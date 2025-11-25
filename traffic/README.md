# Komandorr Traffic Monitor Agent

A lightweight Python agent that monitors network traffic on your servers and reports to your Komandorr dashboard.

## Features

- Real-time bandwidth monitoring (upload/download speeds)
- Total traffic tracking (cumulative data transfer)
- Automatic reporting to Komandorr dashboard
- Configurable network interface monitoring
- Support for basic authentication
- Lightweight and efficient

## Requirements

- Python 3.8 or higher
- `psutil` library
- `requests` library

## Installation

### 1. Copy the agent script to your server

```bash
# Download the script
mkdir /opt/scripts
cd /opt/scripts
wget https://raw.githubusercontent.com/cyb3rgh05t/komandorr/refs/heads/main/traffic/traffic_agent.py
wget https://raw.githubusercontent.com/cyb3rgh05t/komandorr/refs/heads/main/traffic/requirements.txt
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure the agent

Edit `traffic_agent.py` and set the following variables:

```bash
sudo nano traffic_agent.py
```

```python
# URL of your Komandorr dashboard
KOMANDORR_URL = "https://komandorr.mystreamnet.club"

# Service ID from Komandorr (get this from the dashboard)
SERVICE_ID = "your-service-id-here"

# Optional: Update interval in seconds (default: 30)
UPDATE_INTERVAL = 30

# Optional: Specific network interface to monitor
NETWORK_INTERFACE = None  # None for all or "eth0", "ens18", etc.

# Maximum bandwidth capacity of this server in MB/s (used for percentage calculations)
# Example: 125 MB/s = 1 Gbps, 1250 MB/s = 10 Gbps, 12.5 MB/s = 100 Mbps
MAX_BANDWIDTH = 100.0

# Optional: Authentication if enabled in Komandorr
AUTH_USERNAME = None
AUTH_PASSWORD = None
```

### 4. Get your Service ID

1. Open your Komandorr dashboard
2. Go to **Services** page
3. Find or create the service you want to monitor
4. Copy the Service ID from the service details

## Usage

### Run manually

```bash
python3 traffic_agent.py
```

The agent will start monitoring and sending data to your Komandorr dashboard every 30 seconds (or your configured interval).

### Run as a systemd service (Linux)

1. Create a systemd service file:

```bash
sudo nano /etc/systemd/system/komandorr-traffic.service
```

2. Add the following content:

```ini
[Unit]
Description=Komandorr Traffic Monitor Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/scripts
ExecStart=/usr/bin/python3 /opt/scripts/traffic_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable komandorr-traffic
sudo systemctl start komandorr-traffic
```

4. Check status:

```bash
sudo systemctl status komandorr-traffic
```

### Run with cron (alternative)

Add to crontab to run on system boot:

```bash
crontab -e
```

Add this line:

```
@reboot /usr/bin/python3 /opt/scripts/traffic_agent.py &
```

## Monitoring Specific Network Interfaces

To monitor a specific network interface instead of all combined:

1. List available interfaces:

```bash
ip addr show
# or
ifconfig
```

2. Set the interface in the script:

```python
NETWORK_INTERFACE = "eth0"  # or ens18, ens19, etc.
```

## Troubleshooting

### Agent can't connect to Komandorr

- Check that `KOMANDORR_URL` is correct
- Verify network connectivity: `curl http://your-komandorr-server:8000/api/health`
- Check firewall rules

### Invalid Service ID

- Verify the `SERVICE_ID` matches a service in your Komandorr dashboard
- Check for typos in the ID

### Permission errors

- Make sure the user running the agent has permission to read network statistics
- On Linux, you may need to run with sudo or add user to appropriate group

### Interface not found

- Check available interfaces: `ip addr` or `ifconfig`
- Use `None` to monitor all interfaces combined

## Data Format

The agent sends the following data to Komandorr:

```json
{
  "service_id": "your-service-id",
  "bandwidth_up": 12.34, // MB/s
  "bandwidth_down": 45.67, // MB/s
  "total_up": 123.45, // GB
  "total_down": 678.9 // GB
}
```

## Security Notes

- **Authentication**: If your Komandorr instance has authentication enabled, configure `AUTH_USERNAME` and `AUTH_PASSWORD`
- **HTTPS**: Use HTTPS for production deployments to encrypt traffic data
- **Firewall**: Only allow traffic from your monitoring servers to Komandorr

## Advanced Configuration

### Multiple Services on One Server

Run multiple instances with different configurations:

```bash
# Service 1
python3 traffic_agent_service1.py &

# Service 2
python3 traffic_agent_service2.py &
```

Each agent should have a different `SERVICE_ID`.

### Custom Update Intervals

Adjust based on your needs:

```python
UPDATE_INTERVAL = 10   # More frequent updates (every 10 seconds)
UPDATE_INTERVAL = 60   # Less frequent updates (every minute)
UPDATE_INTERVAL = 300  # Every 5 minutes
```

**Note**: More frequent updates = more API calls and higher CPU usage (minimal impact).

## License

This agent is part of the Komandorr project and follows the same license.

## Support

For issues and questions:

- GitHub Issues: https://github.com/cyb3rgh05t/komandorr/issues
- Telegram: https://t.me/cyb3rgh05t_01
