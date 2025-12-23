import httpx
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, TYPE_CHECKING
from sqlalchemy import desc
from app.models.service import (
    Service,
    ResponseTimeDataPoint,
    TrafficMetrics,
    TrafficDataPoint,
)
from app.models.storage import StorageMetrics, StorageDataPoint
from app.database import (
    db,
    ServiceDB,
    ResponseHistoryDB,
    TrafficHistoryDB,
    StorageHistoryDB,
)
from app.utils.logger import logger

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class ServiceMonitor:
    """Service monitoring system to check online/offline status"""

    def __init__(self):
        self.services: Dict[str, Service] = {}
        self._monitoring_task = None
        self._running = False
        self._load_services()

    def add_service(self, service: Service) -> None:
        """Add a service to monitor"""
        self.services[service.id] = service
        logger.info(f"Added service: {service.name} ({service.url})")
        self._save_service(service)

    def remove_service(self, service_id: str) -> None:
        """Remove a service from monitoring"""
        if service_id in self.services:
            service = self.services.pop(service_id)
            logger.info(f"Removed service: {service.name}")

            # Delete from database
            session = db.get_session()
            try:
                db_service = (
                    session.query(ServiceDB).filter(ServiceDB.id == service_id).first()
                )
                if db_service:
                    session.delete(db_service)
                    session.commit()
            except Exception as e:
                session.rollback()
                logger.error(f"Failed to delete service from database: {e}")
            finally:
                session.close()

    def get_service(self, service_id: str) -> Service | None:
        """Get a service by ID"""
        return self.services.get(service_id)

    def get_all_services(self) -> List[Service]:
        """Get all monitored services"""
        return list(self.services.values())

    async def check_service(self, service: Service) -> None:
        """Check a single service status"""
        try:
            start_time = datetime.now(timezone.utc)

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(service.url, follow_redirects=True)

                end_time = datetime.now(timezone.utc)
                response_time = (end_time - start_time).total_seconds() * 1000

                if response.status_code < 400:
                    service.status = "online"
                    service.response_time = response_time
                    logger.debug(
                        f"Service {service.name} is online ({response_time:.2f}ms)"
                    )
                else:
                    service.status = "problem"
                    service.response_time = response_time
                    logger.warning(
                        f"Service {service.name} returned status {response.status_code}"
                    )

                service.last_check = datetime.now(timezone.utc)

                # Add response time to history
                self._add_response_time(service, response_time)

        except httpx.TimeoutException:
            service.status = "problem"
            service.last_check = datetime.now(timezone.utc)
            logger.warning(f"Service {service.name} timed out")

        except Exception as e:
            service.status = "offline"
            service.response_time = None  # Clear response time for offline services
            service.last_check = datetime.now(timezone.utc)
            logger.error(f"Service {service.name} check failed: {str(e)}")

    async def check_all_services(self) -> None:
        """Check all services"""
        if not self.services:
            return

        tasks = [self.check_service(service) for service in self.services.values()]
        await asyncio.gather(*tasks)

        # Save after all services are checked
        self._save_all_services()
        logger.debug(f"Checked {len(tasks)} services")

    async def start_monitoring(self, interval: int = 60) -> None:
        """Start monitoring all services at specified interval (seconds)"""
        self._running = True
        logger.info(f"Starting service monitoring (interval: {interval}s)")

        while self._running:
            await self.check_all_services()
            await asyncio.sleep(interval)

    def stop_monitoring(self) -> None:
        """Stop monitoring services"""
        self._running = False
        logger.info("Stopping service monitoring")

    def _add_response_time(self, service: Service, response_time: float) -> None:
        """Add a response time data point to service history"""
        data_point = ResponseTimeDataPoint(
            timestamp=datetime.now(timezone.utc), response_time=response_time
        )

        service.response_history.append(data_point)

        # Keep last 100 points in memory
        if len(service.response_history) > 100:
            service.response_history = service.response_history[-100:]

    def _load_services(self) -> None:
        """Load services from database"""
        session = db.get_session()
        try:
            db_services = session.query(ServiceDB).all()

            for db_service in db_services:
                # Load response history (last 100 points)
                response_history = (
                    session.query(ResponseHistoryDB)
                    .filter(ResponseHistoryDB.service_id == db_service.id)
                    .order_by(desc(ResponseHistoryDB.timestamp))
                    .limit(100)
                    .all()
                )

                # Load traffic history (last 100 points)
                traffic_history = (
                    session.query(TrafficHistoryDB)
                    .filter(TrafficHistoryDB.service_id == db_service.id)
                    .order_by(desc(TrafficHistoryDB.timestamp))
                    .limit(100)
                    .all()
                )

                # Load storage history (last 100 points)
                storage_history = (
                    session.query(StorageHistoryDB)
                    .filter(StorageHistoryDB.service_id == db_service.id)
                    .order_by(desc(StorageHistoryDB.timestamp))
                    .limit(100)
                    .all()
                )

                # Convert to Pydantic models
                response_data = [
                    ResponseTimeDataPoint(
                        timestamp=(
                            r.timestamp.replace(tzinfo=timezone.utc)  # type: ignore
                            if r.timestamp
                            else datetime.now(timezone.utc)
                        ),
                        response_time=float(r.response_time),  # type: ignore
                    )
                    for r in reversed(
                        response_history
                    )  # Reverse to get chronological order
                ]

                traffic_data = [
                    TrafficDataPoint(
                        timestamp=(
                            t.timestamp.replace(tzinfo=timezone.utc)  # type: ignore
                            if t.timestamp
                            else datetime.now(timezone.utc)
                        ),
                        bandwidth_up=float(t.bandwidth_up),  # type: ignore
                        bandwidth_down=float(t.bandwidth_down),  # type: ignore
                        total_up=float(t.total_up),  # type: ignore
                        total_down=float(t.total_down),  # type: ignore
                    )
                    for t in reversed(
                        traffic_history
                    )  # Reverse to get chronological order
                ]

                storage_data = [
                    StorageDataPoint(
                        timestamp=(
                            s.timestamp.replace(tzinfo=timezone.utc)  # type: ignore
                            if s.timestamp
                            else datetime.now(timezone.utc)
                        ),
                        hostname=str(s.hostname),  # type: ignore
                        total_capacity=float(s.total_capacity),  # type: ignore
                        total_used=float(s.total_used),  # type: ignore
                        total_free=float(s.total_free),  # type: ignore
                        average_usage_percent=float(s.average_usage_percent),  # type: ignore
                        raid_healthy=int(s.raid_healthy),  # type: ignore
                        raid_degraded=int(s.raid_degraded),  # type: ignore
                        raid_failed=int(s.raid_failed),  # type: ignore
                    )
                    for s in reversed(
                        storage_history
                    )  # Reverse to get chronological order
                ]

                # Build traffic metrics
                traffic_metrics = None
                if db_service.traffic_last_updated:
                    traffic_metrics = TrafficMetrics(
                        bandwidth_up=float(db_service.bandwidth_up),  # type: ignore
                        bandwidth_down=float(db_service.bandwidth_down),  # type: ignore
                        total_up=float(db_service.total_up),  # type: ignore
                        total_down=float(db_service.total_down),  # type: ignore
                        max_bandwidth=float(db_service.max_bandwidth) if db_service.max_bandwidth else None,  # type: ignore
                        last_updated=(
                            db_service.traffic_last_updated.replace(tzinfo=timezone.utc)  # type: ignore
                            if db_service.traffic_last_updated
                            else None
                        ),
                    )

                # Build storage metrics from saved JSON data
                storage_metrics = None
                if hasattr(db_service, "storage_data") and db_service.storage_data:
                    # Load full storage data from JSON
                    import json

                    try:
                        storage_dict = json.loads(db_service.storage_data)  # type: ignore
                        # Convert datetime strings back to datetime objects
                        if storage_dict.get("last_updated"):
                            from dateutil import parser

                            storage_dict["last_updated"] = parser.parse(
                                storage_dict["last_updated"]
                            ).replace(tzinfo=timezone.utc)
                        storage_metrics = StorageMetrics(**storage_dict)
                    except Exception as e:
                        logger.warning(
                            f"Failed to load storage data for {db_service.name}: {e}"
                        )
                        # Fallback to empty storage metrics
                        if (
                            hasattr(db_service, "storage_last_updated")
                            and db_service.storage_last_updated
                        ):
                            storage_metrics = StorageMetrics(
                                hostname=str(db_service.storage_hostname) if hasattr(db_service, "storage_hostname") and db_service.storage_hostname else "unknown",  # type: ignore
                                storage_paths=[],
                                raid_arrays=[],
                                zfs_pools=[],
                                disks=[],
                                last_updated=(
                                    db_service.storage_last_updated.replace(tzinfo=timezone.utc)  # type: ignore
                                    if db_service.storage_last_updated
                                    else None
                                ),
                            )
                elif (
                    hasattr(db_service, "storage_last_updated")
                    and db_service.storage_last_updated
                ):
                    # Fallback if no storage_data but last_updated exists
                    storage_metrics = StorageMetrics(
                        hostname=str(db_service.storage_hostname) if hasattr(db_service, "storage_hostname") and db_service.storage_hostname else "unknown",  # type: ignore
                        storage_paths=[],
                        raid_arrays=[],
                        zfs_pools=[],
                        disks=[],
                        last_updated=(
                            db_service.storage_last_updated.replace(tzinfo=timezone.utc)  # type: ignore
                            if db_service.storage_last_updated
                            else None
                        ),
                    )

                # Create Service model
                service = Service(
                    id=str(db_service.id),  # type: ignore
                    name=str(db_service.name),  # type: ignore
                    url=str(db_service.url),  # type: ignore
                    type=str(db_service.type),  # type: ignore
                    status=str(db_service.status),  # type: ignore
                    last_check=(
                        db_service.last_check.replace(tzinfo=timezone.utc)  # type: ignore
                        if db_service.last_check
                        else None
                    ),
                    response_time=float(db_service.response_time) if db_service.response_time else None,  # type: ignore
                    description=str(db_service.description) if db_service.description else None,  # type: ignore
                    icon=str(db_service.icon) if db_service.icon else None,  # type: ignore
                    group=str(db_service.group) if db_service.group else None,  # type: ignore
                    traffic=traffic_metrics,
                    traffic_history=traffic_data,
                    response_history=response_data,
                    storage=storage_metrics,
                    storage_history=storage_data,
                )

                self.services[service.id] = service

            logger.info(f"Loaded {len(self.services)} services from database")
        except Exception as e:
            logger.error(f"Failed to load services from database: {e}")
        finally:
            session.close()

    def _save_service(self, service: Service) -> None:
        """Save or update a single service in the database"""
        session = db.get_session()
        try:
            # Helper to convert aware datetime to naive UTC
            def to_naive_utc(dt):
                if dt is None:
                    return None
                if dt.tzinfo is not None:
                    return dt.astimezone(timezone.utc).replace(tzinfo=None)
                return dt

            # Check if service exists
            db_service = (
                session.query(ServiceDB).filter(ServiceDB.id == service.id).first()
            )

            if db_service:
                # Update existing service
                db_service.name = service.name  # type: ignore
                db_service.url = service.url  # type: ignore
                db_service.type = service.type  # type: ignore
                db_service.status = service.status  # type: ignore
                db_service.last_check = to_naive_utc(service.last_check)  # type: ignore
                db_service.response_time = service.response_time  # type: ignore
                db_service.description = service.description  # type: ignore
                db_service.icon = service.icon  # type: ignore
                db_service.group = service.group  # type: ignore

                # Update traffic metrics
                if service.traffic:
                    db_service.bandwidth_up = service.traffic.bandwidth_up  # type: ignore
                    db_service.bandwidth_down = service.traffic.bandwidth_down  # type: ignore
                    db_service.total_up = service.traffic.total_up  # type: ignore
                    db_service.total_down = service.traffic.total_down  # type: ignore
                    db_service.max_bandwidth = service.traffic.max_bandwidth  # type: ignore
                    db_service.traffic_last_updated = to_naive_utc(  # type: ignore
                        service.traffic.last_updated
                    )

                # Update storage metrics
                if service.storage:
                    import json

                    db_service.storage_hostname = service.storage.hostname  # type: ignore
                    db_service.storage_data = json.dumps(service.storage.model_dump(mode="json"))  # type: ignore
                    db_service.storage_last_updated = to_naive_utc(  # type: ignore
                        service.storage.last_updated
                    )
            else:
                # Create new service
                db_service = ServiceDB(
                    id=service.id,
                    name=service.name,
                    url=service.url,
                    type=service.type,
                    status=service.status,
                    last_check=to_naive_utc(service.last_check),
                    response_time=service.response_time,
                    description=service.description,
                    icon=service.icon,
                    group=service.group,
                    bandwidth_up=(
                        service.traffic.bandwidth_up if service.traffic else 0.0
                    ),
                    bandwidth_down=(
                        service.traffic.bandwidth_down if service.traffic else 0.0
                    ),
                    total_up=service.traffic.total_up if service.traffic else 0.0,
                    total_down=service.traffic.total_down if service.traffic else 0.0,
                    max_bandwidth=(
                        service.traffic.max_bandwidth if service.traffic else None
                    ),
                    traffic_last_updated=(
                        to_naive_utc(service.traffic.last_updated)
                        if service.traffic
                        else None
                    ),
                )
                session.add(db_service)

            # Save new response history points
            if service.response_history:
                # Get the last stored timestamp
                last_stored = (
                    session.query(ResponseHistoryDB)
                    .filter(ResponseHistoryDB.service_id == service.id)
                    .order_by(desc(ResponseHistoryDB.timestamp))
                    .first()
                )

                # Get timestamp value, ensure it has timezone info for comparison
                last_timestamp = None
                if last_stored and last_stored.timestamp:  # type: ignore
                    last_timestamp = last_stored.timestamp.replace(tzinfo=timezone.utc)  # type: ignore

                # Add only new points
                for point in service.response_history:
                    if not last_timestamp or point.timestamp > last_timestamp:
                        history_entry = ResponseHistoryDB(
                            service_id=service.id,
                            timestamp=to_naive_utc(point.timestamp),
                            response_time=point.response_time,
                        )
                        session.add(history_entry)

                # Clean up old history (keep last 1000 points in DB)
                old_entries = (
                    session.query(ResponseHistoryDB)
                    .filter(ResponseHistoryDB.service_id == service.id)
                    .order_by(desc(ResponseHistoryDB.timestamp))
                    .offset(1000)
                    .all()
                )
                for entry in old_entries:
                    session.delete(entry)

            # Save new traffic history points
            if service.traffic_history:
                # Get the last stored timestamp
                last_stored_traffic = (
                    session.query(TrafficHistoryDB)
                    .filter(TrafficHistoryDB.service_id == service.id)
                    .order_by(desc(TrafficHistoryDB.timestamp))
                    .first()
                )

                # Get timestamp value, ensure it has timezone info for comparison
                last_traffic_timestamp = None
                if last_stored_traffic and last_stored_traffic.timestamp:  # type: ignore
                    last_traffic_timestamp = last_stored_traffic.timestamp.replace(  # type: ignore
                        tzinfo=timezone.utc
                    )

                # Add only new points
                for point in service.traffic_history:
                    if (
                        not last_traffic_timestamp
                        or point.timestamp > last_traffic_timestamp
                    ):
                        traffic_entry = TrafficHistoryDB(
                            service_id=service.id,
                            timestamp=to_naive_utc(point.timestamp),
                            bandwidth_up=point.bandwidth_up,
                            bandwidth_down=point.bandwidth_down,
                            total_up=point.total_up,
                            total_down=point.total_down,
                        )
                        session.add(traffic_entry)

                # Clean up old traffic history (keep last 1000 points in DB)
                old_traffic = (
                    session.query(TrafficHistoryDB)
                    .filter(TrafficHistoryDB.service_id == service.id)
                    .order_by(desc(TrafficHistoryDB.timestamp))
                    .offset(1000)
                    .all()
                )
                for entry in old_traffic:
                    session.delete(entry)

            # Save new storage history points
            if service.storage_history:
                # Get the last stored timestamp
                last_stored_storage = (
                    session.query(StorageHistoryDB)
                    .filter(StorageHistoryDB.service_id == service.id)
                    .order_by(desc(StorageHistoryDB.timestamp))
                    .first()
                )

                # Get timestamp value, ensure it has timezone info for comparison
                last_storage_timestamp = None
                if last_stored_storage and last_stored_storage.timestamp:  # type: ignore
                    last_storage_timestamp = last_stored_storage.timestamp.replace(  # type: ignore
                        tzinfo=timezone.utc
                    )

                # Add only new points
                for point in service.storage_history:
                    if (
                        not last_storage_timestamp
                        or point.timestamp > last_storage_timestamp
                    ):
                        storage_entry = StorageHistoryDB(
                            service_id=service.id,
                            timestamp=to_naive_utc(point.timestamp),
                            hostname=point.hostname,
                            total_capacity=point.total_capacity,
                            total_used=point.total_used,
                            total_free=point.total_free,
                            average_usage_percent=point.average_usage_percent,
                            raid_healthy=point.raid_healthy,
                            raid_degraded=point.raid_degraded,
                            raid_failed=point.raid_failed,
                        )
                        session.add(storage_entry)

                # Clean up old storage history (keep last 1000 points in DB)
                old_storage = (
                    session.query(StorageHistoryDB)
                    .filter(StorageHistoryDB.service_id == service.id)
                    .order_by(desc(StorageHistoryDB.timestamp))
                    .offset(1000)
                    .all()
                )
                for entry in old_storage:
                    session.delete(entry)

            session.commit()
            logger.debug(f"Saved service {service.name} to database")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save service to database: {e}")
        finally:
            session.close()

    def _save_all_services(self) -> None:
        """Save all services to database"""
        for service in self.services.values():
            self._save_service(service)


# Global monitor instance
monitor = ServiceMonitor()
