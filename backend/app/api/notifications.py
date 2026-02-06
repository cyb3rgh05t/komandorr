"""
API routes for notification settings (Telegram)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import json

from ..middleware.auth import require_auth
from ..services.notifications import notification_service
from ..utils.logger import logger

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class TelegramSettings(BaseModel):
    enabled: bool = False
    bot_token: str = ""
    chat_id: str = ""
    notify_offline: bool = True
    notify_problem: bool = True
    notify_recovery: bool = True


class TelegramSettingsResponse(BaseModel):
    telegram: TelegramSettings


class TestNotificationResponse(BaseModel):
    success: bool
    message: str


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
    try:
        with open(config_path, "w") as f:
            json.dump(config_data, f, indent=2)
        logger.info(f"Notification config saved to {config_path}")
    except Exception as e:
        logger.error(f"Failed to save notification config: {e}")
        raise


@router.get("/telegram", response_model=TelegramSettingsResponse)
async def get_telegram_settings(username: str = Depends(require_auth)):
    """Get current Telegram notification settings"""
    config = load_config()
    telegram_config = config.get("notifications", {}).get("telegram", {})

    # Mask the bot token for security (show only last 4 chars)
    bot_token = telegram_config.get("bot_token", "")
    masked_token = ""
    if bot_token:
        masked_token = (
            "*" * (len(bot_token) - 4) + bot_token[-4:]
            if len(bot_token) > 4
            else "****"
        )

    return TelegramSettingsResponse(
        telegram=TelegramSettings(
            enabled=telegram_config.get("enabled", False),
            bot_token=masked_token,
            chat_id=telegram_config.get("chat_id", ""),
            notify_offline=telegram_config.get("notify_offline", True),
            notify_problem=telegram_config.get("notify_problem", True),
            notify_recovery=telegram_config.get("notify_recovery", True),
        )
    )


@router.put("/telegram", response_model=TelegramSettingsResponse)
async def update_telegram_settings(
    settings: TelegramSettings, username: str = Depends(require_auth)
):
    """Update Telegram notification settings"""
    config = load_config()

    # Initialize notifications section if needed
    if "notifications" not in config:
        config["notifications"] = {}

    # Get existing config to preserve token if masked
    existing_telegram = config.get("notifications", {}).get("telegram", {})

    # If token starts with asterisks, keep the existing token
    bot_token = settings.bot_token
    if bot_token.startswith("*"):
        bot_token = existing_telegram.get("bot_token", "")

    config["notifications"]["telegram"] = {
        "enabled": settings.enabled,
        "bot_token": bot_token,
        "chat_id": settings.chat_id,
        "notify_offline": settings.notify_offline,
        "notify_problem": settings.notify_problem,
        "notify_recovery": settings.notify_recovery,
    }

    try:
        save_config(config)

        # Return masked token
        masked_token = ""
        if bot_token:
            masked_token = (
                "*" * (len(bot_token) - 4) + bot_token[-4:]
                if len(bot_token) > 4
                else "****"
            )

        return TelegramSettingsResponse(
            telegram=TelegramSettings(
                enabled=settings.enabled,
                bot_token=masked_token,
                chat_id=settings.chat_id,
                notify_offline=settings.notify_offline,
                notify_problem=settings.notify_problem,
                notify_recovery=settings.notify_recovery,
            )
        )
    except Exception as e:
        logger.error(f"Failed to save Telegram settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.post("/telegram/test", response_model=TestNotificationResponse)
async def test_telegram_notification(username: str = Depends(require_auth)):
    """Send a test notification to verify Telegram configuration"""
    if not notification_service.is_enabled():
        return TestNotificationResponse(
            success=False,
            message="Telegram notifications are not enabled or not configured properly",
        )

    try:
        success = await notification_service.send_test_notification()

        if success:
            return TestNotificationResponse(
                success=True,
                message="Test notification sent successfully! Check your Telegram.",
            )
        else:
            return TestNotificationResponse(
                success=False,
                message="Failed to send notification. Check your bot token and chat ID.",
            )
    except Exception as e:
        logger.error(f"Test notification failed: {e}")
        return TestNotificationResponse(success=False, message=f"Error: {str(e)}")


@router.get("/status")
async def get_notification_status(username: str = Depends(require_auth)):
    """Get current notification service status"""
    return {
        "telegram": {
            "enabled": notification_service.is_enabled(),
            "configured": bool(notification_service.get_config().get("bot_token")),
        }
    }
