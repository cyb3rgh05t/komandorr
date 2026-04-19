"""
API routes for notification settings (Telegram) with multi-target + topic + event routing support.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from pathlib import Path
import json
import uuid

from ..middleware.auth import require_auth
from ..services.notifications import notification_service, EVENT_TYPES, EVENT_LABELS
from ..utils.logger import logger

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ── Pydantic models ───────────────────────────────────────────────


class TelegramTarget(BaseModel):
    id: str = ""
    label: str = ""
    chat_id: str = ""
    topic_id: Optional[int] = None


class EventConfig(BaseModel):
    enabled: bool = False
    targets: List[str] = []


class TelegramSettings(BaseModel):
    enabled: bool = False
    bot_token: str = ""
    # Legacy flat field (kept for backward compat on read)
    chat_id: Optional[str] = None
    # New multi-target
    targets: List[TelegramTarget] = []
    events: Dict[str, EventConfig] = {}
    cooldown_minutes: int = 5


class TelegramSettingsResponse(BaseModel):
    telegram: TelegramSettings


class TestNotificationResponse(BaseModel):
    success: bool
    message: str


class EventTypesResponse(BaseModel):
    event_types: List[dict]


# ── helpers ───────────────────────────────────────────────────────


def get_config_path():
    return Path(__file__).parent.parent.parent / "data" / "config.json"


def load_config():
    config_path = get_config_path()
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_config(config_data):
    config_path = get_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(config_path, "w") as f:
            json.dump(config_data, f, indent=2)
        logger.info(f"Notification config saved to {config_path}")
    except Exception as e:
        logger.error(f"Failed to save notification config: {e}")
        raise


def _mask_token(token: str) -> str:
    if not token:
        return ""
    return "*" * (len(token) - 4) + token[-4:] if len(token) > 4 else "****"


def _migrate_legacy_config(telegram_config: dict) -> dict:
    """Convert old flat config to new targets+events format in-place."""
    if "targets" not in telegram_config:
        chat_id = telegram_config.get("chat_id", "")
        if chat_id:
            telegram_config["targets"] = [
                {
                    "id": "default",
                    "label": "Default",
                    "chat_id": chat_id,
                    "topic_id": None,
                }
            ]
        else:
            telegram_config["targets"] = []

    if "events" not in telegram_config:
        # Map old notify_* flags to new events structure
        target_ids = [t["id"] for t in telegram_config.get("targets", [])]
        telegram_config["events"] = {}
        for evt in EVENT_TYPES:
            if evt == "service_offline":
                enabled = telegram_config.get("notify_offline", True)
            elif evt == "service_problem":
                enabled = telegram_config.get("notify_problem", True)
            elif evt == "service_recovery":
                enabled = telegram_config.get("notify_recovery", True)
            else:
                enabled = False
            telegram_config["events"][evt] = {
                "enabled": enabled,
                "targets": target_ids if enabled else [],
            }

    return telegram_config


def _build_response(telegram_config: dict) -> TelegramSettingsResponse:
    """Build a masked response from raw config."""
    config = _migrate_legacy_config(dict(telegram_config))

    targets = [
        TelegramTarget(
            id=t.get("id", ""),
            label=t.get("label", ""),
            chat_id=t.get("chat_id", ""),
            topic_id=t.get("topic_id"),
        )
        for t in config.get("targets", [])
    ]

    events = {}
    for evt in EVENT_TYPES:
        evt_cfg = config.get("events", {}).get(evt, {})
        events[evt] = EventConfig(
            enabled=evt_cfg.get("enabled", False),
            targets=evt_cfg.get("targets", []),
        )

    return TelegramSettingsResponse(
        telegram=TelegramSettings(
            enabled=config.get("enabled", False),
            bot_token=_mask_token(config.get("bot_token", "")),
            targets=targets,
            events=events,
            cooldown_minutes=config.get("cooldown_minutes", 5),
        )
    )


# ── routes ────────────────────────────────────────────────────────


@router.get("/telegram/events", response_model=EventTypesResponse)
async def get_event_types(username: str = Depends(require_auth)):
    """Return the list of all supported notification event types."""
    return EventTypesResponse(
        event_types=[
            {"id": evt, "label": EVENT_LABELS.get(evt, evt)} for evt in EVENT_TYPES
        ]
    )


@router.get("/telegram", response_model=TelegramSettingsResponse)
async def get_telegram_settings(username: str = Depends(require_auth)):
    """Get current Telegram notification settings."""
    config = load_config()
    telegram_config = config.get("notifications", {}).get("telegram", {})
    return _build_response(telegram_config)


@router.put("/telegram", response_model=TelegramSettingsResponse)
async def update_telegram_settings(
    settings: TelegramSettings, username: str = Depends(require_auth)
):
    """Update Telegram notification settings."""
    config = load_config()

    if "notifications" not in config:
        config["notifications"] = {}

    existing = config.get("notifications", {}).get("telegram", {})

    # Preserve token if masked
    bot_token = settings.bot_token
    if bot_token.startswith("*"):
        bot_token = existing.get("bot_token", "")

    # Ensure every target has an id
    targets = []
    for t in settings.targets:
        tid = t.id or f"t-{uuid.uuid4().hex[:8]}"
        targets.append(
            {
                "id": tid,
                "label": t.label or f"Chat {t.chat_id}",
                "chat_id": t.chat_id,
                "topic_id": t.topic_id,
            }
        )

    # Build events dict
    events = {}
    for evt in EVENT_TYPES:
        evt_cfg = settings.events.get(evt)
        if evt_cfg:
            events[evt] = {"enabled": evt_cfg.enabled, "targets": evt_cfg.targets}
        else:
            events[evt] = {"enabled": False, "targets": []}

    new_telegram = {
        "enabled": settings.enabled,
        "bot_token": bot_token,
        "targets": targets,
        "events": events,
        "cooldown_minutes": max(0, settings.cooldown_minutes),
    }

    config["notifications"]["telegram"] = new_telegram

    try:
        save_config(config)
        return _build_response(new_telegram)
    except Exception as e:
        logger.error(f"Failed to save Telegram settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.post("/telegram/test", response_model=TestNotificationResponse)
async def test_telegram_notification(
    username: str = Depends(require_auth),
    target_id: Optional[str] = Query(None, description="Send test only to this target"),
):
    """Send a test notification to verify Telegram configuration."""
    if not notification_service.is_enabled():
        return TestNotificationResponse(
            success=False,
            message="Telegram notifications are not enabled or not configured properly",
        )

    try:
        success = await notification_service.send_test_notification(target_id=target_id)
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
    """Get current notification service status."""
    cfg = notification_service.get_config()
    return {
        "telegram": {
            "enabled": notification_service.is_enabled(),
            "configured": bool(cfg.get("bot_token")),
            "target_count": len(cfg.get("targets", [1] if cfg.get("chat_id") else [])),
        }
    }
