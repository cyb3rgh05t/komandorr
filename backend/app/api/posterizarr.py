from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import httpx
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/posterizarr", tags=["posterizarr"])

# Track whether we already logged the "not configured" message
_logged_not_configured = False


def get_posterizarr_config() -> tuple[str, str]:
    """Return (base_url, api_key) from runtime settings."""
    url = getattr(settings, "POSTERIZARR_URL", "")
    api_key = getattr(settings, "POSTERIZARR_API_KEY", "")
    return url, api_key


def _is_configured() -> bool:
    url, api_key = get_posterizarr_config()
    return bool(url and api_key)


async def proxy_get(path: str, params: Optional[dict] = None):
    """Forward a GET request to the Posterizarr API."""
    base_url, api_key = get_posterizarr_config()
    if not base_url or not api_key:
        global _logged_not_configured
        if not _logged_not_configured:
            logger.info("Posterizarr not configured — skipping request")
            _logged_not_configured = True
        return None

    url = f"{base_url.rstrip('/')}/api{path}"
    query_params = {"api_key": api_key}
    if params:
        query_params.update(params)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=query_params)
            resp.raise_for_status()
            return resp.json()
    except httpx.RequestError as e:
        logger.error(f"Posterizarr unreachable: {e}")
        raise HTTPException(status_code=502, detail=f"Posterizarr unreachable: {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Posterizarr error: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.get("/status")
async def posterizarr_status(username: str = Depends(require_auth)):
    """Check if Posterizarr is reachable."""
    base_url, api_key = get_posterizarr_config()
    if not base_url or not api_key:
        return {"connected": False, "error": "Not configured"}
    try:
        url = f"{base_url.rstrip('/')}/api"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params={"api_key": api_key})
            resp.raise_for_status()
            return {"connected": True, "url": base_url}
    except Exception as e:
        return {"connected": False, "error": str(e)}


@router.get("/dashboard")
async def get_dashboard(username: str = Depends(require_auth)):
    """Get combined dashboard data (Status + Version + System Info)."""
    if not _is_configured():
        return {"not_configured": True}
    return await proxy_get("/dashboard/all") or {}


@router.get("/system-info")
async def get_system_info(username: str = Depends(require_auth)):
    """Get hardware and OS information."""
    if not _is_configured():
        return {"not_configured": True}
    return await proxy_get("/system-info") or {}


@router.get("/version")
async def get_version(username: str = Depends(require_auth)):
    """Check installed version against remote."""
    if not _is_configured():
        return {"not_configured": True}
    return await proxy_get("/version") or {}


@router.get("/execution-status")
async def get_execution_status(username: str = Depends(require_auth)):
    """Get current execution status."""
    if not _is_configured():
        return {"not_configured": True}
    return await proxy_get("/status") or {}


@router.get("/scheduler")
async def get_scheduler(username: str = Depends(require_auth)):
    """Get scheduler status, next run times, active jobs."""
    if not _is_configured():
        return {"not_configured": True}
    return await proxy_get("/scheduler/status") or {}


@router.get("/runtime-history")
async def get_runtime_history(
    limit: Optional[int] = Query(None, description="Limit number of results"),
    username: str = Depends(require_auth),
):
    """Get history of previous script executions."""
    if not _is_configured():
        return {"not_configured": True, "runs": []}
    params = {}
    if limit is not None:
        params["limit"] = limit
    return await proxy_get("/runtime-history", params=params) or {}


@router.get("/assets/overview")
async def get_assets_overview(username: str = Depends(require_auth)):
    """Get categorized overview of assets."""
    if not _is_configured():
        return {"not_configured": True}
    return await proxy_get("/assets/overview") or {}


@router.get("/assets/stats")
async def get_assets_stats(username: str = Depends(require_auth)):
    """Get storage usage and file counts per library folder."""
    if not _is_configured():
        return {"not_configured": True}
    return await proxy_get("/assets/stats") or {}


@router.get("/plex-export/statistics")
async def get_plex_export_stats(username: str = Depends(require_auth)):
    """Get Plex library export statistics."""
    if not _is_configured():
        return {"not_configured": True}
    return await proxy_get("/plex-export/statistics") or {}


@router.get("/plex-export/runs")
async def get_plex_export_runs(username: str = Depends(require_auth)):
    """Get timestamps for previous Plex export runs."""
    return await proxy_get("/plex-export/runs")
