from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
import httpx
from typing import Optional, List, Any

from app.config import settings
from app.middleware.auth import require_auth
from app.utils.logger import logger

router = APIRouter(prefix="/api/overseerr", tags=["overseerr"])


class OverseerrUserCreate(BaseModel):
    """Model for creating VoDWisharr user"""

    username: str
    password: str
    email: Optional[str] = None
    email_domain: Optional[str] = None


class OverseerrUserResponse(BaseModel):
    """Response from VoDWisharr user creation"""

    success: bool
    message: str
    username: str


class OverseerrUser(BaseModel):
    """Model for VoDWisharr user in list"""

    id: int
    email: str
    username: str
    displayName: Optional[str] = None
    plexToken: Optional[str] = None
    plexId: Optional[int] = None
    avatar: Optional[str] = None
    createdAt: Optional[str] = None
    userType: Optional[int] = None


@router.post("/users", response_model=OverseerrUserResponse)
async def create_overseerr_user(
    user_data: OverseerrUserCreate, username: str = Depends(require_auth)
):
    """Create a user in VoDWisharr"""
    try:
        # Check if VoDWisharr is configured
        if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="VoDWisharr is not configured. Please set OVERSEERR_URL and OVERSEERR_API_KEY in config.json",
            )

        # Construct email
        if user_data.email:
            email = user_data.email
        elif user_data.email_domain:
            email = f"{user_data.username}@{user_data.email_domain}"
        else:
            # Use default domain if available
            default_domain = getattr(settings, "DEFAULT_EMAIL_DOMAIN", None)
            if default_domain:
                email = f"{user_data.username}@{default_domain}"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email or email_domain is required",
                )

        # Prepare request to VoDWisharr
        headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": settings.OVERSEERR_API_KEY,
        }

        payload = {
            "email": email,
            "username": user_data.username,
            "password": user_data.password,
            "permissions": 0,
        }

        # Make request to VoDWisharr
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.OVERSEERR_URL, json=payload, headers=headers
            )

            if response.status_code == 201:
                logger.info(
                    f"User {user_data.username} created in VoDWisharr by {username}"
                )
                return OverseerrUserResponse(
                    success=True,
                    message=f"User {user_data.username} created successfully",
                    username=user_data.username,
                )
            elif response.status_code == 409:
                logger.warning(
                    f"User {user_data.username} already exists in VoDWisharr"
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User {user_data.username} already exists in VoDWisharr",
                )
            else:
                logger.error(
                    f"Failed to create VoDWisharr user: {response.status_code} - {response.text}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"VoDWisharr API error: {response.text}",
                )

    except httpx.TimeoutException:
        logger.error("Timeout connecting to VoDWisharr")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timeout connecting to VoDWisharr",
        )
    except httpx.RequestError as e:
        logger.error(f"Error connecting to VoDWisharr: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to VoDWisharr: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating VoDWisharr user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get("/status")
async def check_overseerr_status(username: str = Depends(require_auth)):
    """Check if VoDWisharr is configured and reachable"""
    try:
        if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
            return {
                "configured": False,
                "reachable": False,
                "message": "VoDWisharr is not configured",
            }

        # Try to reach VoDWisharr status endpoint
        base_url = settings.OVERSEERR_URL.rsplit("/user", 1)[0]
        status_url = f"{base_url}/status"

        headers = {
            "accept": "application/json",
            "X-Api-Key": settings.OVERSEERR_API_KEY,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(status_url, headers=headers)

            if response.status_code == 200:
                return {
                    "configured": True,
                    "reachable": True,
                    "message": "VoDWisharr is configured and reachable",
                }
            else:
                return {
                    "configured": True,
                    "reachable": False,
                    "message": f"VoDWisharr returned status code: {response.status_code}",
                }

    except Exception as e:
        logger.error(f"Error checking VoDWisharr status: {e}")
        return {
            "configured": True,
            "reachable": False,
            "message": f"Failed to connect: {str(e)}",
        }


@router.get("/users")
async def get_overseerr_users(
    username: str = Depends(require_auth), search: Optional[str] = None
):
    """Get list of users from VoDWisharr with optional search"""
    try:
        # Check if VoDWisharr is configured
        if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="VoDWisharr is not configured",
            )

        # Prepare request
        base_url = settings.OVERSEERR_URL.rstrip("/api/v1/user")
        users_url = f"{base_url}/api/v1/user"

        headers = {
            "accept": "application/json",
            "X-Api-Key": settings.OVERSEERR_API_KEY,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            all_users = []
            page = 0
            page_size = 100

            # Always fetch ALL users using pagination
            logger.info(
                f"Fetching VoDWisharr users{' with search: ' + search if search else ''}..."
            )

            while True:
                params = {"take": page_size, "skip": page * page_size}
                response = await client.get(users_url, headers=headers, params=params)

                if response.status_code == 200:
                    data = response.json()
                    users = data.get("results", [])

                    if not users:
                        break  # No more users

                    all_users.extend(users)
                    logger.info(
                        f"Fetched page {page + 1}: {len(users)} users (total so far: {len(all_users)})"
                    )

                    # Check if we got fewer results than requested (last page)
                    # or if we've reached the total count indicated by pageInfo
                    page_info = data.get("pageInfo", {})
                    pages = page_info.get("pages", 0)
                    page_count = page_info.get("pageCount", 0)

                    logger.info(
                        f"Page info: pages={pages}, pageCount={page_count}, results_in_page={len(users)}"
                    )

                    # Stop if we got fewer results than page_size (last page)
                    if len(users) < page_size:
                        logger.info(
                            f"Got {len(users)} users (less than page size {page_size}), stopping pagination"
                        )
                        break

                    # Also check pageInfo if available
                    if pages > 0 and (page + 1) >= pages:
                        logger.info(f"Reached last page ({page + 1} of {pages})")
                        break

                    page += 1
                else:
                    logger.error(
                        f"Failed to fetch VoDWisharr users: {response.status_code} - {response.text}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"VoDWisharr API returned status code: {response.status_code}",
                    )

            logger.info(f"Fetched total of {len(all_users)} users from VoDWisharr")

            # Apply search filter if provided
            if search:
                search_lower = search.lower()
                all_users = [
                    user
                    for user in all_users
                    if search_lower in (user.get("username") or "").lower()
                    or search_lower in (user.get("email") or "").lower()
                    or search_lower in (user.get("displayName") or "").lower()
                ]
                logger.info(
                    f"Search '{search}' returned {len(all_users)} matching users"
                )

            return {
                "success": True,
                "users": all_users,
                "total": len(all_users),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching VoDWisharr users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}",
        )


@router.get("/requests")
async def get_overseerr_requests(username: str = Depends(require_auth)):
    """Get all requests from VoDWisharr"""
    try:
        # Check if VoDWisharr is configured
        if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="VoDWisharr is not configured",
            )

        # Prepare request
        base_url = settings.OVERSEERR_URL.rstrip("/api/v1/user")
        requests_url = f"{base_url}/api/v1/request"

        headers = {
            "accept": "application/json",
            "X-Api-Key": settings.OVERSEERR_API_KEY,
        }

        # Fetch all requests with pagination
        all_requests = []
        page = 1
        take = 50  # Number of requests per page

        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                params = {"take": take, "skip": (page - 1) * take}
                response = await client.get(
                    requests_url, headers=headers, params=params
                )

                if response.status_code == 200:
                    data = response.json()
                    requests = data.get("results", [])

                    if not requests:
                        break

                    all_requests.extend(requests)

                    # Check if we've fetched all requests
                    page_info = data.get("pageInfo", {})
                    if page_info.get("pages", 1) <= page:
                        break

                    page += 1
                else:
                    logger.error(
                        f"VoDWisharr returned status {response.status_code} for requests"
                    )
                    break

        return {"requests": all_requests, "total": len(all_requests)}

    except HTTPException:
        raise
    except httpx.RequestError as e:
        logger.error(f"Network error fetching VoDWisharr requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not connect to VoDWisharr: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error fetching VoDWisharr requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch requests: {str(e)}",
        )


@router.delete("/users/{user_id}")
async def delete_overseerr_user(user_id: int, username: str = Depends(require_auth)):
    """Delete a user from VoDWisharr"""
    try:
        # Check if VoDWisharr is configured
        if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="VoDWisharr is not configured",
            )

        # Prepare request
        base_url = settings.OVERSEERR_URL.rstrip("/api/v1/user")
        delete_url = f"{base_url}/api/v1/user/{user_id}"

        headers = {
            "accept": "application/json",
            "X-Api-Key": settings.OVERSEERR_API_KEY,
        }

        # Make delete request
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(delete_url, headers=headers)

            if response.status_code in [200, 204]:
                logger.info(f"User {user_id} deleted from VoDWisharr by {username}")
                return {
                    "success": True,
                    "message": "User deleted successfully",
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"VoDWisharr returned status {response.status_code}",
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting VoDWisharr user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}",
        )


def _overseerr_base_url() -> str:
    """Strip trailing /api/v1/user (legacy stored URL) so we can build any v1 path."""
    url = (settings.OVERSEERR_URL or "").rstrip("/")
    for suffix in ("/api/v1/user", "/api/v1"):
        if url.endswith(suffix):
            url = url[: -len(suffix)]
            break
    return url


async def _safe_get(
    client: httpx.AsyncClient, url: str, headers: dict, params: dict | None = None
):
    """GET that never raises; returns parsed JSON or None on any error."""
    try:
        resp = await client.get(url, headers=headers, params=params)
        if resp.status_code == 200:
            return resp.json()
        logger.debug(f"Overseerr GET {url} returned {resp.status_code}")
    except Exception as exc:
        logger.debug(f"Overseerr GET {url} failed: {exc}")
    return None


@router.get("/dashboard")
async def get_overseerr_dashboard(username: str = Depends(require_auth)):
    """Bundled dashboard summary: request counts, issue counts, user count.

    Designed for the dashboard polling card so the frontend issues only one
    HTTP call instead of N parallel ones. Each section degrades gracefully
    when its endpoint isn't reachable or supported.
    """
    if not settings.OVERSEERR_URL or not settings.OVERSEERR_API_KEY:
        return {
            "configured": False,
            "reachable": False,
            "requests": None,
            "issues": None,
            "users_total": 0,
        }

    base = _overseerr_base_url()
    headers = {
        "accept": "application/json",
        "X-Api-Key": settings.OVERSEERR_API_KEY,
    }

    import asyncio

    async with httpx.AsyncClient(timeout=10.0) as client:
        status_data, request_count, issue_count, users_first_page = (
            await asyncio.gather(
                _safe_get(client, f"{base}/api/v1/status", headers),
                _safe_get(client, f"{base}/api/v1/request/count", headers),
                _safe_get(client, f"{base}/api/v1/issue/count", headers),
                _safe_get(
                    client, f"{base}/api/v1/user", headers, {"take": 1, "skip": 0}
                ),
            )
        )

    reachable = status_data is not None or request_count is not None

    # Issues fallback: if /issue/count is unsupported, derive from /issue?filter=...
    issues = issue_count
    if issues is None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            open_issues, all_issues = await asyncio.gather(
                _safe_get(
                    client,
                    f"{base}/api/v1/issue",
                    headers,
                    {"take": 1, "skip": 0, "filter": "open"},
                ),
                _safe_get(
                    client,
                    f"{base}/api/v1/issue",
                    headers,
                    {"take": 1, "skip": 0, "filter": "all"},
                ),
            )
        if open_issues or all_issues:
            total = (
                (all_issues or {}).get("pageInfo", {}).get("results", 0)
                if all_issues
                else 0
            )
            open_count = (
                (open_issues or {}).get("pageInfo", {}).get("results", 0)
                if open_issues
                else 0
            )
            issues = {
                "total": total,
                "open": open_count,
                "closed": max(0, total - open_count),
                "video": 0,
                "audio": 0,
                "subtitles": 0,
                "others": 0,
            }

    # Users total — pageInfo.results is the canonical count
    users_total = 0
    if users_first_page:
        page_info = users_first_page.get("pageInfo") or {}
        users_total = int(
            page_info.get("results") or len(users_first_page.get("results") or [])
        )

    return {
        "configured": True,
        "reachable": reachable,
        "requests": request_count,
        "issues": issues,
        "users_total": users_total,
    }
