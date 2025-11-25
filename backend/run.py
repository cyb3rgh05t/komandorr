"""
Run the FastAPI application with Uvicorn
"""

import uvicorn
import logging
from colorama import Fore, Style, init

# Initialize colorama
init(autoreset=True)


class UvicornFormatter(logging.Formatter):
    """Custom formatter for Uvicorn logs with colorama colors to match our enhanced logger"""

    COLORS = {
        "INFO": Fore.GREEN,
        "WARNING": Fore.YELLOW,
        "ERROR": Fore.RED,
        "CRITICAL": Fore.MAGENTA,
    }

    def format(self, record):
        levelname = record.levelname

        # Get color for this level
        color = self.COLORS.get(levelname, Fore.WHITE)

        # Create colored level name
        colored_level = f"{color}{Style.BRIGHT}{levelname}{Style.RESET_ALL}"

        # Format message without timestamp for consistency
        return f"{colored_level} - {record.getMessage()}"


if __name__ == "__main__":
    # Configure uvicorn logging to match our enhanced logger
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": UvicornFormatter,
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "uvicorn": {"handlers": ["default"], "level": "INFO"},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"handlers": ["default"], "level": "WARNING"},
        },
    }

    # Startup message with colorama styling
    print(
        f"{Fore.GREEN}{Style.BRIGHT}INFO{Style.RESET_ALL} - Starting Komandorr Web UI on port 8000..."
    )

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_config=log_config,
        access_log=True,
    )
