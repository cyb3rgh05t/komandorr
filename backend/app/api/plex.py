from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
import httpx
import json
import shutil
from pathlib import Path
from typing import Optional, cast, Dict, Any
from datetime import datetime, timezone, timedelta

from app.utils.logger import logger
from app.database import db, PlexStatsDB

router = APIRouter(prefix="/api/plex", tags=["plex"])

# Module-level cache for Plex activities
_activity_cache: Dict[str, Any] = {
    "data": None,
    "last_fetched": None,
    "ttl_seconds": 5,
    "hits": 0,
    "misses": 0,
}

# Module-level cache for watch history
_watch_history_cache: Dict[str, Any] = {
    "data": None,
    "last_fetched": None,
    "ttl_seconds": 300,  # 5 minutes cache for watch history
    "hits": 0,
    "misses": 0,
}


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
    """Load Plex configuration from config.json (via settings)"""
    try:
        from app.config import settings

        if settings.PLEX_SERVER_URL and settings.PLEX_SERVER_TOKEN:
            logger.debug(
                f"Loaded Plex config from config.json: {settings.PLEX_SERVER_URL}"
            )
            return {
                "url": settings.PLEX_SERVER_URL,
                "token": settings.PLEX_SERVER_TOKEN,
                "server_name": settings.PLEX_SERVER_NAME,
            }
        else:
            logger.debug("No Plex config found in config.json")
    except Exception as e:
        logger.error(f"Error loading Plex config: {e}")
    return None


def save_plex_config(
    config: dict,
    server_name: Optional[str] = None,
) -> bool:
    """Save Plex configuration to config.json"""
    try:
        from pathlib import Path
        import json

        config_path = Path(__file__).parent.parent.parent / "data" / "config.json"

        # Load existing config
        config_data = {}
        if config_path.exists():
            with open(config_path, "r") as f:
                config_data = json.load(f)

        # Update plex section
        config_data["plex"] = {
            "server_url": config["url"],
            "server_token": config["token"],
            "server_name": server_name or "Plex Server",
        }

        # Save back to file
        with open(config_path, "w") as f:
            json.dump(config_data, f, indent=2)

        # Update runtime settings
        from app.config import settings

        settings.PLEX_SERVER_URL = config["url"]
        settings.PLEX_SERVER_TOKEN = config["token"]
        settings.PLEX_SERVER_NAME = server_name or "Plex Server"

        logger.info(f"Plex configuration saved to config.json")
        return True
    except Exception as e:
        logger.error(f"Error saving Plex config: {e}")
        return False


def migrate_plex_config_if_needed() -> None:
    """Migrate Plex config from database to config.json if needed"""
    try:
        from app.config import settings

        # Check if config.json already has Plex config
        if settings.PLEX_SERVER_URL and settings.PLEX_SERVER_TOKEN:
            logger.debug("Plex config already exists in config.json")
            return

        # Check if database has old config
        session = db.get_session()
        try:
            stats = session.query(PlexStatsDB).first()
            has_db_config = stats and hasattr(stats, "server_url") and stats.server_url and hasattr(stats, "server_token") and stats.server_token  # type: ignore

            if not has_db_config:
                logger.debug("No Plex config found in database to migrate")
                return

            # Migrate to config.json
            logger.info("Migrating Plex config from database to config.json...")

            config = {
                "url": stats.server_url,  # type: ignore
                "token": stats.server_token,  # type: ignore
            }
            server_name = getattr(stats, "server_name", "Plex Server")  # type: ignore

            if save_plex_config(config, server_name):
                logger.info("Plex config migration completed successfully")
            else:
                logger.error("Failed to migrate Plex config")

        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error during Plex config migration: {e}")
        import traceback

        logger.error(traceback.format_exc())


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


async def fetch_plex_episode_count(url: str, token: str) -> int:
    """
    Fetch total episode count from Plex server
    Returns: total_episodes
    """
    total_episodes = 0

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {"X-Plex-Token": token, "Accept": "application/json"}

            # Fetch library sections
            sections_response = await client.get(
                f"{url}/library/sections", headers=headers
            )
            if sections_response.status_code == 200:
                sections_data = sections_response.json()
                sections = sections_data.get("MediaContainer", {}).get("Directory", [])

                for section in sections:
                    section_key = section.get("key")
                    section_type = section.get("type")

                    if section_type == "show":
                        # Get episode count for this TV library
                        try:
                            episodes_response = await client.get(
                                f"{url}/library/sections/{section_key}/allLeaves",
                                headers=headers,
                                params={
                                    "X-Plex-Container-Start": 0,
                                    "X-Plex-Container-Size": 0,
                                },
                            )
                            if episodes_response.status_code == 200:
                                episodes_data = episodes_response.json()
                                total_episodes += episodes_data.get(
                                    "MediaContainer", {}
                                ).get("totalSize", 0)
                        except Exception as e:
                            logger.warning(
                                f"Could not fetch episode count for section {section_key}: {e}"
                            )
    except Exception as e:
        logger.warning(f"Could not fetch episode counts: {e}")

    return total_episodes


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

        if save_plex_config(config_data, server_name):
            logger.info("Plex configuration saved successfully to config.json")
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
        # Save the server name to config.json when validation succeeds
        config_data = {
            "url": request.url.rstrip("/"),
            "token": request.token,
        }
        save_plex_config(config_data, server_name)

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
    """Get current Plex download/sync activities with caching"""
    config = load_plex_config()

    if not config:
        logger.warning("Plex not configured - no config file found")
        return {"error": True, "message": "Plex not configured", "activities": []}

    # Check cache first
    now = datetime.now()
    if (
        _activity_cache["data"] is not None
        and _activity_cache["last_fetched"] is not None
    ):

        elapsed = (now - _activity_cache["last_fetched"]).total_seconds()
        if elapsed < _activity_cache["ttl_seconds"]:
            _activity_cache["hits"] += 1
            logger.debug(f"Returning cached activities (age: {elapsed:.1f}s)")
            cached_response = _activity_cache["data"].copy()
            cached_response["cached"] = True
            cached_response["cache_age"] = elapsed
            return cached_response

    # Cache miss - fetch fresh data
    _activity_cache["misses"] += 1
    logger.info("Fetching fresh Plex activities from server")

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
                logger.debug(f"Checking /activities endpoint...")
                activities_response = await client.get(
                    f"{url}/activities", headers=headers
                )
                logger.debug(
                    f"Activities endpoint status: {activities_response.status_code}"
                )

                if activities_response.status_code == 200:
                    activities_data = activities_response.json()
                    logger.debug(
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
                logger.debug(f"Checking /status/sessions endpoint...")
                sessions_response = await client.get(
                    f"{url}/status/sessions", headers=headers
                )
                logger.debug(
                    f"Sessions endpoint status: {sessions_response.status_code}"
                )

                if sessions_response.status_code == 200:
                    sessions_data = sessions_response.json()
                    logger.debug(
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

            # Build response
            response = {
                "error": False,
                "activities": activities,
                "cached": False,
                "timestamp": now.isoformat(),
            }

            # Update cache
            _activity_cache["data"] = response
            _activity_cache["last_fetched"] = now

            return response

    except Exception as e:
        logger.error(f"Error fetching Plex activities: {e}", exc_info=True)
        # Return cached data if available, even if stale
        if _activity_cache["data"]:
            logger.warning("Returning stale cache due to fetch error")
            stale_response = _activity_cache["data"].copy()
            stale_response["cached"] = True
            stale_response["stale"] = True
            return stale_response
        return {"error": True, "message": str(e), "activities": []}


@router.get("/stats", response_model=PlexStats)
async def get_plex_stats():
    """Get Plex statistics including peak concurrent activities"""
    try:
        # Load config from config.json
        plex_config = load_plex_config()

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

            # Fetch live statistics from Plex
            total_users = 0
            total_movies = 0
            total_tv_shows = 0

            if plex_config and plex_config.get("url") and plex_config.get("token"):
                try:
                    total_users, total_movies, total_tv_shows = (
                        await fetch_plex_statistics(
                            plex_config["url"], plex_config["token"]
                        )
                    )
                except Exception as e:
                    logger.warning(f"Failed to fetch live Plex stats: {e}")

            return PlexStats(
                peak_concurrent=stats.peak_concurrent,  # type: ignore
                last_updated=stats.last_updated.isoformat() if stats.last_updated else None,  # type: ignore
                server_url=plex_config.get("url", "") if plex_config else "",
                server_name=(
                    plex_config.get("server_name", "Plex Server")
                    if plex_config
                    else "Plex Server"
                ),
                token_configured=bool(
                    plex_config and plex_config.get("url") and plex_config.get("token")
                ),
                total_users=total_users,
                total_movies=total_movies,
                total_tv_shows=total_tv_shows,
            )
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Error getting Plex stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving Plex statistics: {str(e)}",
        )


@router.get("/stats/live")
async def get_live_plex_stats():
    """Get live Plex statistics by fetching directly from Plex server"""
    try:
        config = load_plex_config()
        if not config:
            return {
                "total_users": 0,
                "total_movies": 0,
                "total_tv_shows": 0,
                "total_episodes": 0,
                "server_name": "Plex Server",
                "error": "Plex not configured",
            }

        total_users, total_movies, total_tv_shows = await fetch_plex_statistics(
            config["url"], config["token"]
        )

        # Fetch episode count
        total_episodes = await fetch_plex_episode_count(config["url"], config["token"])

        # Get server name
        server_name = config.get("server_name", "Plex Server")

        return {
            "total_users": total_users,
            "total_movies": total_movies,
            "total_tv_shows": total_tv_shows,
            "total_episodes": total_episodes,
            "server_name": server_name,
        }
    except Exception as e:
        logger.error(f"Error getting live Plex stats: {e}")
        return {
            "total_users": 0,
            "total_movies": 0,
            "total_tv_shows": 0,
            "total_episodes": 0,
            "server_name": "Plex Server",
            "error": str(e),
        }


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
        async with httpx.AsyncClient(
            verify=False, timeout=10.0, follow_redirects=True
        ) as client:
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


@router.get("/sessions")
async def get_plex_sessions():
    """
    Get live Plex sessions (currently streaming users)
    Similar to Wizarr's activity monitoring
    """
    try:
        plex_config = load_plex_config()

        if (
            not plex_config
            or not plex_config.get("url")
            or not plex_config.get("token")
        ):
            return {
                "error": False,
                "sessions": [],
                "message": "Plex server not configured",
            }

        url = plex_config["url"]
        token = plex_config["token"]

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            headers = {"X-Plex-Token": token, "Accept": "application/json"}

            # Fetch active sessions
            sessions_response = await client.get(
                f"{url}/status/sessions", headers=headers
            )

            if sessions_response.status_code != 200:
                logger.warning(
                    f"Failed to fetch sessions: {sessions_response.status_code}"
                )
                return {"error": False, "sessions": [], "message": "No active sessions"}

            sessions_data = sessions_response.json()
            raw_sessions = sessions_data.get("MediaContainer", {}).get("Metadata", [])

            processed_sessions = []

            for session in raw_sessions:
                # Extract user information
                user_info = session.get("User", {})
                user_name = user_info.get("title", "Unknown User")
                user_id = user_info.get("id", "")
                user_thumb = user_info.get("thumb", "")

                # Extract media information
                media_type = session.get("type", "unknown")
                media_title = session.get("title", "Unknown")
                rating_key = session.get("ratingKey", "")
                grandparent_rating_key = session.get("grandparentRatingKey", "")

                # For TV shows, include series info and fetch show poster
                if media_type == "episode":
                    series_title = session.get("grandparentTitle", "")
                    season_num = session.get("parentIndex", 0)
                    episode_num = session.get("index", 0)
                    full_title = f"{series_title} - S{season_num:02d}E{episode_num:02d} - {media_title}"

                    # Fetch the show's metadata to get the poster
                    show_thumb = None
                    if grandparent_rating_key:
                        try:
                            logger.info(
                                f"Fetching show metadata for grandparent key: {grandparent_rating_key}"
                            )
                            show_metadata_response = await client.get(
                                f"{url}/library/metadata/{grandparent_rating_key}",
                                headers=headers,
                            )
                            logger.info(
                                f"Show metadata response status: {show_metadata_response.status_code}"
                            )
                            if show_metadata_response.status_code == 200:
                                show_data = show_metadata_response.json()
                                show_metadata = show_data.get("MediaContainer", {}).get(
                                    "Metadata", [{}]
                                )[0]
                                show_thumb = show_metadata.get("thumb", "")
                                logger.info(f"Show thumb retrieved: {show_thumb}")
                        except Exception as e:
                            logger.warning(f"Failed to fetch show metadata: {e}")
                    else:
                        logger.warning(
                            f"No grandparent_rating_key found for episode: {full_title}"
                        )
                else:
                    full_title = media_title
                    show_thumb = None

                # Extract playback information
                view_offset = int(session.get("viewOffset", 0))
                duration = int(session.get("duration", 1))
                progress = (view_offset / duration * 100) if duration > 0 else 0

                # Extract player/device information
                player = session.get("Player", {})
                state = player.get(
                    "state", "stopped"
                )  # playing, paused, buffering, stopped
                device_name = player.get("device", "Unknown Device")
                client_name = player.get("product", "Unknown Client")
                platform = player.get("platform", "Unknown")

                # Extract transcode information
                transcode_session = session.get("TranscodeSession", {})
                is_transcoding = bool(transcode_session)
                transcode_speed = None
                video_decision = None
                audio_decision = None

                if is_transcoding:
                    transcode_speed = transcode_session.get("speed", 0)
                    video_decision = transcode_session.get("videoDecision", "copy")
                    audio_decision = transcode_session.get("audioDecision", "copy")
                    # Only consider it transcoding if not direct play/stream
                    is_transcoding = (
                        video_decision == "transcode" or audio_decision == "transcode"
                    )

                # Extract media details
                media = session.get("Media", [{}])[0] if session.get("Media") else {}
                video_resolution = media.get("videoResolution", "Unknown")
                video_codec = media.get("videoCodec", "Unknown")
                audio_codec = media.get("audioCodec", "Unknown")
                container = media.get("container", "Unknown")
                bitrate = media.get("bitrate", 0)

                # Extract artwork
                thumb = session.get("thumb", "")
                art = session.get("art", "")

                # For TV episodes, use the fetched show poster and art
                if media_type == "episode" and show_thumb:
                    artwork_path = show_thumb
                    # Also try to get show art from the fetched metadata
                    show_art = None
                    if grandparent_rating_key:
                        try:
                            show_metadata_response = await client.get(
                                f"{url}/library/metadata/{grandparent_rating_key}",
                                headers=headers,
                            )
                            if show_metadata_response.status_code == 200:
                                show_data = show_metadata_response.json()
                                show_metadata = show_data.get("MediaContainer", {}).get(
                                    "Metadata", [{}]
                                )[0]
                                show_art = show_metadata.get("art", "")
                        except Exception as e:
                            logger.warning(f"Failed to fetch show art: {e}")
                    art_path = show_art if show_art else art
                else:
                    artwork_path = thumb or art
                    art_path = art

                # Force HTTP for image URLs if using HTTPS with IP address to avoid cert errors
                image_url = url
                if image_url.startswith("https://"):
                    # Extract hostname/IP from URL
                    hostname = image_url.split("://")[1].split(":")[0].split("/")[0]
                    # Check if it's an IP address (contains only digits and dots)
                    if hostname.replace(".", "").isdigit():
                        image_url = image_url.replace("https://", "http://")
                        logger.info(
                            f"Converting HTTPS to HTTP for IP-based Plex server: {hostname}"
                        )

                artwork_url = (
                    f"{image_url}{artwork_path}?X-Plex-Token={token}"
                    if artwork_path
                    else None
                )

                art_url = (
                    f"{image_url}{art_path}?X-Plex-Token={token}" if art_path else None
                )

                # Extract location/IP if available
                session_location = session.get("Session", {})
                location = session_location.get("location", "wan")  # lan or wan
                bandwidth = session_location.get("bandwidth", 0)

                processed_session = {
                    "session_id": session.get("sessionKey", ""),
                    "user": {
                        "name": user_name,
                        "id": user_id,
                        "thumb": (
                            f"{user_thumb}&X-Plex-Token={token}"
                            if user_thumb and user_thumb.startswith("http")
                            else (
                                f"{image_url}{user_thumb}?X-Plex-Token={token}"
                                if user_thumb
                                else None
                            )
                        ),
                    },
                    "media": {
                        "title": full_title,
                        "type": media_type,
                        "year": session.get("year", None),
                        "rating": session.get("rating", None),
                        "thumb": artwork_url,
                        "art": art_url,
                    },
                    "playback": {
                        "state": state,
                        "progress": round(progress, 2),
                        "position_ms": view_offset,
                        "duration_ms": duration,
                    },
                    "device": {
                        "name": device_name,
                        "client": client_name,
                        "platform": platform,
                    },
                    "transcode": {
                        "is_transcoding": is_transcoding,
                        "speed": transcode_speed,
                        "video_decision": video_decision,
                        "audio_decision": audio_decision,
                    },
                    "stream": {
                        "video_resolution": video_resolution,
                        "video_codec": video_codec,
                        "audio_codec": audio_codec,
                        "container": container,
                        "bitrate": bitrate,
                        "location": location,
                        "bandwidth": bandwidth,
                    },
                }

                processed_sessions.append(processed_session)

            return {
                "error": False,
                "sessions": processed_sessions,
                "total": len(processed_sessions),
            }

    except Exception as e:
        logger.error(f"Error fetching Plex sessions: {e}")
        return {"error": True, "message": str(e), "sessions": []}


@router.get("/watch-history")
async def get_watch_history():
    """Get watch history from database (fast) with caching - synced by background task"""
    from app.database import db, WatchHistoryDB

    # Check cache first
    now = datetime.now()
    if (
        _watch_history_cache["data"] is not None
        and _watch_history_cache["last_fetched"] is not None
    ):

        elapsed = (now - _watch_history_cache["last_fetched"]).total_seconds()
        if elapsed < _watch_history_cache["ttl_seconds"]:
            _watch_history_cache["hits"] += 1
            logger.debug(f"Returning cached watch history (age: {elapsed:.1f}s)")
            return _watch_history_cache["data"]

    # Cache miss - fetch from database
    _watch_history_cache["misses"] += 1
    logger.info("Fetching watch history from database")

    try:
        session = db.get_session()
        try:
            # Query all watch history from database
            history_items = (
                session.query(WatchHistoryDB)
                .order_by(WatchHistoryDB.viewed_at.desc())
                .limit(500)  # Limit to last 500 items
                .all()
            )

            watch_history = []
            for item in history_items:
                # Parse genres back to list
                genres = []
                if item.genres:
                    genres = item.genres.split(",")

                # Get progress value and ensure it's a float for type checking
                progress_value = 0.0
                if item.progress is not None:
                    progress_value = float(cast(float, item.progress))

                # Convert direct Plex thumbnail URL to proxy URL to avoid SSL issues
                thumb_url = None
                if item.thumb:
                    # Ensure thumb is a string value, not a Column object
                    thumb_value = str(item.thumb) if item.thumb else None
                    # If it's already a full URL with the Plex server, proxy it
                    if thumb_value and thumb_value.startswith("http"):
                        from urllib.parse import quote

                        thumb_url = f"/api/plex/proxy/image?url={quote(thumb_value)}"
                    else:
                        thumb_url = thumb_value

                watch_history.append(
                    {
                        "user_id": item.user_id,
                        "email": item.username
                        or item.email,  # Use username as display name
                        "type": item.type,
                        "title": item.title,
                        "grandparent_title": item.grandparent_title,
                        "parent_index": item.parent_index,
                        "index": item.index,
                        "viewed_at": (
                            item.viewed_at.isoformat() if item.viewed_at else None
                        ),
                        "duration": item.duration,  # already in seconds
                        "view_offset": item.view_offset,  # already in seconds
                        "progress": round(progress_value, 2),
                        "view_count": item.view_count,
                        "rating": item.rating,
                        "year": item.year,
                        "thumb": thumb_url,
                        "content_rating": item.content_rating,
                        "studio": item.studio,
                        "summary": item.summary,
                        "genres": genres,
                    }
                )

            logger.info(
                f"Returned {len(watch_history)} watch history items from database"
            )

            # Update cache
            _watch_history_cache["data"] = watch_history
            _watch_history_cache["last_fetched"] = now

            return watch_history

        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error fetching watch history from database: {e}")
        # Return cached data if available, even if stale
        if _watch_history_cache["data"]:
            logger.warning("Returning stale watch history cache due to error")
            return _watch_history_cache["data"]
        return []


@router.post("/watch-history/sync")
async def sync_watch_history_now():
    """Manually trigger watch history sync (admin only)"""
    from app.services.watch_history_sync import watch_history_sync

    try:
        await watch_history_sync.sync_watch_history()
        # Invalidate cache after sync
        _watch_history_cache["data"] = None
        _watch_history_cache["last_fetched"] = None
        return {"success": True, "message": "Watch history sync completed"}
    except Exception as e:
        logger.error(f"Error during manual sync: {e}")
        return {"success": False, "message": str(e)}


@router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics for monitoring performance"""
    now = datetime.now()

    def calculate_stats(cache: Dict[str, Any], name: str) -> dict:
        """Calculate statistics for a cache"""
        hits = cache.get("hits", 0)
        misses = cache.get("misses", 0)
        total = hits + misses
        hit_rate = (hits / total * 100) if total > 0 else 0

        cache_age = None
        if cache.get("last_fetched"):
            cache_age = (now - cache["last_fetched"]).total_seconds()

        return {
            "name": name,
            "hits": hits,
            "misses": misses,
            "total_requests": total,
            "hit_rate": f"{hit_rate:.1f}%",
            "ttl_seconds": cache.get("ttl_seconds", 0),
            "cached": cache.get("data") is not None,
            "cache_age_seconds": round(cache_age, 1) if cache_age else None,
        }

    # Get stats cache info
    from app.services.stats_cache import stats_cache

    stats_cache_info = {
        "name": "background_stats",
        "enabled": stats_cache.running,
        "last_update": (
            stats_cache.last_update.isoformat() if stats_cache.last_update else None
        ),
        "update_interval": stats_cache.update_interval,
    }

    # Get Redis cache info if available
    redis_info = None
    try:
        from app.services.redis_cache import redis_cache

        redis_info = redis_cache.get_stats()
    except Exception as e:
        logger.debug(f"Redis cache not available: {e}")

    response = {
        "caches": [
            calculate_stats(_activity_cache, "plex_activities"),
            calculate_stats(_watch_history_cache, "watch_history"),
            stats_cache_info,
        ],
        "timestamp": now.isoformat(),
    }

    if redis_info:
        response["redis"] = redis_info

    return response


@router.post("/cache/clear")
async def clear_caches():
    """Clear all caches (admin only)"""
    try:
        # Clear in-memory caches
        _activity_cache["data"] = None
        _activity_cache["last_fetched"] = None
        _activity_cache["hits"] = 0
        _activity_cache["misses"] = 0

        _watch_history_cache["data"] = None
        _watch_history_cache["last_fetched"] = None
        _watch_history_cache["hits"] = 0
        _watch_history_cache["misses"] = 0

        # Force refresh stats cache
        from app.services.stats_cache import stats_cache

        await stats_cache.force_refresh()

        # Clear Redis cache if available
        redis_cleared = False
        try:
            from app.services.redis_cache import cache_clear

            redis_cleared = cache_clear()
        except Exception as e:
            logger.debug(f"Redis cache not available: {e}")

        return {
            "success": True,
            "message": "All caches cleared successfully",
            "redis_cleared": redis_cleared,
        }

    except Exception as e:
        logger.error(f"Error clearing caches: {e}")
        return {"success": False, "message": str(e)}


@router.post("/cache/warm")
async def warm_caches():
    """Manually trigger cache warming (admin only)"""
    try:
        # Warm activities cache
        await get_plex_activities()

        # Warm watch history cache
        await get_watch_history()

        # Force refresh stats cache
        from app.services.stats_cache import stats_cache

        await stats_cache.force_refresh()

        return {
            "success": True,
            "message": "Caches warmed successfully",
            "warmed": ["plex_activities", "watch_history", "background_stats"],
        }

    except Exception as e:
        logger.error(f"Error warming caches: {e}")
        return {"success": False, "message": str(e)}


@router.get("/stats/dashboard")
async def get_dashboard_stats():
    """Get pre-calculated dashboard statistics from background cache"""
    from app.services.stats_cache import stats_cache

    return stats_cache.get_stats()
