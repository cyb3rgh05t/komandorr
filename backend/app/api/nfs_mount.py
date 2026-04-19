from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger
from app.services.notifications import notification_service

router = APIRouter(prefix="/api/nfs-mount", tags=["nfs-mount"])

# Track whether we already logged the "not configured" message
_logged_not_configured = False


def get_nfs_mount_instances() -> list[dict]:
    """Return list of NFS Mount Manager instances from runtime settings."""
    return getattr(settings, "NFS_MOUNT_INSTANCES", []) or []


def _find_instance(instance_id: str) -> dict | None:
    """Find a specific instance by ID."""
    for inst in get_nfs_mount_instances():
        if inst.get("id") == instance_id:
            return inst
    return None


async def _proxy_get(base_url: str, api_key: str, path: str):
    """Forward a GET request to a specific NFS Mount Manager API.

    Raises httpx.HTTPStatusError on 401/403 so callers can fail fast.
    Returns None on network errors or other HTTP errors.
    """
    url = f"{base_url.rstrip('/')}/api{path}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers={"X-API-Key": api_key})
            resp.raise_for_status()
            return resp.json()
    except httpx.RequestError as e:
        logger.error(f"NFS Mount Manager unreachable ({base_url}): {e}")
        return None
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (401, 403):
            raise  # Let caller handle auth failures
        logger.error(f"NFS Mount Manager error ({base_url}): {e.response.status_code}")
        return None


from pydantic import BaseModel


class NfsMountTestRequest(BaseModel):
    url: str
    api_key: str


@router.post("/test-connection")
async def test_nfs_connection(
    body: NfsMountTestRequest, username: str = Depends(require_auth)
):
    """Test connection to an NFS Mount Manager with the provided URL and API key."""
    base_url = body.url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{base_url}/api/system/health",
                headers={"X-API-Key": body.api_key},
            )
            resp.raise_for_status()
            return {"connected": True}
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        if code in (401, 403):
            return {
                "connected": False,
                "error": f"Authentication failed ({code}) — check API key",
            }
        return {"connected": False, "error": f"HTTP error: {code}"}
    except httpx.RequestError as e:
        return {"connected": False, "error": f"Cannot reach server: {e}"}


@router.get("/status")
async def nfs_mount_status(username: str = Depends(require_auth)):
    """Check status of all NFS Mount Manager instances."""
    instances = get_nfs_mount_instances()
    if not instances:
        return {"instances": [], "any_connected": False}

    results = []
    for inst in instances:
        base_url = inst.get("url", "")
        api_key = inst.get("api_key", "")
        inst_id = inst.get("id", "")
        inst_name = inst.get("name", inst_id)
        if not base_url or not api_key:
            results.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": False,
                    "error": "Not configured",
                }
            )
            continue
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{base_url.rstrip('/')}/api/system/health",
                    headers={"X-API-Key": api_key},
                )
                resp.raise_for_status()
                results.append(
                    {
                        "id": inst_id,
                        "name": inst_name,
                        "connected": True,
                        "url": base_url,
                    }
                )
        except Exception as e:
            results.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": False,
                    "error": str(e),
                }
            )

    any_connected = any(r["connected"] for r in results)
    return {"instances": results, "any_connected": any_connected}


@router.get("/dashboard")
async def get_dashboard(username: str = Depends(require_auth)):
    """Get combined dashboard data from all NFS Mount Manager instances."""
    instances = get_nfs_mount_instances()
    if not instances:
        return {"not_configured": True, "managers": []}

    global _logged_not_configured

    managers = []
    for inst in instances:
        base_url = inst.get("url", "")
        api_key = inst.get("api_key", "")
        inst_id = inst.get("id", "")
        inst_name = inst.get("name", inst_id)

        if not base_url or not api_key:
            if not _logged_not_configured:
                logger.info(
                    f"NFS Mount Manager '{inst_name}' not configured — skipping"
                )
                _logged_not_configured = True
            managers.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": False,
                    "error": "Not configured",
                    "nfs_mounts": [],
                    "nfs_mount_statuses": {},
                    "nfs_exports": [],
                    "nfs_export_statuses": {},
                    "mergerfs_configs": [],
                    "mergerfs_statuses": {},
                    "vpn_configs": [],
                    "vpn_statuses": {},
                }
            )
            continue

        try:
            mounts = await _proxy_get(base_url, api_key, "/nfs/mounts") or []
            mount_statuses = await _proxy_get(base_url, api_key, "/nfs/status") or []
            mergerfs_configs = (
                await _proxy_get(base_url, api_key, "/mergerfs/configs") or []
            )
            mergerfs_statuses = (
                await _proxy_get(base_url, api_key, "/mergerfs/status") or []
            )
            vpn_configs = await _proxy_get(base_url, api_key, "/vpn/configs") or []
            vpn_statuses = await _proxy_get(base_url, api_key, "/vpn/status") or []
            exports = await _proxy_get(base_url, api_key, "/nfs/exports") or []
            export_statuses = (
                await _proxy_get(base_url, api_key, "/nfs/exports-status") or []
            )
        except httpx.HTTPStatusError as e:
            logger.error(
                f"NFS Mount Manager '{inst_name}' authentication failed ({base_url}): {e.response.status_code} — check API key"
            )
            try:
                await notification_service.notify_nfs_error(
                    inst_name, f"Authentication failed ({e.response.status_code})"
                )
            except Exception:
                pass
            managers.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": False,
                    "error": f"Authentication failed ({e.response.status_code})",
                    "nfs_mounts": [],
                    "nfs_mount_statuses": {},
                    "nfs_exports": [],
                    "nfs_export_statuses": {},
                    "mergerfs_configs": [],
                    "mergerfs_statuses": {},
                    "vpn_configs": [],
                    "vpn_statuses": {},
                }
            )
            continue

        try:

            # Build status maps
            mount_status_map = {s["id"]: s for s in mount_statuses}
            mergerfs_status_map = {s["id"]: s for s in mergerfs_statuses}
            vpn_status_map = {s["id"]: s for s in vpn_statuses}
            export_status_map = {s["id"]: s for s in export_statuses}

            # Check for unmounted exports, mounts, or mergerfs
            issues = []
            for m in mounts:
                if m.get("enabled") and not mount_status_map.get(m["id"], {}).get(
                    "mounted"
                ):
                    issues.append(f"Mount '{m.get('name', m['id'])}' not mounted")
            for e in exports:
                st = export_status_map.get(e["id"], {})
                if e.get("enabled") and not (st.get("is_active") or e.get("is_active")):
                    issues.append(f"Export '{e.get('name', e['id'])}' not active")
            for c in mergerfs_configs:
                if not mergerfs_status_map.get(c["id"], {}).get("mounted"):
                    issues.append(f"MergerFS '{c.get('name', c['id'])}' not mounted")

            if issues:
                try:
                    await notification_service.notify_nfs_error(
                        inst_name, "; ".join(issues[:5])
                    )
                except Exception:
                    pass

            managers.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": True,
                    "nfs_mounts": mounts,
                    "nfs_mount_statuses": mount_status_map,
                    "nfs_exports": exports,
                    "nfs_export_statuses": export_status_map,
                    "mergerfs_configs": mergerfs_configs,
                    "mergerfs_statuses": mergerfs_status_map,
                    "vpn_configs": vpn_configs,
                    "vpn_statuses": vpn_status_map,
                }
            )
        except Exception as e:
            logger.error(
                f"Failed to fetch dashboard for NFS Manager '{inst_name}': {e}"
            )
            try:
                await notification_service.notify_nfs_error(inst_name, str(e))
            except Exception:
                pass
            managers.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": False,
                    "error": str(e),
                    "nfs_mounts": [],
                    "nfs_mount_statuses": {},
                    "nfs_exports": [],
                    "nfs_export_statuses": {},
                    "mergerfs_configs": [],
                    "mergerfs_statuses": {},
                    "vpn_configs": [],
                    "vpn_statuses": {},
                }
            )

    return {"not_configured": False, "managers": managers}
