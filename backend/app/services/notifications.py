"""
Notification service for sending alerts via Telegram
"""

import httpx
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict
from pathlib import Path
import json

from app.utils.logger import logger


class NotificationService:
    """Service for sending notifications via Telegram"""

    def __init__(self):
        self._last_status: Dict[str, str] = {}  # Track last known status per service
        self._config_path = Path(__file__).parent.parent.parent / "data" / "config.json"

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
        """Check if Telegram notifications are enabled"""
        config = self._load_config()
        return (
            config.get("enabled", False)
            and bool(config.get("bot_token"))
            and bool(config.get("chat_id"))
        )

    def get_config(self) -> dict:
        """Get current Telegram configuration"""
        return self._load_config()

    async def send_telegram_message(
        self, message: str, parse_mode: str = "HTML"
    ) -> bool:
        """
        Send a message via Telegram Bot API

        Args:
            message: The message text to send
            parse_mode: Message format (HTML or Markdown)

        Returns:
            True if message was sent successfully
        """
        config = self._load_config()

        if not self.is_enabled():
            logger.debug("Telegram notifications disabled, skipping")
            return False

        bot_token = config.get("bot_token")
        chat_id = config.get("chat_id")

        if not bot_token or not chat_id:
            logger.warning("Telegram bot_token or chat_id not configured")
            return False

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)

                if response.status_code == 200:
                    logger.info(f"Telegram notification sent successfully")
                    return True
                else:
                    logger.error(
                        f"Telegram API error: {response.status_code} - {response.text}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")
            return False

    async def send_test_notification(self) -> bool:
        """Send a test notification to verify configuration"""
        message = (
            "🔔 <b>Komandorr Test Notification</b>\n\n"
            "✅ Your Telegram notifications are configured correctly!\n\n"
            f"<i>Sent at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</i>"
        )
        return await self.send_telegram_message(message)

    async def notify_service_status_change(
        self,
        service_name: str,
        service_url: str,
        old_status: str,
        new_status: str,
        response_time: Optional[float] = None,
    ) -> bool:
        """
        Send notification when a service status changes

        Args:
            service_name: Name of the service
            service_url: URL of the service
            old_status: Previous status (online/offline/problem)
            new_status: New status
            response_time: Response time in ms (if available)
        """
        config = self._load_config()

        if not self.is_enabled():
            return False

        # Check notification preferences
        notify_offline = config.get("notify_offline", True)
        notify_problem = config.get("notify_problem", True)
        notify_recovery = config.get("notify_recovery", True)

        # Determine notification type
        is_recovery = new_status == "online" and old_status in ("offline", "problem")
        is_problem = new_status == "problem" and old_status == "online"
        is_offline = new_status == "offline" and old_status in ("online", "problem")

        # Check if we should send this notification
        if is_recovery and not notify_recovery:
            return False
        if is_problem and not notify_problem:
            return False
        if is_offline and not notify_offline:
            return False

        # Build message
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        if is_recovery:
            emoji = "✅"
            status_text = "RECOVERED"
            details = f"Response time: {response_time:.0f}ms" if response_time else ""
        elif is_offline:
            emoji = "🔴"
            status_text = "OFFLINE"
            details = "Service is not responding"
        elif is_problem:
            emoji = "⚠️"
            status_text = "PROBLEM"
            details = (
                f"Slow response: {response_time:.0f}ms"
                if response_time
                else "Service has issues"
            )
        else:
            # Unknown transition, don't notify
            return False

        message = (
            f"{emoji} <b>Service {status_text}</b>\n\n"
            f"📌 <b>Service:</b> {service_name}\n"
            f"🔗 <b>URL:</b> {service_url}\n"
            f"📊 <b>Status:</b> {old_status} → {new_status}\n"
        )

        if details:
            message += f"ℹ️ <b>Details:</b> {details}\n"

        message += f"\n<i>{timestamp}</i>"

        return await self.send_telegram_message(message)

    def should_notify(self, service_id: str, new_status: str) -> tuple[bool, str]:
        """
        Check if we should send a notification for this status change

        Returns:
            Tuple of (should_notify, old_status)
        """
        old_status = self._last_status.get(service_id, "unknown")
        self._last_status[service_id] = new_status

        # Don't notify on first check (unknown state)
        if old_status == "unknown":
            return False, old_status

        # Don't notify if status hasn't changed
        if old_status == new_status:
            return False, old_status

        # Notify on significant changes
        significant_changes = [
            # Going offline or having problems
            (old_status == "online" and new_status in ("offline", "problem")),
            # Recovery
            (old_status in ("offline", "problem") and new_status == "online"),
            # Getting worse (problem -> offline)
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
