from pydantic import BaseModel
from typing import Literal, List
from datetime import datetime


class TrafficMetrics(BaseModel):
    """Traffic metrics for a service"""

    bandwidth_up: float = 0.0  # Current upload speed in MB/s
    bandwidth_down: float = 0.0  # Current download speed in MB/s
    total_up: float = 0.0  # Total upload in GB
    total_down: float = 0.0  # Total download in GB
    max_bandwidth: float | None = None  # Maximum bandwidth capacity in MB/s
    last_updated: datetime | None = None


class TrafficDataPoint(BaseModel):
    """Single traffic data point for historical data"""

    timestamp: datetime
    bandwidth_up: float  # MB/s
    bandwidth_down: float  # MB/s
    total_up: float  # GB
    total_down: float  # GB


class ResponseTimeDataPoint(BaseModel):
    """Single response time data point for historical data"""

    timestamp: datetime
    response_time: float  # milliseconds


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
    traffic: TrafficMetrics | None = None
    traffic_history: List[TrafficDataPoint] = []
    response_history: List[ResponseTimeDataPoint] = []


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


class TrafficUpdate(BaseModel):
    """Model for updating traffic data from agent"""

    service_id: str
    bandwidth_up: float  # MB/s
    bandwidth_down: float  # MB/s
    total_up: float  # GB
    total_down: float  # GB
    max_bandwidth: float | None = None  # Maximum bandwidth capacity in MB/s
