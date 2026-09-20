from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from typing import List
from app.models.service import TrafficUpdate, TrafficDataPoint
from app.services.monitor import monitor
from app.utils.logger import logger
from datetime import datetime, timezone
import asyncio
import json

router = APIRouter(prefix="/api/traffic", tags=["traffic"])

# Deduplicate warnings for unknown/removed service IDs so a stale traffic-agent
# doesn't spam the logs every UPDATE_INTERVAL seconds.
_warned_unknown_service_ids: set[str] = set()


# WebSocket connection manager for real-time traffic updates
class TrafficConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.debug(
            f"WebSocket client connected. Total: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.debug(
            f"WebSocket client disconnected. Total: {len(self.active_connections)}"
        )

    async def broadcast(self, data: dict):
        """Send traffic data to all connected WebSocket clients"""
        if not self.active_connections:
            return
        message = json.dumps(data, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.active_connections.remove(conn)


ws_manager = TrafficConnectionManager()


@router.post("/update")
async def update_traffic(traffic_data: TrafficUpdate, request: Request):
    """Receive traffic data from monitoring agent"""
    service = monitor.get_service(traffic_data.service_id)
    if not service:
        # Warn only once per unknown ID, then return 410 Gone so the agent
        # can detect that the service was removed and stop pushing.
        if traffic_data.service_id not in _warned_unknown_service_ids:
            _warned_unknown_service_ids.add(traffic_data.service_id)
            client_ip = request.headers.get("x-forwarded-for", "").split(",")[
                0
            ].strip() or (request.client.host if request.client else "unknown")
            user_agent = request.headers.get("user-agent", "unknown")
            logger.warning(
                f"Traffic update for unknown/removed service_id "
                f"{traffic_data.service_id} from {client_ip} (UA: {user_agent}) — "
                f"ignoring further updates from this agent until it is "
                f"reconfigured or restarted."
            )
        raise HTTPException(
            status_code=410,
            detail={
                "code": "service_unknown",
                "service_id": traffic_data.service_id,
                "message": (
                    "Service was removed from komandorr. Update the traffic "
                    "agent's SERVICE_ID or stop the agent."
                ),
            },
        )

    # If a previously-unknown ID was re-added, clear the dedupe flag so future
    # deletions warn again.
    _warned_unknown_service_ids.discard(traffic_data.service_id)

    # Update current traffic metrics
    if service.traffic is None:
        from app.models.service import TrafficMetrics

        service.traffic = TrafficMetrics()

    service.traffic.bandwidth_up = traffic_data.bandwidth_up
    service.traffic.bandwidth_down = traffic_data.bandwidth_down
    service.traffic.total_up = traffic_data.total_up
    service.traffic.total_down = traffic_data.total_down
    if traffic_data.max_bandwidth is not None:
        service.traffic.max_bandwidth = traffic_data.max_bandwidth
    if traffic_data.cpu_percent is not None:
        service.traffic.cpu_percent = traffic_data.cpu_percent
    if traffic_data.memory_percent is not None:
        service.traffic.memory_percent = traffic_data.memory_percent
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

    # Keep only last 100 data points in memory
    if len(service.traffic_history) > 100:
        service.traffic_history = service.traffic_history[-100:]

    # Save to database
    monitor._save_service(service)

    logger.debug(
        f"Updated traffic for {service.name}: "
        f"↑{traffic_data.bandwidth_up:.2f}MB/s ↓{traffic_data.bandwidth_down:.2f}MB/s"
    )

    # Broadcast real-time update to all WebSocket clients
    summary = await _build_traffic_summary()
    await ws_manager.broadcast(summary)

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
    return await _build_traffic_summary()


@router.websocket("/ws")
async def traffic_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time traffic updates"""
    await ws_manager.connect(websocket)
    try:
        # Send initial data immediately
        summary = await _build_traffic_summary()
        await websocket.send_text(json.dumps(summary, default=str))
        # Keep connection alive, wait for client disconnect
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


async def _build_traffic_summary() -> dict:
    """Build the traffic summary dict (shared by REST and WebSocket)"""
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
                    "max_bandwidth": service.traffic.max_bandwidth,
                    "cpu_percent": service.traffic.cpu_percent,
                    "memory_percent": service.traffic.memory_percent,
                    "last_updated": service.traffic.last_updated,
                    "traffic_history": (
                        service.traffic_history[-60:] if service.traffic_history else []
                    ),
                }
            )

    return summary
