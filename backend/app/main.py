from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import asyncio
import os
import httpx
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from app.config import settings
from app.utils.logger import logger
from app.api.services import router as services_router
from app.api.auth import router as auth_router
from app.api.releases import router as releases_router
from app.services.monitor import monitor
from app.middleware.auth import basic_auth_middleware

# Cache for GitHub API responses
github_cache: Dict[str, Dict[str, Any]] = {
    "version": {"data": None, "timestamp": None},
}
CACHE_DURATION = timedelta(hours=1)  # Cache for 1 hour


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Komandorr Dashboard Backend")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Authentication enabled: {settings.ENABLE_AUTH}")
    logger.info(f"Timezone: {settings.TIMEZONE}")

    # Start monitoring in background
    monitoring_task = asyncio.create_task(monitor.start_monitoring(interval=60))

    yield

    # Shutdown
    logger.info("Shutting down Komandorr Dashboard Backend")
    monitor.stop_monitoring()
    monitoring_task.cancel()
    try:
        await monitoring_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Komandorr Dashboard API",
    description="Backend API for monitoring apps, websites, panels, and projects",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic Auth Middleware (only if enabled)
if settings.ENABLE_AUTH:
    app.middleware("http")(basic_auth_middleware)

# Include routers
app.include_router(services_router)
app.include_router(auth_router)
app.include_router(releases_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services_count": len(monitor.get_all_services()),
    }


@app.get("/api/version")
async def get_version():
    """Get current version and check for updates"""
    # Read version from release.txt in frontend/public directory
    version = "1.0.0"
    root_dir = Path(__file__).parent.parent.parent
    release_file = root_dir / "frontend" / "public" / "release.txt"

    try:
        if release_file.exists():
            version = release_file.read_text().strip()
            if version.startswith("v"):
                version = version[1:]
    except Exception as e:
        logger.warning(f"Could not read release.txt: {e}")

    # Check cache first
    cache = github_cache["version"]
    now = datetime.now()

    if cache["data"] and cache["timestamp"]:
        if now - cache["timestamp"] < CACHE_DURATION:
            # Return cached data with current local version
            cached_data = cache["data"].copy()
            cached_data["local"] = version
            # Recalculate update availability with current local version
            cached_data["is_update_available"] = (
                cached_data["remote"] and cached_data["remote"] != version
            )
            return cached_data

    # Check for updates from GitHub
    remote_version = None
    is_update_available = False

    try:
        headers = {}
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/repos/cyb3rgh05t/komandorr/releases/latest",
                headers=headers,
                timeout=5.0,
            )
            if response.status_code == 200:
                data = response.json()
                remote_version = data.get("tag_name", "").lstrip("v")

                # Compare versions - up to date if release.txt matches GitHub latest
                if remote_version and remote_version != version:
                    is_update_available = True
            elif response.status_code == 403:
                logger.warning(
                    "GitHub API rate limit exceeded, using cached data if available"
                )
                # If we have old cached data, use it
                if cache["data"]:
                    cached_data = cache["data"].copy()
                    cached_data["local"] = version
                    cached_data["is_update_available"] = (
                        cached_data["remote"] and cached_data["remote"] != version
                    )
                    return cached_data
    except Exception as e:
        logger.warning(f"Could not check for updates: {e}")
        # If we have old cached data, use it
        if cache["data"]:
            cached_data = cache["data"].copy()
            cached_data["local"] = version
            cached_data["is_update_available"] = (
                cached_data["remote"] and cached_data["remote"] != version
            )
            return cached_data

    result = {
        "local": version,
        "remote": remote_version,
        "is_update_available": is_update_available,
    }

    # Update cache
    github_cache["version"] = {
        "data": result.copy(),
        "timestamp": now,
    }

    return result


@app.get("/api/config")
async def get_config():
    """Get application configuration"""
    return {
        "timezone": settings.TIMEZONE,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Komandorr Dashboard API", "version": "1.0.0", "docs": "/docs"}
