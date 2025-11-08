from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/komandorr.log"

    # Timezone Configuration (uses TZ environment variable)
    TIMEZONE: str = "UTC"  # Fallback if TZ is not set

    # GitHub Configuration (optional - for higher API rate limits)
    GITHUB_TOKEN: str = ""

    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:3000"

    # Basic Authentication
    ENABLE_AUTH: bool = False
    AUTH_USERNAME: str = "admin"
    AUTH_PASSWORD: str = "admin"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
