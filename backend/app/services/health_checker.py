"""
Background health checker for VPN, NFS, Posterizarr, Storage, and Uploader services.
Runs independently of the UI — sends Telegram notifications when problems are detected.
"""

import asyncio
import httpx
from app.utils.logger import logger
from app.services.notifications import notification_service


class HealthChecker:
    """Periodically checks service health and sends notifications."""

    def __init__(self):
        self._running = False
        self._vpn_error_state: dict[str, bool] = {}  # track per-container error state

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
                    self._check_storage(),
                    self._check_uploader(),
                    return_exceptions=True,
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health checker error: {e}")

            await asyncio.sleep(interval)

    # ── VPN ────────────────────────────────────────────────────────

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
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"Health checker: VPN API unreachable: {e}")
            return

        for container_id, info in data.items():
            vpn_status = (info.get("vpn_status") or "").lower()
            has_ip = bool(info.get("public_ip"))
            is_error = vpn_status != "running" or not has_ip

            # Resolve container name: container list > vpn-info > fallback
            container_name = (
                container_names.get(str(container_id))
                or info.get("container_name")
                or f"Container {container_id}"
            )

            was_error = self._vpn_error_state.get(str(container_id), False)

            if is_error:
                self._vpn_error_state[str(container_id)] = True
                reason = f"VPN status: {vpn_status or 'unknown'}"
                if not has_ip:
                    reason += ", no public IP"
                try:
                    await notification_service.notify_vpn_error(
                        container_name=container_name, error=reason, url=url
                    )
                except Exception:
                    pass
            else:
                # VPN is healthy now — send recovery if it was previously in error
                self._vpn_error_state[str(container_id)] = False
                if was_error:
                    try:
                        await notification_service.notify_vpn_recovery(
                            container_name=container_name,
                            public_ip=info.get("public_ip", ""),
                            url=url,
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

                def safe_json(r):
                    if isinstance(r, Exception):
                        return []
                    try:
                        r.raise_for_status()
                        return r.json()
                    except Exception:
                        return []

                mounts = safe_json(resps[0])
                mount_statuses = safe_json(resps[1])
                exports = safe_json(resps[2])
                export_statuses = safe_json(resps[3])
                mergerfs_configs = safe_json(resps[4])
                mergerfs_statuses = safe_json(resps[5])

                mount_status_map = {s["id"]: s for s in mount_statuses}
                export_status_map = {s["id"]: s for s in export_statuses}
                mergerfs_status_map = {s["id"]: s for s in mergerfs_statuses}

                issues = []
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
                    try:
                        await notification_service.notify_nfs_error(
                            inst_name, "; ".join(issues[:5])
                        )
                    except Exception:
                        pass

            except Exception as e:
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

    # ── Storage ────────────────────────────────────────────────────

    async def _check_storage(self):
        """Check storage usage across all monitored services."""
        from app.services.monitor import monitor

        STORAGE_WARNING_THRESHOLD = 90.0

        for service in monitor.get_all_services():
            storage = getattr(service, "storage", None)
            if not storage:
                continue

            hostname = getattr(storage, "hostname", "unknown")

            # Check storage paths for high usage
            for path in getattr(storage, "storage_paths", []) or []:
                percent = getattr(path, "percent", 0) or 0
                if percent >= STORAGE_WARNING_THRESHOLD:
                    try:
                        await notification_service.notify_storage_warning(
                            hostname=hostname,
                            path=path.path,
                            percent=percent,
                            free_gb=getattr(path, "free", 0) or 0,
                        )
                    except Exception:
                        pass

            # Check RAID arrays
            for raid in getattr(storage, "raid_arrays", []) or []:
                if getattr(raid, "status", "") in ("degraded", "failed"):
                    try:
                        await notification_service.notify_storage_warning(
                            hostname=hostname,
                            path=f"RAID: {raid.device}",
                            percent=0,
                            free_gb=0,
                        )
                    except Exception:
                        pass

            # Check ZFS pools
            for pool in getattr(storage, "zfs_pools", []) or []:
                if getattr(pool, "status", "") in ("degraded", "failed"):
                    try:
                        await notification_service.notify_storage_warning(
                            hostname=hostname,
                            path=f"ZFS: {pool.pool}",
                            percent=0,
                            free_gb=0,
                        )
                    except Exception:
                        pass

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


health_checker = HealthChecker()
