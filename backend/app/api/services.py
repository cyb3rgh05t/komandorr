from fastapi import APIRouter, HTTPException
from typing import List
from app.models.service import Service, ServiceCreate, ServiceUpdate
from app.services.monitor import monitor
from app.utils.logger import logger
import uuid

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("/", response_model=List[Service])
async def get_services():
    """Get all monitored services"""
    services = monitor.get_all_services()
    logger.debug(f"Returning {len(services)} services")
    return services


@router.get("/{service_id}", response_model=Service)
async def get_service(service_id: str):
    """Get a specific service by ID"""
    service = monitor.get_service(service_id)
    if not service:
        logger.warning(f"Service not found: {service_id}")
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.post("/", response_model=Service, status_code=201)
async def create_service(service_data: ServiceCreate):
    """Create a new service to monitor"""
    service = Service(id=str(uuid.uuid4()), **service_data.model_dump())
    monitor.add_service(service)

    # Perform initial check
    await monitor.check_service(service)

    logger.info(f"Created new service: {service.name}")
    return service


@router.put("/{service_id}", response_model=Service)
async def update_service(service_id: str, service_data: ServiceUpdate):
    """Update a service"""
    service = monitor.get_service(service_id)
    if not service:
        logger.warning(f"Service not found: {service_id}")
        raise HTTPException(status_code=404, detail="Service not found")

    # Update fields
    update_data = service_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    # Re-check service after update
    await monitor.check_service(service)

    # Save changes to database
    monitor._save_service(service)

    logger.info(f"Updated service: {service.name}")
    return service


@router.delete("/{service_id}", status_code=204)
async def delete_service(service_id: str):
    """Delete a service"""
    service = monitor.get_service(service_id)
    if not service:
        logger.warning(f"Service not found: {service_id}")
        raise HTTPException(status_code=404, detail="Service not found")

    monitor.remove_service(service_id)
    logger.info(f"Deleted service: {service.name}")
    return None


@router.post("/{service_id}/check", response_model=Service)
async def check_service(service_id: str):
    """Manually trigger a service check"""
    service = monitor.get_service(service_id)
    if not service:
        logger.warning(f"Service not found: {service_id}")
        raise HTTPException(status_code=404, detail="Service not found")

    await monitor.check_service(service)
    monitor._save_service(service)  # Save the updated status and last_check
    logger.info(f"Manually checked service: {service.name}")
    return service


@router.post("/check-all", response_model=List[Service])
async def check_all_services():
    """Manually trigger a check for all services"""
    await monitor.check_all_services()
    # check_all_services already saves to database
    logger.info("Manually checked all services")
    return monitor.get_all_services()
