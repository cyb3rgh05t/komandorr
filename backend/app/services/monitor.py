import httpx
import asyncio
from datetime import datetime
from typing import List, Dict
from app.models.service import Service
from app.utils.logger import logger


class ServiceMonitor:
    """Service monitoring system to check online/offline status"""

    def __init__(self):
        self.services: Dict[str, Service] = {}
        self._monitoring_task = None
        self._running = False

    def add_service(self, service: Service) -> None:
        """Add a service to monitor"""
        self.services[service.id] = service
        logger.info(f"Added service: {service.name} ({service.url})")

    def remove_service(self, service_id: str) -> None:
        """Remove a service from monitoring"""
        if service_id in self.services:
            service = self.services.pop(service_id)
            logger.info(f"Removed service: {service.name}")

    def get_service(self, service_id: str) -> Service | None:
        """Get a service by ID"""
        return self.services.get(service_id)

    def get_all_services(self) -> List[Service]:
        """Get all monitored services"""
        return list(self.services.values())

    async def check_service(self, service: Service) -> None:
        """Check a single service status"""
        try:
            start_time = datetime.now()

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(service.url, follow_redirects=True)

                end_time = datetime.now()
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

                service.last_check = datetime.now()

        except httpx.TimeoutException:
            service.status = "problem"
            service.last_check = datetime.now()
            logger.warning(f"Service {service.name} timed out")

        except Exception as e:
            service.status = "offline"
            service.last_check = datetime.now()
            logger.error(f"Service {service.name} check failed: {str(e)}")

    async def check_all_services(self) -> None:
        """Check all services"""
        if not self.services:
            return

        tasks = [self.check_service(service) for service in self.services.values()]
        await asyncio.gather(*tasks)
        logger.info(f"Checked {len(tasks)} services")

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


# Global monitor instance
monitor = ServiceMonitor()
