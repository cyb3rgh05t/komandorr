from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import base64
import os
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


def update_env_file(key: str, value: str):
    """Update or add a key-value pair in .env file"""
    env_path = Path(__file__).parent.parent.parent / ".env"

    # Read existing content
    lines = []
    if env_path.exists():
        with open(env_path, "r") as f:
            lines = f.readlines()

    # Update or add the key
    key_found = False
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            key_found = True
            break

    if not key_found:
        lines.append(f"{key}={value}\n")

    # Write back
    with open(env_path, "w") as f:
        f.writelines(lines)


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

    # Update .env file
    update_env_file("ENABLE_AUTH", str(toggle.enabled).lower())

    # Update settings (note: requires app restart for full effect)
    settings.ENABLE_AUTH = toggle.enabled

    logger.info(f"Authentication {'enabled' if toggle.enabled else 'disabled'}")

    return {"enabled": toggle.enabled, "message": "Authentication settings updated"}


@router.post("/update")
async def update_credentials(
    credentials: CredentialUpdate, authorization: Optional[str] = Header(None)
):
    """Update authentication credentials"""
    if not settings.ENABLE_AUTH:
        raise HTTPException(status_code=400, detail="Authentication is not enabled")

    # Verify current credentials
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

    # Update .env file with new credentials
    update_env_file("AUTH_USERNAME", credentials.username)
    update_env_file("AUTH_PASSWORD", credentials.new_password)

    # Update settings
    settings.AUTH_USERNAME = credentials.username
    settings.AUTH_PASSWORD = credentials.new_password

    logger.info(f"Credentials updated for user: {credentials.username}")

    return {"message": "Credentials updated successfully"}
