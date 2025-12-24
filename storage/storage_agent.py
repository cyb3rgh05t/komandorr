#!/usr/bin/env python3
"""
Komandorr Storage Monitor Agent
================================
Lightweight agent to monitor server storage (RAID, disks, UnionFS) and report to Komandorr dashboard.

Installation:
1. Copy this script to your server
2. Install dependencies: pip install psutil requests colorama
3. Configure KOMANDORR_URL and SERVICE_ID
4. Run: python storage_agent.py
5. Optional: Setup as systemd service or cron job

Requirements:
- Python 3.8+
- psutil
- requests
- colorama
- Root/sudo access for RAID monitoring (mdadm)
"""

import psutil
import requests
import time
import json
import sys
import os
import subprocess
import re
from datetime import datetime
from typing import Dict, List, Optional, Union, Any
from colorama import Fore, Style, init
from pathlib import Path

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# ============================================
# CONFIGURATION - EDIT THESE VALUES
# ============================================

# URL of your Komandorr dashboard
KOMANDORR_URL = "https://komandorr.mystreamnet.club"

# Service ID from Komandorr (get this from the dashboard)
SERVICE_ID = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# How often to send data (in seconds)
UPDATE_INTERVAL = 60

# Storage paths to monitor (add your mount points)
STORAGE_PATHS = [
    "/mnt/storage",
    "/mnt/raid1",
    "/mnt/raid2",
    "/mnt/unionfs",
]

# RAID devices to monitor (Linux mdadm)
RAID_DEVICES = [
    "/dev/md0",
    "/dev/md1",
]

# ZFS pools to monitor (Linux ZFS)
ZFS_POOLS = [
    "zfsraidpool",
]

# Monitor individual disks in RAID arrays
MONITOR_RAID_DISKS = True

# Optional: Basic auth credentials if enabled in Komandorr
AUTH_USERNAME = None
AUTH_PASSWORD = None

# State file to persist data across restarts
STATE_FILE = os.path.join(
    os.path.dirname(__file__), f".storage_state_{SERVICE_ID}.json"
)

# ============================================
# LOGGING HELPERS
# ============================================


class AgentLogger:
    """Simple logger with colored output for the storage agent"""

    @staticmethod
    def debug(message: str):
        """Debug message (cyan)"""
        print(f"{Fore.CYAN}{Style.BRIGHT}DEBUG{Style.RESET_ALL} - {message}")

    @staticmethod
    def info(message: str):
        """Info message (green)"""
        print(f"{Fore.GREEN}{Style.BRIGHT}INFO{Style.RESET_ALL} - {message}")

    @staticmethod
    def warning(message: str):
        """Warning message (yellow)"""
        print(f"{Fore.YELLOW}{Style.BRIGHT}WARNING{Style.RESET_ALL} - {message}")

    @staticmethod
    def error(message: str):
        """Error message (red)"""
        print(f"{Fore.RED}{Style.BRIGHT}ERROR{Style.RESET_ALL} - {message}")

    @staticmethod
    def success(message: str):
        """Success message (green)"""
        print(f"{Fore.GREEN}{Style.BRIGHT}SUCCESS{Style.RESET_ALL} - {message}")

    @staticmethod
    def header(message: str):
        """Header message (bright white)"""
        print(f"\n{Style.BRIGHT}{message}{Style.RESET_ALL}")
        print("=" * len(message))


logger = AgentLogger()


# ============================================
# STORAGE MONITORING
# ============================================


class StorageMonitor:
    """Monitor storage devices, RAID arrays, and file systems"""

    def __init__(self):
        self.hostname = self._get_hostname()
        self.last_update = None

    @staticmethod
    def _get_hostname() -> str:
        """Get server hostname"""
        try:
            import socket

            return socket.gethostname()
        except:
            return "unknown"

    def get_disk_usage(self, path: str) -> Optional[Dict[str, Any]]:
        """Get disk usage for a specific path"""
        try:
            if not os.path.exists(path):
                logger.warning(f"Path does not exist: {path}")
                return None

            usage = psutil.disk_usage(path)
            return {
                "path": path,
                "total": round(usage.total / (1024**3), 2),  # GB
                "used": round(usage.used / (1024**3), 2),  # GB
                "free": round(usage.free / (1024**3), 2),  # GB
                "percent": round(usage.percent, 2),
            }
        except Exception as e:
            logger.error(f"Error getting disk usage for {path}: {e}")
            return None

    def get_raid_status(self, device: str) -> Optional[Dict[str, Any]]:
        """Get RAID status using mdadm (Linux)"""
        try:
            # Try mdadm first
            result = subprocess.run(
                ["mdadm", "--detail", device],
                capture_output=True,
                text=True,
                timeout=5,
            )

            if result.returncode != 0:
                logger.warning(f"Could not get RAID status for {device}")
                return None

            output = result.stdout
            raid_info = {
                "device": device,
                "status": "unknown",
                "level": "unknown",
                "devices": 0,
                "active_devices": 0,
                "failed_devices": 0,
                "spare_devices": 0,
                "disks": [],
            }

            # Parse mdadm output
            for line in output.split("\n"):
                line = line.strip()

                if "State :" in line:
                    state = line.split("State :")[1].strip()
                    if "clean" in state.lower():
                        raid_info["status"] = "healthy"
                    elif "degraded" in state.lower():
                        raid_info["status"] = "degraded"
                    elif "recovering" in state.lower():
                        raid_info["status"] = "recovering"
                    else:
                        raid_info["status"] = state

                elif "Raid Level :" in line:
                    raid_info["level"] = line.split("Raid Level :")[1].strip()

                elif "Raid Devices :" in line:
                    raid_info["devices"] = int(line.split("Raid Devices :")[1].strip())

                elif "Active Devices :" in line:
                    raid_info["active_devices"] = int(
                        line.split("Active Devices :")[1].strip()
                    )

                elif "Failed Devices :" in line:
                    raid_info["failed_devices"] = int(
                        line.split("Failed Devices :")[1].strip()
                    )

                elif "Spare Devices :" in line:
                    raid_info["spare_devices"] = int(
                        line.split("Spare Devices :")[1].strip()
                    )

                # Parse disk information
                elif re.match(r"\s*\d+\s+\d+\s+\d+\s+\d+\s+\w+\s+\w+\s+/dev/", line):
                    parts = line.split()
                    if len(parts) >= 7:
                        disk_info = {
                            "device": parts[6],
                            "state": parts[5].lower(),
                            "role": parts[4],
                        }
                        raid_info["disks"].append(disk_info)

            return raid_info

        except FileNotFoundError:
            logger.warning("mdadm not found. RAID monitoring requires mdadm.")
            return None
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout getting RAID status for {device}")
            return None
        except Exception as e:
            logger.error(f"Error getting RAID status for {device}: {e}")
            return None

    def get_zfs_pool_status(self, pool_name: str) -> Optional[Dict[str, Any]]:
        """Get ZFS pool status using zpool status"""
        try:
            # Get pool status
            result = subprocess.run(
                ["zpool", "status", pool_name],
                capture_output=True,
                text=True,
                timeout=5,
            )

            if result.returncode != 0:
                logger.warning(f"Could not get ZFS pool status for {pool_name}")
                return None

            output = result.stdout
            pool_info = {
                "pool": pool_name,
                "status": "unknown",
                "state": "unknown",
                "scan": None,
                "errors": "none",
                "disks": [],
                "type": "zfs",
            }

            current_section = None
            vdev_type = None

            # Parse zpool status output
            for line in output.split("\n"):
                line_stripped = line.strip()

                # Pool state
                if "state:" in line.lower():
                    state = line.split(":")[1].strip().upper()
                    pool_info["state"] = state
                    if state == "ONLINE":
                        pool_info["status"] = "healthy"
                    elif state == "DEGRADED":
                        pool_info["status"] = "degraded"
                    elif state == "FAULTED" or state == "UNAVAIL":
                        pool_info["status"] = "failed"
                    else:
                        pool_info["status"] = state.lower()

                # Pool status/action
                elif "status:" in line.lower() and "state:" not in line.lower():
                    pool_info["action"] = line.split(":")[1].strip()

                # Scan/resilver info
                elif "scan:" in line.lower():
                    scan_info = line.split(":")[1].strip()
                    pool_info["scan"] = scan_info
                    if (
                        "resilver" in scan_info.lower()
                        and "in progress" in scan_info.lower()
                    ):
                        pool_info["status"] = "recovering"

                # Errors
                elif "errors:" in line.lower():
                    pool_info["errors"] = line.split(":")[1].strip()

                # Config section
                elif "config:" in line.lower():
                    current_section = "config"
                    continue

                # Parse disk information in config section
                if current_section == "config" and line_stripped:
                    # Skip header lines
                    if "NAME" in line or "STATE" in line:
                        continue

                    # Match disk lines (e.g., "  sda1  ONLINE  0  0  0")
                    match = re.match(
                        r"\s+(\S+)\s+(\S+)(?:\s+(\d+)\s+(\d+)\s+(\d+))?.*", line
                    )
                    if match:
                        device = match.group(1)
                        state = match.group(2)

                        # Identify vdev type (raidz1, raidz2, mirror, etc.)
                        if device == pool_name:
                            continue
                        elif device.startswith("raidz") or device in [
                            "mirror",
                            "spare",
                            "cache",
                            "log",
                        ]:
                            vdev_type = device
                            continue

                        # Add disk info
                        disk_info = {
                            "device": device,
                            "state": state.lower(),
                            "vdev_type": vdev_type,
                        }

                        # Add error counts if available
                        if match.group(3):
                            disk_info["read_errors"] = int(match.group(3))
                            disk_info["write_errors"] = int(match.group(4))
                            disk_info["cksum_errors"] = int(match.group(5))

                        pool_info["disks"].append(disk_info)

            # Get pool capacity
            try:
                cap_result = subprocess.run(
                    ["zpool", "list", "-H", "-o", "size,alloc,free,cap", pool_name],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if cap_result.returncode == 0:
                    parts = cap_result.stdout.strip().split()
                    if len(parts) >= 4:
                        pool_info["size"] = parts[0]
                        pool_info["allocated"] = parts[1]
                        pool_info["free"] = parts[2]
                        pool_info["capacity"] = parts[3].rstrip("%")
            except:
                pass

            return pool_info

        except FileNotFoundError:
            logger.warning("zpool not found. ZFS monitoring requires ZFS tools.")
            return None
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout getting ZFS pool status for {pool_name}")
            return None
        except Exception as e:
            logger.error(f"Error getting ZFS pool status for {pool_name}: {e}")
            return None

    def get_all_disks(self) -> List[Dict[str, Any]]:
        """Get information about all physical disks"""
        disks = []
        try:
            partitions = psutil.disk_partitions(all=False)
            disk_io = psutil.disk_io_counters(perdisk=True)

            seen_devices = set()
            for partition in partitions:
                # Extract base device name (e.g., sda from sda1)
                device = partition.device
                base_device = re.sub(r"\d+$", "", device.split("/")[-1])

                if base_device not in seen_devices:
                    seen_devices.add(base_device)

                    disk_info: Dict[str, Any] = {
                        "device": device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                    }

                    # Add I/O stats if available
                    if base_device in disk_io:
                        io = disk_io[base_device]
                        disk_info["read_bytes"] = io.read_bytes
                        disk_info["write_bytes"] = io.write_bytes
                        disk_info["read_count"] = io.read_count
                        disk_info["write_count"] = io.write_count

                    disks.append(disk_info)

        except Exception as e:
            logger.error(f"Error getting disk information: {e}")

        return disks

    def get_storage_data(self) -> Dict[str, Any]:
        """Collect all storage data"""
        data = {
            "service_id": SERVICE_ID,
            "hostname": self.hostname,
            "timestamp": datetime.now().isoformat(),
            "storage_paths": [],
            "raid_arrays": [],
            "zfs_pools": [],
            "disks": [],
        }

        # Get disk usage for monitored paths
        logger.info(f"Monitoring {len(STORAGE_PATHS)} storage paths...")
        for path in STORAGE_PATHS:
            usage = self.get_disk_usage(path)
            if usage:
                data["storage_paths"].append(usage)
                logger.debug(
                    f"  {path}: {usage['used']:.2f}GB / {usage['total']:.2f}GB ({usage['percent']}%)"
                )

        # Get RAID status
        if RAID_DEVICES:
            logger.info(f"Monitoring {len(RAID_DEVICES)} mdadm RAID arrays...")
            for raid_device in RAID_DEVICES:
                raid_status = self.get_raid_status(raid_device)
                if raid_status:
                    data["raid_arrays"].append(raid_status)
                    status_color = (
                        Fore.GREEN if raid_status["status"] == "healthy" else Fore.RED
                    )
                    logger.debug(
                        f"  {raid_device}: {status_color}{raid_status['status']}{Style.RESET_ALL} "
                        f"({raid_status['level']}, {raid_status['active_devices']}/{raid_status['devices']} active)"
                    )

        # Get ZFS pool status
        if ZFS_POOLS:
            logger.info(f"Monitoring {len(ZFS_POOLS)} ZFS pools...")
            for pool_name in ZFS_POOLS:
                pool_status = self.get_zfs_pool_status(pool_name)
                if pool_status:
                    data["zfs_pools"].append(pool_status)
                    status_color = (
                        Fore.GREEN if pool_status["status"] == "healthy" else Fore.RED
                    )
                    capacity = pool_status.get("capacity", "N/A")
                    logger.debug(
                        f"  {pool_name}: {status_color}{pool_status['status']}{Style.RESET_ALL} "
                        f"({pool_status['state']}, {capacity}% capacity, {len(pool_status['disks'])} disks)"
                    )

        # Get disk information
        if MONITOR_RAID_DISKS:
            data["disks"] = self.get_all_disks()
            logger.debug(f"  Found {len(data['disks'])} disk devices")

        return data

    def send_data(self, data: Dict[str, Any]) -> bool:
        """Send storage data to Komandorr dashboard"""
        try:
            url = f"{KOMANDORR_URL.rstrip('/')}/api/storage/update"
            headers = {"Content-Type": "application/json"}

            auth = None
            if AUTH_USERNAME and AUTH_PASSWORD:
                auth = (AUTH_USERNAME, AUTH_PASSWORD)

            response = requests.post(
                url, json=data, headers=headers, auth=auth, timeout=10
            )

            if response.status_code == 200:
                logger.success(f"✓ Data sent successfully to {KOMANDORR_URL}")
                self.last_update = datetime.now()
                return True
            else:
                logger.error(
                    f"Failed to send data: HTTP {response.status_code} - {response.text}"
                )
                return False

        except requests.exceptions.ConnectionError:
            logger.error(f"Cannot connect to Komandorr at {KOMANDORR_URL}")
            return False
        except requests.exceptions.Timeout:
            logger.error("Request timed out")
            return False
        except Exception as e:
            logger.error(f"Error sending data: {e}")
            return False


# ============================================
# MAIN LOOP
# ============================================


def validate_config():
    """Validate configuration before starting"""
    issues = []

    if SERVICE_ID == "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx":
        issues.append("⚠ SERVICE_ID is set to default - please update")

    if not STORAGE_PATHS and not RAID_DEVICES and not ZFS_POOLS:
        issues.append(
            "⚠ Nothing configured to monitor - add STORAGE_PATHS, RAID_DEVICES, or ZFS_POOLS"
        )

    if issues:
        logger.warning("Configuration issues detected:")
        for issue in issues:
            print(f"  {issue}")
        print()

    return len(issues) == 0


def print_banner():
    """Print startup banner"""
    logger.header("Komandorr Storage Monitor Agent")
    print(f"Hostname:        {StorageMonitor()._get_hostname()}")
    print(f"Dashboard:       {KOMANDORR_URL}")
    print(f"Service ID:      {SERVICE_ID}")
    print(f"Update Interval: {UPDATE_INTERVAL}s")
    print(f"Storage Paths:   {len(STORAGE_PATHS)} configured")
    print(f"mdadm RAID:      {len(RAID_DEVICES)} configured")
    print(f"ZFS Pools:       {len(ZFS_POOLS)} configured")
    print()


def main():
    """Main agent loop"""
    print_banner()

    if not validate_config():
        logger.error("Please fix configuration issues before starting")
        sys.exit(1)

    monitor = StorageMonitor()
    iteration = 0

    logger.info("Storage monitoring agent started")
    logger.info(f"Press Ctrl+C to stop")
    print()

    try:
        while True:
            iteration += 1
            logger.header(
                f"Iteration #{iteration} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )

            # Collect storage data
            storage_data = monitor.get_storage_data()

            # Send to Komandorr
            success = monitor.send_data(storage_data)

            if success:
                logger.info(f"Next update in {UPDATE_INTERVAL} seconds...")
            else:
                logger.warning(f"Retrying in {UPDATE_INTERVAL} seconds...")

            print()
            time.sleep(UPDATE_INTERVAL)

    except KeyboardInterrupt:
        logger.info("\nStopping storage monitor agent...")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
