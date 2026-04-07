from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/nfs-mount", tags=["nfs-mount"])

# Track whether we already logged the "not configured" message
_logged_not_configured = False


def get_nfs_mount_config() -> tuple[str, str]:
    """Return (base_url, api_key) from runtime settings."""
    url = getattr(settings, "NFS_MOUNT_URL", "")
    api_key = getattr(settings, "NFS_MOUNT_API_KEY", "")
    return url, api_key


def _is_configured() -> bool:
    url, api_key = get_nfs_mount_config()
    return bool(url and api_key)


async def proxy_get(path: str):
    """Forward a GET request to the NFS Mount Manager API."""
    base_url, api_key = get_nfs_mount_config()
    if not base_url or not api_key:
        global _logged_not_configured
        if not _logged_not_configured:
            logger.info("NFS Mount Manager not configured — skipping request")
            _logged_not_configured = True
        return None

    url = f"{base_url.rstrip('/')}/api{path}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers={"X-API-Key": api_key})
            resp.raise_for_status()
            return resp.json()
    except httpx.RequestError as e:
        logger.error(f"NFS Mount Manager unreachable: {e}")
        raise HTTPException(
            status_code=502, detail=f"NFS Mount Manager unreachable: {e}"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"NFS Mount Manager error: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@router.get("/status")
async def nfs_mount_status(username: str = Depends(require_auth)):
    """Check if NFS Mount Manager is reachable."""
    base_url, api_key = get_nfs_mount_config()
    if not base_url or not api_key:
        return {"connected": False, "error": "Not configured"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{base_url.rstrip('/')}/api/system/health",
            )
            resp.raise_for_status()
            return {"connected": True, "url": base_url}
    except Exception as e:
        return {"connected": False, "error": str(e)}


@router.get("/dashboard")
async def get_dashboard(username: str = Depends(require_auth)):
    """Get combined dashboard data: NFS mounts, MergerFS, VPN status."""
    if not _is_configured():
        return {"not_configured": True}

    mounts = await proxy_get("/nfs/mounts") or []
    mount_statuses = await proxy_get("/nfs/status") or []
    mergerfs_configs = await proxy_get("/mergerfs/configs") or []
    mergerfs_statuses = await proxy_get("/mergerfs/status") or []
    vpn_configs = await proxy_get("/vpn/configs") or []
    vpn_statuses = await proxy_get("/vpn/status") or []
    exports = await proxy_get("/nfs/exports") or []
    export_statuses = await proxy_get("/nfs/exports/status") or []

    # Build status maps
    mount_status_map = {s["id"]: s for s in mount_statuses}
    mergerfs_status_map = {s["id"]: s for s in mergerfs_statuses}
    vpn_status_map = {s["id"]: s for s in vpn_statuses}
    export_status_map = {s["id"]: s for s in export_statuses}

    return {
        "nfs_mounts": mounts,
        "nfs_mount_statuses": mount_status_map,
        "nfs_exports": exports,
        "nfs_export_statuses": export_status_map,
        "mergerfs_configs": mergerfs_configs,
        "mergerfs_statuses": mergerfs_status_map,
        "vpn_configs": vpn_configs,
        "vpn_statuses": vpn_status_map,
    }
