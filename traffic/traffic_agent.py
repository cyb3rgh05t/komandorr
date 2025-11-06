#!/usr/bin/env python3
"""
Komandorr Traffic Monitor Agent
================================
Lightweight agent to monitor server network traffic and report to Komandorr dashboard.

Installation:
1. Copy this script to your server
2. Install dependencies: pip install psutil requests
3. Configure KOMANDORR_URL and SERVICE_ID
4. Run: python traffic_agent.py
5. Optional: Setup as systemd service or cron job

Requirements:
- Python 3.8+
- psutil
- requests
"""

import psutil
import requests
import time
import json
import sys
from datetime import datetime
from typing import Dict

# ============================================
# CONFIGURATION - EDIT THESE VALUES
# ============================================

# URL of your Komandorr dashboard
KOMANDORR_URL = "http://localhost:8000"

# Service ID from Komandorr (get this from the dashboard)
SERVICE_ID = "your-service-id-here"

# How often to send data (in seconds)
UPDATE_INTERVAL = 30

# Network interface to monitor (None = all interfaces, or specify like 'eth0', 'ens18')
NETWORK_INTERFACE = None

# Optional: Basic auth credentials if enabled in Komandorr
AUTH_USERNAME = None
AUTH_PASSWORD = None

# ============================================
# CODE - DO NOT EDIT BELOW
# ============================================


class TrafficMonitor:
    """Monitor network traffic and send to Komandorr"""

    def __init__(self):
        self.last_bytes_sent = 0
        self.last_bytes_recv = 0
        self.total_sent_gb = 0.0
        self.total_recv_gb = 0.0
        self.last_update = time.time()
        self._initialize_counters()

    def _initialize_counters(self):
        """Initialize network counters"""
        stats = self._get_network_stats()
        self.last_bytes_sent = stats["bytes_sent"]
        self.last_bytes_recv = stats["bytes_recv"]

    def _get_network_stats(self) -> Dict:
        """Get current network statistics"""
        if NETWORK_INTERFACE:
            # Monitor specific interface
            stats = psutil.net_io_counters(pernic=True).get(NETWORK_INTERFACE)
            if not stats:
                print(f"Warning: Interface {NETWORK_INTERFACE} not found")
                stats = psutil.net_io_counters()
        else:
            # Monitor all interfaces combined
            stats = psutil.net_io_counters()

        return {
            "bytes_sent": stats.bytes_sent,
            "bytes_recv": stats.bytes_recv,
        }

    def calculate_traffic(self) -> Dict:
        """Calculate current bandwidth and total traffic"""
        current_stats = self._get_network_stats()
        current_time = time.time()

        # Calculate time delta
        time_delta = current_time - self.last_update

        # Calculate bytes transferred since last check
        bytes_sent_delta = current_stats["bytes_sent"] - self.last_bytes_sent
        bytes_recv_delta = current_stats["bytes_recv"] - self.last_bytes_recv

        # Calculate bandwidth in MB/s
        bandwidth_up = (bytes_sent_delta / time_delta) / (1024 * 1024)
        bandwidth_down = (bytes_recv_delta / time_delta) / (1024 * 1024)

        # Update totals in GB
        self.total_sent_gb += bytes_sent_delta / (1024 * 1024 * 1024)
        self.total_recv_gb += bytes_recv_delta / (1024 * 1024 * 1024)

        # Update last values
        self.last_bytes_sent = current_stats["bytes_sent"]
        self.last_bytes_recv = current_stats["bytes_recv"]
        self.last_update = current_time

        return {
            "service_id": SERVICE_ID,
            "bandwidth_up": round(bandwidth_up, 2),
            "bandwidth_down": round(bandwidth_down, 2),
            "total_up": round(self.total_sent_gb, 3),
            "total_down": round(self.total_recv_gb, 3),
        }

    def send_to_komandorr(self, traffic_data: Dict) -> bool:
        """Send traffic data to Komandorr dashboard"""
        url = f"{KOMANDORR_URL}/api/traffic/update"

        try:
            auth = None
            if AUTH_USERNAME and AUTH_PASSWORD:
                auth = (AUTH_USERNAME, AUTH_PASSWORD)

            response = requests.post(
                url,
                json=traffic_data,
                auth=auth,
                timeout=10,
            )

            if response.status_code == 200:
                print(
                    f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                    f"✓ Sent: ↑{traffic_data['bandwidth_up']:.2f} MB/s "
                    f"↓{traffic_data['bandwidth_down']:.2f} MB/s "
                    f"| Total: ↑{traffic_data['total_up']:.2f} GB "
                    f"↓{traffic_data['total_down']:.2f} GB"
                )
                return True
            else:
                print(f"✗ Error: Server returned {response.status_code}")
                print(f"  Response: {response.text}")
                return False

        except requests.exceptions.ConnectionError:
            print(f"✗ Error: Cannot connect to {KOMANDORR_URL}")
            return False
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            return False

    def run(self):
        """Main monitoring loop"""
        print("=" * 60)
        print("Komandorr Traffic Monitor Agent")
        print("=" * 60)
        print(f"Dashboard URL: {KOMANDORR_URL}")
        print(f"Service ID: {SERVICE_ID}")
        print(f"Update Interval: {UPDATE_INTERVAL}s")
        print(f"Network Interface: {NETWORK_INTERFACE or 'All interfaces'}")
        print("=" * 60)
        print("\nStarting monitoring... (Press Ctrl+C to stop)\n")

        try:
            while True:
                traffic_data = self.calculate_traffic()
                self.send_to_komandorr(traffic_data)
                time.sleep(UPDATE_INTERVAL)

        except KeyboardInterrupt:
            print("\n\nStopping monitor... Goodbye!")
            sys.exit(0)


def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import psutil
        import requests

        return True
    except ImportError as e:
        print("=" * 60)
        print("ERROR: Missing dependencies!")
        print("=" * 60)
        print(f"\n{str(e)}\n")
        print("Please install required packages:")
        print("  pip install psutil requests")
        print("\nOr using requirements:")
        print("  pip install -r requirements.txt")
        print()
        return False


def main():
    """Main entry point"""
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)

    # Validate configuration
    if SERVICE_ID == "your-service-id-here":
        print("=" * 60)
        print("ERROR: Configuration required!")
        print("=" * 60)
        print("\nPlease edit this script and set:")
        print("  - KOMANDORR_URL: URL of your Komandorr dashboard")
        print("  - SERVICE_ID: Your service ID from the dashboard")
        print("\nOptional settings:")
        print("  - UPDATE_INTERVAL: How often to send data (default: 30s)")
        print("  - NETWORK_INTERFACE: Specific interface to monitor")
        print("  - AUTH_USERNAME/AUTH_PASSWORD: If auth is enabled")
        print()
        sys.exit(1)

    # Start monitoring
    monitor = TrafficMonitor()
    monitor.run()


if __name__ == "__main__":
    main()
