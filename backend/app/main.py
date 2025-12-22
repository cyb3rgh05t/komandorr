from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html
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
from app.api.plex import router as plex_router
from app.api.invites import router as invites_router
from app.api.oauth import router as oauth_router
from app.api.settings import router as settings_router
from app.api.overseerr import router as overseerr_router
from app.api.uploader import router as uploader_router
from app.services.monitor import monitor
from app.middleware.auth import basic_auth_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Komandorr Dashboard Backend")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Authentication enabled: {settings.ENABLE_AUTH}")
    logger.info(f"Timezone: {settings.TZ}")

    # Migrate Plex config from JSON to database if needed
    from app.api.plex import migrate_plex_config_if_needed

    migrate_plex_config_if_needed()

    # Background task to check for expired invites
    async def check_expired_invites_loop():
        """Background task to check for expired invites every hour"""
        from app.api.invites import check_expired_invites

        while True:
            try:
                await asyncio.sleep(3600)  # Check every hour
                await check_expired_invites()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in expiration check loop: {e}")

    # Start monitoring in background
    monitoring_task = asyncio.create_task(monitor.start_monitoring(interval=10))

    # Start invite expiration checker
    expiration_task = asyncio.create_task(check_expired_invites_loop())

    # Start watch history sync (every 15 minutes)
    from app.services.watch_history_sync import watch_history_sync

    watch_history_task = asyncio.create_task(
        watch_history_sync.start_sync_loop(interval=900)
    )

    # Start background stats cache (every 60 seconds)
    from app.services.stats_cache import stats_cache

    stats_cache_task = asyncio.create_task(stats_cache.start_background_refresh())

    # Start cache warmer to prevent cold starts
    from app.services.cache_warmer import cache_warmer

    cache_warmer_task = asyncio.create_task(cache_warmer.start_warming())

    yield

    # Shutdown
    logger.info("Shutting down Komandorr Dashboard Backend")
    monitor.stop_monitoring()
    watch_history_sync.stop()
    stats_cache.stop()
    cache_warmer.stop()
    monitoring_task.cancel()
    expiration_task.cancel()
    watch_history_task.cancel()
    stats_cache_task.cancel()
    cache_warmer_task.cancel()
    try:
        await monitoring_task
    except asyncio.CancelledError:
        pass
    try:
        await expiration_task
    except asyncio.CancelledError:
        pass
    try:
        await watch_history_task
    except asyncio.CancelledError:
        pass
    try:
        await stats_cache_task
    except asyncio.CancelledError:
        pass
    try:
        await cache_warmer_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Komandorr Dashboard API",
    description="Backend API for monitoring apps, websites, panels, and projects",
    version="3.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={
        "syntaxHighlight.theme": "monokai",
        "persistAuthorization": True,
    },
    docs_url=None,  # Disable default docs
    redoc_url=None,  # Disable redoc
)


# Customize OpenAPI schema to ensure proper version
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["openapi"] = "3.1.0"
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

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
app.include_router(plex_router)
app.include_router(invites_router)
app.include_router(oauth_router)
app.include_router(settings_router)
app.include_router(overseerr_router)
app.include_router(uploader_router)


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI with dark theme"""
    return HTMLResponse(
        content="""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Komandorr API Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body {
            margin: 0;
            background: #1b1b1b;
        }
        
        .swagger-ui {
            filter: invert(88%) hue-rotate(180deg);
        }
        
        .swagger-ui .microlight {
            filter: invert(100%) hue-rotate(180deg);
        }
        
        .swagger-ui img {
            filter: invert(100%) hue-rotate(180deg);
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                url: "/openapi.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                syntaxHighlight: {
                    theme: "monokai"
                },
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                tryItOutEnabled: true
            });
        };
    </script>
</body>
</html>
"""
    )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.5.6",
        "services_count": len(monitor.get_all_services()),
    }


@app.get("/api/downloads")
async def get_downloads():
    """
    Get Plex download/sync activities
    This is an alias for /api/plex/activities for compatibility
    """
    from app.api.plex import get_plex_activities

    return await get_plex_activities()


@app.get("/api/version")
async def get_version():
    """Get current version and check for updates"""
    # Read version from release.txt in frontend/dist directory (production) or public (dev)
    version = "unknown"

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


@app.get("/api/version/debug")
async def debug_version():
    """Debug endpoint to check version file paths and existence"""
    current_file = Path(__file__).resolve()

    # Determine root directory
    if current_file.parts[-3] == "backend":
        root_dir = current_file.parent.parent.parent
        environment = "local"
    else:
        root_dir = current_file.parent.parent
        environment = "docker"

    # Check all possible paths
    dist_path = root_dir / "frontend" / "dist" / "release.txt"
    public_path = root_dir / "frontend" / "public" / "release.txt"

    debug_info = {
        "environment": environment,
        "current_file": str(current_file),
        "root_dir": str(root_dir),
        "paths_checked": {
            "dist": {
                "path": str(dist_path),
                "exists": dist_path.exists(),
                "content": None,
            },
            "public": {
                "path": str(public_path),
                "exists": public_path.exists(),
                "content": None,
            },
        },
    }

    # Try to read content from existing files
    if dist_path.exists():
        try:
            debug_info["paths_checked"]["dist"][
                "content"
            ] = dist_path.read_text().strip()
        except Exception as e:
            debug_info["paths_checked"]["dist"]["error"] = str(e)

    if public_path.exists():
        try:
            debug_info["paths_checked"]["public"][
                "content"
            ] = public_path.read_text().strip()
        except Exception as e:
            debug_info["paths_checked"]["public"]["error"] = str(e)

    return debug_info


@app.get("/api/config")
async def get_config():
    """Get application configuration"""
    return {
        "timezone": settings.TZ,
    }


from app.middleware.auth import require_auth
from fastapi import Depends


@app.post("/api/upload-icon")
async def upload_icon(
    file: UploadFile = File(...), username: str = Depends(require_auth)
):
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
