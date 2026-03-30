from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/vpn-proxy", tags=["vpn-proxy"])


def get_vpn_proxy_config() -> tuple[str, str]:
    """Return (base_url, api_key) from runtime settings."""
    url = getattr(settings, "VPN_PROXY_URL", "")
    api_key = getattr(settings, "VPN_PROXY_API_KEY", "")
    return url, api_key


async def proxy_get(path: str):
    """Forward a GET request to the VPN Proxy Manager API."""
    base_url, api_key = get_vpn_proxy_config()
    if not base_url:
        raise HTTPException(
            status_code=503, detail="VPN Proxy Manager URL not configured"
        )
    if not api_key:
        raise HTTPException(
            status_code=503, detail="VPN Proxy Manager API key not configured"
        )

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
    return await proxy_get("/containers")


@router.get("/containers/vpn-info-batch")
async def get_vpn_info_batch(username: str = Depends(require_auth)):
    """Get VPN info for all running containers."""
    return await proxy_get("/containers/vpn-info-batch")


@router.get("/containers/dependents")
async def get_dependents(username: str = Depends(require_auth)):
    """Get all dependent containers."""
    return await proxy_get("/containers/dependents")


@router.get("/containers/{container_id}")
async def get_container(container_id: int, username: str = Depends(require_auth)):
    """Get a single container."""
    return await proxy_get(f"/containers/{container_id}")


@router.get("/containers/{container_id}/vpn-info")
async def get_container_vpn_info(
    container_id: int, username: str = Depends(require_auth)
):
    """Get VPN info for a single container."""
    return await proxy_get(f"/containers/{container_id}/vpn-info")


@router.get("/system/docker-status")
async def get_docker_status(username: str = Depends(require_auth)):
    """Get Docker system status from VPN Proxy Manager."""
    return await proxy_get("/system/docker-status")
