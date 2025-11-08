from fastapi import APIRouter, HTTPException
from typing import List
from app.models.service import TrafficUpdate, TrafficDataPoint
from app.services.monitor import monitor
from app.utils.logger import logger
from datetime import datetime, timezone

router = APIRouter(prefix="/api/traffic", tags=["traffic"])


@router.post("/update")
async def update_traffic(traffic_data: TrafficUpdate):
    """Receive traffic data from monitoring agent"""
    service = monitor.get_service(traffic_data.service_id)
    if not service:
        logger.warning(
            f"Service not found for traffic update: {traffic_data.service_id}"
        )
        raise HTTPException(status_code=404, detail="Service not found")

    # Update current traffic metrics
    if service.traffic is None:
        from app.models.service import TrafficMetrics

        service.traffic = TrafficMetrics()

    service.traffic.bandwidth_up = traffic_data.bandwidth_up
    service.traffic.bandwidth_down = traffic_data.bandwidth_down
    service.traffic.total_up = traffic_data.total_up
    service.traffic.total_down = traffic_data.total_down
    service.traffic.last_updated = datetime.now(timezone.utc)

    # Add to history (keep last 100 data points)
    data_point = TrafficDataPoint(
        timestamp=datetime.now(timezone.utc),
        bandwidth_up=traffic_data.bandwidth_up,
        bandwidth_down=traffic_data.bandwidth_down,
        total_up=traffic_data.total_up,
        total_down=traffic_data.total_down,
    )
    service.traffic_history.append(data_point)

    # Keep only last 100 data points to prevent excessive storage
    if len(service.traffic_history) > 100:
        service.traffic_history = service.traffic_history[-100:]

    # Save to disk
    monitor._save_services()

    logger.info(
        f"Updated traffic for {service.name}: "
        f"↑{traffic_data.bandwidth_up:.2f}MB/s ↓{traffic_data.bandwidth_down:.2f}MB/s"
    )
    return {"status": "success", "message": "Traffic data updated"}


@router.get("/{service_id}/history", response_model=List[TrafficDataPoint])
async def get_traffic_history(service_id: str, limit: int = 100):
    """Get traffic history for a service"""
    service = monitor.get_service(service_id)
    if not service:
        logger.warning(f"Service not found: {service_id}")
        raise HTTPException(status_code=404, detail="Service not found")

    # Return last N data points
    history = service.traffic_history[-limit:] if service.traffic_history else []
    return history


@router.get("/{service_id}/current")
async def get_current_traffic(service_id: str):
    """Get current traffic metrics for a service"""
    service = monitor.get_service(service_id)
    if not service:
        logger.warning(f"Service not found: {service_id}")
        raise HTTPException(status_code=404, detail="Service not found")

    if not service.traffic:
        return {
            "bandwidth_up": 0.0,
            "bandwidth_down": 0.0,
            "total_up": 0.0,
            "total_down": 0.0,
            "last_updated": None,
        }

    return service.traffic


@router.get("/summary")
async def get_traffic_summary():
    """Get traffic summary for all services"""
    services = monitor.get_all_services()

    summary = {
        "total_services": len(services),
        "services_with_traffic": 0,
        "total_bandwidth_up": 0.0,
        "total_bandwidth_down": 0.0,
        "total_traffic_up": 0.0,
        "total_traffic_down": 0.0,
        "services": [],
    }

    for service in services:
        if service.traffic and service.traffic.last_updated:
            summary["services_with_traffic"] += 1
            summary["total_bandwidth_up"] += service.traffic.bandwidth_up
            summary["total_bandwidth_down"] += service.traffic.bandwidth_down
            summary["total_traffic_up"] += service.traffic.total_up
            summary["total_traffic_down"] += service.traffic.total_down

            summary["services"].append(
                {
                    "id": service.id,
                    "name": service.name,
                    "bandwidth_up": service.traffic.bandwidth_up,
                    "bandwidth_down": service.traffic.bandwidth_down,
                    "total_up": service.traffic.total_up,
                    "total_down": service.traffic.total_down,
                    "last_updated": service.traffic.last_updated,
                }
            )

    return summary
