"""
Enhanced Logger Module for Komandorr
====================================
Provides colored console output and detailed file logging with proper log levels.
Uses colorama for cross-platform colored terminal output.
"""

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo
from colorama import Fore, Back, Style, init

# Initialize colorama for cross-platform colored terminal support
init(autoreset=True)


class ColoredConsoleFormatter(logging.Formatter):
    """
    Custom formatter with colorama colors for different log levels.
    Provides clean, colored console output with timestamps.
    """

    # Colorama color mapping for log levels
    LEVEL_COLORS = {
        "DEBUG": Fore.CYAN,
        "INFO": Fore.GREEN,
        "WARNING": Fore.YELLOW,
        "ERROR": Fore.RED,
        "CRITICAL": Fore.MAGENTA + Style.BRIGHT,
    }

    def __init__(self, show_timestamp: bool = False):
        """
        Initialize the formatter.

        Args:
            show_timestamp: Whether to show timestamp in console output
        """
        self.show_timestamp = show_timestamp

        if show_timestamp:
            fmt = "%(asctime)s - %(levelname)s - %(message)s"
            datefmt = "%Y-%m-%d %H:%M:%S"
        else:
            fmt = "%(levelname)s - %(message)s"
            datefmt = None

        super().__init__(fmt=fmt, datefmt=datefmt)

    def format(self, record):
        """Format log record with colors"""
        # Save original levelname
        original_levelname = record.levelname

        # Get color for this level
        color = self.LEVEL_COLORS.get(record.levelname, Fore.WHITE)

        # Build colored levelname
        colored_levelname = f"{color}{Style.BRIGHT}{record.levelname}{Style.RESET_ALL}"

        # Temporarily replace levelname for formatting
        record.levelname = colored_levelname

        # Format the message with colored text
        formatted = super().format(record)

        # Add color to the message text itself
        result = (
            formatted.replace(" - ", f"{Style.RESET_ALL} - {color}") + Style.RESET_ALL
        )

        # Restore original levelname
        record.levelname = original_levelname

        return result


class DetailedFileFormatter(logging.Formatter):
    """
    Detailed formatter for file output.
    Includes timestamps, log levels, and optionally module/function names.
    """

    def __init__(self, include_location: bool = True):
        """
        Initialize the formatter.

        Args:
            include_location: Whether to include module and function names
        """
        if include_location:
            fmt = (
                "%(asctime)s - %(levelname)-8s - "
                "[%(name)s:%(funcName)s:%(lineno)d] - "
                "%(message)s"
            )
        else:
            fmt = "%(asctime)s - %(levelname)-8s - %(message)s"

        super().__init__(fmt=fmt, datefmt="%Y-%m-%d %H:%M:%S")


class Logger:
    """
    Enhanced Logger with colored console and detailed file output.

    Features:
    - Cross-platform colored console output using colorama
    - Separate formatting for console and file logs
    - Configurable log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - Automatic log file rotation support
    - Timezone-aware timestamps
    - Singleton pattern to ensure single logger instance

    Environment Variables:
    - LOG_LEVEL: Set logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - LOG_FILE: Path to log file (default: logs/komandorr.log)
    - LOG_TO_FILE: Enable/disable file logging (default: true)
    - LOG_SHOW_TIMESTAMP: Show timestamp in console (default: false)
    - LOG_FILE_INCLUDE_LOCATION: Include module/function in file logs (default: true)
    - TZ or TIMEZONE: Timezone for timestamps (default: UTC)
    """

    _instance: Optional["Logger"] = None
    _logger: logging.Logger

    def __new__(cls):
        """Singleton pattern - only one logger instance"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize logger only once"""
        if not hasattr(self, "_initialized"):
            self._setup_logger()
            self._initialized = True

    def _setup_logger(self) -> None:
        """Setup logger with console and file handlers"""
        self._logger = logging.getLogger("komandorr")
        self._logger.handlers.clear()  # Clear any existing handlers
        self._logger.propagate = False  # Prevent duplicate logs to root logger

        # Import settings here to avoid circular import
        try:
            from app.config import settings

            log_level = settings.LOG_LEVEL
            log_file = settings.LOG_FILE
            enable_file_logging = settings.LOG_ENABLE_FILE
            show_timestamp = settings.LOG_SHOW_TIMESTAMP_CONSOLE
            include_location = settings.LOG_SHOW_LOCATION_FILE
            timezone_str = settings.TZ
        except ImportError:
            # Fallback to environment variables if settings not available
            log_level = os.getenv("LOG_LEVEL", "INFO").upper()
            log_file = os.getenv("LOG_FILE", "logs/komandorr.log")
            enable_file_logging = os.getenv("LOG_ENABLE_FILE", "true").lower() == "true"
            show_timestamp = (
                os.getenv("LOG_SHOW_TIMESTAMP_CONSOLE", "false").lower() == "true"
            )
            include_location = (
                os.getenv("LOG_SHOW_LOCATION_FILE", "true").lower() == "true"
            )
            timezone_str = os.getenv("TZ") or os.getenv("TIMEZONE", "UTC")

        # Get log level
        try:
            level = getattr(logging, log_level.upper())
            self._logger.setLevel(level)
        except AttributeError:
            self._logger.setLevel(logging.INFO)
            print(
                f"{Fore.YELLOW}Warning: Invalid LOG_LEVEL '{log_level}', using INFO{Style.RESET_ALL}"
            )

        # Get timezone
        try:
            self._timezone = ZoneInfo(timezone_str)
        except Exception as e:
            print(
                f"{Fore.YELLOW}Warning: Invalid timezone '{timezone_str}', falling back to UTC: {e}{Style.RESET_ALL}"
            )
            self._timezone = ZoneInfo("UTC")

        # ===========================
        # Console Handler Setup
        # ===========================
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)  # Console shows all levels
        console_formatter = ColoredConsoleFormatter(show_timestamp=show_timestamp)
        console_handler.setFormatter(console_formatter)
        self._logger.addHandler(console_handler)

        # ===========================
        # File Handler Setup
        # ===========================
        if enable_file_logging:
            try:
                log_path = Path(log_file)
                log_path.parent.mkdir(parents=True, exist_ok=True)

                # Delete existing log file on restart
                if log_path.exists():
                    try:
                        log_path.unlink()
                    except Exception:
                        pass  # If we can't delete, just append to it

                file_handler = logging.FileHandler(log_file, encoding="utf-8")
                file_handler.setLevel(logging.DEBUG)  # File logs everything
                file_formatter = DetailedFileFormatter(
                    include_location=include_location
                )
                file_handler.setFormatter(file_formatter)
                self._logger.addHandler(file_handler)

                # Log that file logging is enabled
                self.debug(f"File logging enabled: {log_file}")

            except (PermissionError, OSError) as e:
                # If we can't write to log file, just use console logging
                print(
                    f"{Fore.YELLOW}Warning: Cannot write to log file {log_file}: {e}. "
                    f"Using console-only logging.{Style.RESET_ALL}"
                )

    def debug(self, message: str, **kwargs) -> None:
        """
        Log debug message (detailed diagnostic information).
        Use for debugging and development.
        """
        self._logger.debug(message, extra=kwargs)

    def info(self, message: str, **kwargs) -> None:
        """
        Log info message (general informational messages).
        Use for normal application flow events.
        """
        self._logger.info(message, extra=kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """
        Log warning message (warning but not critical).
        Use for deprecated features or unusual events.
        """
        self._logger.warning(message, extra=kwargs)

    def error(self, message: str, **kwargs) -> None:
        """
        Log error message (error events that might still allow application to continue).
        Use for errors that are handled but should be logged.
        """
        self._logger.error(message, extra=kwargs)

    def critical(self, message: str, **kwargs) -> None:
        """
        Log critical message (severe error events that may cause application to abort).
        Use for critical failures that require immediate attention.
        """
        self._logger.critical(message, extra=kwargs)

    def exception(self, message: str, **kwargs) -> None:
        """
        Log exception with traceback (convenience method for error + traceback).
        Use in exception handlers to log the full traceback.
        """
        self._logger.exception(message, extra=kwargs)

    def set_level(self, level: str) -> None:
        """
        Dynamically change the logging level.

        Args:
            level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        try:
            log_level = getattr(logging, level.upper())
            self._logger.setLevel(log_level)
            self.info(f"Log level changed to {level.upper()}")
        except AttributeError:
            self.error(f"Invalid log level: {level}")


# Global logger instance
logger = Logger()
