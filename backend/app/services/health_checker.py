"""
Background health checker for VPN, NFS, Posterizarr, Storage, and Uploader services.
Runs independently of the UI — sends Telegram notifications when problems are detected.
"""

import asyncio
import httpx
import json
from pathlib import Path
from app.utils.logger import logger
from app.services.notifications import notification_service

_STATE_FILE = Path(__file__).parent.parent.parent / "data" / "health_state.json"


class HealthChecker:
    """Periodically checks service health and sends notifications."""

    def __init__(self):
        self._running = False
        self._vpn_issue_state: dict[str, str] = {}
        self._nfs_error_state: dict[str, bool] = (
            {}
        )  # track per-instance NFS error state
        self._autoscan_error_state: dict[str, bool] = {}
        self._autoscan_target_state: dict[str, set[str]] = {}
        self._traffic_high_count: dict[str, int] = {}  # consecutive high-traffic checks
        self._traffic_high_state: dict[str, bool] = {}  # track per-service alert state
        self._storage_last_notify_day: dict[str, str] = self._load_state()

    def _load_state(self) -> dict[str, str]:
        """Load persisted daily-gate state from disk."""
        try:
            if _STATE_FILE.exists():
                data = json.loads(_STATE_FILE.read_text())
                return data.get("storage_last_notify_day", {})
        except Exception as e:
            logger.warning(f"Could not load health state: {e}")
        return {}

    def _save_state(self) -> None:
        """Persist daily-gate state to disk so it survives restarts."""
        try:
            _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
            _STATE_FILE.write_text(
                json.dumps({"storage_last_notify_day": self._storage_last_notify_day})
            )
        except Exception as e:
            logger.warning(f"Could not save health state: {e}")

    def stop(self):
        self._running = False

    async def start(self, interval: int = 60):
        """Start the health check loop."""
        self._running = True
        logger.info(f"Starting background health checker (interval: {interval}s)")

        # Wait a bit before first check to let services initialize
        await asyncio.sleep(30)

        while self._running:
            try:
                await asyncio.gather(
                    self._check_vpn(),
                    self._check_nfs(),
                    self._check_posterizarr(),
                    self._check_autoscan(),
                    self._check_storage(),
                    self._check_uploader(),
                    self._check_traffic(),
                    return_exceptions=True,
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health checker error: {e}")

            await asyncio.sleep(interval)

    # ── VPN ────────────────────────────────────────────────────────

    @staticmethod
    def _classify_vpn_issue(
        docker_status: str, vpn_status: str, has_ip: bool
    ) -> tuple[str | None, str]:
        """Return (issue_type, reason). issue_type is one of stopped/unhealthy/not_connected."""
        stopped_states = {"stopped", "exited", "dead", "removed", "created"}
        unhealthy_states = {"unhealthy"}
        connected_states = {"running", "healthy", "connected"}

        ds = (docker_status or "").lower()
        vs = (vpn_status or "").lower()

        if ds in stopped_states:
            return "stopped", f"Container status: {ds}"

        if ds in unhealthy_states or vs in unhealthy_states:
            return "unhealthy", f"VPN status: {vs or ds or 'unhealthy'}"

        if vs not in connected_states or not has_ip:
            reason = f"VPN status: {vs or 'unknown'}"
            if not has_ip:
                reason += ", no public IP"
            return "not_connected", reason

        return None, ""

    async def _check_vpn(self):
        """Check VPN container health via VPN Proxy Manager API."""
        from app.config import settings

        url = getattr(settings, "VPN_PROXY_URL", "")
        api_key = getattr(settings, "VPN_PROXY_API_KEY", "")
        if not url or not api_key:
            return

        headers = {"X-API-Key": api_key}
        base = url.rstrip("/")

        # Fetch both vpn-info-batch and full container list for proper names
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{base}/api/containers/vpn-info-batch", headers=headers
                )
                resp.raise_for_status()
                data = resp.json()

                # Fetch full container list to get docker_name / name
                container_names: dict[str, str] = {}
                container_statuses: dict[str, str] = {}
                try:
                    containers_resp = await client.get(
                        f"{base}/api/containers", headers=headers
                    )
                    containers_resp.raise_for_status()
                    for c in containers_resp.json():
                        cid = str(c.get("id", ""))
                        # Prefer docker_name, fall back to name
                        container_names[cid] = (
                            c.get("docker_name") or c.get("name") or f"Container {cid}"
                        )
                        container_statuses[cid] = (
                            c.get("docker_status") or c.get("status") or ""
                        )
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"Health checker: VPN API unreachable: {e}")
            return

        for container_id, info in data.items():
            vpn_status = (info.get("vpn_status") or "").lower()
            has_ip = bool(info.get("public_ip"))
            container_id_str = str(container_id)
            docker_status = (container_statuses.get(container_id_str) or "").lower()

            # Resolve container name: container list > vpn-info > fallback
            container_name = (
                container_names.get(container_id_str)
                or info.get("container_name")
                or f"Container {container_id}"
            )

            issue_type, reason = self._classify_vpn_issue(
                docker_status=docker_status,
                vpn_status=vpn_status,
                has_ip=has_ip,
            )
            previous_issue = self._vpn_issue_state.get(container_id_str)

            logger.debug(
                f"VPN check [{container_name}]: docker_status={docker_status or 'unknown'} "
                f"vpn_status={vpn_status or 'unknown'} has_ip={has_ip} -> "
                f"issue={issue_type or 'healthy'} ({reason or 'ok'})"
            )

            if issue_type is None:
                # VPN is healthy now — send recovery if it was previously in error
                self._vpn_issue_state[container_id_str] = "healthy"
                if previous_issue and previous_issue != "healthy":
                    logger.info(
                        f"VPN recovered [{container_name}]: previous_issue={previous_issue}"
                    )
                    try:
                        sent = await notification_service.notify_vpn_recovery(
                            container_name=container_name,
                            public_ip=info.get("public_ip", ""),
                            url=url,
                        )
                        logger.debug(
                            f"VPN recovery notification [{container_name}]: sent={sent}"
                        )
                    except Exception:
                        pass
                continue

            self._vpn_issue_state[container_id_str] = issue_type

            # stopped/exited should notify only once until recovery
            if issue_type == "stopped":
                if previous_issue != "stopped":
                    logger.warning(
                        f"VPN stopped [{container_name}]: "
                        f"docker_status={docker_status or 'unknown'} (one-shot notification)"
                    )
                    try:
                        sent = await notification_service.notify_vpn_stopped(
                            container_name=container_name,
                            status=docker_status or "unknown",
                            url=url,
                        )
                        logger.debug(
                            f"VPN stopped notification [{container_name}]: sent={sent}"
                        )
                    except Exception:
                        pass
                else:
                    logger.debug(
                        f"VPN stopped still active [{container_name}]: "
                        f"suppressing repeat notification"
                    )
                continue

            # unhealthy / not_connected should continue with cooldown behavior
            logger.warning(
                f"VPN issue [{container_name}]: type={issue_type} reason={reason}"
            )
            try:
                sent = await notification_service.notify_vpn_error(
                    container_name=container_name, error=reason, url=url
                )
                logger.debug(
                    f"VPN error notification [{container_name}]: "
                    f"type={issue_type} sent={sent}"
                )
            except Exception:
                pass

    # ── NFS ────────────────────────────────────────────────────────

    async def _check_nfs(self):
        """Check NFS mount/export/mergerfs health for all instances."""
        from app.config import settings

        instances = getattr(settings, "NFS_MOUNT_INSTANCES", []) or []
        if not instances:
            return

        for inst in instances:
            base_url = inst.get("url", "")
            api_key = inst.get("api_key", "")
            inst_name = inst.get("name", inst.get("id", "unknown"))

            if not base_url or not api_key:
                continue

            try:
                mounts, mount_statuses, exports, export_statuses = (
                    None,
                    None,
                    None,
                    None,
                )
                mergerfs_configs, mergerfs_statuses = None, None

                async with httpx.AsyncClient(timeout=15) as client:
                    headers = {"X-API-Key": api_key}
                    base = base_url.rstrip("/")

                    resps = await asyncio.gather(
                        client.get(f"{base}/api/nfs/mounts", headers=headers),
                        client.get(f"{base}/api/nfs/status", headers=headers),
                        client.get(f"{base}/api/nfs/exports", headers=headers),
                        client.get(f"{base}/api/nfs/exports-status", headers=headers),
                        client.get(f"{base}/api/mergerfs/configs", headers=headers),
                        client.get(f"{base}/api/mergerfs/status", headers=headers),
                        return_exceptions=True,
                    )

                failed_endpoints = []

                def safe_json(r, endpoint_name):
                    if isinstance(r, Exception):
                        failed_endpoints.append(endpoint_name)
                        return []
                    try:
                        r.raise_for_status()
                        return r.json()
                    except Exception:
                        failed_endpoints.append(endpoint_name)
                        return []

                mounts = safe_json(resps[0], "/nfs/mounts")
                mount_statuses = safe_json(resps[1], "/nfs/status")
                exports = safe_json(resps[2], "/nfs/exports")
                export_statuses = safe_json(resps[3], "/nfs/exports-status")
                mergerfs_configs = safe_json(resps[4], "/mergerfs/configs")
                mergerfs_statuses = safe_json(resps[5], "/mergerfs/status")

                # Check if ALL responses failed → instance completely unreachable
                all_failed = all(isinstance(r, Exception) for r in resps)
                if all_failed:
                    first_err = next(
                        (r for r in resps if isinstance(r, Exception)), None
                    )
                    self._nfs_error_state[inst_name] = True
                    try:
                        await notification_service.notify_nfs_error(
                            inst_name,
                            f"Instance unreachable: {first_err}",
                        )
                    except Exception:
                        pass
                    continue

                mount_status_map = {s["id"]: s for s in mount_statuses}
                export_status_map = {s["id"]: s for s in export_statuses}
                mergerfs_status_map = {s["id"]: s for s in mergerfs_statuses}

                issues = []
                if failed_endpoints:
                    issues.append(
                        f"API endpoint check failed: {', '.join(sorted(set(failed_endpoints)))}"
                    )

                for m in mounts:
                    if m.get("enabled") and not mount_status_map.get(m["id"], {}).get(
                        "mounted"
                    ):
                        issues.append(f"Mount '{m.get('name', m['id'])}' not mounted")
                for e in exports:
                    st = export_status_map.get(e["id"], {})
                    if e.get("enabled") and not (
                        st.get("is_active") or e.get("is_active")
                    ):
                        issues.append(f"Export '{e.get('name', e['id'])}' not active")
                for c in mergerfs_configs:
                    if not mergerfs_status_map.get(c["id"], {}).get("mounted"):
                        issues.append(
                            f"MergerFS '{c.get('name', c['id'])}' not mounted"
                        )

                if issues:
                    self._nfs_error_state[inst_name] = True
                    try:
                        await notification_service.notify_nfs_error(
                            inst_name, "; ".join(issues[:5])
                        )
                    except Exception:
                        pass
                else:
                    # No issues — send recovery if previously in error
                    if self._nfs_error_state.get(inst_name):
                        self._nfs_error_state[inst_name] = False
                        try:
                            await notification_service.notify_nfs_recovery(inst_name)
                        except Exception:
                            pass

            except Exception as e:
                self._nfs_error_state[inst_name] = True
                logger.debug(f"Health checker: NFS '{inst_name}' check failed: {e}")
                try:
                    await notification_service.notify_nfs_error(inst_name, str(e))
                except Exception:
                    pass

    # ── Posterizarr ────────────────────────────────────────────────

    async def _check_posterizarr(self):
        """Check Posterizarr runtime history for errors."""
        from app.config import settings

        instances = (
            list(settings.POSTERIZARR_INSTANCES)
            if getattr(settings, "POSTERIZARR_INSTANCES", None)
            else []
        )
        if not instances:
            return

        for inst in instances:
            inst_url = inst.get("url", "")
            inst_api_key = inst.get("api_key", "")
            inst_name = inst.get("name", inst.get("id", "unknown"))
            inst_id = inst.get("id", "")

            if not inst_url or not inst_api_key:
                continue

            try:
                url = f"{inst_url.rstrip('/')}/api/runtime-history"
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(
                        url, params={"api_key": inst_api_key, "limit": 1}
                    )
                    resp.raise_for_status()
                    data = resp.json()
            except Exception as e:
                logger.debug(
                    f"Health checker: Posterizarr '{inst_name}' unreachable: {e}"
                )
                continue

            history_items = data.get("history", [])
            if history_items:
                latest = history_items[0]
                error_count = latest.get("errors", 0) or 0
                if error_count > 0:
                    try:
                        await notification_service.notify_posterizarr_error(
                            inst_name,
                            f"Latest run had {error_count} error(s)",
                        )
                    except Exception:
                        pass

    # ── Autoscan ─────────────────────────────────────────

    async def _check_autoscan(self):
        """Check Autoscan instance reachability + per-target availability."""
        import base64 as _b64
        from app.config import settings

        instances = list(getattr(settings, "AUTOSCAN_INSTANCES", []) or [])
        if not instances:
            return

        for inst in instances:
            inst_url = (inst.get("url") or "").rstrip("/")
            inst_name = inst.get("name") or inst.get("id") or "autoscan"
            user = inst.get("username") or ""
            pwd = inst.get("password") or ""
            if not inst_url:
                continue

            headers = {}
            if user or pwd:
                token = _b64.b64encode(f"{user}:{pwd}".encode()).decode()
                headers["Authorization"] = f"Basic {token}"

            # 1) instance reachability via /api/health
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(f"{inst_url}/api/health", headers=headers)
                    resp.raise_for_status()
            except Exception as e:
                logger.debug(f"Health checker: Autoscan '{inst_name}' unreachable: {e}")
                if not self._autoscan_error_state.get(inst_name):
                    self._autoscan_error_state[inst_name] = True
                    try:
                        await notification_service.notify_autoscan_error(
                            inst_name, f"Instance unreachable: {e}"
                        )
                    except Exception:
                        pass
                continue

            # 2) per-target availability via /api/stats
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(f"{inst_url}/api/stats", headers=headers)
                    resp.raise_for_status()
                    stats = resp.json() or {}
            except Exception as e:
                logger.debug(
                    f"Health checker: Autoscan '{inst_name}' /stats failed: {e}"
                )
                stats = {}

            targets_avail = stats.get("targets_available") or {}
            unavailable = {name for name, ok in targets_avail.items() if ok is False}
            previous = self._autoscan_target_state.get(inst_name, set())

            new_down = unavailable - previous
            recovered = previous - unavailable

            if new_down:
                try:
                    await notification_service.notify_autoscan_error(
                        inst_name,
                        f"Targets unreachable: {', '.join(sorted(new_down))}",
                    )
                except Exception:
                    pass

            if recovered and not unavailable and previous:
                # All targets back AND we previously had outages → recovery
                try:
                    await notification_service.notify_autoscan_recovery(inst_name)
                except Exception:
                    pass
            elif recovered and unavailable:
                # Partial recovery — just log, no spam notification
                logger.info(
                    f"Autoscan '{inst_name}': partial recovery for {sorted(recovered)}, still down: {sorted(unavailable)}"
                )

            self._autoscan_target_state[inst_name] = unavailable

            # Instance reachable again → clear instance-level error
            if self._autoscan_error_state.get(inst_name) and not unavailable:
                self._autoscan_error_state[inst_name] = False
                try:
                    await notification_service.notify_autoscan_recovery(inst_name)
                except Exception:
                    pass

    # ── Storage ────────────────────────────────────────────────────

    async def _check_storage(self):
        """Check storage usage across all monitored services."""
        from app.services.monitor import monitor
        from datetime import datetime, timezone

        STORAGE_WARNING_THRESHOLD = 90.0
        STORAGE_RISKY_STATUSES = {
            "degraded",
            "failed",
            "faulted",
            "offline",
            "unavail",
            "unavailable",
        }
        current_issue_keys = set()
        today = datetime.now(timezone.utc).date().isoformat()

        for service in monitor.get_all_services():
            storage = getattr(service, "storage", None)
            if not storage:
                continue

            hostname = getattr(storage, "hostname", "unknown")

            # Check storage paths for high usage
            for path in getattr(storage, "storage_paths", []) or []:
                percent = float(getattr(path, "percent", 0) or 0)
                if percent >= STORAGE_WARNING_THRESHOLD:
                    issue_key = f"storage_path:{hostname}:{path.path}"
                    current_issue_keys.add(issue_key)
                    if self._storage_last_notify_day.get(issue_key) == today:
                        continue
                    try:
                        await notification_service.notify_storage_warning(
                            hostname=hostname,
                            path=path.path,
                            percent=percent,
                            free_gb=getattr(path, "free", 0) or 0,
                        )
                        self._storage_last_notify_day[issue_key] = today
                        self._save_state()
                    except Exception:
                        pass

            # Check RAID arrays
            for raid in getattr(storage, "raid_arrays", []) or []:
                raid_status = (getattr(raid, "status", "") or "").lower()
                if raid_status in STORAGE_RISKY_STATUSES:
                    issue_key = f"storage_raid:{hostname}:{raid.device}"
                    current_issue_keys.add(issue_key)
                    if self._storage_last_notify_day.get(issue_key) == today:
                        continue
                    try:
                        await notification_service.notify_storage_warning(
                            hostname=hostname,
                            path=f"RAID: {raid.device} ({raid_status or 'unknown'})",
                            percent=0,
                            free_gb=0,
                        )
                        self._storage_last_notify_day[issue_key] = today
                        self._save_state()
                    except Exception:
                        pass

            # Check ZFS pools
            for pool in getattr(storage, "zfs_pools", []) or []:
                pool_status = (getattr(pool, "status", "") or "").lower()
                pool_state = (getattr(pool, "state", "") or "").lower()
                if (
                    pool_status in STORAGE_RISKY_STATUSES
                    or pool_state in STORAGE_RISKY_STATUSES
                ):
                    issue_key = f"storage_zfs:{hostname}:{pool.pool}"
                    current_issue_keys.add(issue_key)
                    if self._storage_last_notify_day.get(issue_key) == today:
                        continue
                    try:
                        await notification_service.notify_storage_warning(
                            hostname=hostname,
                            path=f"ZFS: {pool.pool} ({pool_status or pool_state or 'unknown'})",
                            percent=0,
                            free_gb=0,
                        )
                        self._storage_last_notify_day[issue_key] = today
                        self._save_state()
                    except Exception:
                        pass

        # Reset per-day suppression when an issue is resolved
        resolved_keys = set(self._storage_last_notify_day.keys()) - current_issue_keys
        if resolved_keys:
            for key in resolved_keys:
                self._storage_last_notify_day.pop(key, None)
            self._save_state()

    # ── Uploader ───────────────────────────────────────────────────

    async def _check_uploader(self):
        """Check uploader for failed jobs."""
        from app.config import settings

        base_url = getattr(settings, "UPLOADER_BASE_URL", "")
        if not base_url:
            return

        try:
            url = f"{base_url.rstrip('/')}/srv/api/jobs/failed_count.php"
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.debug(f"Health checker: Uploader unreachable: {e}")
            return

        if isinstance(data, dict) and data.get("count", 0) > 0:
            try:
                await notification_service.notify_uploader_failed(data["count"])
            except Exception:
                pass

    # ── Traffic ────────────────────────────────────────────────────

    async def _check_traffic(self):
        """Check traffic bandwidth — alert when ≥95% sustained for 2+ minutes."""
        from app.services.monitor import monitor

        TRAFFIC_HIGH_THRESHOLD = 95.0
        # With 60s health-check interval, 2 consecutive checks = ~2 minutes
        REQUIRED_CONSECUTIVE = 2

        for service in monitor.get_all_services():
            traffic = getattr(service, "traffic", None)
            if not traffic or not getattr(traffic, "last_updated", None):
                continue

            max_bw = getattr(traffic, "max_bandwidth", 0) or 0
            if max_bw <= 0:
                continue

            bw_up = getattr(traffic, "bandwidth_up", 0) or 0
            bw_down = getattr(traffic, "bandwidth_down", 0) or 0
            current_bw = bw_up + bw_down
            percent = min((current_bw / max_bw) * 100, 100.0)

            svc_key = service.id

            if percent >= TRAFFIC_HIGH_THRESHOLD:
                self._traffic_high_count[svc_key] = (
                    self._traffic_high_count.get(svc_key, 0) + 1
                )

                if self._traffic_high_count[
                    svc_key
                ] >= REQUIRED_CONSECUTIVE and not self._traffic_high_state.get(svc_key):
                    self._traffic_high_state[svc_key] = True
                    bw_str = f"{current_bw:.1f} / {max_bw:.1f} MB/s"
                    try:
                        await notification_service.notify_traffic_high(
                            service.name, percent, bw_str
                        )
                    except Exception:
                        pass
            else:
                # Below threshold — reset counter
                self._traffic_high_count[svc_key] = 0

                if self._traffic_high_state.get(svc_key):
                    self._traffic_high_state[svc_key] = False
                    try:
                        await notification_service.notify_traffic_recovery(
                            service.name, percent
                        )
                    except Exception:
                        pass


health_checker = HealthChecker()
