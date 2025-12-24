from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime


class DiskUsage(BaseModel):
    """Disk usage information for a storage path"""

    path: str
    total: float  # GB
    used: float  # GB
    free: float  # GB
    percent: float  # Usage percentage


class RaidDisk(BaseModel):
    """Individual disk in RAID array"""

    device: str
    state: str  # active, spare, faulty, etc.
    role: str


class RaidArray(BaseModel):
    """RAID array status information"""

    device: str
    status: str  # healthy, degraded, recovering, failed
    level: str  # raid0, raid1, raid5, raid6, raid10
    devices: int  # Total devices in array
    active_devices: int
    failed_devices: int
    spare_devices: int
    disks: List[RaidDisk] = []


class ZfsDisk(BaseModel):
    """Individual disk in ZFS pool"""

    device: str
    state: str  # online, degraded, faulted, offline, etc.
    vdev_type: Optional[str] = None  # raidz1, raidz2, mirror, etc.
    read_errors: Optional[int] = None
    write_errors: Optional[int] = None
    cksum_errors: Optional[int] = None


class ZfsPool(BaseModel):
    """ZFS pool status information"""

    pool: str
    status: str  # healthy, degraded, recovering, failed
    state: str  # ONLINE, DEGRADED, FAULTED, etc.
    type: str = "zfs"
    scan: Optional[str] = None  # Scrub/resilver status
    errors: str = "none"
    size: Optional[str] = None  # Total size (e.g., "10T")
    allocated: Optional[str] = None  # Allocated space
    free: Optional[str] = None  # Free space
    capacity: Optional[str] = None  # Capacity percentage
    disks: List[ZfsDisk] = []


class DiskInfo(BaseModel):
    """Physical disk information"""

    device: str
    mountpoint: str
    fstype: str
    read_bytes: Optional[int] = None
    write_bytes: Optional[int] = None
    read_count: Optional[int] = None
    write_count: Optional[int] = None


class StorageMetrics(BaseModel):
    """Storage metrics for a service"""

    hostname: str
    storage_paths: List[DiskUsage] = []
    raid_arrays: List[RaidArray] = []
    zfs_pools: List[ZfsPool] = []
    disks: List[DiskInfo] = []
    last_updated: datetime | None = None


class StorageDataPoint(BaseModel):
    """Single storage data point for historical data"""

    timestamp: datetime
    hostname: str
    total_capacity: float  # Total GB across all monitored paths
    total_used: float  # Total used GB
    total_free: float  # Total free GB
    average_usage_percent: float
    raid_healthy: int  # Number of healthy RAID arrays (mdadm + ZFS)
    raid_degraded: int  # Number of degraded RAID arrays
    raid_failed: int  # Number of failed RAID arrays


class StorageUpdate(BaseModel):
    """Model for updating storage data from agent"""

    service_id: str
    hostname: str
    timestamp: str
    storage_paths: List[DiskUsage]
    raid_arrays: List[RaidArray] = []
    zfs_pools: List[ZfsPool] = []
    disks: List[DiskInfo] = []
