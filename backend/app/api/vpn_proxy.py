from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger
from app.services.notifications import notification_service

router = APIRouter(prefix="/api/vpn-proxy", tags=["vpn-proxy"])

# Track whether we already logged the "not configured" message
_logged_not_configured = False


def get_vpn_proxy_config() -> tuple[str, str]:
    """Return (base_url, api_key) from runtime settings."""
    url = getattr(settings, "VPN_PROXY_URL", "")
    api_key = getattr(settings, "VPN_PROXY_API_KEY", "")
    return url, api_key


def _is_configured() -> bool:
    url, api_key = get_vpn_proxy_config()
    return bool(url and api_key)


async def proxy_get(path: str):
    """Forward a GET request to the VPN Proxy Manager API."""
    base_url, api_key = get_vpn_proxy_config()
    if not base_url or not api_key:
        global _logged_not_configured
        if not _logged_not_configured:
            logger.info("VPN Proxy Manager not configured — skipping request")
            _logged_not_configured = True
        return None

    url = f"{base_url.rstrip('/')}/api{path}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers={"X-API-Key": api_key})
            resp.raise_for_status()
            return resp.json()
    except httpx.RequestError as e:
        logger.error(f"VPN Proxy Manager unreachable: {e}")
        try:
            await notification_service.notify_vpn_error(str(e), url=base_url)
        except Exception:
            pass
        raise HTTPException(
            status_code=502, detail=f"VPN Proxy Manager unreachable: {e}"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"VPN Proxy Manager error: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


async def proxy_post(path: str):
    """Forward a POST request to the VPN Proxy Manager API."""
    base_url, api_key = get_vpn_proxy_config()
    if not base_url or not api_key:
        raise HTTPException(status_code=400, detail="VPN Proxy Manager not configured")

    url = f"{base_url.rstrip('/')}/api{path}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers={"X-API-Key": api_key})
            resp.raise_for_status()
            return resp.json()
    except httpx.RequestError as e:
        logger.error(f"VPN Proxy Manager unreachable: {e}")
        raise HTTPException(
            status_code=502, detail=f"VPN Proxy Manager unreachable: {e}"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"VPN Proxy Manager error: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.get("/status")
async def vpn_proxy_status(username: str = Depends(require_auth)):
    """Check if VPN Proxy Manager is reachable."""
    base_url, api_key = get_vpn_proxy_config()
    if not base_url or not api_key:
        return {"connected": False, "error": "Not configured"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{base_url.rstrip('/')}/api/health",
                headers={"X-API-Key": api_key},
            )
            resp.raise_for_status()
            return {"connected": True, "url": base_url}
    except Exception as e:
        return {"connected": False, "error": str(e)}


@router.get("/containers")
async def get_containers(username: str = Depends(require_auth)):
    """Get all VPN containers."""
    if not _is_configured():
        return []
    return await proxy_get("/containers") or []


@router.get("/containers/vpn-info-batch")
async def get_vpn_info_batch(username: str = Depends(require_auth)):
    """Get VPN info for all running containers."""
    if not _is_configured():
        return {}
    return await proxy_get("/containers/vpn-info-batch") or {}


@router.get("/containers/dependents")
async def get_dependents(username: str = Depends(require_auth)):
    """Get all dependent containers."""
    if not _is_configured():
        return []
    return await proxy_get("/containers/dependents") or []


@router.get("/containers/dependents-batch")
async def get_dependents_batch(username: str = Depends(require_auth)):
    """Get dependents for every VPN container, keyed by container DB id."""
    if not _is_configured():
        return {}
    containers = await proxy_get("/containers") or []
    import asyncio

    async def _fetch(cid: int):
        try:
            deps = await proxy_get(f"/containers/{cid}/dependents")
            return cid, deps or []
        except Exception:
            return cid, []

    tasks = [_fetch(c["id"]) for c in containers if c.get("id")]
    pairs = await asyncio.gather(*tasks)
    return {str(cid): deps for cid, deps in pairs if deps}


@router.get("/containers/{container_id}")
async def get_container(container_id: int, username: str = Depends(require_auth)):
    """Get a single container."""
    if not _is_configured():
        return {"error": "Not configured"}
    return await proxy_get(f"/containers/{container_id}")


@router.get("/containers/{container_id}/vpn-info")
async def get_container_vpn_info(
    container_id: int, username: str = Depends(require_auth)
):
    """Get VPN info for a single container."""
    if not _is_configured():
        return {"error": "Not configured"}
    return await proxy_get(f"/containers/{container_id}/vpn-info")


@router.get("/system/docker-status")
async def get_docker_status(username: str = Depends(require_auth)):
    """Get Docker system status from VPN Proxy Manager."""
    if not _is_configured():
        return {"error": "Not configured"}
    return await proxy_get("/system/docker-status")


# --- Monitoring endpoints (proxy to VPN-Proxy Manager's monitoring API) ---


@router.get("/monitoring/status")
async def get_monitoring_status(username: str = Depends(require_auth)):
    """Check if O11 monitoring is configured."""
    if not _is_configured():
        return {"configured": False}
    try:
        return await proxy_get("/monitoring/status")
    except Exception:
        return {"configured": False}


@router.get("/monitoring")
async def get_monitoring(username: str = Depends(require_auth)):
    """Get monitoring data (readers, system stats)."""
    if not _is_configured():
        return {}
    return await proxy_get("/monitoring") or {}


@router.get("/monitoring/network-usage")
async def get_network_usage(
    provider: str = "demagentatv", username: str = Depends(require_auth)
):
    """Get network usage data for a provider."""
    if not _is_configured():
        return {}
    return await proxy_get(f"/monitoring/network-usage?provider={provider}") or {}


@router.post("/containers/{container_id}/dependents/{docker_name}/{action}")
async def control_dependent(
    container_id: int,
    docker_name: str,
    action: str,
    username: str = Depends(require_auth),
):
    """Control a dependent container (start/stop/restart)."""
    if action not in ("start", "stop", "restart"):
        raise HTTPException(status_code=400, detail="Invalid action")
    if not _is_configured():
        raise HTTPException(status_code=400, detail="VPN Proxy Manager not configured")
    return await proxy_post(
        f"/containers/{container_id}/dependents/{docker_name}/{action}"
    )
