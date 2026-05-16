from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import httpx
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/vpn-proxy", tags=["vpn-proxy"])

# Track whether we already logged the "not configured" message
_logged_not_configured = False


def get_vpn_proxy_instances() -> list[dict]:
    """Return the configured komandorr-level VPN Proxy Manager instances."""
    instances = getattr(settings, "VPN_PROXY_INSTANCES", None) or []
    if instances:
        return list(instances)
    # Backward compat: fall back to single legacy env-style settings
    url = getattr(settings, "VPN_PROXY_URL", "")
    api_key = getattr(settings, "VPN_PROXY_API_KEY", "")
    if url or api_key:
        return [
            {
                "id": "vpn-default",
                "name": "VPN Proxy Manager",
                "url": url,
                "api_key": api_key,
            }
        ]
    return []


def get_vpn_proxy_config(vpn_id: Optional[str] = None) -> tuple[str, str]:
    """Return (base_url, api_key) for the requested komandorr instance.

    If vpn_id is provided and matches a configured instance, that one is used.
    Otherwise the first configured instance is used (backward compat).
    """
    instances = get_vpn_proxy_instances()
    if not instances:
        return "", ""
    if vpn_id:
        for inst in instances:
            if inst.get("id") == vpn_id:
                return inst.get("url", ""), inst.get("api_key", "")
        logger.warning(f"VPN Proxy instance '{vpn_id}' not found; using first")
    first = instances[0]
    return first.get("url", ""), first.get("api_key", "")


def _is_configured(vpn_id: Optional[str] = None) -> bool:
    url, api_key = get_vpn_proxy_config(vpn_id)
    return bool(url and api_key)


async def proxy_get(path: str, vpn_id: Optional[str] = None):
    """Forward a GET request to the selected VPN Proxy Manager API."""
    base_url, api_key = get_vpn_proxy_config(vpn_id)
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
        raise HTTPException(
            status_code=502, detail=f"VPN Proxy Manager unreachable: {e}"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"VPN Proxy Manager error: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


async def proxy_post(path: str, vpn_id: Optional[str] = None):
    """Forward a POST request to the selected VPN Proxy Manager API."""
    base_url, api_key = get_vpn_proxy_config(vpn_id)
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


@router.get("/instances")
async def list_instances(username: str = Depends(require_auth)):
    """List configured komandorr-level VPN Proxy Manager instances (id + name + url only)."""
    return [
        {"id": inst.get("id"), "name": inst.get("name"), "url": inst.get("url", "")}
        for inst in get_vpn_proxy_instances()
    ]


@router.get("/status")
async def vpn_proxy_status(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Check if the selected VPN Proxy Manager is reachable."""
    base_url, api_key = get_vpn_proxy_config(vpn_id)
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
async def get_containers(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get all VPN containers for the selected instance."""
    if not _is_configured(vpn_id):
        return []
    return await proxy_get("/containers", vpn_id) or []


@router.get("/containers/vpn-info-batch")
async def get_vpn_info_batch(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get VPN info for all running containers on the selected instance."""
    if not _is_configured(vpn_id):
        return {}
    return await proxy_get("/containers/vpn-info-batch", vpn_id) or {}


@router.get("/containers/dependents")
async def get_dependents(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get all dependent containers on the selected instance."""
    if not _is_configured(vpn_id):
        return []
    return await proxy_get("/containers/dependents", vpn_id) or []


@router.get("/containers/dependents-batch")
async def get_dependents_batch(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get dependents for every VPN container, keyed by container DB id."""
    if not _is_configured(vpn_id):
        return {}
    containers = await proxy_get("/containers", vpn_id) or []
    import asyncio

    async def _fetch(cid: int):
        try:
            deps = await proxy_get(f"/containers/{cid}/dependents", vpn_id)
            return cid, deps or []
        except Exception:
            return cid, []

    tasks = [_fetch(c["id"]) for c in containers if c.get("id")]
    pairs = await asyncio.gather(*tasks)
    return {str(cid): deps for cid, deps in pairs if deps}


@router.get("/containers/{container_id}")
async def get_container(
    container_id: int,
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get a single container from the selected instance."""
    if not _is_configured(vpn_id):
        return {"error": "Not configured"}
    return await proxy_get(f"/containers/{container_id}", vpn_id)


@router.get("/containers/{container_id}/vpn-info")
async def get_container_vpn_info(
    container_id: int,
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get VPN info for a single container on the selected instance."""
    if not _is_configured(vpn_id):
        return {"error": "Not configured"}
    return await proxy_get(f"/containers/{container_id}/vpn-info", vpn_id)


@router.get("/system/docker-status")
async def get_docker_status(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get Docker system status from the selected VPN Proxy Manager."""
    if not _is_configured(vpn_id):
        return {"error": "Not configured"}
    return await proxy_get("/system/docker-status", vpn_id)


# --- Monitoring endpoints (proxy to VPN-Proxy Manager's monitoring API) ---


@router.get("/monitoring/status")
async def get_monitoring_status(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Check if O11 monitoring is configured on the selected instance."""
    if not _is_configured(vpn_id):
        return {"configured": False}
    try:
        return await proxy_get("/monitoring/status", vpn_id)
    except Exception:
        return {"configured": False}


@router.get("/monitoring/instances")
async def get_monitoring_instances(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get configured O11 monitoring instances from the selected VPN Proxy Manager."""
    if not _is_configured(vpn_id):
        return []
    try:
        return await proxy_get("/settings/o11/instances", vpn_id) or []
    except Exception:
        return []


@router.get("/monitoring")
async def get_monitoring(
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get monitoring data (readers, system stats) from the selected instance."""
    if not _is_configured(vpn_id):
        return {}
    return await proxy_get("/monitoring", vpn_id) or {}


@router.get("/monitoring/instance/{instance_id}")
async def get_instance_monitoring(
    instance_id: str,
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get monitoring data for a specific O11 instance."""
    if not _is_configured(vpn_id):
        return {}
    return await proxy_get(f"/monitoring/instance/{instance_id}", vpn_id) or {}


@router.get("/monitoring/network-usage")
async def get_network_usage(
    provider: str = "demagentatv",
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get network usage data for a provider on the selected instance."""
    if not _is_configured(vpn_id):
        return {}
    return (
        await proxy_get(f"/monitoring/network-usage?provider={provider}", vpn_id) or {}
    )


@router.get("/monitoring/instance/{instance_id}/network-usage")
async def get_instance_network_usage(
    instance_id: str,
    provider: str = "demagentatv",
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Get network usage data for a provider on a specific O11 instance."""
    if not _is_configured(vpn_id):
        return {}
    return (
        await proxy_get(
            f"/monitoring/instance/{instance_id}/network-usage?provider={provider}",
            vpn_id,
        )
        or {}
    )


@router.post("/containers/{container_id}/dependents/{docker_name}/{action}")
async def control_dependent(
    container_id: int,
    docker_name: str,
    action: str,
    vpn_id: Optional[str] = Query(None),
    username: str = Depends(require_auth),
):
    """Control a dependent container (start/stop/restart) on the selected instance."""
    if action not in ("start", "stop", "restart"):
        raise HTTPException(status_code=400, detail="Invalid action")
    if not _is_configured(vpn_id):
        raise HTTPException(status_code=400, detail="VPN Proxy Manager not configured")
    return await proxy_post(
        f"/containers/{container_id}/dependents/{docker_name}/{action}", vpn_id
    )
