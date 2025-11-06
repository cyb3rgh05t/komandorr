"""
Run the FastAPI application with Uvicorn
"""

import uvicorn
import logging


class UvicornFormatter(logging.Formatter):
    """Custom formatter for Uvicorn logs to match our style"""

    COLORS = {
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
    }
    RESET = "\033[0m"
    BOLD = "\033[1m"

    def format(self, record):
        levelname = record.levelname
        if levelname in self.COLORS:
            colored_level = (
                f"{self.BOLD}{self.COLORS[levelname]}{levelname}{self.RESET}"
            )
        else:
            colored_level = f"{self.BOLD}{levelname}{self.RESET}"

        # Format message without timestamp
        return f"{colored_level} - {record.getMessage()}"


if __name__ == "__main__":
    # Configure uvicorn logging
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
            "uvicorn.access": {"handlers": ["default"], "level": "INFO"},
        },
    }

    print("\033[1m\033[36mINFO\033[0m - Starting Komandorr Web UI on port 8000...")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_config=log_config,
        access_log=True,
    )
