from fastapi import APIRouter, Depends, HTTPException
import os
import httpx
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger
from app.services.notifications import notification_service


router = APIRouter(prefix="/api/uploader", tags=["uploader"])

# Track whether we already logged the "not configured" message
_logged_not_configured = False


def get_uploader_base_url() -> str:
    # Prefer config.json; fallback to environment; else empty
    if getattr(settings, "UPLOADER_BASE_URL", ""):
        return settings.UPLOADER_BASE_URL
    return os.getenv("UPLOADER_BASE_URL", "")


def _is_configured() -> bool:
    return bool(get_uploader_base_url())


async def proxy_get(path: str, params: dict | None = None):
    base = get_uploader_base_url()
    if not base:
        global _logged_not_configured
        if not _logged_not_configured:
            logger.info("Uploader not configured — skipping request")
            _logged_not_configured = True
        return None
    base = base.rstrip("/")
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
        logger.error(f"Uploader unreachable: {e}")
        raise HTTPException(status_code=502, detail=f"Uploader unreachable: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.get("/status")
async def get_status(username: str = Depends(require_auth)):
    if not _is_configured():
        return {"connected": False, "error": "Not configured"}
    try:
        result = await proxy_get("/srv/api/system/status.php")
        return {"connected": True, **(result if isinstance(result, dict) else {})}
    except Exception:
        return {"connected": False, "error": "Unreachable"}


@router.get("/queue")
async def get_queue(username: str = Depends(require_auth)):
    if not _is_configured():
        return {"files": [], "not_configured": True}
    return await proxy_get("/srv/api/jobs/queue.php")


@router.get("/inprogress")
async def get_inprogress(username: str = Depends(require_auth)):
    if not _is_configured():
        return {"jobs": [], "not_configured": True}
    return await proxy_get("/srv/api/jobs/inprogress.php")


@router.get("/completed")
async def get_completed(
    pageNumber: int = 1, pageSize: int = 25, username: str = Depends(require_auth)
):
    if not _is_configured():
        return {"jobs": [], "total": 0, "not_configured": True}
    params = {"pageNumber": pageNumber, "pageSize": pageSize}
    return await proxy_get("/srv/api/jobs/completed.php", params=params)


@router.get("/queue_stats")
async def get_queue_stats(username: str = Depends(require_auth)):
    if not _is_configured():
        return {"count": 0, "not_configured": True}
    return await proxy_get("/srv/api/jobs/queue_stats.php")


@router.get("/completed_today_stats")
async def get_completed_today_stats(username: str = Depends(require_auth)):
    if not _is_configured():
        return {"count": 0, "not_configured": True}
    return await proxy_get("/srv/api/jobs/completed_today_stats.php")


@router.get("/failed")
async def get_failed(
    pageNumber: int = 1, pageSize: int = 25, username: str = Depends(require_auth)
):
    if not _is_configured():
        return {"jobs": [], "total": 0, "not_configured": True}
    params = {"pageNumber": pageNumber, "pageSize": pageSize}
    return await proxy_get("/srv/api/jobs/failed.php", params=params)


@router.get("/failed_count")
async def get_failed_count(username: str = Depends(require_auth)):
    if not _is_configured():
        return {"count": 0, "not_configured": True}
    result = await proxy_get("/srv/api/jobs/failed_count.php")
    if isinstance(result, dict) and result.get("count", 0) > 0:
        try:
            await notification_service.notify_uploader_failed(result["count"])
        except Exception:
            pass
    return result
