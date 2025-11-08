from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, HttpUrl
import httpx
import json
from pathlib import Path
from typing import Optional

from app.utils.logger import logger

router = APIRouter(prefix="/api/plex", tags=["plex"])

# Path to store Plex configuration
CONFIG_FILE = Path("data/plex_config.json")


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


def load_plex_config() -> Optional[dict]:
    """Load Plex configuration from file"""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading Plex config: {e}")
    return None


def save_plex_config(config: dict) -> bool:
    """Save Plex configuration to file"""
    try:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving Plex config: {e}")
        return False


async def validate_plex_connection(
    url: str, token: str
) -> tuple[bool, Optional[str], Optional[str]]:
    """
    Validate Plex server connection
    Returns: (is_valid, error_message, server_name)
    """
    try:
        # Clean up URL - remove trailing slash
        url = url.rstrip("/")

        # Test connection to Plex server
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {"X-Plex-Token": token, "Accept": "application/json"}

            response = await client.get(f"{url}/identity", headers=headers)

            if response.status_code == 200:
                data = response.json()
                server_name = data.get("MediaContainer", {}).get(
                    "friendlyName", "Unknown"
                )
                logger.info(f"Successfully connected to Plex server: {server_name}")
                return True, None, server_name
            elif response.status_code == 401:
                return False, "Invalid Plex token", None
            else:
                return (
                    False,
                    f"Server returned status code: {response.status_code}",
                    None,
                )

    except httpx.TimeoutException:
        return False, "Connection timeout - server not reachable", None
    except httpx.ConnectError:
        return False, "Could not connect to server - check URL", None
    except Exception as e:
        logger.error(f"Error validating Plex connection: {e}")
        return False, str(e), None


@router.get("/config")
async def get_plex_config():
    """Get current Plex configuration"""
    config = load_plex_config()
    if config:
        return {
            "url": config.get("url", ""),
            "token": config.get("token", ""),
        }
    return {"url": "", "token": ""}


@router.post("/config")
async def save_plex_configuration(config: PlexConfig):
    """Save Plex configuration"""
    try:
        config_data = {
            "url": config.url.rstrip("/"),
            "token": config.token,
        }

        if save_plex_config(config_data):
            logger.info("Plex configuration saved successfully")
            return {"status": "success", "message": "Configuration saved"}
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
    """Validate Plex server connection"""
    is_valid, error_msg, server_name = await validate_plex_connection(
        request.url, request.token
    )

    if is_valid:
        return PlexValidateResponse(
            valid=True,
            message=f"Successfully connected to {server_name}",
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
