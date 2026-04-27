import base64
from fastapi import APIRouter, Depends
import httpx
from pydantic import BaseModel
from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/autoscan", tags=["autoscan"])


def get_autoscan_instances() -> list[dict]:
    """Return list of Autoscan instances from runtime settings."""
    return getattr(settings, "AUTOSCAN_INSTANCES", []) or []


def _basic_auth_header(username: str, password: str) -> dict:
    """Build Basic Auth header dict if username/password given."""
    if not username and not password:
        return {}
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


async def _proxy_get(
    base_url: str, username: str, password: str, path: str, params: dict | None = None
):
    """Forward a GET request to a docker-autoscan instance."""
    url = f"{base_url.rstrip('/')}/api{path}"
    headers = _basic_auth_header(username, password)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            return resp.json()
    except httpx.RequestError as e:
        logger.error(f"Autoscan unreachable ({base_url}): {e}")
        return None
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (401, 403):
            raise
        logger.error(f"Autoscan error ({base_url}): {e.response.status_code}")
        return None


class AutoscanTestRequest(BaseModel):
    url: str
    username: str = ""
    password: str = ""


@router.post("/test-connection")
async def test_autoscan_connection(
    body: AutoscanTestRequest, username: str = Depends(require_auth)
):
    """Test connection to an Autoscan instance."""
    base_url = body.url.rstrip("/")
    headers = _basic_auth_header(body.username, body.password)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{base_url}/api/health", headers=headers)
            resp.raise_for_status()
            return {"connected": True}
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        if code in (401, 403):
            return {
                "connected": False,
                "error": f"Authentication failed ({code}) — check username/password",
            }
        return {"connected": False, "error": f"HTTP error: {code}"}
    except httpx.RequestError as e:
        return {"connected": False, "error": f"Cannot reach server: {e}"}


@router.get("/status")
async def autoscan_status(username: str = Depends(require_auth)):
    """Check status of all Autoscan instances."""
    instances = get_autoscan_instances()
    if not instances:
        return {"instances": [], "any_connected": False}

    results = []
    for inst in instances:
        base_url = inst.get("url", "")
        user = inst.get("username", "")
        pwd = inst.get("password", "")
        inst_id = inst.get("id", "")
        inst_name = inst.get("name", inst_id)
        if not base_url:
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
            headers = _basic_auth_header(user, pwd)
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{base_url.rstrip('/')}/api/health", headers=headers
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

    return {
        "instances": results,
        "any_connected": any(r["connected"] for r in results),
    }


@router.get("/dashboard")
async def get_dashboard(username: str = Depends(require_auth)):
    """Get combined dashboard data from all Autoscan instances."""
    instances = get_autoscan_instances()
    if not instances:
        return {"not_configured": True, "instances": []}

    out = []
    for inst in instances:
        base_url = inst.get("url", "")
        user = inst.get("username", "")
        pwd = inst.get("password", "")
        inst_id = inst.get("id", "")
        inst_name = inst.get("name", inst_id)

        if not base_url:
            out.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": False,
                    "error": "Not configured",
                }
            )
            continue

        try:
            health = await _proxy_get(base_url, user, pwd, "/health")
            stats = await _proxy_get(base_url, user, pwd, "/stats") or {}
            scans_data = await _proxy_get(base_url, user, pwd, "/scans") or {}
            history_data = (
                await _proxy_get(
                    base_url, user, pwd, "/scans/history", params={"limit": 100}
                )
                or {}
            )
            logs_data = (
                await _proxy_get(base_url, user, pwd, "/logs", params={"lines": 200})
                or {}
            )
            config = await _proxy_get(base_url, user, pwd, "/config") or {}
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Autoscan '{inst_name}' authentication failed: {e.response.status_code}"
            )
            out.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": False,
                    "error": f"Authentication failed ({e.response.status_code})",
                }
            )
            continue
        except Exception as e:
            logger.error(f"Failed to fetch Autoscan '{inst_name}': {e}")
            out.append(
                {
                    "id": inst_id,
                    "name": inst_name,
                    "connected": False,
                    "error": str(e),
                }
            )
            continue

        # Normalize queue/history/logs (different endpoints may return list or dict)
        queue = (
            scans_data.get("scans") if isinstance(scans_data, dict) else scans_data
        ) or []
        history = (
            history_data.get("history")
            if isinstance(history_data, dict)
            else history_data
        ) or []
        logs = (
            logs_data.get("lines") if isinstance(logs_data, dict) else logs_data
        ) or []

        out.append(
            {
                "id": inst_id,
                "name": inst_name,
                "connected": True,
                "url": base_url,
                "health": health or {},
                "stats": stats,
                "queue": queue,
                "history": history,
                "logs": logs,
                "config": config,
            }
        )

    return {"not_configured": False, "instances": out}
