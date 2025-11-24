from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from pathlib import Path
import json
from typing import Optional

from ..middleware.auth import require_auth
from ..config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


# Data models for request/response
class LoggingSettings(BaseModel):
    level: str
    enable_file: bool


class GeneralSettings(BaseModel):
    timezone: str


class APISettings(BaseModel):
    github_token: str
    tmdb_api_key: str


class PlexSettings(BaseModel):
    server_url: str
    server_token: str
    server_name: str


class SettingsResponse(BaseModel):
    logging: LoggingSettings
    general: GeneralSettings
    api: APISettings
    plex: PlexSettings


class SettingsUpdate(BaseModel):
    logging: Optional[LoggingSettings] = None
    general: Optional[GeneralSettings] = None
    api: Optional[APISettings] = None
    plex: Optional[PlexSettings] = None


def get_config_path():
    """Get path to config.json"""
    return Path(__file__).parent.parent.parent / "data" / "config.json"


def load_config():
    """Load current configuration from config.json"""
    config_path = get_config_path()
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_config(config_data):
    """Save configuration to config.json"""
    config_path = get_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w") as f:
        json.dump(config_data, f, indent=2)


@router.get("", response_model=SettingsResponse)
async def get_settings(username: str = Depends(require_auth)):
    """Get current application settings"""
    config_data = load_config()

    # Get logging settings from config or defaults
    logging_config = config_data.get("logging", {})
    logging_settings = LoggingSettings(
        level=logging_config.get("level", settings.LOG_LEVEL),
        enable_file=logging_config.get("enable_file", settings.LOG_ENABLE_FILE),
    )

    # Get general settings from config or defaults
    general_config = config_data.get("general", {})
    general_settings = GeneralSettings(
        timezone=general_config.get("timezone", settings.TZ)
    )

    # Get API settings from config or defaults
    api_config = config_data.get("api", {})
    api_settings = APISettings(
        github_token=api_config.get("github_token", settings.GITHUB_TOKEN),
        tmdb_api_key=api_config.get("tmdb_api_key", settings.TMDB_API_KEY),
    )

    # Get Plex settings from config or defaults
    plex_config = config_data.get("plex", {})
    plex_settings = PlexSettings(
        server_url=plex_config.get("server_url", settings.PLEX_SERVER_URL),
        server_token=plex_config.get("server_token", settings.PLEX_SERVER_TOKEN),
        server_name=plex_config.get("server_name", settings.PLEX_SERVER_NAME),
    )

    return SettingsResponse(
        logging=logging_settings,
        general=general_settings,
        api=api_settings,
        plex=plex_settings,
    )


@router.post("", response_model=SettingsResponse)
async def update_settings(
    updates: SettingsUpdate, username: str = Depends(require_auth)
):
    """Update application settings"""
    config_data = load_config()

    # Update logging settings
    if updates.logging:
        config_data["logging"] = {
            "level": updates.logging.level,
            "enable_file": updates.logging.enable_file,
        }
        # Update runtime settings
        settings.LOG_LEVEL = updates.logging.level
        settings.LOG_ENABLE_FILE = updates.logging.enable_file

    # Update general settings
    if updates.general:
        config_data["general"] = {"timezone": updates.general.timezone}
        # Update runtime settings
        settings.TZ = updates.general.timezone

    # Update API settings
    if updates.api:
        config_data["api"] = {
            "github_token": updates.api.github_token,
            "tmdb_api_key": updates.api.tmdb_api_key,
        }
        # Update runtime settings
        settings.GITHUB_TOKEN = updates.api.github_token
        settings.TMDB_API_KEY = updates.api.tmdb_api_key

    # Update Plex settings
    if updates.plex:
        config_data["plex"] = {
            "server_url": updates.plex.server_url,
            "server_token": updates.plex.server_token,
            "server_name": updates.plex.server_name,
        }
        # Update runtime settings
        settings.PLEX_SERVER_URL = updates.plex.server_url
        settings.PLEX_SERVER_TOKEN = updates.plex.server_token
        settings.PLEX_SERVER_NAME = updates.plex.server_name

    # Save to config.json
    save_config(config_data)

    # Return updated settings
    return await get_settings(username)
