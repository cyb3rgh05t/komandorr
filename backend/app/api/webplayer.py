import time
import json
import re
import subprocess
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx

from app.middleware.auth import require_auth
from app.config import settings
from app.utils.logger import logger

router = APIRouter(prefix="/api/webplayer", tags=["webplayer"])


class WebplayerTestRequest(BaseModel):
    url: str
    username: str
    password: str


_token_cache: dict[str, object] = {
    "base_url": "",
    "username": "",
    "token": "",
    "expires_at": 0.0,
}


def _extract_embedded_json_from_html(raw: str) -> dict | None:
    if not raw:
        return None

    # Common SPA pattern: window.__INITIAL_STATE__ = {...};
    m = re.search(
        r"window\.__INITIAL_STATE__\s*=\s*(\{.*?\})\s*;",
        raw,
        flags=re.DOTALL,
    )
    if m:
        blob = m.group(1)
        try:
            parsed = json.loads(blob)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    # Next.js style payload
    m = re.search(
        r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
        raw,
        flags=re.DOTALL | re.IGNORECASE,
    )
    if m:
        blob = m.group(1)
        try:
            parsed = json.loads(blob)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    return None


def _is_stats_like_dict(obj: object) -> bool:
    if not isinstance(obj, dict):
        return False
    keys = {str(k).lower() for k in obj.keys()}
    expected = {"transcode", "users", "sources", "content", "server"}
    return len(keys.intersection(expected)) >= 2


def _find_first_stats_dict(obj: object) -> dict | None:
    if isinstance(obj, dict):
        if _is_stats_like_dict(obj):
            return obj
        for value in obj.values():
            found = _find_first_stats_dict(value)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for value in obj:
            found = _find_first_stats_dict(value)
            if found is not None:
                return found
    return None


def _looks_like_log_entry(item: object) -> bool:
    if isinstance(item, str):
        return bool(item.strip())
    if not isinstance(item, dict):
        return False
    keys = {str(k).lower() for k in item.keys()}
    candidates = {
        "message",
        "msg",
        "text",
        "line",
        "action",
        "event",
        "description",
        "level",
        "severity",
        "timestamp",
        "time",
    }
    return len(keys.intersection(candidates)) >= 1


def _extract_container_log_list(payload: object) -> list[object]:
    """Extract container log entries only.

    We intentionally ignore generic activity/analytics lists because the user
    requested real container logs.
    """

    preferred_keys = {
        "containerlogs",
        "container_logs",
        "dockerlogs",
        "docker_logs",
        "servicelogs",
        "service_logs",
        "podlogs",
        "runtime_logs",
    }

    def walk(node: object) -> list[object]:
        if isinstance(node, dict):
            for key, value in node.items():
                key_l = str(key).lower().replace("-", "").replace(" ", "")

                if isinstance(value, list):
                    if key_l in preferred_keys:
                        if not value or _looks_like_log_entry(value[0]):
                            return value

                    if "container" in key_l and "log" in key_l:
                        if not value or _looks_like_log_entry(value[0]):
                            return value

                nested = walk(value)
                if nested:
                    return nested

        elif isinstance(node, list):
            for item in node:
                nested = walk(item)
                if nested:
                    return nested

        return []

    return walk(payload)


def _extract_log_list(payload: object) -> list[object]:
    if isinstance(payload, list) and payload and _looks_like_log_entry(payload[0]):
        return payload

    if isinstance(payload, dict):
        for key in (
            "logs",
            "items",
            "entries",
            "lines",
            "events",
            "activity",
            "activities",
            "recentActivity",
            "data",
        ):
            value = payload.get(key)
            if isinstance(value, list) and (
                not value or _looks_like_log_entry(value[0])
            ):
                return value

    return []


def _extract_stats_payload(payload: object) -> dict | None:
    if isinstance(payload, dict):
        if _is_stats_like_dict(payload):
            return payload

        found = _find_first_stats_dict(payload)
        if found is not None:
            return found

        raw = payload.get("raw")
        if isinstance(raw, str):
            embedded = _extract_embedded_json_from_html(raw)
            if embedded is not None:
                found = _find_first_stats_dict(embedded)
                if found is not None:
                    return found

    return None


def _extract_daily_series(obj: object) -> list[dict]:
    if isinstance(obj, list):
        result: list[dict] = []
        for idx, item in enumerate(obj):
            if isinstance(item, dict):
                label = (
                    item.get("label")
                    or item.get("day")
                    or item.get("date")
                    or item.get("name")
                    or str(idx + 1)
                )
                value = (
                    item.get("value")
                    or item.get("peak")
                    or item.get("count")
                    or item.get("streams")
                    or item.get("sessions")
                    or item.get("y")
                    or 0
                )
                try:
                    number = int(float(value))
                except Exception:
                    number = 0
                result.append({"label": str(label), "value": number})
            else:
                try:
                    number = int(float(item))
                except Exception:
                    number = 0
                result.append({"label": str(idx + 1), "value": number})
        return result

    if isinstance(obj, dict):
        result = []
        for key, value in obj.items():
            try:
                number = int(float(value))
            except Exception:
                number = 0
            result.append({"label": str(key), "value": number})
        return result

    return []


def _find_first_peak_payload(obj: object) -> dict | None:
    if isinstance(obj, dict):
        keys = {str(k).lower() for k in obj.keys()}
        score = 0
        for needle in (
            "maxpeak",
            "avgpeak",
            "totalevents",
            "daily",
            "peaks",
            "concurrent",
            "streams",
            "chart",
        ):
            if any(needle in k for k in keys):
                score += 1

        if score >= 2:
            return obj

        for value in obj.values():
            found = _find_first_peak_payload(value)
            if found is not None:
                return found

    elif isinstance(obj, list):
        for value in obj:
            found = _find_first_peak_payload(value)
            if found is not None:
                return found

    return None


def _normalize_peak_payload(payload: object) -> dict | None:
    candidate = _find_first_peak_payload(payload)
    if not isinstance(candidate, dict):
        return None

    def pick_number(keys: tuple[str, ...], default: float = 0.0) -> float:
        for key in keys:
            if key in candidate:
                try:
                    return float(candidate.get(key, default))
                except Exception:
                    continue
        return default

    max_peak = int(
        pick_number(
            (
                "maxPeak",
                "max_peak",
                "peakMax",
                "highestPeak",
                "maxConcurrent",
            ),
            0,
        )
    )
    avg_peak = float(pick_number(("avgPeak", "avg_peak", "averagePeak", "meanPeak"), 0))
    total_events = int(
        pick_number(("totalEvents", "total_events", "eventsTotal", "total"), 0)
    )

    daily_source = (
        candidate.get("daily")
        or candidate.get("dailyPeaks")
        or candidate.get("dailySeries")
        or candidate.get("chartData")
        or candidate.get("series")
        or candidate.get("points")
        or candidate.get("data")
    )
    daily = _extract_daily_series(daily_source)

    if not daily and isinstance(payload, dict):
        fallback_daily = payload.get("daily") or payload.get("dailyPeaks")
        daily = _extract_daily_series(fallback_daily)

    if max_peak <= 0 and daily:
        max_peak = max((row.get("value", 0) for row in daily), default=0)

    if avg_peak <= 0 and daily:
        avg_peak = sum((row.get("value", 0) for row in daily)) / max(len(daily), 1)

    if total_events <= 0 and daily:
        total_events = int(sum((row.get("value", 0) for row in daily)))

    return {
        "max_peak": max_peak,
        "avg_peak": round(avg_peak, 2),
        "total_events": total_events,
        "daily": daily,
    }


def _normalize_peak_from_stats_charts(payload: object) -> dict | None:
    if not isinstance(payload, dict):
        return None

    charts = payload.get("charts") if isinstance(payload.get("charts"), dict) else {}
    if not charts:
        return None

    telemetry = charts.get("playbackTelemetryDaily")
    if not isinstance(telemetry, dict):
        return None

    labels = (
        telemetry.get("labels") if isinstance(telemetry.get("labels"), list) else []
    )
    values = (
        telemetry.get("values") if isinstance(telemetry.get("values"), list) else []
    )
    if not labels or not values:
        return None

    daily: list[dict] = []
    for idx, value in enumerate(values):
        label = labels[idx] if idx < len(labels) else str(idx + 1)
        try:
            number = int(float(value))
        except Exception:
            number = 0
        daily.append({"label": str(label), "value": number})

    values_only = [int(row.get("value", 0)) for row in daily]
    total_events = int(sum(values_only))
    max_peak = int(max(values_only) if values_only else 0)
    avg_peak = (total_events / len(values_only)) if values_only else 0

    return {
        "max_peak": max_peak,
        "avg_peak": round(avg_peak, 2),
        "total_events": total_events,
        "daily": daily,
    }


def _synthetic_logs_from_stats(payload: object) -> list[dict]:
    if not isinstance(payload, dict):
        return []

    charts = payload.get("charts") if isinstance(payload.get("charts"), dict) else {}
    if not charts:
        return []

    out: list[dict] = []

    telemetry = charts.get("playbackTelemetryDaily")
    if isinstance(telemetry, dict):
        labels_obj = telemetry.get("labels")
        values_obj = telemetry.get("values")
        labels = labels_obj if isinstance(labels_obj, list) else []
        values = values_obj if isinstance(values_obj, list) else []
        for idx, value in enumerate(values):
            try:
                number = int(float(value))
            except Exception:
                number = 0
            if number <= 0:
                continue
            label = labels[idx] if idx < len(labels) else str(idx + 1)
            out.append(
                {
                    "timestamp": str(label),
                    "level": "info",
                    "message": f"Playback telemetry events: {number}",
                }
            )

    users_trend = charts.get("usersTrend7d")
    if isinstance(users_trend, dict):
        labels_obj = users_trend.get("labels")
        values_obj = users_trend.get("values")
        labels = labels_obj if isinstance(labels_obj, list) else []
        values = values_obj if isinstance(values_obj, list) else []
        for idx, value in enumerate(values):
            try:
                number = int(float(value))
            except Exception:
                number = 0
            if number <= 0:
                continue
            label = labels[idx] if idx < len(labels) else str(idx + 1)
            out.append(
                {
                    "timestamp": str(label),
                    "level": "info",
                    "message": f"New users: {number}",
                }
            )

    out.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
    return out[:80]


def _looks_like_html(value: object) -> bool:
    if not isinstance(value, str):
        return False
    sample = value.strip().lower()
    return (
        sample.startswith("<!doctype html")
        or "<html" in sample
        or "<head" in sample
        or "<body" in sample
        or "<script" in sample
    )


def get_webplayer_config() -> tuple[str, str, str]:
    base_url = getattr(settings, "WEBPLAYER_BASE_URL", "") or ""
    username = getattr(settings, "WEBPLAYER_USERNAME", "") or ""
    password = getattr(settings, "WEBPLAYER_PASSWORD", "") or ""
    return base_url.strip(), username.strip(), password


def is_configured(base_url: str, username: str, password: str) -> bool:
    return bool(base_url and username and password)


def _try_local_docker_container_logs() -> tuple[list[dict], str] | None:
    """Fallback for environments where Webplayer API does not expose logs.

    Reads logs from local Docker daemon (same host where Komandorr runs).
    """

    try:
        ps = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=8,
            check=False,
        )
    except Exception:
        return None

    if ps.returncode != 0:
        return None

    names = [line.strip() for line in ps.stdout.splitlines() if line.strip()]
    if not names:
        return None

    configured_name = getattr(settings, "WEBPLAYER_CONTAINER_NAME", "") or ""
    candidates: list[str] = []

    if configured_name:
        candidates.extend([n for n in names if n == configured_name])
        candidates.extend(
            [
                n
                for n in names
                if configured_name.lower() in n.lower() and n not in candidates
            ]
        )

    fuzzy = [
        n
        for n in names
        if re.search(r"(webplayer|streamnet|iptv|vod)", n, flags=re.IGNORECASE)
        and n not in candidates
    ]
    candidates.extend(fuzzy)

    for name in candidates:
        try:
            logs_cmd = subprocess.run(
                ["docker", "logs", "--tail", "200", name],
                capture_output=True,
                text=True,
                timeout=12,
                check=False,
            )
        except Exception:
            continue

        if logs_cmd.returncode != 0:
            continue

        text = (logs_cmd.stdout or "").strip()
        if not text:
            continue

        lines = [line for line in text.splitlines() if line.strip()]
        logs = [
            {"timestamp": "", "level": "info", "message": line.strip()}
            for line in lines[-200:]
        ]
        if logs:
            return logs, f"docker://{name}"

    return None


async def get_admin_token(base_url: str, username: str, password: str) -> str:
    now = time.time()
    cache_expires = _token_cache.get("expires_at", 0.0)
    if isinstance(cache_expires, (int, float)):
        cache_expires = float(cache_expires)
    else:
        cache_expires = 0.0

    if (
        _token_cache.get("token")
        and _token_cache.get("base_url") == base_url
        and _token_cache.get("username") == username
        and cache_expires > now
    ):
        return str(_token_cache.get("token", ""))

    login_url = f"{base_url.rstrip('/')}/api/auth/admin-login"
    payload = {"username": username, "password": password}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.post(login_url, json=payload)
            resp.raise_for_status()
            data = (
                resp.json()
                if "application/json" in resp.headers.get("content-type", "")
                else {}
            )
            token = data.get("token")
            if not token:
                raise HTTPException(
                    status_code=502, detail="Webplayer login did not return a token"
                )

            _token_cache["base_url"] = base_url
            _token_cache["username"] = username
            _token_cache["token"] = token
            _token_cache["expires_at"] = now + 20 * 60
            return token
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        if code in (401, 403):
            raise HTTPException(
                status_code=401, detail="Webplayer authentication failed"
            )
        raise HTTPException(
            status_code=502, detail=f"Webplayer login failed with HTTP {code}"
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Webplayer unreachable: {e}")


async def proxy_admin_get(
    base_url: str,
    username: str,
    password: str,
    endpoint: str,
):
    token = await get_admin_token(base_url, username, password)
    url = f"{base_url.rstrip('/')}{endpoint}"
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=headers)

        # Token may have expired server-side; retry once with fresh login.
        if resp.status_code == 401:
            _token_cache["token"] = ""
            _token_cache["expires_at"] = 0.0
            token = await get_admin_token(base_url, username, password)
            headers = {"Authorization": f"Bearer {token}"}
            resp = await client.get(url, headers=headers)

        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Webplayer admin endpoint failed with HTTP {e.response.status_code}",
            )

        if "application/json" in resp.headers.get("content-type", ""):
            return resp.json()
        return {"raw": resp.text}


@router.post("/test-connection")
async def test_connection(
    body: WebplayerTestRequest, username: str = Depends(require_auth)
):
    base_url = body.url.strip()
    if not is_configured(base_url, body.username, body.password):
        return {"connected": False, "error": "Missing URL, username or password"}

    try:
        stats = await proxy_admin_get(
            base_url, body.username, body.password, "/api/admin/stats"
        )
        return {
            "connected": True,
            "has_stats": isinstance(stats, dict),
        }
    except HTTPException as e:
        return {"connected": False, "error": e.detail}
    except Exception as e:
        logger.error(f"Webplayer test connection failed: {e}")
        return {"connected": False, "error": str(e)}


@router.get("/status")
async def get_status(username: str = Depends(require_auth)):
    base_url, user, pwd = get_webplayer_config()
    if not is_configured(base_url, user, pwd):
        return {"connected": False, "not_configured": True, "error": "Not configured"}

    try:
        stats = await proxy_admin_get(base_url, user, pwd, "/api/admin/stats")
        return {
            "connected": True,
            "not_configured": False,
            "base_url": base_url,
            "timestamp": stats.get("timestamp") if isinstance(stats, dict) else None,
        }
    except HTTPException as e:
        return {
            "connected": False,
            "not_configured": False,
            "base_url": base_url,
            "error": e.detail,
        }
    except Exception as e:
        logger.error(f"Webplayer status failed: {e}")
        return {
            "connected": False,
            "not_configured": False,
            "base_url": base_url,
            "error": str(e),
        }


@router.get("/stats")
async def get_stats(username: str = Depends(require_auth)):
    base_url, user, pwd = get_webplayer_config()
    if not is_configured(base_url, user, pwd):
        return {"not_configured": True}

    candidates = [
        "/api/admin/stats",
        "/api/admin/dashboard",
        "/api/admin/metrics",
        "/api/dashboard/stats",
    ]

    last_error = None
    for endpoint in candidates:
        try:
            payload = await proxy_admin_get(base_url, user, pwd, endpoint)
            extracted = _extract_stats_payload(payload)
            if extracted is not None:
                result = dict(extracted)
                result["_source"] = endpoint
                return result
        except HTTPException as e:
            last_error = str(e.detail)
        except Exception as e:
            last_error = str(e)

    raise HTTPException(
        status_code=502,
        detail=last_error or "Webplayer stats endpoint returned no usable data",
    )


@router.get("/live-metrics")
async def get_live_metrics(username: str = Depends(require_auth)):
    base_url, user, pwd = get_webplayer_config()
    if not is_configured(base_url, user, pwd):
        return {"not_configured": True}
    return await proxy_admin_get(base_url, user, pwd, "/api/admin/live-metrics")


@router.get("/peak-stats")
async def get_peak_stats(username: str = Depends(require_auth)):
    base_url, user, pwd = get_webplayer_config()
    if not is_configured(base_url, user, pwd):
        return {"not_configured": True, "daily": []}

    candidates = [
        "/api/admin/peak-stats",
        "/api/admin/stream-peaks",
        "/api/admin/analytics/peaks",
        "/api/admin/dashboard/peaks",
        "/api/admin/stats",
        "/api/admin/dashboard",
    ]

    # Primary source for this StreamNet build: /api/admin/stats charts payload.
    try:
        stats_payload = await proxy_admin_get(base_url, user, pwd, "/api/admin/stats")
        from_stats = _normalize_peak_from_stats_charts(stats_payload)
        if from_stats is not None:
            from_stats["source"] = "/api/admin/stats#charts.playbackTelemetryDaily"
            return from_stats
    except Exception as e:
        last_error = str(e)

    last_error = None
    for endpoint in candidates:
        try:
            payload = await proxy_admin_get(base_url, user, pwd, endpoint)
            normalized = _normalize_peak_payload(payload)
            if normalized is not None and (
                normalized.get("daily")
                or normalized.get("max_peak", 0) > 0
                or normalized.get("total_events", 0) > 0
            ):
                normalized["source"] = endpoint
                return normalized

            if isinstance(payload, dict) and "raw" in payload:
                embedded = _extract_embedded_json_from_html(str(payload.get("raw", "")))
                if embedded is not None:
                    normalized = _normalize_peak_payload(embedded)
                    if normalized is not None:
                        normalized["source"] = f"{endpoint}#embedded"
                        return normalized
        except HTTPException as e:
            last_error = str(e.detail)
        except Exception as e:
            last_error = str(e)

    return {
        "max_peak": 0,
        "avg_peak": 0,
        "total_events": 0,
        "daily": [],
        "error": last_error or "Unable to fetch peak stats from Webplayer admin API",
    }


@router.get("/logs")
async def get_logs(username: str = Depends(require_auth)):
    base_url, user, pwd = get_webplayer_config()
    if not is_configured(base_url, user, pwd):
        return {"not_configured": True, "logs": []}

    candidates = [
        "/api/admin/container-logs?limit=200",
        "/api/admin/container-logs",
        "/api/admin/container/logs?limit=200",
        "/api/admin/container/logs",
        "/api/admin/docker/logs?limit=200",
        "/api/admin/docker/logs",
        "/api/admin/system/container-logs?limit=200",
        "/api/admin/system/container-logs",
        "/api/admin/runtime/logs?scope=container&limit=200",
        "/api/admin/runtime/logs?scope=container",
        "/api/admin/logs?scope=container&limit=200",
        "/api/admin/logs?scope=container",
    ]

    last_error = None
    for endpoint in candidates:
        try:
            payload = await proxy_admin_get(base_url, user, pwd, endpoint)
            logs = _extract_container_log_list(payload)
            if logs:
                return {"logs": logs, "source": endpoint}

            if isinstance(payload, dict) and "raw" in payload:
                raw = str(payload.get("raw", ""))
                if not _looks_like_html(raw) and raw.strip():
                    return {"logs": [raw], "source": endpoint}

                embedded = _extract_embedded_json_from_html(raw)
                if embedded is not None:
                    logs = _extract_container_log_list(embedded)
                    if logs:
                        return {"logs": logs, "source": f"{endpoint}#embedded"}

        except HTTPException as e:
            last_error = str(e.detail)
        except Exception as e:
            last_error = str(e)

    # Fallback: some builds embed container logs in /api/admin/stats payload.
    try:
        stats_payload = await proxy_admin_get(base_url, user, pwd, "/api/admin/stats")
        logs = _extract_container_log_list(stats_payload)
        if logs:
            return {"logs": logs, "source": "/api/admin/stats#container"}

        if isinstance(stats_payload, dict) and "raw" in stats_payload:
            embedded = _extract_embedded_json_from_html(
                str(stats_payload.get("raw", ""))
            )
            if embedded is not None:
                logs = _extract_container_log_list(embedded)
                if logs:
                    return {
                        "logs": logs,
                        "source": "/api/admin/stats#embedded-container",
                    }
    except Exception as e:
        last_error = str(e)

    local = _try_local_docker_container_logs()
    if local is not None:
        logs, source = local
        return {
            "logs": logs,
            "source": source,
            "notice": "Using local Docker container logs fallback.",
        }

    return {
        "logs": [],
        "error": last_error or "Container logs endpoint not exposed by Webplayer API",
    }
