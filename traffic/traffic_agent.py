#!/usr/bin/env python3
"""
Komandorr Traffic Monitor Agent
================================
Lightweight agent to monitor server network traffic and report to Komandorr dashboard.

Installation:
1. Copy this script to your server
2. Install dependencies: pip install psutil requests colorama
3. Configure KOMANDORR_URL and SERVICE_ID
4. Run: python traffic_agent.py
5. Optional: Setup as systemd service or cron job

Requirements:
- Python 3.8+
- psutil
- requests
- colorama
"""

import psutil
import requests
import time
import json
import sys
from datetime import datetime
from typing import Dict
from colorama import Fore, Back, Style, init

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
UPDATE_INTERVAL = 5

# Network interface to monitor (None = all interfaces, or specify like 'eth0', 'ens18')
NETWORK_INTERFACE = None

# Maximum bandwidth capacity of this server in MB/s (used for percentage calculations)
# Example: 125 MB/s = 1 Gbps, 1250 MB/s = 10 Gbps, 12.5 MB/s = 100 Mbps
MAX_BANDWIDTH = 100.0

# Optional: Basic auth credentials if enabled in Komandorr
AUTH_USERNAME = None
AUTH_PASSWORD = None

# ============================================
# LOGGING HELPERS
# ============================================


class AgentLogger:
    """Simple logger with colored output for the traffic agent"""

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
        print(f"{Style.BRIGHT}{message}{Style.RESET_ALL}")

    @staticmethod
    def separator():
        """Print a separator line"""
        print(f"{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")


logger = AgentLogger()

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
                logger.warning(
                    f"Interface {NETWORK_INTERFACE} not found, using all interfaces"
                )
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
            "max_bandwidth": MAX_BANDWIDTH,
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
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                logger.success(
                    f"[{timestamp}] Sent: {Fore.CYAN}↑{traffic_data['bandwidth_up']:.2f} MB/s "
                    f"{Fore.BLUE}↓{traffic_data['bandwidth_down']:.2f} MB/s{Style.RESET_ALL} "
                    f"| Total: {Fore.YELLOW}↑{traffic_data['total_up']:.2f} GB "
                    f"↓{traffic_data['total_down']:.2f} GB{Style.RESET_ALL}"
                )
                return True
            else:
                logger.error(f"Server returned status {response.status_code}")
                logger.debug(f"Response: {response.text}")
                return False

        except requests.exceptions.ConnectionError:
            logger.error(f"Cannot connect to {KOMANDORR_URL}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return False

    def run(self):
        """Main monitoring loop"""
        logger.separator()
        logger.header("Komandorr Traffic Monitor Agent")
        logger.separator()
        logger.info(f"Dashboard URL: {Fore.CYAN}{KOMANDORR_URL}{Style.RESET_ALL}")
        logger.info(f"Service ID: {Fore.YELLOW}{SERVICE_ID}{Style.RESET_ALL}")
        logger.info(f"Update Interval: {Fore.GREEN}{UPDATE_INTERVAL}s{Style.RESET_ALL}")
        logger.info(
            f"Network Interface: {Fore.MAGENTA}{NETWORK_INTERFACE or 'All interfaces'}{Style.RESET_ALL}"
        )
        logger.separator()
        logger.info("Starting monitoring... (Press Ctrl+C to stop)\n")

        try:
            while True:
                traffic_data = self.calculate_traffic()
                self.send_to_komandorr(traffic_data)
                time.sleep(UPDATE_INTERVAL)

        except KeyboardInterrupt:
            logger.info("\nStopping monitor... Goodbye!")
            sys.exit(0)


def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import psutil
        import requests
        import colorama

        logger.debug("All dependencies found")
        return True
    except ImportError as e:
        logger.separator()
        logger.error("Missing dependencies!")
        logger.separator()
        print(f"\n{str(e)}\n")
        logger.info("Please install required packages:")
        print(f"  {Fore.CYAN}pip install psutil requests colorama{Style.RESET_ALL}")
        logger.info("Or using requirements:")
        print(f"  {Fore.CYAN}pip install -r requirements.txt{Style.RESET_ALL}\n")
        return False


def main():
    """Main entry point"""
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)

    # Validate configuration
    if SERVICE_ID == "your-service-id-here":
        logger.separator()
        logger.error("Configuration required!")
        logger.separator()
        logger.info("Please edit this script and set:")
        print(
            f"  {Fore.YELLOW}KOMANDORR_URL{Style.RESET_ALL}: URL of your Komandorr dashboard"
        )
        print(
            f"  {Fore.YELLOW}SERVICE_ID{Style.RESET_ALL}: Your service ID from the dashboard"
        )
        logger.info("Optional settings:")
        print(
            f"  {Fore.CYAN}UPDATE_INTERVAL{Style.RESET_ALL}: How often to send data (default: 30s)"
        )
        print(
            f"  {Fore.CYAN}NETWORK_INTERFACE{Style.RESET_ALL}: Specific interface to monitor"
        )
        print(
            f"  {Fore.CYAN}AUTH_USERNAME/AUTH_PASSWORD{Style.RESET_ALL}: If auth is enabled\n"
        )
        sys.exit(1)

    # Start monitoring
    monitor = TrafficMonitor()
    monitor.run()


if __name__ == "__main__":
    main()
