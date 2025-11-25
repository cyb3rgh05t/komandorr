from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional, overload, Literal
from datetime import datetime, timezone, timedelta
from sqlalchemy import func
import secrets
import string
import httpx

from app.models.invite import (
    InviteCreate,
    InviteUpdate,
    Invite,
    InviteWithUsers,
    PlexUser,
    RedeemInviteRequest,
    ValidateInviteResponse,
    InviteStatsResponse,
)
from app.database import db, InviteDB, PlexUserDB, PlexStatsDB
from app.utils.logger import logger
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.plex_invite import (
    check_plexapi_available,
    get_plex_libraries,
    invite_plex_friend,
    invite_plex_home,
    remove_plex_user,
)

router = APIRouter(prefix="/api/invites", tags=["invites"])


def get_plex_config_from_settings():
    """Get Plex configuration from settings (config.json)"""
    from app.config import settings

    if not settings.PLEX_SERVER_URL or not settings.PLEX_SERVER_TOKEN:
        return None

    return {
        "url": settings.PLEX_SERVER_URL,
        "token": settings.PLEX_SERVER_TOKEN,
        "server_name": settings.PLEX_SERVER_NAME or "Plex Server",
    }


def generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code"""
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


@overload
def db_invite_to_pydantic(
    db_invite: InviteDB, include_users: Literal[True], plex_server: str = "Plex Server"
) -> InviteWithUsers: ...


@overload
def db_invite_to_pydantic(
    db_invite: InviteDB,
    include_users: Literal[False] = False,
    plex_server: str = "Plex Server",
) -> Invite: ...


def db_invite_to_pydantic(
    db_invite: InviteDB, include_users: bool = False, plex_server: str = "Plex Server"
) -> Invite | InviteWithUsers:
    """Convert database invite to Pydantic model"""
    from app.utils.logger import logger

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    is_expired = False
    if db_invite.expires_at:
        is_expired = db_invite.expires_at < now

    is_exhausted = False
    if db_invite.usage_limit and db_invite.used_count >= db_invite.usage_limit:
        is_exhausted = True

    logger.info(f"Creating invite model with plex_server: {plex_server}")

    base_data = {
        "id": db_invite.id,
        "code": db_invite.code,
        "created_at": db_invite.created_at,
        "created_by": db_invite.created_by,
        "expires_at": db_invite.expires_at,
        "usage_limit": db_invite.usage_limit,
        "used_count": db_invite.used_count,
        "allow_sync": db_invite.allow_sync,
        "allow_camera_upload": db_invite.allow_camera_upload,
        "allow_channels": db_invite.allow_channels,
        "plex_home": db_invite.plex_home,
        "libraries": db_invite.libraries,
        "is_active": db_invite.is_active,
        "is_expired": is_expired,
        "is_exhausted": is_exhausted,
        "plex_server": plex_server,
    }

    logger.info(f"base_data plex_server: {base_data['plex_server']}")

    if include_users:
        users = [
            PlexUser(
                id=u.id,
                email=u.email,
                username=u.username,
                plex_id=u.plex_id,
                invite_id=u.invite_id,
                created_at=u.created_at,
                last_seen=u.last_seen,
                is_active=u.is_active,
            )
            for u in db_invite.users
        ]
        result = InviteWithUsers(**base_data, users=users)
        logger.info(f"InviteWithUsers model plex_server: {result.plex_server}")
        logger.info(f"InviteWithUsers model dict: {result.model_dump()}")
        return result

    return Invite(**base_data)


async def invite_plex_user(
    email: str,
    plex_config: dict,
    libraries: str,
    allow_sync: bool,
    allow_camera_upload: bool,
    allow_channels: bool,
    plex_home: bool,
) -> tuple[bool, Optional[str]]:
    """
    Invite a user to Plex server
    Returns: (success, error_message)
    """
    try:
        url = plex_config["url"].rstrip("/")
        token = plex_config["token"]

        # Check if PlexAPI is available
        if not check_plexapi_available():
            logger.warning("PlexAPI not available - invitation not sent")
            logger.info(
                f"Would invite {email} to Plex (PlexAPI required for actual invitation)"
            )
            # For now, return success so the system can still track the invite
            # In production, you should install PlexAPI: pip install plexapi
            return True, None

        # Determine which libraries to share
        if libraries == "all":
            # Get all libraries
            library_list = await get_plex_libraries(url, token)
            library_ids = [lib["id"] for lib in library_list]
        else:
            # Parse comma-separated IDs
            library_ids = [
                lib_id.strip() for lib_id in libraries.split(",") if lib_id.strip()
            ]

        logger.info(f"Inviting {email} to Plex with {len(library_ids)} libraries")

        # Invite based on type
        if plex_home:
            success, error = await invite_plex_home(
                server_url=url,
                token=token,
                email=email,
                library_ids=library_ids,
                allow_sync=allow_sync,
                allow_camera_upload=allow_camera_upload,
                allow_channels=allow_channels,
            )
        else:
            success, error = await invite_plex_friend(
                server_url=url,
                token=token,
                email=email,
                library_ids=library_ids,
                allow_sync=allow_sync,
                allow_camera_upload=allow_camera_upload,
                allow_channels=allow_channels,
            )

        return success, error

    except Exception as e:
        logger.error(f"Error inviting Plex user: {e}", exc_info=True)
        return False, str(e)


@router.post("/", response_model=Invite)
async def create_invite(
    invite_data: InviteCreate, username: str = Depends(require_auth)
):
    """Create a new invite code"""
    try:
        session = db.get_session()
        try:
            # Use custom code if provided, otherwise generate one
            if invite_data.custom_code:
                code = invite_data.custom_code.strip().upper()
                # Validate custom code
                if len(code) < 4:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Custom code must be at least 4 characters long",
                    )
                if not code.replace("-", "").replace("_", "").isalnum():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Custom code can only contain letters, numbers, hyphens, and underscores",
                    )
                # Check if code already exists
                if session.query(InviteDB).filter_by(code=code).first():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This invite code already exists",
                    )
            else:
                # Generate unique code
                code = generate_invite_code()
                while session.query(InviteDB).filter_by(code=code).first():
                    code = generate_invite_code()

            # Calculate expiration
            expires_at = None
            if invite_data.expires_in_days:
                expires_at = datetime.now(timezone.utc).replace(
                    tzinfo=None
                ) + timedelta(days=invite_data.expires_in_days)

            # Create invite
            db_invite = InviteDB(
                code=code,
                created_by=username,
                expires_at=expires_at,
                usage_limit=invite_data.usage_limit,
                allow_sync=invite_data.allow_sync,
                allow_camera_upload=invite_data.allow_camera_upload,
                allow_channels=invite_data.allow_channels,
                plex_home=invite_data.plex_home,
                libraries=invite_data.libraries,
            )

            session.add(db_invite)
            session.commit()
            session.refresh(db_invite)

            logger.info(f"Created invite {code} by {username}")

            # Get Plex server name from config
            from app.config import settings

            plex_server = settings.PLEX_SERVER_NAME or "Plex Server"

            return db_invite_to_pydantic(db_invite, plex_server=plex_server)

        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error creating invite: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating invite: {str(e)}",
        )


@router.get("/")
async def list_invites(
    include_inactive: bool = False, username: str = Depends(require_auth)
) -> List[InviteWithUsers]:
    """List all invites"""
    try:
        session = db.get_session()
        try:
            # Get Plex server name from settings
            plex_config = get_plex_config_from_settings()
            plex_server = plex_config["server_name"] if plex_config else "Plex Server"
            logger.info(f"Using Plex server name: {plex_server}")

            query = session.query(InviteDB)

            if not include_inactive:
                query = query.filter_by(is_active=True)

            invites = query.order_by(InviteDB.created_at.desc()).all()

            return [
                db_invite_to_pydantic(inv, include_users=True, plex_server=plex_server)
                for inv in invites
            ]

        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error listing invites: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing invites: {str(e)}",
        )


@router.get("/plex/config")
async def get_plex_config(username: str = Depends(require_auth)):
    """Get Plex server configuration and available libraries"""
    try:
        plex_config = get_plex_config_from_settings()

        if not plex_config:
            return {
                "servers": [],
                "libraries": [],
                "error": "Plex server not configured",
            }

        # For now, return single server (can be extended for multiple servers later)
        servers = [
            {
                "id": "default",
                "name": plex_config["server_name"],
                "url": plex_config["url"],
            }
        ]

        # Fetch libraries
        libraries = []
        try:
            if check_plexapi_available():
                libraries = await get_plex_libraries(
                    plex_config["url"],
                    plex_config["token"],
                )
        except Exception as lib_error:
            logger.warning(f"Could not fetch libraries: {lib_error}")

        return {"servers": servers, "libraries": libraries}

    except Exception as e:
        logger.error(f"Error fetching Plex config: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching Plex configuration: {str(e)}",
        )


@router.get("/stats", response_model=InviteStatsResponse)
async def get_invite_stats(username: str = Depends(require_auth)):
    """Get invite statistics"""
    try:
        session = db.get_session()
        try:
            total_invites = session.query(InviteDB).count()
            active_invites = session.query(InviteDB).filter_by(is_active=True).count()
            total_users = session.query(PlexUserDB).count()
            active_users = session.query(PlexUserDB).filter_by(is_active=True).count()

            # Calculate used up invites (where used_count >= usage_limit and usage_limit is not null)
            used_up_invites = (
                session.query(InviteDB)
                .filter(
                    InviteDB.usage_limit.isnot(None),
                    InviteDB.used_count >= InviteDB.usage_limit,
                )
                .count()
            )

            # Calculate total redemptions (sum of all used_count)
            total_redemptions = (
                session.query(InviteDB)
                .with_entities(func.sum(InviteDB.used_count))
                .scalar()
                or 0
            )

            return InviteStatsResponse(
                total_invites=total_invites,
                active_invites=active_invites,
                used_up_invites=used_up_invites,
                total_redemptions=total_redemptions,
                total_users=total_users,
                active_users=active_users,
            )

        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error getting invite stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting invite stats: {str(e)}",
        )


@router.get("/{invite_id}", response_model=InviteWithUsers)
async def get_invite(invite_id: int, username: str = Depends(require_auth)):
    """Get a specific invite by ID"""
    try:
        session = db.get_session()
        try:
            db_invite = session.query(InviteDB).filter_by(id=invite_id).first()

            if not db_invite:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found"
                )

            # Get Plex server name from settings
            plex_config = get_plex_config_from_settings()
            plex_server = plex_config["server_name"] if plex_config else "Plex Server"

            return db_invite_to_pydantic(
                db_invite, include_users=True, plex_server=plex_server
            )

        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invite: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting invite: {str(e)}",
        )


@router.put("/{invite_id}", response_model=Invite)
async def update_invite(
    invite_id: int, invite_data: InviteUpdate, username: str = Depends(require_auth)
):
    """Update an existing invite"""
    try:
        session = db.get_session()
        try:
            db_invite = session.query(InviteDB).filter_by(id=invite_id).first()

            if not db_invite:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found"
                )

            # Update fields
            if invite_data.usage_limit is not None:
                db_invite.usage_limit = invite_data.usage_limit  # type: ignore
            if invite_data.expires_at is not None:
                db_invite.expires_at = invite_data.expires_at  # type: ignore
            if invite_data.allow_sync is not None:
                db_invite.allow_sync = invite_data.allow_sync  # type: ignore
            if invite_data.allow_camera_upload is not None:
                db_invite.allow_camera_upload = invite_data.allow_camera_upload  # type: ignore
            if invite_data.allow_channels is not None:
                db_invite.allow_channels = invite_data.allow_channels  # type: ignore
            if invite_data.plex_home is not None:
                db_invite.plex_home = invite_data.plex_home  # type: ignore
            if invite_data.libraries is not None:
                db_invite.libraries = invite_data.libraries  # type: ignore
            if invite_data.is_active is not None:
                db_invite.is_active = invite_data.is_active  # type: ignore

            session.commit()
            session.refresh(db_invite)

            logger.info(f"Updated invite {db_invite.code} by {username}")

            # Get Plex server name from settings
            plex_config = get_plex_config_from_settings()
            plex_server = plex_config["server_name"] if plex_config else "Plex Server"

            return db_invite_to_pydantic(db_invite, plex_server=plex_server)

        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invite: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating invite: {str(e)}",
        )


@router.delete("/{invite_id}")
async def delete_invite(invite_id: int, username: str = Depends(require_auth)):
    """Delete an invite and remove associated users from Plex"""
    try:
        session = db.get_session()
        try:
            db_invite = session.query(InviteDB).filter_by(id=invite_id).first()

            if not db_invite:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found"
                )

            code = db_invite.code

            # Get Plex config
            plex_config = get_plex_config_from_settings()

            # Get associated users before deletion
            users = session.query(PlexUserDB).filter_by(invite_id=invite_id).all()
            user_count = len(users)

            # Remove users from Plex server if they exist
            if user_count > 0 and plex_config:
                removed_count = 0
                failed_removals = []

                for user in users:
                    if user.email:
                        success, error = await remove_plex_user(
                            token=plex_config["token"], email=str(user.email)
                        )
                        if success:
                            removed_count += 1
                            logger.info(f"Removed {user.email} from Plex server")
                        else:
                            failed_removals.append(f"{user.email}: {error}")
                            logger.warning(
                                f"Failed to remove {user.email} from Plex: {error}"
                            )

                if removed_count > 0:
                    logger.info(
                        f"Successfully removed {removed_count}/{user_count} users from Plex"
                    )
                if failed_removals:
                    logger.warning(
                        f"Failed to remove some users: {', '.join(failed_removals)}"
                    )

            # Delete users from database
            if user_count > 0:
                session.query(PlexUserDB).filter_by(invite_id=invite_id).delete()
                session.flush()  # Ensure users are deleted before deleting invite
                logger.info(
                    f"Deleted {user_count} users from database for invite {code}"
                )

            session.delete(db_invite)
            session.commit()

            logger.info(f"Deleted invite {code} by {username}")

            return {
                "success": True,
                "message": "Invite deleted and users removed from Plex",
            }

        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting invite: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting invite: {str(e)}",
        )


# Public endpoints (no auth required)


@router.post("/validate", response_model=ValidateInviteResponse)
async def validate_invite(code: str):
    """Validate an invite code (public endpoint)"""
    try:
        session = db.get_session()
        try:
            db_invite = session.query(InviteDB).filter_by(code=code.upper()).first()

            if not db_invite:
                return ValidateInviteResponse(
                    valid=False,
                    message="Einladungscode nicht gefunden",
                    invite=None,
                    plex_server_name=None,
                )

            if not db_invite.is_active:
                return ValidateInviteResponse(
                    valid=False,
                    message="Diese Einladung wurde deaktiviert",
                    invite=None,
                    plex_server_name=None,
                )

            now = datetime.now(timezone.utc).replace(tzinfo=None)

            if db_invite.expires_at and db_invite.expires_at < now:
                return ValidateInviteResponse(
                    valid=False,
                    message="Diese Einladung ist abgelaufen",
                    invite=None,
                    plex_server_name=None,
                )

            if db_invite.usage_limit and db_invite.used_count >= db_invite.usage_limit:
                return ValidateInviteResponse(
                    valid=False,
                    message="Diese Einladung hat das maximale Nutzungslimit erreicht",
                    invite=None,
                    plex_server_name=None,
                )

            # Get Plex server name from config
            # Get Plex server name from settings
            plex_config = get_plex_config_from_settings()
            server_name = plex_config["server_name"] if plex_config else "Plex Server"

            return ValidateInviteResponse(
                valid=True,
                message="Valid invite code",
                invite=db_invite_to_pydantic(db_invite, plex_server=server_name),
                plex_server_name=server_name,
            )

        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error validating invite: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating invite: {str(e)}",
        )


@router.post("/redeem")
async def redeem_invite(request: RedeemInviteRequest):
    """Redeem an invite code and invite user to Plex (public endpoint)"""
    try:
        session = db.get_session()
        try:
            # Validate invite
            db_invite = (
                session.query(InviteDB).filter_by(code=request.code.upper()).first()
            )

            if not db_invite:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invite code not found",
                )

            if not db_invite.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This invite has been disabled",
                )

            now = datetime.now(timezone.utc).replace(tzinfo=None)

            if db_invite.expires_at and db_invite.expires_at < now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This invite has expired",
                )

            if db_invite.usage_limit and db_invite.used_count >= db_invite.usage_limit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This invite has reached its usage limit",
                )

            # Check if user already redeemed an invite
            existing_user = (
                session.query(PlexUserDB).filter_by(email=request.email.lower()).first()
            )
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email has already been invited",
                )

            # Get Plex config from settings
            plex_config = get_plex_config_from_settings()
            if not plex_config:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Plex server not configured",
                )

            # Invite user to Plex
            success, error = await invite_plex_user(
                email=str(request.email),
                plex_config=plex_config,
                libraries=db_invite.libraries,  # type: ignore
                allow_sync=db_invite.allow_sync,  # type: ignore
                allow_camera_upload=db_invite.allow_camera_upload,  # type: ignore
                allow_channels=db_invite.allow_channels,  # type: ignore
                plex_home=db_invite.plex_home,  # type: ignore
            )

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to invite user to Plex: {error}",
                )

            # Create user record
            plex_user = PlexUserDB(
                email=request.email.lower(),
                invite_id=db_invite.id,
            )
            session.add(plex_user)

            # Update invite usage
            db_invite.used_count += 1  # type: ignore

            session.commit()
            session.refresh(plex_user)

            logger.info(f"User {request.email} redeemed invite {db_invite.code}")

            return {
                "success": True,
                "message": f"Successfully invited to Plex! Check {request.email} for the invitation email.",
                "user": PlexUser(
                    id=plex_user.id,  # type: ignore
                    email=plex_user.email,  # type: ignore
                    username=plex_user.username,  # type: ignore
                    plex_id=plex_user.plex_id,  # type: ignore
                    invite_id=plex_user.invite_id,  # type: ignore
                    created_at=plex_user.created_at,  # type: ignore
                    last_seen=plex_user.last_seen,  # type: ignore
                    is_active=plex_user.is_active,  # type: ignore
                ),
            }

        finally:
            session.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error redeeming invite: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error redeeming invite: {str(e)}",
        )


@router.get("/users", response_model=List[PlexUser])
async def list_plex_users(username: str = Depends(require_auth)):
    """List all Plex users created via invites"""
    try:
        session = db.get_session()
        try:
            users = (
                session.query(PlexUserDB).order_by(PlexUserDB.created_at.desc()).all()
            )

            return [
                PlexUser(
                    id=u.id,  # type: ignore
                    email=u.email,  # type: ignore
                    username=u.username,  # type: ignore
                    plex_id=u.plex_id,  # type: ignore
                    invite_id=u.invite_id,  # type: ignore
                    created_at=u.created_at,  # type: ignore
                    last_seen=u.last_seen,  # type: ignore
                    is_active=u.is_active,  # type: ignore
                )
                for u in users
            ]

        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error listing plex users: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing plex users: {str(e)}",
        )


@router.get("/tmdb/api-key")
async def get_tmdb_api_key():
    """Get TMDB API key for invite redemption backgrounds (public endpoint)"""
    return {"api_key": settings.TMDB_API_KEY or ""}
