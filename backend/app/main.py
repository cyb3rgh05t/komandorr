from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import asyncio
import os
import httpx
from pathlib import Path
from fastapi import UploadFile, File, HTTPException
import shutil
import uuid

from app.config import settings
from app.utils.logger import logger
from app.api.services import router as services_router
from app.api.auth import router as auth_router
from app.api.releases import router as releases_router
from app.api.traffic import router as traffic_router
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
app.include_router(releases_router)
app.include_router(traffic_router)


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
    # Read version from release.txt in frontend/dist directory (production) or public (dev)
    version = "1.0.0"

    # Determine root directory based on deployment
    # Docker: /app/app/main.py -> /app
    # Local: /path/to/komandorr/backend/app/main.py -> /path/to/komandorr
    current_file = Path(__file__).resolve()
    if current_file.parts[-3] == "backend":  # Local development
        root_dir = current_file.parent.parent.parent  # backend/app/main.py -> root
    else:  # Docker (app/app/main.py -> app)
        root_dir = current_file.parent.parent

    # Try dist first (production), then public (development)
    release_files = [
        root_dir / "frontend" / "dist" / "release.txt",
        root_dir / "frontend" / "public" / "release.txt",
    ]

    for release_file in release_files:
        try:
            if release_file.exists():
                version = release_file.read_text().strip()
                if version.startswith("v"):
                    version = version[1:]
                logger.info(f"Read version from {release_file}: {version}")
                break
        except Exception as e:
            logger.warning(f"Could not read {release_file}: {e}")
            continue  # Check for updates from GitHub
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
    except Exception as e:
        logger.warning(f"Could not check for updates: {e}")

    return {
        "local": version,
        "remote": remote_version,
        "is_update_available": is_update_available,
    }


@app.get("/api/config")
async def get_config():
    """Get application configuration"""
    return {
        "timezone": settings.TIMEZONE,
    }


@app.post("/api/upload-icon")
async def upload_icon(file: UploadFile = File(...)):
    """Upload a service icon"""
    # Validate file type
    allowed_types = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/svg+xml",
        "image/webp",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
        )

    # Create icons directory if it doesn't exist
    icons_dir = Path(__file__).parent.parent / "icons"
    icons_dir.mkdir(exist_ok=True)

    # Generate unique filename
    file_extension = Path(file.filename or "icon.png").suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = icons_dir / unique_filename

    try:
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Uploaded icon: {unique_filename}")

        return {"path": f"/icons/{unique_filename}", "filename": unique_filename}
    except Exception as e:
        logger.error(f"Failed to upload icon: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload icon")


# Mount icons directory for serving uploaded icons
icons_dir = Path(__file__).parent.parent / "icons"
icons_dir.mkdir(exist_ok=True)
app.mount("/icons", StaticFiles(directory=str(icons_dir)), name="icons")

# Mount static files for frontend (if dist folder exists)
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount(
        "/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets"
    )

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend for all non-API routes"""
        # Don't serve frontend for API routes
        if full_path.startswith("api/"):
            return {"error": "Not found"}

        # Try to serve the requested file
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Default to index.html for client-side routing
        return FileResponse(frontend_dist / "index.html")

else:

    @app.get("/")
    async def root():
        """Root endpoint when frontend is not available"""
        return {
            "message": "Komandorr Dashboard API",
            "version": "1.0.0",
            "docs": "/docs",
        }
