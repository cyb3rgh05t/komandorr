from pydantic_settings import BaseSettings
from typing import List
import json
from pathlib import Path


def load_config_json():
    """Load configuration from config.json file"""
    config_path = Path(__file__).parent.parent / "data" / "config.json"
    if config_path.exists():
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


class Settings(BaseSettings):
    """Application settings loaded from environment variables and config.json"""

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/komandorr.log"
    LOG_ENABLE_FILE: bool = True
    LOG_SHOW_TIMESTAMP_CONSOLE: bool = False
    LOG_SHOW_LOCATION_FILE: bool = True

    # Timezone Configuration
    TZ: str = "UTC"

    # GitHub Configuration (optional - for higher API rate limits)
    GITHUB_TOKEN: str = ""

    # TMDB Configuration (for invite redemption backgrounds)
    TMDB_API_KEY: str = ""

    # Overseerr Configuration (optional)
    OVERSEERR_URL: str = ""
    OVERSEERR_API_KEY: str = ""
    DEFAULT_EMAIL_DOMAIN: str = ""

    # Plex Configuration
    PLEX_SERVER_URL: str = ""
    PLEX_SERVER_TOKEN: str = ""
    PLEX_SERVER_NAME: str = "Plex Server"

    # Uploader Configuration
    UPLOADER_BASE_URL: str = ""

    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:3000"

    # Basic Authentication (defaults - can be overridden by config.json)
    ENABLE_AUTH: bool = False
    AUTH_USERNAME: str = "admin"
    AUTH_PASSWORD: str = "admin"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Override with config.json values if they exist
        config_data = load_config_json()
        if "auth" in config_data:
            auth_config = config_data["auth"]
            self.ENABLE_AUTH = auth_config.get("enabled", self.ENABLE_AUTH)
            self.AUTH_USERNAME = auth_config.get("username", self.AUTH_USERNAME)
            self.AUTH_PASSWORD = auth_config.get("password", self.AUTH_PASSWORD)
        if "logging" in config_data:
            logging_config = config_data["logging"]
            self.LOG_LEVEL = logging_config.get("level", self.LOG_LEVEL)
            self.LOG_ENABLE_FILE = logging_config.get(
                "enable_file", self.LOG_ENABLE_FILE
            )
        if "general" in config_data:
            general_config = config_data["general"]
            self.TZ = general_config.get("timezone", self.TZ)
        if "api" in config_data:
            api_config = config_data["api"]
            self.GITHUB_TOKEN = api_config.get("github_token", self.GITHUB_TOKEN)
            self.TMDB_API_KEY = api_config.get("tmdb_api_key", self.TMDB_API_KEY)
        if "overseerr" in config_data:
            overseerr_config = config_data["overseerr"]
            self.OVERSEERR_URL = overseerr_config.get("url", self.OVERSEERR_URL)
            self.OVERSEERR_API_KEY = overseerr_config.get(
                "api_key", self.OVERSEERR_API_KEY
            )
            self.DEFAULT_EMAIL_DOMAIN = overseerr_config.get(
                "email_domain", self.DEFAULT_EMAIL_DOMAIN
            )
        if "plex" in config_data:
            plex_config = config_data["plex"]
            self.PLEX_SERVER_URL = plex_config.get("server_url", self.PLEX_SERVER_URL)
            self.PLEX_SERVER_TOKEN = plex_config.get(
                "server_token", self.PLEX_SERVER_TOKEN
            )
            self.PLEX_SERVER_NAME = plex_config.get(
                "server_name", self.PLEX_SERVER_NAME
            )
        if "uploader" in config_data:
            uploader_config = config_data["uploader"]
            self.UPLOADER_BASE_URL = uploader_config.get(
                "base_url", self.UPLOADER_BASE_URL
            )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        case_sensitive = True
        # No env_file - only use environment variables from docker-compose/runtime
        # All application settings come from config.json


settings = Settings()
