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

    # Start monitoring in background
    monitoring_task = asyncio.create_task(monitor.start_monitoring(interval=10))

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
    version="2.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={
        "syntaxHighlight.theme": "monokai",
        "persistAuthorization": True,
    },
    docs_url=None,  # Disable default docs
    redoc_url=None,  # Disable redoc
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
app.include_router(plex_router)
app.include_router(invites_router)
app.include_router(oauth_router)
app.include_router(settings_router)


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
    <title>Komandorr Dashboard API - Documentation</title>
    <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #1a1f2e;
        }
        
        /* Dark theme base */
        .swagger-ui {
            background: #1a1f2e;
            color: #e0e0e0;
        }
        
        /* Topbar styling */
        .swagger-ui .topbar {
            background: #0f1419;
            border-bottom: 3px solid #e97b2e;
            padding: 10px 0;
        }
        
        .swagger-ui .topbar .download-url-wrapper {
            display: none;
        }
        
        /* Title and version */
        .swagger-ui .info .title {
            color: #e97b2e !important;
            font-size: 36px;
        }
        
        .swagger-ui .info .title small {
            background: #e97b2e;
            color: #1a1f2e;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
        }
        
        .swagger-ui .info hgroup.main a {
            color: #4caf50;
        }
        
        /* General text */
        .swagger-ui .info p,
        .swagger-ui .info li,
        .swagger-ui .renderedMarkdown p {
            color: #d0d0d0 !important;
        }
        
        /* Section headers */
        .swagger-ui h1, .swagger-ui h2, .swagger-ui h3, 
        .swagger-ui h4, .swagger-ui h5, .swagger-ui .opblock-tag {
            color: #e0e0e0 !important;
        }
        
        /* Operation blocks */
        .swagger-ui .opblock {
            background: #252b3a;
            border: 1px solid #3a4254;
            margin: 0 0 15px;
        }
        
        .swagger-ui .opblock .opblock-summary {
            border-color: #3a4254;
        }
        
        .swagger-ui .opblock .opblock-summary-description {
            color: #d0d0d0 !important;
        }
        
        /* HTTP method colors */
        .swagger-ui .opblock.opblock-get {
            background: rgba(97, 175, 254, 0.1);
            border-color: #61affe;
        }
        
        .swagger-ui .opblock.opblock-post {
            background: rgba(73, 204, 144, 0.1);
            border-color: #49cc90;
        }
        
        .swagger-ui .opblock.opblock-put {
            background: rgba(252, 161, 48, 0.1);
            border-color: #fca130;
        }
        
        .swagger-ui .opblock.opblock-delete {
            background: rgba(249, 62, 62, 0.1);
            border-color: #f93e3e;
        }
        
        /* Method badges */
        .swagger-ui .opblock-get .opblock-summary-method {
            background: #61affe;
        }
        
        .swagger-ui .opblock-post .opblock-summary-method {
            background: #49cc90;
        }
        
        .swagger-ui .opblock-put .opblock-summary-method {
            background: #fca130;
        }
        
        .swagger-ui .opblock-delete .opblock-summary-method {
            background: #f93e3e;
        }
        
        /* Expanded operation */
        .swagger-ui .opblock .opblock-section-header {
            background: #1a1f2e;
        }
        
        .swagger-ui .opblock .opblock-section-header h4 {
            color: #e0e0e0 !important;
        }
        
        /* Tables */
        .swagger-ui table thead tr th,
        .swagger-ui table thead tr td {
            color: #e0e0e0 !important;
            border-color: #3a4254 !important;
            background: #252b3a;
        }
        
        .swagger-ui table tbody tr td {
            color: #d0d0d0 !important;
            border-color: #3a4254 !important;
        }
        
        /* Parameters */
        .swagger-ui .parameter__name,
        .swagger-ui .parameter__type {
            color: #e0e0e0 !important;
        }
        
        .swagger-ui .parameter__in {
            color: #dadada !important;
        }
        
        /* Models */
        .swagger-ui .model-box {
            background: #252b3a;
            border: 1px solid #3a4254;
        }
        
        .swagger-ui .model {
            color: #e0e0e0 !important;
        }
        
        .swagger-ui .model-title {
            color: #e97b2e !important;
        }
        
        .swagger-ui section.models .model-container {
            background: #252b3a;
        }
        
        /* Code blocks */
        .swagger-ui .highlight-code {
            background: #0f1419 !important;
        }
        
        .swagger-ui .highlight-code code {
            color: #d0d0d0 !important;
        }
        
        /* Buttons */
        .swagger-ui .btn {
            background: #e97b2e;
            border-color: #e97b2e;
            color: #fff;
        }
        
        .swagger-ui .btn:hover {
            background: #ff8c42;
            border-color: #ff8c42;
        }
        
        .swagger-ui .btn.authorize {
            background: #49cc90;
            border-color: #49cc90;
        }
        
        .swagger-ui .btn.authorize svg {
            fill: #fff;
        }
        
        /* Inputs */
        .swagger-ui input[type=text],
        .swagger-ui input[type=password],
        .swagger-ui input[type=search],
        .swagger-ui input[type=email],
        .swagger-ui input[type=file],
        .swagger-ui textarea,
        .swagger-ui select {
            background: #252b3a;
            border: 1px solid #3a4254;
            color: #e0e0e0;
        }
        
        .swagger-ui .scheme-container {
            background: #252b3a;
            border: 1px solid #3a4254;
        }
        
        /* Responses */
        .swagger-ui .responses-inner h4,
        .swagger-ui .responses-inner h5 {
            color: #e0e0e0 !important;
        }
        
        .swagger-ui .response-col_status {
            color: #e0e0e0 !important;
        }
        
        .swagger-ui .response-col_description__inner p {
            color: #d0d0d0 !important;
        }
        
        /* Authentication modal */
        .swagger-ui .dialog-ux .modal-ux {
            background: #1a1f2e;
            border: 2px solid #e97b2e;
        }
        
        .swagger-ui .dialog-ux .modal-ux-header h3 {
            color: #e97b2e !important;
        }
        
        .swagger-ui .dialog-ux .modal-ux-content p,
        .swagger-ui .dialog-ux .modal-ux-content h4 {
            color: #e0e0e0 !important;
        }
        
        /* Filter bar */
        .swagger-ui .filter-container input {
            background: #252b3a;
            border: 1px solid #3a4254;
            color: #e0e0e0;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 12px;
        }
        
        ::-webkit-scrollbar-track {
            background: #1a1f2e;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #e97b2e;
            border-radius: 6px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #ff8c42;
        }
        
        /* Links */
        .swagger-ui a {
            color: #61affe;
        }
        
        .swagger-ui a:hover {
            color: #4990e2;
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
