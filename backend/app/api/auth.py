from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import base64
import json
from pathlib import Path

from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/auth", tags=["authentication"])


class AuthToggle(BaseModel):
    enabled: bool


class CredentialUpdate(BaseModel):
    username: str
    current_password: str
    new_password: str


def load_config_json():
    """Load configuration from config.json file"""
    config_path = Path(__file__).parent.parent.parent / "data" / "config.json"
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"auth": {"enabled": False, "username": "admin", "password": "admin"}}


def save_config_json(config_data):
    """Save configuration to config.json file"""
    config_path = Path(__file__).parent.parent.parent / "data" / "config.json"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w") as f:
        json.dump(config_data, f, indent=2)


@router.get("/status")
async def get_auth_status():
    """Get current authentication status"""
    return {"enabled": settings.ENABLE_AUTH}


@router.post("/toggle")
async def toggle_auth(toggle: AuthToggle, authorization: Optional[str] = Header(None)):
    """Enable or disable authentication"""
    # If auth is currently enabled, verify credentials
    if settings.ENABLE_AUTH and authorization:
        try:
            credentials = base64.b64decode(authorization.split(" ")[1]).decode("utf-8")
            username, password = credentials.split(":", 1)
            if username != settings.AUTH_USERNAME or password != settings.AUTH_PASSWORD:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    # Update config.json
    config = load_config_json()
    config["auth"]["enabled"] = toggle.enabled
    save_config_json(config)

    # Update settings in memory
    settings.ENABLE_AUTH = toggle.enabled

    logger.info(f"Authentication {'enabled' if toggle.enabled else 'disabled'}")

    return {"enabled": toggle.enabled, "message": "Authentication settings updated"}


@router.post("/update")
async def update_credentials(
    credentials: CredentialUpdate, authorization: Optional[str] = Header(None)
):
    """Update authentication credentials"""
    # If auth is enabled, verify current credentials
    if settings.ENABLE_AUTH:
        if authorization:
            try:
                current_creds = base64.b64decode(authorization.split(" ")[1]).decode(
                    "utf-8"
                )
                current_user, current_pass = current_creds.split(":", 1)

                # Verify current password matches
                if (
                    current_user != settings.AUTH_USERNAME
                    or current_pass != credentials.current_password
                ):
                    raise HTTPException(
                        status_code=401, detail="Invalid current credentials"
                    )
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        else:
            raise HTTPException(status_code=401, detail="Authentication required")
    # If auth is disabled, allow credential updates without verification (for initial setup)

    # Update config.json with new credentials
    config = load_config_json()
    config["auth"]["username"] = credentials.username
    config["auth"]["password"] = credentials.new_password
    save_config_json(config)

    # Update settings in memory
    settings.AUTH_USERNAME = credentials.username
    settings.AUTH_PASSWORD = credentials.new_password

    logger.info(f"Credentials updated for user: {credentials.username}")

    return {"message": "Credentials updated successfully"}
