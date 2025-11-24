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
    TZ: str = "UTC"  # Fallback if TZ is not set

    # GitHub Configuration (optional - for higher API rate limits)
    GITHUB_TOKEN: str = ""

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

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
