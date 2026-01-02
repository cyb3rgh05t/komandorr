from fastapi import APIRouter, HTTPException
from typing import List
from app.models.storage import StorageUpdate, StorageDataPoint
from app.services.monitor import monitor
from app.utils.logger import logger
from datetime import datetime, timezone

router = APIRouter(prefix="/api/storage", tags=["storage"])


@router.post("/update")
async def update_storage(storage_data: StorageUpdate):
    """Receive storage data from monitoring agent"""
    service = monitor.get_service(storage_data.service_id)
    if not service:
        logger.warning(
            f"Service not found for storage update: {storage_data.service_id}"
        )
        raise HTTPException(status_code=404, detail="Service not found")

    # Update current storage metrics
    if service.storage is None:
        from app.models.storage import StorageMetrics

        service.storage = StorageMetrics(
            hostname=storage_data.hostname,
            storage_paths=[],
            raid_arrays=[],
            zfs_pools=[],
            disks=[],
        )

    service.storage.hostname = storage_data.hostname
    service.storage.storage_paths = storage_data.storage_paths
    service.storage.raid_arrays = storage_data.raid_arrays
    service.storage.zfs_pools = storage_data.zfs_pools
    service.storage.disks = storage_data.disks
    service.storage.last_updated = datetime.now(timezone.utc)

    # Calculate aggregated metrics for history
    total_capacity = sum(path.total for path in storage_data.storage_paths)
    total_used = sum(path.used for path in storage_data.storage_paths)
    total_free = sum(path.free for path in storage_data.storage_paths)
    average_usage = (
        sum(path.percent for path in storage_data.storage_paths)
        / len(storage_data.storage_paths)
        if storage_data.storage_paths
        else 0
    )

    # Count RAID array statuses (mdadm + ZFS pools)
    raid_healthy = sum(
        1 for raid in storage_data.raid_arrays if raid.status == "healthy"
    ) + sum(1 for pool in storage_data.zfs_pools if pool.status == "healthy")

    raid_degraded = sum(
        1 for raid in storage_data.raid_arrays if raid.status == "degraded"
    ) + sum(1 for pool in storage_data.zfs_pools if pool.status == "degraded")

    raid_failed = sum(
        1
        for raid in storage_data.raid_arrays
        if raid.status not in ["healthy", "degraded", "recovering"]
    ) + sum(
        1
        for pool in storage_data.zfs_pools
        if pool.status not in ["healthy", "degraded", "recovering"]
    )

    # Add to history
    data_point = StorageDataPoint(
        timestamp=datetime.now(timezone.utc),
        hostname=storage_data.hostname,
        total_capacity=round(total_capacity, 2),
        total_used=round(total_used, 2),
        total_free=round(total_free, 2),
        average_usage_percent=round(average_usage, 2),
        raid_healthy=raid_healthy,
        raid_degraded=raid_degraded,
        raid_failed=raid_failed,
    )
    service.storage_history.append(data_point)

    # Keep only last 100 data points in memory
    if len(service.storage_history) > 100:
        service.storage_history = service.storage_history[-100:]

    # Save to database
    monitor._save_service(service)

    logger.debug(
        f"Updated storage for {service.name}: "
        f"{total_used:.2f}GB / {total_capacity:.2f}GB ({average_usage:.1f}%)"
    )
    return {"status": "success", "message": "Storage data updated"}


@router.get("/{service_id}/history", response_model=List[StorageDataPoint])
async def get_storage_history(service_id: str, limit: int = 100):
    """Get storage history for a service"""
    service = monitor.get_service(service_id)
    if not service:
        logger.warning(f"Service not found: {service_id}")
        raise HTTPException(status_code=404, detail="Service not found")

    # Return last N data points
    history = service.storage_history[-limit:] if service.storage_history else []
    return history


@router.get("/{service_id}/current")
async def get_current_storage(service_id: str):
    """Get current storage metrics for a service"""
    service = monitor.get_service(service_id)
    if not service:
        logger.warning(f"Service not found: {service_id}")
        raise HTTPException(status_code=404, detail="Service not found")

    if not service.storage:
        return {
            "hostname": None,
            "storage_paths": [],
            "raid_arrays": [],
            "disks": [],
            "last_updated": None,
        }

    return service.storage


@router.get("/summary")
async def get_storage_summary():
    """Get storage summary for all services"""
    services = monitor.get_all_services()

    summary = {
        "total_services": len(services),
        "services_with_storage": 0,
        "total_capacity": 0.0,
        "total_used": 0.0,
        "total_free": 0.0,
        "average_usage_percent": 0.0,
        "total_raid_arrays": 0,
        "healthy_raids": 0,
        "degraded_raids": 0,
        "failed_raids": 0,
        "unmounted_paths": 0,
    }

    services_with_storage = []
    for service in services:
        if service.storage and service.storage.last_updated:
            services_with_storage.append(service)
            summary["services_with_storage"] += 1

            # Aggregate storage paths and count unmounted
            for path in service.storage.storage_paths:
                summary["total_capacity"] += path.total
                summary["total_used"] += path.used
                summary["total_free"] += path.free
                # Count unmounted paths (total = 0 usually indicates unmounted)
                if path.total == 0:
                    summary["unmounted_paths"] += 1

            # Count RAID arrays (mdadm + ZFS)
            summary["total_raid_arrays"] += len(service.storage.raid_arrays) + len(
                service.storage.zfs_pools
            )

            # Count mdadm RAID status
            for raid in service.storage.raid_arrays:
                if raid.status == "healthy":
                    summary["healthy_raids"] += 1
                elif raid.status == "degraded":
                    summary["degraded_raids"] += 1
                else:
                    summary["failed_raids"] += 1

            # Count ZFS pool status
            for pool in service.storage.zfs_pools:
                if pool.status == "healthy":
                    summary["healthy_raids"] += 1
                elif pool.status == "degraded":
                    summary["degraded_raids"] += 1
                else:
                    summary["failed_raids"] += 1

    # Calculate average usage
    if summary["total_capacity"] > 0:
        summary["average_usage_percent"] = round(
            (summary["total_used"] / summary["total_capacity"]) * 100, 2
        )

    # Round values
    summary["total_capacity"] = round(summary["total_capacity"], 2)
    summary["total_used"] = round(summary["total_used"], 2)
    summary["total_free"] = round(summary["total_free"], 2)

    return summary
