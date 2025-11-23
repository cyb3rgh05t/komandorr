"""
Plex Invitation Helper - PlexAPI Integration

This module provides helper functions for inviting users to Plex using the PlexAPI library.
"""

from typing import Optional, Tuple, List
import logging

try:
    from plexapi.myplex import MyPlexAccount
    from plexapi.server import PlexServer

    PLEXAPI_AVAILABLE = True
except ImportError:
    PLEXAPI_AVAILABLE = False
    logging.warning("PlexAPI not installed. Install with: pip install plexapi")


class PlexInviteError(Exception):
    """Custom exception for Plex invitation errors"""

    pass


def check_plexapi_available() -> bool:
    """Check if PlexAPI library is available"""
    return PLEXAPI_AVAILABLE


async def get_plex_libraries(server_url: str, token: str) -> List[dict]:
    """
    Get available libraries from Plex server

    Args:
        server_url: Plex server URL
        token: Plex authentication token

    Returns:
        List of libraries with id, name, and type

    Raises:
        PlexInviteError: If unable to connect or fetch libraries
    """
    if not PLEXAPI_AVAILABLE:
        raise PlexInviteError("PlexAPI library not installed")

    try:
        plex = PlexServer(server_url, token)
        libraries = []

        for section in plex.library.sections():
            libraries.append(
                {"id": str(section.key), "name": section.title, "type": section.type}
            )

        return libraries

    except Exception as e:
        logging.error(f"Error fetching Plex libraries: {e}")
        raise PlexInviteError(f"Failed to fetch libraries: {str(e)}")


async def invite_plex_friend(
    server_url: str,
    token: str,
    email: str,
    library_ids: List[str],
    allow_sync: bool = False,
    allow_camera_upload: bool = False,
    allow_channels: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Invite a user as a Plex Friend

    Args:
        server_url: Plex server URL
        token: Plex admin token
        email: Email address to invite
        library_ids: List of library IDs to share
        allow_sync: Allow downloads/sync
        allow_camera_upload: Allow camera uploads
        allow_channels: Allow Live TV/channels

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    if not PLEXAPI_AVAILABLE:
        return False, "PlexAPI library not installed. Install with: pip install plexapi"

    try:
        # Connect to Plex
        account = MyPlexAccount(token=token)
        plex = PlexServer(server_url, token)

        # Get library sections
        all_sections = plex.library.sections()
        sections_to_share = []

        for section in all_sections:
            if str(section.key) in library_ids:
                sections_to_share.append(section)

        if not sections_to_share:
            return False, "No valid libraries selected"

        # Invite friend
        account.inviteFriend(
            user=email,
            server=plex,
            sections=sections_to_share,
            allowSync=allow_sync,
            allowCameraUpload=allow_camera_upload,
            allowChannels=allow_channels,
        )

        logging.info(f"Successfully invited {email} to Plex as friend")
        return True, None

    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error inviting Plex friend {email}: {error_msg}")

        # Provide user-friendly error messages
        if "already sharing" in error_msg.lower():
            return False, "This user is already shared with this server"
        elif "not found" in error_msg.lower():
            return False, "User not found or invalid email"
        else:
            return False, f"Failed to invite user: {error_msg}"


async def invite_plex_home(
    server_url: str,
    token: str,
    email: str,
    library_ids: List[str],
    allow_sync: bool = False,
    allow_camera_upload: bool = False,
    allow_channels: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Invite a user to Plex Home (requires Plex Pass)

    Args:
        server_url: Plex server URL
        token: Plex admin token
        email: Email address to invite
        library_ids: List of library IDs to share
        allow_sync: Allow downloads/sync
        allow_camera_upload: Allow camera uploads
        allow_channels: Allow Live TV/channels

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    if not PLEXAPI_AVAILABLE:
        return False, "PlexAPI library not installed. Install with: pip install plexapi"

    try:
        # Connect to Plex
        account = MyPlexAccount(token=token)
        plex = PlexServer(server_url, token)

        # Get library sections
        all_sections = plex.library.sections()
        sections_to_share = []

        for section in all_sections:
            if str(section.key) in library_ids:
                sections_to_share.append(section)

        if not sections_to_share:
            return False, "No valid libraries selected"

        # Create Plex Home user
        account.createExistingUser(
            user=email,
            server=plex,
            sections=sections_to_share,
            allowSync=allow_sync,
            allowCameraUpload=allow_camera_upload,
            allowChannels=allow_channels,
        )

        logging.info(f"Successfully invited {email} to Plex Home")
        return True, None

    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error inviting Plex Home user {email}: {error_msg}")

        # Provide user-friendly error messages
        if "already" in error_msg.lower():
            return False, "This user is already a Plex Home member"
        elif "plex pass" in error_msg.lower():
            return False, "Plex Home requires an active Plex Pass subscription"
        elif "not found" in error_msg.lower():
            return False, "User not found or invalid email"
        else:
            return False, f"Failed to invite user: {error_msg}"


async def remove_plex_user(
    token: str,
    email: str,
) -> Tuple[bool, Optional[str]]:
    """
    Remove a user from Plex sharing

    Args:
        token: Plex admin token
        email: Email address to remove

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    if not PLEXAPI_AVAILABLE:
        return False, "PlexAPI library not installed"

    try:
        account = MyPlexAccount(token=token)

        # Find and remove user
        user = account.user(email)
        if user:
            account.removeFriend(user)
            logging.info(f"Successfully removed {email} from Plex")
            return True, None
        else:
            return False, "User not found"

    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error removing Plex user {email}: {error_msg}")
        return False, f"Failed to remove user: {error_msg}"


async def get_plex_user_info(
    token: str,
    email: str,
) -> Optional[dict]:
    """
    Get information about a Plex user

    Args:
        token: Plex admin token
        email: User's email address

    Returns:
        User info dict or None if not found
    """
    if not PLEXAPI_AVAILABLE:
        return None

    try:
        account = MyPlexAccount(token=token)
        user = account.user(email)

        if user:
            return {
                "email": user.email,
                "username": user.username,
                "id": str(user.id),
                "thumb": user.thumb,
            }

        return None

    except Exception as e:
        logging.error(f"Error getting Plex user info for {email}: {e}")
        return None


async def invite_plex_user_oauth(
    auth_token: str,
    email: str,
    username: str,
    invite,
) -> Tuple[bool, Optional[str]]:
    """
    Invite user to Plex using their OAuth token (Wizarr-style)

    This function:
    1. Gets admin account and server from invite
    2. Invites user as friend or home member
    3. Auto-accepts the invitation using user's token

    Args:
        auth_token: User's Plex OAuth token
        email: User's email
        username: User's username
        invite: InviteDB object with server configuration

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    if not PLEXAPI_AVAILABLE:
        return False, "PlexAPI library not installed. Install with: pip install plexapi"

    try:
        # Get Plex server config from database
        from app.database import PlexStatsDB, db

        session = db.get_session()
        try:
            plex_config = session.query(PlexStatsDB).first()

            if (
                not plex_config
                or not plex_config.server_url
                or not plex_config.server_token
            ):
                return False, "Plex server not configured"

            # Connect as admin
            admin_account = MyPlexAccount(token=plex_config.server_token)
            plex_server = PlexServer(plex_config.server_url, plex_config.server_token)
        finally:
            session.close()

        # Get libraries to share
        all_sections = plex_server.library.sections()

        # If specific libraries are configured, use those
        if hasattr(invite, "library_ids") and invite.library_ids:
            library_ids = (
                invite.library_ids.split(",")
                if isinstance(invite.library_ids, str)
                else invite.library_ids
            )
            sections_to_share = [s for s in all_sections if str(s.key) in library_ids]
        else:
            # Share all libraries
            sections_to_share = all_sections

        # Get permissions
        allow_sync = getattr(invite, "allow_sync", False)
        allow_channels = getattr(invite, "allow_channels", False)
        plex_home = getattr(invite, "plex_home", False)

        logging.info(f"Inviting {email} to Plex (home={plex_home})")

        # Step 1: Send invitation
        if plex_home:
            # Plex Home invitation
            admin_account.createExistingUser(
                user=email,
                server=plex_server,
                sections=sections_to_share,
                allowSync=allow_sync,
                allowChannels=allow_channels,
            )
        else:
            # Plex Friend invitation
            admin_account.inviteFriend(
                user=email,
                server=plex_server,
                sections=sections_to_share,
                allowSync=allow_sync,
                allowChannels=allow_channels,
            )

        logging.info(f"Invitation sent to {email}")

        # Step 2: Auto-accept using user's OAuth token (Wizarr approach)
        try:
            user_account = MyPlexAccount(token=auth_token)

            # Accept the invitation
            user_account.acceptInvite(admin_account.username)
            logging.info(f"Auto-accepted invitation for {email}")

            # Enable view state sync (optional but recommended)
            try:
                user_account.enableViewStateSync()
            except:
                pass  # Not critical if this fails

        except Exception as accept_error:
            # If auto-accept fails, user can still manually accept
            logging.warning(f"Auto-accept failed for {email}: {accept_error}")
            # Don't fail the whole operation - invitation was still sent

        return True, None

    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error inviting {email} via OAuth: {error_msg}")
        return False, f"Failed to invite user: {error_msg}"
