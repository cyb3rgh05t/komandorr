"""
Notification service for sending alerts via Telegram.
Supports multiple chat targets with optional topic IDs and granular per-event routing.
"""

import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, List
from pathlib import Path
from zoneinfo import ZoneInfo
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
    "vpn_recovery",
    "nfs_error",
    "nfs_recovery",
    "traffic_high",
    "traffic_recovery",
    "uploader_failed",
    "posterizarr_error",
    "autoscan_error",
    "autoscan_recovery",
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
    "vpn_recovery": "VPN Recovery",
    "nfs_error": "NFS Error",
    "nfs_recovery": "NFS Recovery",
    "traffic_high": "Traffic High",
    "traffic_recovery": "Traffic Recovery",
    "uploader_failed": "Uploader Failed",
    "posterizarr_error": "Posterizarr Error",
    "autoscan_error": "Autoscan Error",
    "autoscan_recovery": "Autoscan Recovery",
}


class NotificationService:
    """Service for sending notifications via Telegram with multi-target + topic support"""

    def __init__(self):
        self._last_status: Dict[str, str] = {}
        self._error_cooldowns: Dict[str, datetime] = {}  # dedup for error notifications
        self._config_path = Path(__file__).parent.parent.parent / "data" / "config.json"
        self._error_cooldown_seconds = (
            300  # default 5 min, overridden by config cooldown_minutes
        )

    # ── dedup / cooldown ────────────────────────────────────────────

    def _get_tz(self) -> ZoneInfo:
        """Return the configured timezone from settings."""
        try:
            from app.config import settings

            return ZoneInfo(settings.TZ)
        except Exception:
            return ZoneInfo("UTC")

    def _get_timestamp(self) -> str:
        """Return a formatted timestamp string using the configured timezone."""
        tz = self._get_tz()
        now = datetime.now(tz)
        tz_name = now.strftime("%Z") or str(tz)
        return now.strftime(f"%Y-%m-%d %H:%M:%S {tz_name}")

    def _check_cooldown(self, key: str) -> bool:
        """Return True if we should send (not in cooldown). Sets cooldown on call."""
        # Re-read cooldown from config each time so changes take effect immediately
        cfg = self._load_config()
        cooldown_min = cfg.get("cooldown_minutes")
        if cooldown_min is not None:
            self._error_cooldown_seconds = max(0, int(cooldown_min)) * 60
        now = datetime.now(timezone.utc)
        last = self._error_cooldowns.get(key)
        if last and (now - last).total_seconds() < self._error_cooldown_seconds:
            remaining = int(self._error_cooldown_seconds - (now - last).total_seconds())
            logger.debug(
                f"Notification cooldown active for key={key} "
                f"(remaining={max(0, remaining)}s)"
            )
            return False
        self._error_cooldowns[key] = now
        return True

    # ── config helpers ────────────────────────────────────────────

    def _load_config(self) -> dict:
        """Load notification config from config.json, auto-migrating legacy format."""
        try:
            if self._config_path.exists():
                with open(self._config_path, "r") as f:
                    config = json.load(f)
                    telegram = config.get("notifications", {}).get("telegram", {})
                    return self._migrate_legacy(telegram)
        except Exception as e:
            logger.error(f"Failed to load notification config: {e}")
        return {}

    @staticmethod
    def _migrate_legacy(config: dict) -> dict:
        """Convert old flat config to new targets+events format (in memory only)."""
        if "targets" not in config:
            chat_id = config.get("chat_id", "")
            if chat_id:
                config["targets"] = [
                    {
                        "id": "default",
                        "label": "Default",
                        "chat_id": chat_id,
                        "topic_id": None,
                    }
                ]
            else:
                config["targets"] = []

        if "events" not in config:
            target_ids = [t["id"] for t in config.get("targets", [])]
            config["events"] = {}
            for evt in EVENT_TYPES:
                if evt == "service_offline":
                    enabled = config.get("notify_offline", True)
                elif evt == "service_problem":
                    enabled = config.get("notify_problem", True)
                elif evt == "service_recovery":
                    enabled = config.get("notify_recovery", True)
                else:
                    # Legacy config had no per-event flags for non-service events;
                    # enable all events by default so notifications actually fire.
                    enabled = True
                config["events"][evt] = {
                    "enabled": enabled,
                    "targets": target_ids if enabled else [],
                }

        return config

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
            f"<i>Sent at {self._get_timestamp()}</i>"
        )

        if target_id:
            targets = config.get("targets", [])
            target = next((t for t in targets if t.get("id") == target_id), None)
            if not target:
                return False
            return await self._send_to_target(config["bot_token"], target, message)

        return await self.send_telegram_message(message)

    # ── unified message template ──────────────────────────────────

    def _format_message(
        self,
        emoji: str,
        title: str,
        fields: list[tuple[str, str, str]],
    ) -> str:
        """Build a Telegram message using the canonical Komandorr template.

        Layout::

            {emoji} <b>{title}</b>

            {field_emoji} <b>{field_label}:</b> {field_value}
            ...

            <i>{timestamp}</i>

        ``fields`` is a list of ``(emoji, label, value)`` tuples. Rows whose
        value is empty/None are skipped, so callers can pass optional fields
        without conditional logic.
        """
        lines = [f"{emoji} <b>{title}</b>", ""]
        for fe, label, value in fields:
            if value is None or value == "":
                continue
            lines.append(f"{fe} <b>{label}:</b> {value}")
        lines.append("")
        lines.append(f"<i>{self._get_timestamp()}</i>")
        return "\n".join(lines)

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

        message = self._format_message(
            emoji,
            f"Service {status_text}",
            [
                ("📌", "Service", service_name),
                ("🔗", "URL", service_url),
                ("📊", "Status", f"{old_status} → {new_status}"),
                ("ℹ️", "Details", details),
            ],
        )
        return await self._dispatch(event_type, message)

    # ── invite events ─────────────────────────────────────────────

    async def notify_invite_created(
        self,
        code: str,
        created_by: str,
        server_name: str = "",
        usage_limit: Optional[int] = None,
    ) -> bool:
        message = self._format_message(
            "📨",
            "Invite Created",
            [
                ("🔑", "Code", f"<code>{code}</code>"),
                ("👤", "By", created_by),
                ("🖥", "Server", server_name),
                ("🔢", "Limit", str(usage_limit) if usage_limit else "Unlimited"),
            ],
        )
        return await self._dispatch("invite_created", message)

    async def notify_invite_redeemed(
        self, code: str, email: str, server_name: str = ""
    ) -> bool:
        message = self._format_message(
            "🎉",
            "Invite Redeemed",
            [
                ("🔑", "Code", f"<code>{code}</code>"),
                ("📧", "Email", email),
                ("🖥", "Server", server_name),
            ],
        )
        return await self._dispatch("invite_redeemed", message)

    # ── user events ───────────────────────────────────────────────

    async def notify_user_added(
        self, email: str, server_name: str = "", added_by: str = ""
    ) -> bool:
        message = self._format_message(
            "👤",
            "User Added to Plex",
            [
                ("📧", "Email", email),
                ("🖥", "Server", server_name),
                ("👤", "By", added_by),
            ],
        )
        return await self._dispatch("user_added", message)

    async def notify_user_removed(
        self, email: str, server_name: str = "", removed_by: str = ""
    ) -> bool:
        message = self._format_message(
            "🚫",
            "User Removed from Plex",
            [
                ("📧", "Email", email),
                ("🖥", "Server", server_name),
                ("👤", "By", removed_by),
            ],
        )
        return await self._dispatch("user_removed", message)

    # ── storage events ────────────────────────────────────────────

    async def notify_storage_warning(
        self, hostname: str, path: str, percent: float, free_gb: float
    ) -> bool:
        # Daily gate is handled entirely in health_checker; no cooldown needed here
        message = self._format_message(
            "💾",
            "Storage Warning",
            [
                ("🖥", "Host", hostname),
                ("📂", "Path", path),
                ("📊", "Usage", f"{percent:.1f}%"),
                ("💿", "Free", f"{free_gb:.1f} GB"),
            ],
        )
        return await self._dispatch("storage_warning", message)

    # ── VPN events ────────────────────────────────────────────────

    async def notify_vpn_error(
        self, container_name: str, error: str, url: str = ""
    ) -> bool:
        if not self._check_cooldown(f"vpn_error:{container_name}"):
            return False
        message = self._format_message(
            "🔒",
            "VPN Error",
            [
                ("📦", "Container", container_name),
                ("❌", "Error", error),
                ("🔗", "URL", url),
            ],
        )
        return await self._dispatch("vpn_error", message)

    async def notify_vpn_stopped(
        self, container_name: str, status: str, url: str = ""
    ) -> bool:
        """Send a one-shot VPN stopped/exited notification (no cooldown)."""
        message = self._format_message(
            "🔒",
            "VPN Container Stopped",
            [
                ("📦", "Container", container_name),
                ("⏹", "Status", status or "unknown"),
                ("ℹ️", "Behavior", "Sent once until container recovers"),
                ("🔗", "URL", url),
            ],
        )
        return await self._dispatch("vpn_error", message)

    async def notify_vpn_recovery(
        self, container_name: str, public_ip: str = "", url: str = ""
    ) -> bool:
        if not self._check_cooldown(f"vpn_recovery:{container_name}"):
            return False
        message = self._format_message(
            "🔒",
            "VPN Recovery",
            [
                ("📦", "Container", container_name),
                ("✅", "Status", "VPN running"),
                ("🌐", "Public IP", public_ip),
                ("🔗", "URL", url),
            ],
        )
        return await self._dispatch("vpn_recovery", message)

    # ── NFS events ────────────────────────────────────────────────

    async def notify_nfs_error(self, instance_name: str, error: str) -> bool:
        if not self._check_cooldown(f"nfs_error:{instance_name}"):
            return False
        message = self._format_message(
            "📁",
            "NFS Error",
            [
                ("🖥", "Instance", instance_name),
                ("❌", "Error", error),
            ],
        )
        return await self._dispatch("nfs_error", message)

    async def notify_nfs_recovery(self, instance_name: str) -> bool:
        if not self._check_cooldown(f"nfs_recovery:{instance_name}"):
            return False
        message = self._format_message(
            "📁",
            "NFS Recovery",
            [
                ("🖥", "Instance", instance_name),
                ("✅", "Status", "All mounts/exports healthy"),
            ],
        )
        return await self._dispatch("nfs_recovery", message)

    # ── Traffic events ────────────────────────────────────────────

    async def notify_traffic_high(
        self, service_name: str, percent: float, bandwidth: str
    ) -> bool:
        if not self._check_cooldown(f"traffic_high:{service_name}"):
            return False
        message = self._format_message(
            "📡",
            "Traffic High",
            [
                ("🖥", "Service", service_name),
                ("⚠️", "Bandwidth", f"{percent:.0f}% ({bandwidth})"),
                ("⏱", "Duration", "Sustained for 2+ minutes"),
            ],
        )
        return await self._dispatch("traffic_high", message)

    async def notify_traffic_recovery(self, service_name: str, percent: float) -> bool:
        if not self._check_cooldown(f"traffic_recovery:{service_name}"):
            return False
        message = self._format_message(
            "📡",
            "Traffic Recovery",
            [
                ("🖥", "Service", service_name),
                ("✅", "Status", f"Bandwidth back to normal ({percent:.0f}%)"),
            ],
        )
        return await self._dispatch("traffic_recovery", message)

    # ── Uploader events ──────────────────────────────────────────

    async def notify_uploader_failed(
        self, failed_count: int, details: str = ""
    ) -> bool:
        if not self._check_cooldown("uploader_failed"):
            return False
        message = self._format_message(
            "📤",
            "Uploader Failed Items",
            [
                ("🔢", "Failed", str(failed_count)),
                ("ℹ️", "Details", details),
            ],
        )
        return await self._dispatch("uploader_failed", message)

    # ── Posterizarr events ────────────────────────────────────────

    async def notify_posterizarr_error(self, instance_name: str, error: str) -> bool:
        if not self._check_cooldown(f"posterizarr_error:{instance_name}"):
            return False
        message = self._format_message(
            "🖼",
            "Posterizarr Error",
            [
                ("🖥", "Instance", instance_name),
                ("❌", "Error", error),
            ],
        )
        return await self._dispatch("posterizarr_error", message)

    # ── Autoscan events ───────────────────────────────

    async def notify_autoscan_error(self, instance_name: str, error: str) -> bool:
        if not self._check_cooldown(f"autoscan_error:{instance_name}"):
            return False
        message = self._format_message(
            "🔗",
            "Autoscan Error",
            [
                ("🖥", "Instance", instance_name),
                ("❌", "Error", error),
            ],
        )
        return await self._dispatch("autoscan_error", message)

    async def notify_autoscan_recovery(self, instance_name: str) -> bool:
        if not self._check_cooldown(f"autoscan_recovery:{instance_name}"):
            return False
        message = self._format_message(
            "🔗",
            "Autoscan Recovery",
            [
                ("🖥", "Instance", instance_name),
                ("✅", "Status", "All targets reachable"),
            ],
        )
        return await self._dispatch("autoscan_recovery", message)

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
