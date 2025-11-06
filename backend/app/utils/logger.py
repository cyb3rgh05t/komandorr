import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo


class Logger:
    """Custom Logger with console and file output support"""

    _instance: Optional["Logger"] = None
    _logger: logging.Logger

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "_initialized"):
            self._setup_logger()
            self._initialized = True

    def _setup_logger(self) -> None:
        """Setup logger with console and file handlers"""
        self._logger = logging.getLogger("komandorr")

        # Get log level from environment or default to INFO
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self._logger.setLevel(getattr(logging, log_level))

        # Get timezone from TZ environment variable (standard) or fall back to TIMEZONE
        timezone_str = os.getenv("TZ") or os.getenv("TIMEZONE", "UTC")
        try:
            self._timezone = ZoneInfo(timezone_str)
        except Exception:
            self._logger.warning(
                f"Invalid timezone '{timezone_str}', falling back to UTC"
            )
            self._timezone = ZoneInfo("UTC")

        # Create custom formatter that uses the configured timezone
        class TimezoneFormatter(logging.Formatter):
            def __init__(self, fmt, datefmt, tz):
                super().__init__(fmt, datefmt)
                self.tz = tz

            def formatTime(self, record, datefmt=None):
                dt = datetime.fromtimestamp(record.created, tz=self.tz)
                if datefmt:
                    return dt.strftime(datefmt)
                return dt.isoformat()

        # Create formatters with timezone
        console_formatter = TimezoneFormatter(
            "%(asctime)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            tz=self._timezone,
        )

        file_formatter = TimezoneFormatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            tz=self._timezone,
        )

        # Console Handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(console_formatter)
        self._logger.addHandler(console_handler)

        # File Handler - with error handling
        try:
            log_file = os.getenv("LOG_FILE", "logs/komandorr.log")
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)

            file_handler = logging.FileHandler(log_file, encoding="utf-8")
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(file_formatter)
            self._logger.addHandler(file_handler)
        except (PermissionError, OSError) as e:
            # If we can't write to log file, just use console logging
            self._logger.warning(
                f"Cannot write to log file {log_file}: {e}. Using console-only logging."
            )

    def debug(self, message: str, **kwargs) -> None:
        """Log debug message"""
        self._logger.debug(message, extra=kwargs)

    def info(self, message: str, **kwargs) -> None:
        """Log info message"""
        self._logger.info(message, extra=kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """Log warning message"""
        self._logger.warning(message, extra=kwargs)

    def error(self, message: str, **kwargs) -> None:
        """Log error message"""
        self._logger.error(message, extra=kwargs)

    def critical(self, message: str, **kwargs) -> None:
        """Log critical message"""
        self._logger.critical(message, extra=kwargs)


# Global logger instance
logger = Logger()
