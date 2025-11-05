import httpx
import asyncio
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict
from app.models.service import Service
from app.utils.logger import logger


class ServiceMonitor:
    """Service monitoring system to check online/offline status"""

    def __init__(self, storage_file: str = "data/services.json"):
        self.services: Dict[str, Service] = {}
        self.storage_file = Path(storage_file)
        self._monitoring_task = None
        self._running = False
        self._ensure_storage_exists()
        self._load_services()

    def add_service(self, service: Service) -> None:
        """Add a service to monitor"""
        self.services[service.id] = service
        logger.info(f"Added service: {service.name} ({service.url})")
        self._save_services()

    def remove_service(self, service_id: str) -> None:
        """Remove a service from monitoring"""
        if service_id in self.services:
            service = self.services.pop(service_id)
            logger.info(f"Removed service: {service.name}")
            self._save_services()

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

    def _ensure_storage_exists(self) -> None:
        """Ensure the storage directory and file exist"""
        try:
            # Create directory if it doesn't exist
            self.storage_file.parent.mkdir(parents=True, exist_ok=True)

            # Create empty file if it doesn't exist
            if not self.storage_file.exists():
                with open(self.storage_file, "w", encoding="utf-8") as f:
                    json.dump([], f)
                logger.info(f"Created services storage file at {self.storage_file}")
        except Exception as e:
            logger.error(f"Failed to create storage directory/file: {e}")

    def _load_services(self) -> None:
        """Load services from JSON file"""
        try:
            with open(self.storage_file, "r", encoding="utf-8") as f:
                data = json.load(f)

                if not data:
                    logger.info("No services found in storage file")
                    return

                for service_data in data:
                    # Convert string datetime back to datetime objects
                    if service_data.get("last_check"):
                        service_data["last_check"] = datetime.fromisoformat(
                            service_data["last_check"]
                        )
                    service = Service(**service_data)
                    self.services[service.id] = service
            logger.info(
                f"Loaded {len(self.services)} services from {self.storage_file}"
            )
        except Exception as e:
            logger.error(f"Failed to load services from {self.storage_file}: {e}")

    def _save_services(self) -> None:
        """Save services to JSON file"""
        try:
            # Convert services to dict and handle datetime serialization
            services_data = []
            for service in self.services.values():
                service_dict = service.model_dump()
                # Convert datetime to ISO format string
                if service_dict.get("last_check"):
                    service_dict["last_check"] = service_dict["last_check"].isoformat()
                services_data.append(service_dict)

            with open(self.storage_file, "w", encoding="utf-8") as f:
                json.dump(services_data, f, indent=2, ensure_ascii=False)

            logger.debug(f"Saved {len(services_data)} services to {self.storage_file}")
        except Exception as e:
            logger.error(f"Failed to save services to {self.storage_file}: {e}")


# Global monitor instance
monitor = ServiceMonitor()
