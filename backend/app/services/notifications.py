"""
Notification service for sending alerts via Telegram.
Supports multiple chat targets with optional topic IDs and granular per-event routing.
"""

import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, List
from pathlib import Path
import json

from app.utils.logger import logger

# All supported notification event types
EVENT_TYPES = [
    "service_offline",
    "service_problem",
    "service_recovery",
    "invite_created",
    "invite_redeemed",
    "user_added",
    "user_removed",
    "storage_warning",
    "vpn_error",
    "nfs_error",
    "uploader_failed",
    "posterizarr_error",
]

# Human-readable labels for events (used in messages / UI)
EVENT_LABELS = {
    "service_offline": "Service Offline",
    "service_problem": "Service Problem",
    "service_recovery": "Service Recovery",
    "invite_created": "Invite Created",
    "invite_redeemed": "Invite Redeemed",
    "user_added": "User Added",
    "user_removed": "User Removed",
    "storage_warning": "Storage Warning",
    "vpn_error": "VPN Error",
    "nfs_error": "NFS Error",
    "uploader_failed": "Uploader Failed",
    "posterizarr_error": "Posterizarr Error",
}


class NotificationService:
    """Service for sending notifications via Telegram with multi-target + topic support"""

    def __init__(self):
        self._last_status: Dict[str, str] = {}
        self._error_cooldowns: Dict[str, datetime] = {}  # dedup for error notifications
        self._config_path = Path(__file__).parent.parent.parent / "data" / "config.json"
        self._error_cooldown_seconds = (
            300  # 5 min between duplicate error notifications
        )

    # ── dedup / cooldown ────────────────────────────────────────────

    def _check_cooldown(self, key: str) -> bool:
        """Return True if we should send (not in cooldown). Sets cooldown on call."""
        now = datetime.now(timezone.utc)
        last = self._error_cooldowns.get(key)
        if last and (now - last).total_seconds() < self._error_cooldown_seconds:
            return False
        self._error_cooldowns[key] = now
        return True

    # ── config helpers ────────────────────────────────────────────

    def _load_config(self) -> dict:
        """Load notification config from config.json"""
        try:
            if self._config_path.exists():
                with open(self._config_path, "r") as f:
                    config = json.load(f)
                    return config.get("notifications", {}).get("telegram", {})
        except Exception as e:
            logger.error(f"Failed to load notification config: {e}")
        return {}

    def is_enabled(self) -> bool:
        """Check if Telegram notifications are globally enabled"""
        config = self._load_config()
        return (
            config.get("enabled", False)
            and bool(config.get("bot_token"))
            and self._has_targets(config)
        )

    def _has_targets(self, config: dict) -> bool:
        """Check whether at least one target is configured (new or legacy format)"""
        targets = config.get("targets", [])
        if targets:
            return any(t.get("chat_id") for t in targets)
        # Legacy single chat_id
        return bool(config.get("chat_id"))

    def get_config(self) -> dict:
        """Get current Telegram configuration"""
        return self._load_config()

    def _get_targets_for_event(self, event_type: str) -> List[dict]:
        """Return the list of target dicts that should receive *event_type*."""
        config = self._load_config()
        if not config.get("enabled", False) or not config.get("bot_token"):
            return []

        events = config.get("events", {})
        event_cfg = events.get(event_type, {})
        if not event_cfg.get("enabled", False):
            return []

        target_ids = event_cfg.get("targets", [])
        targets = config.get("targets", [])

        # Legacy fallback: no targets array → use flat chat_id
        if not targets:
            chat_id = config.get("chat_id")
            if chat_id:
                # In legacy mode every enabled event goes to the single chat
                return [{"id": "__legacy__", "chat_id": chat_id, "topic_id": None}]
            return []

        if not target_ids:
            return []

        targets_by_id = {t["id"]: t for t in targets if t.get("id")}
        return [targets_by_id[tid] for tid in target_ids if tid in targets_by_id]

    # ── low-level send ────────────────────────────────────────────

    async def _send_to_target(
        self, bot_token: str, target: dict, message: str, parse_mode: str = "HTML"
    ) -> bool:
        """Send a message to a single target (chat_id + optional topic_id)."""
        chat_id = target.get("chat_id")
        if not chat_id:
            return False

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        }
        topic_id = target.get("topic_id")
        if topic_id:
            payload["message_thread_id"] = int(topic_id)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    label = target.get("label", chat_id)
                    logger.info(f"Telegram notification sent to {label}")
                    return True
                else:
                    logger.error(
                        f"Telegram API error for {chat_id}: {response.status_code} - {response.text}"
                    )
                    return False
        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")
            return False

    async def send_telegram_message(
        self, message: str, parse_mode: str = "HTML"
    ) -> bool:
        """Send to ALL configured targets (used for test / legacy callers)."""
        config = self._load_config()
        if not self.is_enabled():
            logger.debug("Telegram notifications disabled, skipping")
            return False

        bot_token = config["bot_token"]
        targets = config.get("targets", [])
        if not targets:
            chat_id = config.get("chat_id")
            if chat_id:
                targets = [{"chat_id": chat_id, "topic_id": None}]

        ok = False
        for t in targets:
            if await self._send_to_target(bot_token, t, message, parse_mode):
                ok = True
        return ok

    # ── event dispatch ────────────────────────────────────────────

    async def _dispatch(self, event_type: str, message: str) -> bool:
        """Route *message* to the targets configured for *event_type*."""
        config = self._load_config()
        targets = self._get_targets_for_event(event_type)
        if not targets:
            return False

        bot_token = config["bot_token"]
        ok = False
        for t in targets:
            if await self._send_to_target(bot_token, t, message):
                ok = True
        return ok

    # ── test notification ─────────────────────────────────────────

    async def send_test_notification(self, target_id: Optional[str] = None) -> bool:
        """Send a test notification. If *target_id* given, send only to that target."""
        config = self._load_config()
        if not config.get("bot_token"):
            return False

        message = (
            "🔔 <b>Komandorr Test Notification</b>\n\n"
            "✅ Your Telegram notifications are configured correctly!\n\n"
            f"<i>Sent at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</i>"
        )

        if target_id:
            targets = config.get("targets", [])
            target = next((t for t in targets if t.get("id") == target_id), None)
            if not target:
                return False
            return await self._send_to_target(config["bot_token"], target, message)

        return await self.send_telegram_message(message)

    # ── service status (existing) ─────────────────────────────────

    async def notify_service_status_change(
        self,
        service_name: str,
        service_url: str,
        old_status: str,
        new_status: str,
        response_time: Optional[float] = None,
    ) -> bool:
        """Send notification when a service status changes."""
        is_recovery = new_status == "online" and old_status in ("offline", "problem")
        is_problem = new_status == "problem" and old_status == "online"
        is_offline = new_status == "offline" and old_status in ("online", "problem")

        if is_recovery:
            event_type = "service_recovery"
            emoji = "✅"
            status_text = "RECOVERED"
            details = f"Response time: {response_time:.0f}ms" if response_time else ""
        elif is_offline:
            event_type = "service_offline"
            emoji = "🔴"
            status_text = "OFFLINE"
            details = "Service is not responding"
        elif is_problem:
            event_type = "service_problem"
            emoji = "⚠️"
            status_text = "PROBLEM"
            details = (
                f"Slow response: {response_time:.0f}ms"
                if response_time
                else "Service has issues"
            )
        else:
            return False

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = (
            f"{emoji} <b>Service {status_text}</b>\n\n"
            f"📌 <b>Service:</b> {service_name}\n"
            f"🔗 <b>URL:</b> {service_url}\n"
            f"📊 <b>Status:</b> {old_status} → {new_status}\n"
        )
        if details:
            message += f"ℹ️ <b>Details:</b> {details}\n"
        message += f"\n<i>{timestamp}</i>"

        return await self._dispatch(event_type, message)

    # ── invite events ─────────────────────────────────────────────

    async def notify_invite_created(
        self,
        code: str,
        created_by: str,
        server_name: str = "",
        usage_limit: Optional[int] = None,
    ) -> bool:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        limit = str(usage_limit) if usage_limit else "Unlimited"
        message = (
            f"📨 <b>Invite Created</b>\n\n"
            f"🔑 <b>Code:</b> <code>{code}</code>\n"
            f"👤 <b>By:</b> {created_by}\n"
        )
        if server_name:
            message += f"🖥 <b>Server:</b> {server_name}\n"
        message += f"🔢 <b>Limit:</b> {limit}\n" f"\n<i>{timestamp}</i>"
        return await self._dispatch("invite_created", message)

    async def notify_invite_redeemed(
        self, code: str, email: str, server_name: str = ""
    ) -> bool:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = (
            f"🎉 <b>Invite Redeemed</b>\n\n"
            f"🔑 <b>Code:</b> <code>{code}</code>\n"
            f"📧 <b>Email:</b> {email}\n"
        )
        if server_name:
            message += f"🖥 <b>Server:</b> {server_name}\n"
        message += f"\n<i>{timestamp}</i>"
        return await self._dispatch("invite_redeemed", message)

    # ── user events ───────────────────────────────────────────────

    async def notify_user_added(
        self, email: str, server_name: str = "", added_by: str = ""
    ) -> bool:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = f"👤 <b>User Added to Plex</b>\n\n" f"📧 <b>Email:</b> {email}\n"
        if server_name:
            message += f"🖥 <b>Server:</b> {server_name}\n"
        if added_by:
            message += f"👤 <b>By:</b> {added_by}\n"
        message += f"\n<i>{timestamp}</i>"
        return await self._dispatch("user_added", message)

    async def notify_user_removed(
        self, email: str, server_name: str = "", removed_by: str = ""
    ) -> bool:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = f"🚫 <b>User Removed from Plex</b>\n\n" f"📧 <b>Email:</b> {email}\n"
        if server_name:
            message += f"🖥 <b>Server:</b> {server_name}\n"
        if removed_by:
            message += f"👤 <b>By:</b> {removed_by}\n"
        message += f"\n<i>{timestamp}</i>"
        return await self._dispatch("user_removed", message)

    # ── storage events ────────────────────────────────────────────

    async def notify_storage_warning(
        self, hostname: str, path: str, percent: float, free_gb: float
    ) -> bool:
        if not self._check_cooldown(f"storage_warning:{hostname}:{path}"):
            return False
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = (
            f"💾 <b>Storage Warning</b>\n\n"
            f"🖥 <b>Host:</b> {hostname}\n"
            f"📂 <b>Path:</b> {path}\n"
            f"📊 <b>Usage:</b> {percent:.1f}%\n"
            f"💿 <b>Free:</b> {free_gb:.1f} GB\n"
            f"\n<i>{timestamp}</i>"
        )
        return await self._dispatch("storage_warning", message)

    # ── VPN events ────────────────────────────────────────────────

    async def notify_vpn_error(self, error: str, url: str = "") -> bool:
        if not self._check_cooldown(f"vpn_error:{url}"):
            return False
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = f"🔒 <b>VPN Error</b>\n\n" f"❌ <b>Error:</b> {error}\n"
        if url:
            message += f"🔗 <b>URL:</b> {url}\n"
        message += f"\n<i>{timestamp}</i>"
        return await self._dispatch("vpn_error", message)

    # ── NFS events ────────────────────────────────────────────────

    async def notify_nfs_error(self, instance_name: str, error: str) -> bool:
        if not self._check_cooldown(f"nfs_error:{instance_name}"):
            return False
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = (
            f"📁 <b>NFS Error</b>\n\n"
            f"🖥 <b>Instance:</b> {instance_name}\n"
            f"❌ <b>Error:</b> {error}\n"
            f"\n<i>{timestamp}</i>"
        )
        return await self._dispatch("nfs_error", message)

    # ── Uploader events ──────────────────────────────────────────

    async def notify_uploader_failed(
        self, failed_count: int, details: str = ""
    ) -> bool:
        if not self._check_cooldown("uploader_failed"):
            return False
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = (
            f"📤 <b>Uploader Failed Items</b>\n\n" f"🔢 <b>Failed:</b> {failed_count}\n"
        )
        if details:
            message += f"ℹ️ <b>Details:</b> {details}\n"
        message += f"\n<i>{timestamp}</i>"
        return await self._dispatch("uploader_failed", message)

    # ── Posterizarr events ────────────────────────────────────────

    async def notify_posterizarr_error(self, instance_name: str, error: str) -> bool:
        if not self._check_cooldown(f"posterizarr_error:{instance_name}"):
            return False
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        message = (
            f"🖼 <b>Posterizarr Error</b>\n\n"
            f"🖥 <b>Instance:</b> {instance_name}\n"
            f"❌ <b>Error:</b> {error}\n"
            f"\n<i>{timestamp}</i>"
        )
        return await self._dispatch("posterizarr_error", message)

    # ── status tracking (unchanged) ──────────────────────────────

    def should_notify(self, service_id: str, new_status: str) -> tuple[bool, str]:
        """Check if we should send a notification for this status change."""
        old_status = self._last_status.get(service_id, "unknown")
        self._last_status[service_id] = new_status

        if old_status == "unknown":
            return False, old_status
        if old_status == new_status:
            return False, old_status

        significant_changes = [
            (old_status == "online" and new_status in ("offline", "problem")),
            (old_status in ("offline", "problem") and new_status == "online"),
            (old_status == "problem" and new_status == "offline"),
        ]
        return any(significant_changes), old_status

    def clear_status_cache(self, service_id: Optional[str] = None) -> None:
        """Clear cached status for a service or all services"""
        if service_id:
            self._last_status.pop(service_id, None)
        else:
            self._last_status.clear()


# Singleton instance
notification_service = NotificationService()
