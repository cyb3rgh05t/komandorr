from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class Service(BaseModel):
    """Service model representing a monitored app/website/panel"""

    id: str
    name: str
    url: str
    type: Literal["app", "website", "panel", "project"]
    status: Literal["online", "offline", "problem"] = "offline"
    last_check: datetime | None = None
    response_time: float | None = None
    description: str | None = None
    icon: str | None = None
    group: str | None = None


class ServiceCreate(BaseModel):
    """Model for creating a new service"""

    name: str
    url: str
    type: Literal["app", "website", "panel", "project"]
    description: str | None = None
    icon: str | None = None
    group: str | None = None


class ServiceUpdate(BaseModel):
    """Model for updating a service"""

    name: str | None = None
    url: str | None = None
    type: Literal["app", "website", "panel", "project"] | None = None
    description: str | None = None
    icon: str | None = None
    group: str | None = None


class StatusResponse(BaseModel):
    """API status response"""

    status: str
    message: str
