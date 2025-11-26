"""
Plex OAuth Authentication

Handles Plex OAuth flow for invite redemption (Wizarr-style)
"""

from fastapi import APIRouter, HTTPException, status, Response
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional
import secrets
import httpx
from datetime import datetime, timezone

from app.utils.logger import logger
from app.database import db, InviteDB, PlexUserDB

router = APIRouter(prefix="/api/oauth", tags=["oauth"])

logger.info(
    "===== OAuth module loaded, routes will be: /api/oauth/plex/login, /api/oauth/plex/check, /api/oauth/plex/redeem ====="
)

# Store OAuth states temporarily (in production, use Redis or database)
oauth_states = {}


class PlexOAuthConfig(BaseModel):
    """Plex OAuth configuration"""

    client_id: str = "komandorr-plex-invite"
    redirect_uri: str = "http://localhost:8000/api/oauth/plex/callback"


class PlexPinResponse(BaseModel):
    """Response from Plex PIN creation"""

    id: int
    code: str
    auth_url: str


class PlexRedeemRequest(BaseModel):
    """Request to redeem invite with Plex OAuth"""

    invite_code: str
    auth_token: str
    email: str
    username: str
    plex_id: str


@router.get("/plex/login")
async def plex_oauth_login(invite_code: str):
    """
    Initiate Plex OAuth flow

    This endpoint creates a Plex PIN and returns the auth URL
    Similar to Wizarr's approach
    """
    try:
        # Create Plex PIN for OAuth
        async with httpx.AsyncClient() as client:
            # Step 1: Create PIN
            headers = {
                "X-Plex-Product": "Komandorr",
                "X-Plex-Version": "1.0",
                "X-Plex-Client-Identifier": "komandorr-invite",
                "Accept": "application/json",
            }

            response = await client.post(
                "https://plex.tv/api/v2/pins",
                headers=headers,
                params={"strong": "true"},
            )

            if response.status_code != 201:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create Plex PIN",
                )

            pin_data = response.json()
            pin_id = pin_data["id"]
            pin_code = pin_data["code"]

            # Store state for callback verification
            state = secrets.token_urlsafe(32)
            oauth_states[state] = {
                "pin_id": pin_id,
                "invite_code": invite_code,
                "created_at": datetime.now(timezone.utc),
            }

            # Build Plex auth URL
            auth_url = (
                f"https://app.plex.tv/auth#"
                f"?clientID=komandorr-invite"
                f"&code={pin_code}"
                f"&context[device][product]=Komandorr"
                f"&context[device][version]=1.0"
                f"&context[device][platform]=Web"
            )

            return {
                "pin_id": pin_id,
                "pin_code": pin_code,
                "auth_url": auth_url,
                "state": state,
            }

    except Exception as e:
        logger.error(f"Plex OAuth login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Plex OAuth: {str(e)}",
        )


@router.get("/plex/check/{pin_id}")
async def check_plex_pin(pin_id: int, state: str):
    """
    Check if PIN has been authorized

    Frontend polls this endpoint to check if user has authorized
    """
    try:
        # Verify state
        if state not in oauth_states:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state"
            )

        # Check PIN status
        async with httpx.AsyncClient() as client:
            headers = {
                "X-Plex-Client-Identifier": "komandorr-invite",
                "Accept": "application/json",
            }

            response = await client.get(
                f"https://plex.tv/api/v2/pins/{pin_id}", headers=headers
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to check PIN status",
                )

            pin_data = response.json()
            auth_token = pin_data.get("authToken")

            logger.debug(f"PIN {pin_id} status: {pin_data}")

            if auth_token:
                # PIN has been authorized - get user info
                logger.info(f"PIN {pin_id} authorized, fetching user info")
                user_response = await client.get(
                    "https://plex.tv/api/v2/user",
                    headers={"X-Plex-Token": auth_token, "Accept": "application/json"},
                )

                if user_response.status_code == 200:
                    user_data = user_response.json()
                    logger.info(f"User authorized: {user_data.get('username')}")

                    return {
                        "authorized": True,
                        "auth_token": auth_token,
                        "email": user_data.get("email"),
                        "username": user_data.get("username"),
                        "plex_id": user_data.get("id"),
                    }
            else:
                logger.debug(f"PIN {pin_id} not yet authorized")

            return {"authorized": False}

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        logger.error(
            f"PIN check HTTP error: {e.response.status_code} - {e.response.text}"
        )
        if e.response.status_code == 404:
            # PIN not found or expired - this is normal after successful authorization
            return {"authorized": False, "expired": True}
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check PIN status",
        )
    except Exception as e:
        logger.error(f"PIN check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check PIN: {str(e)}",
        )


@router.post("/plex/redeem")
async def redeem_with_plex_oauth(request: PlexRedeemRequest):
    """
    Redeem invite using Plex OAuth token

    This is called after user has authorized via Plex OAuth
    Similar to Wizarr's handle_oauth_token function
    """
    logger.info(
        f"=== OAUTH REDEEM CALLED === Email: {request.email}, Invite: {request.invite_code}"
    )

    session = db.get_session()
    try:
        # Validate invite
        invite = (
            session.query(InviteDB)
            .filter(InviteDB.code == request.invite_code.upper())
            .first()
        )

        if not invite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found"
            )

        # Check if valid
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        if invite.expires_at and invite.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invite has expired"
            )

        if invite.usage_limit and invite.used_count >= invite.usage_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite has been fully used",
            )

        # Check if user already exists (email is unique across all invites)
        existing_user = (
            session.query(PlexUserDB).filter(PlexUserDB.email == request.email).first()
        )

        # Check if this specific invite was already redeemed by this user
        if existing_user and existing_user.invite_id == invite.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already redeemed this invite",
            )

        # ALWAYS invite/update the user in Plex, even if they exist in our database
        # This ensures library access is updated if they're redeeming a different invite
        from app.utils.plex_invite import invite_plex_user_oauth

        logger.info(
            f"About to call invite_plex_user_oauth for {request.email} with invite libraries: {invite.libraries}"
        )

        success, error_msg = await invite_plex_user_oauth(
            auth_token=request.auth_token,
            email=request.email,
            username=request.username,
            invite=invite,
        )

        logger.info(
            f"invite_plex_user_oauth returned: success={success}, error={error_msg}"
        )

        if not success:
            # Log warning but don't fail - user might already be in Plex
            logger.warning(
                f"Plex invitation failed for {request.email}: {error_msg}, continuing anyway"
            )

        if existing_user:
            # Update existing user record with new invite
            existing_user.invite_id = invite.id  # type: ignore
            existing_user.username = request.username  # type: ignore
            existing_user.plex_id = request.plex_id  # type: ignore
            existing_user.is_active = True  # type: ignore
            user_record = existing_user
        else:
            # Create new user record
            user_record = PlexUserDB(
                invite_id=invite.id,
                email=request.email,
                username=request.username,
                plex_id=request.plex_id,
            )
            session.add(user_record)

        # Update invite usage
        invite.used_count += 1  # type: ignore

        session.commit()
        session.refresh(user_record)

        logger.info(
            f"User {request.email} redeemed invite {request.invite_code} via OAuth"
        )

        return {
            "success": True,
            "message": "Successfully added to Plex server!",
            "user": {
                "email": request.email,
                "username": request.username,
                "created_at": user_record.created_at.isoformat(),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Redeem error: {e}")
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to redeem invite: {str(e)}",
        )
    finally:
        session.close()
