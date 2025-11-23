from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import base64
from typing import Optional
from app.config import settings
from app.utils.logger import logger

security = HTTPBasic(auto_error=False)


def require_auth(
    credentials: Optional[HTTPBasicCredentials] = Depends(security),
) -> str:
    """
    Dependency function for route-level authentication
    Returns the username if authentication is successful
    """
    if not settings.ENABLE_AUTH:
        return "admin"  # Return default username when auth is disabled

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Basic"},
            detail="Authentication required",
        )

    if (
        credentials.username == settings.AUTH_USERNAME
        and credentials.password == settings.AUTH_PASSWORD
    ):
        return credentials.username

    logger.warning(f"Invalid credentials for user: {credentials.username}")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        headers={"WWW-Authenticate": "Basic"},
        detail="Invalid username or password",
    )


async def basic_auth_middleware(request: Request, call_next):
    """Middleware for Basic Authentication"""

    # Skip auth if not enabled
    if not settings.ENABLE_AUTH:
        return await call_next(request)

    # Allow auth endpoints without authentication
    if request.url.path.startswith("/api/auth/"):
        return await call_next(request)

    # Get Authorization header
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Basic "):
        logger.warning(f"Unauthorized access attempt to {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Basic"},
            content={"detail": "Authentication required"},
        )

    try:
        # Decode credentials
        credentials = base64.b64decode(auth_header.split(" ")[1]).decode("utf-8")
        username, password = credentials.split(":", 1)

        # Verify credentials
        if username == settings.AUTH_USERNAME and password == settings.AUTH_PASSWORD:
            # Authentication successful
            response = await call_next(request)
            return response
        else:
            logger.warning(f"Invalid credentials for user: {username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                headers={"WWW-Authenticate": "Basic"},
                detail="Invalid username or password",
            )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Basic"},
            content={"detail": "Authentication failed"},
        )
