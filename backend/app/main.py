from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import asyncio
import os
from pathlib import Path

from app.config import settings
from app.utils.logger import logger
from app.api.services import router as services_router
from app.api.auth import router as auth_router
from app.services.monitor import monitor
from app.middleware.auth import basic_auth_middleware


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
    # Read version from release.txt in project root
    version = "1.0.0"
    root_dir = Path(__file__).parent.parent.parent
    release_file = root_dir / "release.txt"

    try:
        if release_file.exists():
            version = release_file.read_text().strip()
            if version.startswith("v"):
                version = version[1:]
    except Exception as e:
        logger.warning(f"Could not read release.txt: {e}")

    # TODO: Implement update check against GitHub releases
    # For now, always return up to date
    return {
        "local": version,
        "is_update_available": False,
    }


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
