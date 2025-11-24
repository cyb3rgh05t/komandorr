from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
import httpx
import json
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

from app.utils.logger import logger
from app.database import db, PlexStatsDB

router = APIRouter(prefix="/api/plex", tags=["plex"])


class PlexConfig(BaseModel):
    url: str
    token: str


class PlexValidateRequest(BaseModel):
    url: str
    token: str


class PlexValidateResponse(BaseModel):
    valid: bool
    message: Optional[str] = None
    server_name: Optional[str] = None


class PlexStats(BaseModel):
    peak_concurrent: int
    last_updated: Optional[str] = None
    server_url: Optional[str] = None
    server_name: Optional[str] = None
    token_configured: bool = False
    total_users: int = 0
    total_movies: int = 0
    total_tv_shows: int = 0


class UpdatePeakRequest(BaseModel):
    peak_concurrent: int


def load_plex_config() -> Optional[dict]:
    """Load Plex configuration from database"""
    try:
        session = db.get_session()
        try:
            stats = session.query(PlexStatsDB).first()
            if stats and stats.server_url and stats.server_token:  # type: ignore
                logger.debug(f"Loaded Plex config from database: {stats.server_url}")  # type: ignore
                return {
                    "url": stats.server_url,  # type: ignore
                    "token": stats.server_token,  # type: ignore
                    "server_name": stats.server_name,  # type: ignore
                    "total_users": stats.total_users or 0,  # type: ignore
                    "total_movies": stats.total_movies or 0,  # type: ignore
                    "total_tv_shows": stats.total_tv_shows or 0,  # type: ignore
                }
            else:
                logger.debug("No Plex config found in database")
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error loading Plex config: {e}")
    return None


def save_plex_config(
    config: dict,
    server_name: Optional[str] = None,
    total_users: int = 0,
    total_movies: int = 0,
    total_tv_shows: int = 0,
) -> bool:
    """Save Plex configuration to database"""
    try:
        session = db.get_session()
        try:
            stats = session.query(PlexStatsDB).first()

            if not stats:
                stats = PlexStatsDB(
                    server_url=config["url"],
                    server_token=config["token"],
                    server_name=server_name,
                    peak_concurrent=0,
                    total_users=total_users,
                    total_movies=total_movies,
                    total_tv_shows=total_tv_shows,
                )
                session.add(stats)
            else:
                stats.server_url = config["url"]  # type: ignore
                stats.server_token = config["token"]  # type: ignore
                if server_name:
                    stats.server_name = server_name  # type: ignore
                stats.total_users = total_users  # type: ignore
                stats.total_movies = total_movies  # type: ignore
                stats.total_tv_shows = total_tv_shows  # type: ignore

            session.commit()
            logger.info(
                f"Plex configuration saved to database (Users: {total_users}, Movies: {total_movies}, TV Shows: {total_tv_shows})"
            )
            return True
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error saving Plex config: {e}")
        return False


def migrate_plex_config_if_needed() -> None:
    """Migrate Plex config from JSON to database on startup if needed"""
    CONFIG_FILE = Path("data/plex_config.json")

    try:
        # Check if database already has Plex config
        session = db.get_session()
        try:
            stats = session.query(PlexStatsDB).first()
            has_db_config = stats and stats.server_url and stats.server_token  # type: ignore
        finally:
            session.close()

        # If database already has config, skip migration
        if has_db_config:
            logger.debug("Plex config already exists in database")
            return

        # Check if JSON file exists
        if not CONFIG_FILE.exists():
            logger.debug("No Plex config JSON file found to migrate")
            return

        # Read JSON file
        with open(CONFIG_FILE, "r") as f:
            json_config = json.load(f)

        if not json_config.get("url") or not json_config.get("token"):
            logger.debug("Plex config JSON file is empty or incomplete")
            return

        # Migrate to database
        logger.info("Migrating Plex config from JSON to database...")
        success = save_plex_config(
            {"url": json_config["url"], "token": json_config["token"]},
            server_name=json_config.get("server_name"),
        )

        if success:
            # Create backup of JSON file
            backup_file = CONFIG_FILE.with_suffix(".json.backup")
            shutil.copy2(CONFIG_FILE, backup_file)
            logger.info(
                f"Plex config migrated successfully. Backup created at {backup_file}"
            )
        else:
            logger.error("Failed to migrate Plex config to database")

    except Exception as e:
        logger.error(f"Error during Plex config migration: {e}")


async def fetch_plex_statistics(url: str, token: str) -> tuple[int, int, int]:
    """
    Fetch Plex server statistics
    Returns: (total_users, total_movies, total_tv_shows)
    """
    total_users = 0
    total_movies = 0
    total_tv_shows = 0

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {"X-Plex-Token": token, "Accept": "application/json"}

            # Fetch users count
            try:
                users_response = await client.get(f"{url}/accounts", headers=headers)
                if users_response.status_code == 200:
                    users_data = users_response.json()
                    total_users = len(
                        users_data.get("MediaContainer", {}).get("Account", [])
                    )
            except Exception as e:
                logger.warning(f"Could not fetch user count: {e}")

            # Fetch library sections to count movies and TV shows
            try:
                sections_response = await client.get(
                    f"{url}/library/sections", headers=headers
                )
                if sections_response.status_code == 200:
                    sections_data = sections_response.json()
                    sections = sections_data.get("MediaContainer", {}).get(
                        "Directory", []
                    )

                    for section in sections:
                        section_key = section.get("key")
                        section_type = section.get("type")

                        if section_type == "movie":
                            # Get movie count for this library
                            try:
                                movies_response = await client.get(
                                    f"{url}/library/sections/{section_key}/all",
                                    headers=headers,
                                    params={
                                        "X-Plex-Container-Start": 0,
                                        "X-Plex-Container-Size": 0,
                                    },
                                )
                                if movies_response.status_code == 200:
                                    movies_data = movies_response.json()
                                    total_movies += movies_data.get(
                                        "MediaContainer", {}
                                    ).get("totalSize", 0)
                            except Exception as e:
                                logger.warning(
                                    f"Could not fetch movie count for section {section_key}: {e}"
                                )

                        elif section_type == "show":
                            # Get TV show count for this library
                            try:
                                shows_response = await client.get(
                                    f"{url}/library/sections/{section_key}/all",
                                    headers=headers,
                                    params={
                                        "X-Plex-Container-Start": 0,
                                        "X-Plex-Container-Size": 0,
                                    },
                                )
                                if shows_response.status_code == 200:
                                    shows_data = shows_response.json()
                                    total_tv_shows += shows_data.get(
                                        "MediaContainer", {}
                                    ).get("totalSize", 0)
                            except Exception as e:
                                logger.warning(
                                    f"Could not fetch TV show count for section {section_key}: {e}"
                                )
            except Exception as e:
                logger.warning(f"Could not fetch library sections: {e}")

    except Exception as e:
        logger.error(f"Error fetching Plex statistics: {e}")

    return total_users, total_movies, total_tv_shows


async def validate_plex_connection(
    url: str, token: str
) -> tuple[bool, Optional[str], Optional[str], int, int, int]:
    """
    Validate Plex server connection
    Returns: (is_valid, error_message, server_name, total_users, total_movies, total_tv_shows)
    """
    try:
        # Clean up URL - remove trailing slash
        url = url.rstrip("/")

        # Test connection to Plex server
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {"X-Plex-Token": token, "Accept": "application/json"}

            response = await client.get(f"{url}/", headers=headers)

            if response.status_code == 200:
                data = response.json()
                server_name = data.get("MediaContainer", {}).get(
                    "friendlyName", "Plex Server"
                )
                logger.info(f"Successfully connected to Plex server: {server_name}")

                # Fetch statistics
                total_users, total_movies, total_tv_shows = await fetch_plex_statistics(
                    url, token
                )

                return (
                    True,
                    None,
                    server_name,
                    total_users,
                    total_movies,
                    total_tv_shows,
                )
            elif response.status_code == 401:
                return False, "Invalid Plex token", None, 0, 0, 0
            else:
                return (
                    False,
                    f"Server returned status code: {response.status_code}",
                    None,
                    0,
                    0,
                    0,
                )

    except httpx.TimeoutException:
        return False, "Connection timeout - server not reachable", None, 0, 0, 0
    except httpx.ConnectError:
        return False, "Could not connect to server - check URL", None, 0, 0, 0
    except Exception as e:
        logger.error(f"Error validating Plex connection: {e}")
        return False, str(e), None, 0, 0, 0


@router.get("/users/count")
async def get_plex_users_count():
    """Get count of Plex server shared users via plex.tv API"""
    try:
        config = load_plex_config()
        if not config or not config.get("url") or not config.get("token"):
            return {"count": 0}

        url = config["url"].rstrip("/")
        token = config["token"]

        async with httpx.AsyncClient(timeout=30.0) as client:
            # First, get the server's machine identifier
            try:
                identity_response = await client.get(
                    f"{url}/identity",
                    headers={"X-Plex-Token": token, "Accept": "application/json"},
                )

                logger.info(
                    f"Identity response status: {identity_response.status_code}"
                )

                if identity_response.status_code == 200:
                    identity_data = identity_response.json()
                    machine_identifier = identity_data.get("MediaContainer", {}).get(
                        "machineIdentifier"
                    )

                    if not machine_identifier:
                        logger.warning("Could not get Plex server machine identifier")
                        return {"count": 0}

                    logger.info(f"Plex server machine identifier: {machine_identifier}")

                    # Now use plex.tv API to get shared servers
                    shared_url = f"https://plex.tv/api/servers/{machine_identifier}/shared_servers"
                    logger.info(f"Calling plex.tv API: {shared_url}")

                    shared_response = await client.get(
                        shared_url,
                        params={"X-Plex-Token": token},
                    )

                    logger.info(
                        f"Shared servers response status: {shared_response.status_code}"
                    )

                    if shared_response.status_code == 200:
                        # Parse XML response
                        import xml.etree.ElementTree as ET

                        try:
                            root = ET.fromstring(shared_response.text)

                            # Count SharedServer elements
                            shared_servers = root.findall("SharedServer")
                            user_count = len(shared_servers)

                            logger.info(f"Plex shared users count: {user_count}")
                            return {"count": user_count}

                        except Exception as xml_error:
                            logger.error(f"Failed to parse XML response: {xml_error}")
                            return {"count": 0}
                    else:
                        logger.warning(
                            f"plex.tv shared_servers returned status {shared_response.status_code}: {shared_response.text}"
                        )

            except Exception as e:
                logger.error(f"Failed to fetch Plex shared users: {e}")

            return {"count": 0}
    except Exception as e:
        logger.error(f"Error fetching Plex users count: {e}")
        return {"count": 0}


@router.get("/config")
async def get_plex_config():
    """Get current Plex configuration"""
    config = load_plex_config()
    if config:
        return {
            "url": config.get("url", ""),
            "token": config.get("token", ""),
            "server_name": config.get("server_name", ""),
            "total_users": config.get("total_users", 0),
            "total_movies": config.get("total_movies", 0),
            "total_tv_shows": config.get("total_tv_shows", 0),
        }
    return {
        "url": "",
        "token": "",
        "server_name": "",
        "total_users": 0,
        "total_movies": 0,
        "total_tv_shows": 0,
    }


@router.post("/config")
async def save_plex_configuration(config: PlexConfig):
    """Save Plex configuration"""
    try:
        # Validate the configuration first
        is_valid, error_msg, server_name, total_users, total_movies, total_tv_shows = (
            await validate_plex_connection(config.url.rstrip("/"), config.token)
        )

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg or "Invalid Plex configuration",
            )

        config_data = {
            "url": config.url.rstrip("/"),
            "token": config.token,
        }

        if save_plex_config(
            config_data, server_name, total_users, total_movies, total_tv_shows
        ):
            logger.info("Plex configuration saved successfully to database")
            return {
                "status": "success",
                "message": "Configuration saved",
                "server_name": server_name,
                "total_users": total_users,
                "total_movies": total_movies,
                "total_tv_shows": total_tv_shows,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save configuration",
            )
    except Exception as e:
        logger.error(f"Error saving Plex configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/validate", response_model=PlexValidateResponse)
async def validate_plex(request: PlexValidateRequest):
    """Validate Plex server connection and save server name and statistics"""
    is_valid, error_msg, server_name, total_users, total_movies, total_tv_shows = (
        await validate_plex_connection(request.url, request.token)
    )

    if is_valid:
        # Save the server name and statistics to database when validation succeeds
        config_data = {
            "url": request.url.rstrip("/"),
            "token": request.token,
        }
        save_plex_config(
            config_data, server_name, total_users, total_movies, total_tv_shows
        )

        return PlexValidateResponse(
            valid=True,
            message=f"Successfully connected to {server_name} ({total_users} users, {total_movies} movies, {total_tv_shows} TV shows)",
            server_name=server_name,
        )
    else:
        return PlexValidateResponse(
            valid=False, message=error_msg or "Connection failed"
        )


@router.get("/debug/raw-activities")
async def debug_raw_activities():
    """Debug endpoint to see raw Plex API response"""
    config = load_plex_config()

    if not config:
        return {"error": "No config found"}

    try:
        url = config.get("url", "").rstrip("/")
        token = config.get("token", "")

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"X-Plex-Token": token, "Accept": "application/json"}

            results = {}

            # Check /activities endpoint
            try:
                response = await client.get(f"{url}/activities", headers=headers)
                results["activities_endpoint"] = {
                    "status": response.status_code,
                    "data": (
                        response.json()
                        if response.status_code == 200
                        else response.text
                    ),
                }
            except Exception as e:
                results["activities_endpoint"] = {"error": str(e)}

            # Check /status/sessions endpoint
            try:
                response = await client.get(f"{url}/status/sessions", headers=headers)
                results["sessions_endpoint"] = {
                    "status": response.status_code,
                    "data": (
                        response.json()
                        if response.status_code == 200
                        else response.text
                    ),
                }
            except Exception as e:
                results["sessions_endpoint"] = {"error": str(e)}

            return results

    except Exception as e:
        return {"error": str(e)}


@router.get("/activities")
async def get_plex_activities():
    """Get current Plex download/sync activities"""
    config = load_plex_config()

    if not config:
        logger.warning("Plex not configured - no config file found")
        return {"error": True, "message": "Plex not configured", "activities": []}

    try:
        url = config.get("url", "").rstrip("/")
        token = config.get("token", "")

        logger.info(f"Fetching Plex activities from: {url}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"X-Plex-Token": token, "Accept": "application/json"}

            # Try multiple endpoints to get activities
            activities = []

            # 1. Check for background activities (downloads, sync)
            try:
                logger.info(f"Checking /activities endpoint...")
                activities_response = await client.get(
                    f"{url}/activities", headers=headers
                )
                logger.info(
                    f"Activities endpoint status: {activities_response.status_code}"
                )

                if activities_response.status_code == 200:
                    activities_data = activities_response.json()
                    logger.info(
                        f"Activities response: {json.dumps(activities_data, indent=2)}"
                    )

                    plex_activities = activities_data.get("MediaContainer", {}).get(
                        "Activity", []
                    )
                    logger.info(
                        f"Found {len(plex_activities)} activities from /activities endpoint"
                    )

                    for activity in plex_activities:
                        processed_activity = {
                            "uuid": activity.get("uuid", ""),
                            "title": activity.get("title", "Unknown"),
                            "subtitle": activity.get("subtitle", ""),
                            "type": activity.get("type", "download"),
                            "progress": float(activity.get("progress", 0)),
                            "raw_data": activity,
                        }
                        activities.append(processed_activity)
            except Exception as e:
                logger.error(f"Error fetching /activities: {e}")

            # 2. Check for active sessions (streams/transcodes)
            try:
                logger.info(f"Checking /status/sessions endpoint...")
                sessions_response = await client.get(
                    f"{url}/status/sessions", headers=headers
                )
                logger.info(
                    f"Sessions endpoint status: {sessions_response.status_code}"
                )

                if sessions_response.status_code == 200:
                    sessions_data = sessions_response.json()
                    logger.info(
                        f"Sessions response keys: {sessions_data.get('MediaContainer', {}).keys()}"
                    )

                    sessions = sessions_data.get("MediaContainer", {}).get(
                        "Metadata", []
                    )
                    logger.info(
                        f"Found {len(sessions)} sessions from /status/sessions endpoint"
                    )

                    for session in sessions:
                        # Determine activity type
                        activity_type = "stream"
                        if session.get("TranscodeSession"):
                            activity_type = "transcode"

                        # Get progress percentage
                        view_offset = int(session.get("viewOffset", 0))
                        duration = int(session.get("duration", 1))
                        progress = (view_offset / duration * 100) if duration > 0 else 0

                        # Check if paused
                        player = session.get("Player", {})
                        if player.get("state") == "paused":
                            activity_type = "pause"

                        activity = {
                            "uuid": session.get("sessionKey", session.get("key", "")),
                            "title": session.get(
                                "grandparentTitle", session.get("title", "Unknown")
                            ),
                            "subtitle": session.get("title", "Unknown"),
                            "type": activity_type,
                            "progress": round(progress, 2),
                            "raw_data": session,
                        }

                        activities.append(activity)
            except Exception as e:
                logger.error(f"Error fetching /status/sessions: {e}")

            logger.info(f"Total activities retrieved: {len(activities)}")
            return {"error": False, "activities": activities}

    except Exception as e:
        logger.error(f"Error fetching Plex activities: {e}", exc_info=True)
        return {"error": True, "message": str(e), "activities": []}


@router.get("/stats", response_model=PlexStats)
async def get_plex_stats():
    """Get Plex statistics including peak concurrent activities"""
    try:
        session = db.get_session()
        try:
            # Get the first (and only) stats record
            stats = session.query(PlexStatsDB).first()

            if not stats:
                # Create initial stats record
                stats = PlexStatsDB(peak_concurrent=0, last_updated=None)
                session.add(stats)
                session.commit()
                session.refresh(stats)

            return PlexStats(
                peak_concurrent=stats.peak_concurrent,  # type: ignore
                last_updated=stats.last_updated.isoformat() if stats.last_updated else None,  # type: ignore
                server_url=stats.server_url,  # type: ignore
                server_name=stats.server_name,  # type: ignore
                token_configured=bool(stats.server_url and stats.server_token),  # type: ignore
                total_users=stats.total_users or 0,  # type: ignore
                total_movies=stats.total_movies or 0,  # type: ignore
                total_tv_shows=stats.total_tv_shows or 0,  # type: ignore
            )
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error getting Plex stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving Plex statistics: {str(e)}",
        )


@router.post("/stats/peak")
async def update_peak_concurrent(request: UpdatePeakRequest):
    """Update peak concurrent activities count"""
    try:
        session = db.get_session()
        try:
            # Get or create stats record
            stats = session.query(PlexStatsDB).first()

            if not stats:
                stats = PlexStatsDB(
                    peak_concurrent=request.peak_concurrent,
                    last_updated=datetime.now(timezone.utc).replace(tzinfo=None),
                )
                session.add(stats)
            else:
                # Only update if new value is higher
                if request.peak_concurrent > stats.peak_concurrent:  # type: ignore
                    stats.peak_concurrent = request.peak_concurrent  # type: ignore
                    stats.last_updated = datetime.now(timezone.utc).replace(tzinfo=None)  # type: ignore

            session.commit()
            session.refresh(stats)

            return {
                "success": True,
                "peak_concurrent": stats.peak_concurrent,  # type: ignore
                "last_updated": stats.last_updated.isoformat() if stats.last_updated else None,  # type: ignore
            }
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error updating peak concurrent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating peak concurrent: {str(e)}",
        )


@router.post("/stats/reset")
async def reset_peak_concurrent():
    """Reset peak concurrent activities count to 0"""
    try:
        session = db.get_session()
        try:
            stats = session.query(PlexStatsDB).first()

            if stats:
                stats.peak_concurrent = 0  # type: ignore
                stats.last_updated = datetime.now(timezone.utc).replace(tzinfo=None)  # type: ignore
                session.commit()
                session.refresh(stats)

            return {
                "success": True,
                "peak_concurrent": 0,
                "last_updated": stats.last_updated.isoformat() if stats else None,  # type: ignore
            }
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error resetting peak concurrent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting peak concurrent: {str(e)}",
        )


@router.get("/media/recent")
async def get_recent_media():
    """Get recent media items with posters from Plex server"""
    try:
        config = load_plex_config()
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plex server not configured",
            )

        url = config["url"]
        token = config["token"]

        async with httpx.AsyncClient() as client:
            headers = {"X-Plex-Token": token, "Accept": "application/json"}

            # Get library sections first
            sections_response = await client.get(
                f"{url}/library/sections", headers=headers
            )

            if sections_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to fetch library sections",
                )

            sections_data = sections_response.json()
            sections = sections_data.get("MediaContainer", {}).get("Directory", [])

            media_items = []

            # Get recently added items from both movie and TV sections
            for section in sections:
                section_key = section.get("key")
                section_type = section.get("type")

                # Process both movie and show sections
                if section_type in ["movie", "show"]:
                    try:
                        # Get recently added items
                        recent_response = await client.get(
                            f"{url}/library/sections/{section_key}/recentlyAdded",
                            headers=headers,
                            params={"X-Plex-Container-Size": 30},
                        )

                        if recent_response.status_code == 200:
                            recent_data = recent_response.json()
                            metadata = recent_data.get("MediaContainer", {}).get(
                                "Metadata", []
                            )

                            for item in metadata:
                                poster = item.get("thumb")
                                if poster:
                                    # Convert Plex path to full URL
                                    poster_url = f"{url}{poster}?X-Plex-Token={token}"
                                    media_items.append(
                                        {
                                            "title": item.get("title", "Unknown"),
                                            "type": section_type,
                                            "year": item.get("year"),
                                            "poster": poster_url,
                                            "rating": item.get("rating"),
                                        }
                                    )
                    except Exception as e:
                        logger.warning(
                            f"Could not fetch movies from section {section_key}: {e}"
                        )
                        continue

            return {"media": media_items[:30]}  # Return max 30 items

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching recent media: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recent media: {str(e)}",
        )


@router.get("/proxy/image")
async def proxy_plex_image(url: str):
    """
    Proxy Plex images to avoid SSL certificate issues when accessing via HTTPS domain.
    Fetches the image from Plex server and returns it through the backend.
    """
    try:
        # Get Plex config to verify SSL settings
        session = db.get_session()
        try:
            config = session.query(PlexStatsDB).first()
            if not config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Plex server not configured",
                )
        finally:
            session.close()

        # Fetch image from Plex server with SSL verification disabled
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()

            # Determine content type from response headers
            content_type = response.headers.get("content-type", "image/jpeg")

            # Return image as streaming response
            return StreamingResponse(
                iter([response.content]),
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
                },
            )
    except httpx.HTTPStatusError as e:
        logger.error(f"Error fetching Plex image: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Error fetching image from Plex: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error proxying Plex image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error proxying image: {str(e)}",
        )
