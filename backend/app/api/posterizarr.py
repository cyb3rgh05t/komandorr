from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
import httpx
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/posterizarr", tags=["posterizarr"])

# Track whether we already logged the "not configured" message
_logged_not_configured = False


def get_posterizarr_instances() -> List[dict]:
    """Return all configured Posterizarr instances."""
    return (
        list(settings.POSTERIZARR_INSTANCES) if settings.POSTERIZARR_INSTANCES else []
    )


def get_posterizarr_config(instance_id: Optional[str] = None) -> tuple[str, str]:
    """Return (base_url, api_key) for a specific instance or first instance."""
    instances = settings.POSTERIZARR_INSTANCES
    if instances:
        if instance_id:
            for inst in instances:
                if inst.get("id") == instance_id:
                    return inst.get("url", ""), inst.get("api_key", "")
            return "", ""
        # Return first instance
        first = instances[0]
        return first.get("url", ""), first.get("api_key", "")
    # Legacy fallback
    url = getattr(settings, "POSTERIZARR_URL", "")
    api_key = getattr(settings, "POSTERIZARR_API_KEY", "")
    return url, api_key


def _is_configured(instance_id: Optional[str] = None) -> bool:
    url, api_key = get_posterizarr_config(instance_id)
    return bool(url and api_key)


async def proxy_get(
    path: str, params: Optional[dict] = None, instance_id: Optional[str] = None
):
    """Forward a GET request to a Posterizarr instance."""
    base_url, api_key = get_posterizarr_config(instance_id)
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


@router.get("/instances")
async def get_posterizarr_instances_endpoint(username: str = Depends(require_auth)):
    """Return list of configured Posterizarr instances with connectivity status."""
    instances = get_posterizarr_instances()
    if not instances:
        # Legacy fallback
        url, api_key = get_posterizarr_config()
        if url and api_key:
            instances = [
                {
                    "id": "posterizarr-default",
                    "name": "Posterizarr",
                    "url": url,
                    "api_key": api_key,
                }
            ]
        else:
            return {"instances": []}

    results = []
    async with httpx.AsyncClient(timeout=5) as client:
        for inst in instances:
            url = (inst.get("url") or "").rstrip("/")
            api_key = inst.get("api_key", "")
            connected = False
            if url and api_key:
                try:
                    resp = await client.get(f"{url}/api", params={"api_key": api_key})
                    if resp.status_code == 200:
                        connected = True
                except Exception:
                    pass
            results.append(
                {
                    "id": inst.get("id", "posterizarr-default"),
                    "name": inst.get("name", "Posterizarr"),
                    "connected": connected,
                }
            )
    return {"instances": results}


@router.get("/status")
async def posterizarr_status(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Check if Posterizarr is reachable."""
    base_url, api_key = get_posterizarr_config(instance_id)
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


class PosterizarrTestRequest(BaseModel):
    url: str
    api_key: str


@router.post("/test-connection")
async def test_posterizarr_connection(
    req: PosterizarrTestRequest, username: str = Depends(require_auth)
):
    """Test connection to a specific Posterizarr instance."""
    if not req.url or not req.api_key:
        return {"connected": False, "error": "URL and API key are required"}
    try:
        url = f"{req.url.rstrip('/')}/api"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params={"api_key": req.api_key})
            resp.raise_for_status()
            return {"connected": True, "url": req.url}
    except Exception as e:
        return {"connected": False, "error": str(e)}


@router.get("/dashboard")
async def get_dashboard(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get combined dashboard data (Status + Version + System Info)."""
    if not _is_configured(instance_id):
        return {"not_configured": True}
    return await proxy_get("/dashboard/all", instance_id=instance_id) or {}


@router.get("/system-info")
async def get_system_info(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get hardware and OS information."""
    if not _is_configured(instance_id):
        return {"not_configured": True}
    return await proxy_get("/system-info", instance_id=instance_id) or {}


@router.get("/version")
async def get_version(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Check installed version against remote."""
    if not _is_configured(instance_id):
        return {"not_configured": True}
    return await proxy_get("/version", instance_id=instance_id) or {}


@router.get("/execution-status")
async def get_execution_status(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get current execution status."""
    if not _is_configured(instance_id):
        return {"not_configured": True}
    return await proxy_get("/status", instance_id=instance_id) or {}


@router.get("/scheduler")
async def get_scheduler(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get scheduler status, next run times, active jobs."""
    if not _is_configured(instance_id):
        return {"not_configured": True}
    return await proxy_get("/scheduler/status", instance_id=instance_id) or {}


@router.get("/runtime-history")
async def get_runtime_history(
    limit: Optional[int] = Query(None, description="Limit number of results"),
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get history of previous script executions."""
    if not _is_configured(instance_id):
        return {"not_configured": True, "runs": []}
    params = {}
    if limit is not None:
        params["limit"] = limit
    return (
        await proxy_get("/runtime-history", params=params, instance_id=instance_id)
        or {}
    )


@router.get("/assets/overview")
async def get_assets_overview(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get categorized overview of assets."""
    if not _is_configured(instance_id):
        return {"not_configured": True}
    return await proxy_get("/assets/overview", instance_id=instance_id) or {}


@router.get("/assets/stats")
async def get_assets_stats(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get storage usage and file counts per library folder."""
    if not _is_configured(instance_id):
        return {"not_configured": True}
    return await proxy_get("/assets/stats", instance_id=instance_id) or {}


@router.get("/plex-export/statistics")
async def get_plex_export_stats(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get Plex library export statistics."""
    if not _is_configured(instance_id):
        return {"not_configured": True}
    return await proxy_get("/plex-export/statistics", instance_id=instance_id) or {}


@router.get("/plex-export/runs")
async def get_plex_export_runs(
    instance_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get timestamps for previous Plex export runs."""
    return await proxy_get("/plex-export/runs", instance_id=instance_id)
