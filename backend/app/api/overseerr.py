from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
import httpx
from typing import Optional, List, Any

from app.config import settings
from app.middleware.auth import require_auth
from app.utils.logger import logger

router = APIRouter(prefix="/api/overseerr", tags=["overseerr"])


class OverseerrUserCreate(BaseModel):
    """Model for creating Overseerr user"""

    username: str
    password: str
    email: Optional[str] = None
    email_domain: Optional[str] = None


class OverseerrUserResponse(BaseModel):
    """Response from Overseerr user creation"""

    success: bool
    message: str
    username: str


class OverseerrUser(BaseModel):
    """Model for Overseerr user in list"""

    id: int
    email: str
    username: str
    displayName: Optional[str] = None
    plexToken: Optional[str] = None
    plexId: Optional[int] = None
    avatar: Optional[str] = None
    createdAt: Optional[str] = None
    userType: Optional[int] = None


@router.post("/users", response_model=OverseerrUserResponse)
async def create_overseerr_user(
    user_data: OverseerrUserCreate, username: str = Depends(require_auth)
):
    """Create a user in Overseerr"""
    try:
        # Check if Overseerr is configured
        if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Overseerr is not configured. Please set OVERSEERR_URL and OVERSEERR_API_KEY in config.json",
            )

        # Construct email
        if user_data.email:
            email = user_data.email
        elif user_data.email_domain:
            email = f"{user_data.username}@{user_data.email_domain}"
        else:
            # Use default domain if available
            default_domain = getattr(settings, "DEFAULT_EMAIL_DOMAIN", None)
            if default_domain:
                email = f"{user_data.username}@{default_domain}"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email or email_domain is required",
                )

        # Prepare request to Overseerr
        headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": settings.OVERSEERR_API_KEY,
        }

        payload = {
            "email": email,
            "username": user_data.username,
            "password": user_data.password,
            "permissions": 0,
        }

        # Make request to Overseerr
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.OVERSEERR_URL, json=payload, headers=headers
            )

            if response.status_code == 201:
                logger.info(
                    f"User {user_data.username} created in Overseerr by {username}"
                )
                return OverseerrUserResponse(
                    success=True,
                    message=f"User {user_data.username} created successfully",
                    username=user_data.username,
                )
            elif response.status_code == 409:
                logger.warning(f"User {user_data.username} already exists in Overseerr")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User {user_data.username} already exists in Overseerr",
                )
            else:
                logger.error(
                    f"Failed to create Overseerr user: {response.status_code} - {response.text}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Overseerr API error: {response.text}",
                )

    except httpx.TimeoutException:
        logger.error("Timeout connecting to Overseerr")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timeout connecting to Overseerr",
        )
    except httpx.RequestError as e:
        logger.error(f"Error connecting to Overseerr: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to Overseerr: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating Overseerr user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get("/status")
async def check_overseerr_status(username: str = Depends(require_auth)):
    """Check if Overseerr is configured and reachable"""
    try:
        if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
            return {
                "configured": False,
                "reachable": False,
                "message": "Overseerr is not configured",
            }

        # Try to reach Overseerr status endpoint
        base_url = settings.OVERSEERR_URL.rsplit("/user", 1)[0]
        status_url = f"{base_url}/status"

        headers = {
            "accept": "application/json",
            "X-Api-Key": settings.OVERSEERR_API_KEY,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(status_url, headers=headers)

            if response.status_code == 200:
                return {
                    "configured": True,
                    "reachable": True,
                    "message": "Overseerr is configured and reachable",
                }
            else:
                return {
                    "configured": True,
                    "reachable": False,
                    "message": f"Overseerr returned status code: {response.status_code}",
                }

    except Exception as e:
        logger.error(f"Error checking Overseerr status: {e}")
        return {
            "configured": True,
            "reachable": False,
            "message": f"Failed to connect: {str(e)}",
        }


@router.get("/users")
async def get_overseerr_users(
    username: str = Depends(require_auth), search: Optional[str] = None
):
    """Get list of users from Overseerr with optional search"""
    try:
        # Check if Overseerr is configured
        if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Overseerr is not configured",
            )

        # Prepare request
        base_url = settings.OVERSEERR_URL.rstrip("/api/v1/user")
        users_url = f"{base_url}/api/v1/user"

        headers = {
            "accept": "application/json",
            "X-Api-Key": settings.OVERSEERR_API_KEY,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            all_users = []
            page = 0
            page_size = 100

            # Always fetch ALL users using pagination
            logger.info(
                f"Fetching Overseerr users{' with search: ' + search if search else ''}..."
            )

            while True:
                params = {"take": page_size, "skip": page * page_size}
                response = await client.get(users_url, headers=headers, params=params)

                if response.status_code == 200:
                    data = response.json()
                    users = data.get("results", [])

                    if not users:
                        break  # No more users

                    all_users.extend(users)
                    logger.info(
                        f"Fetched page {page + 1}: {len(users)} users (total so far: {len(all_users)})"
                    )

                    # Check if we got fewer results than requested (last page)
                    # or if we've reached the total count indicated by pageInfo
                    page_info = data.get("pageInfo", {})
                    pages = page_info.get("pages", 0)
                    page_count = page_info.get("pageCount", 0)

                    logger.info(
                        f"Page info: pages={pages}, pageCount={page_count}, results_in_page={len(users)}"
                    )

                    # Stop if we got fewer results than page_size (last page)
                    if len(users) < page_size:
                        logger.info(
                            f"Got {len(users)} users (less than page size {page_size}), stopping pagination"
                        )
                        break

                    # Also check pageInfo if available
                    if pages > 0 and (page + 1) >= pages:
                        logger.info(f"Reached last page ({page + 1} of {pages})")
                        break

                    page += 1
                else:
                    logger.error(
                        f"Failed to fetch Overseerr users: {response.status_code} - {response.text}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Overseerr API returned status code: {response.status_code}",
                    )

            logger.info(f"Fetched total of {len(all_users)} users from Overseerr")

            # Apply search filter if provided
            if search:
                search_lower = search.lower()
                all_users = [
                    user
                    for user in all_users
                    if search_lower in (user.get("username") or "").lower()
                    or search_lower in (user.get("email") or "").lower()
                    or search_lower in (user.get("displayName") or "").lower()
                ]
                logger.info(
                    f"Search '{search}' returned {len(all_users)} matching users"
                )

            return {
                "success": True,
                "users": all_users,
                "total": len(all_users),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Overseerr users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}",
        )
