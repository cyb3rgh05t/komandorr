from fastapi import APIRouter, Depends, HTTPException
import os
import httpx
from app.middleware.auth import require_auth
from app.config import settings


router = APIRouter(prefix="/api/uploader", tags=["uploader"])


def get_uploader_base_url() -> str:
    # Prefer config.json; fallback to environment; else default
    if getattr(settings, "UPLOADER_BASE_URL", ""):
        return settings.UPLOADER_BASE_URL
    return os.getenv("UPLOADER_BASE_URL", "http://uploader:8080")


async def proxy_get(path: str, params: dict | None = None):
    base = get_uploader_base_url().rstrip("/")
    url = f"{base}{path}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            # Return parsed JSON if possible, else raw text
            content_type = resp.headers.get("content-type", "")
            if "application/json" in content_type:
                return resp.json()
            return resp.text
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Uploader unreachable: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.get("/queue")
async def get_queue(username: str = Depends(require_auth)):
    return await proxy_get("/srv/api/jobs/queue.php")


@router.get("/inprogress")
async def get_inprogress(username: str = Depends(require_auth)):
    return await proxy_get("/srv/api/jobs/inprogress.php")


@router.get("/completed")
async def get_completed(
    pageNumber: int = 1, pageSize: int = 25, username: str = Depends(require_auth)
):
    params = {"pageNumber": pageNumber, "pageSize": pageSize}
    return await proxy_get("/srv/api/jobs/completed.php", params=params)


@router.get("/queue_stats")
async def get_queue_stats(username: str = Depends(require_auth)):
    return await proxy_get("/srv/api/jobs/queue_stats.php")


@router.get("/completed_today_stats")
async def get_completed_today_stats(username: str = Depends(require_auth)):
    return await proxy_get("/srv/api/jobs/completed_today_stats.php")


@router.get("/status")
async def get_status(username: str = Depends(require_auth)):
    return await proxy_get("/srv/api/system/status.php")
