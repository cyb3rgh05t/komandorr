# Traffic Monitoring

Monitor network bandwidth usage with real-time and historical data visualization.

## Overview

Komandorr's traffic monitoring feature tracks network bandwidth consumption, providing insights into upload/download usage patterns.

## Architecture

Traffic monitoring consists of two components:

1. **Traffic Agent** - Runs on monitored servers
2. **Komandorr Dashboard** - Displays and stores metrics

## Installation

### Install Traffic Agent

On the server you want to monitor:

```bash
# Clone repository or download traffic agent
git clone https://github.com/cyb3rgh05t/komandorr.git
cd komandorr/traffic

# Install dependencies
pip install -r requirements.txt

# Run the agent
python traffic_agent.py
```

### Configure Agent

Edit `traffic_agent.py` or set environment variables:

```bash
export KOMANDORR_URL=http://your-komandorr:3000
export INTERFACE=eth0
export INTERVAL=5
```

Or modify the script:

```python
KOMANDORR_URL = "http://your-komandorr:3000"
INTERFACE = "eth0"  # Network interface to monitor
INTERVAL = 5        # Update interval in seconds
```

## Network Interfaces

Identify your network interface:

=== "Linux"

    ```bash
    ip link show
    # or
    ifconfig
    ```

=== "Windows"

    ```powershell
    ipconfig
    # or
    Get-NetAdapter
    ```

=== "macOS"

    ```bash
    ifconfig
    # or
    networksetup -listallhardwareports
    ```

Common interfaces:

- **eth0** - Primary ethernet (Linux)
- **eno1** - Ethernet (Linux, systemd naming)
- **wlan0** - WiFi (Linux)
- **en0** - Primary network (macOS)

## Metrics Collected

### Bandwidth Usage

- **Upload Rate** - Current bytes/sec uploaded
- **Download Rate** - Current bytes/sec downloaded
- **Total Upload** - Cumulative bytes uploaded
- **Total Download** - Cumulative bytes downloaded

### Visualizations

- Real-time line charts
- Historical data (last 24 hours)
- Peak usage indicators
- Average bandwidth calculations

## Dashboard Features

### Real-time Monitoring

View current traffic in real-time:

- Live upload/download rates
- Color-coded graphs
- Auto-refreshing display

### Historical Data

Analyze traffic patterns:

- Last hour, day, week, or month
- Identify peak usage times
- Compare trends over time

### Data Retention

- In-memory: Last 100 data points
- Database: Last 1000 data points per service
- Automatic cleanup of old data

## Configuration

### Update Interval

Configure how often traffic data is collected:

```python
INTERVAL = 5  # Update every 5 seconds
```

Recommended values:

- **Real-time monitoring**: 5-10 seconds
- **General monitoring**: 30-60 seconds
- **Light monitoring**: 300+ seconds

### API Endpoint

Point the agent to your Komandorr instance:

```python
KOMANDORR_URL = "http://localhost:3000"
```

## Running as Service

### Linux (systemd)

Create `/etc/systemd/system/komandorr-traffic.service`:

```ini
[Unit]
Description=Komandorr Traffic Agent
After=network.target

[Service]
Type=simple
User=komandorr
WorkingDirectory=/opt/komandorr/traffic
ExecStart=/usr/bin/python3 traffic_agent.py
Restart=always
Environment="KOMANDORR_URL=http://your-komandorr:3000"
Environment="INTERFACE=eth0"

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable komandorr-traffic
sudo systemctl start komandorr-traffic
sudo systemctl status komandorr-traffic
```

### Docker

Run the traffic agent in a container:

```bash
docker run -d \
  --name traffic-agent \
  --network host \
  -e KOMANDORR_URL=http://your-komandorr:3000 \
  -e INTERFACE=eth0 \
  cyb3rgh05t/komandorr-traffic:latest
```

!!! note "Network Mode"
The `--network host` flag is required for the agent to access network interfaces.

## Troubleshooting

### Agent Not Connecting

!!! error "Connection refused"
**Check:**

    - Komandorr URL is correct
    - Komandorr is running and accessible
    - No firewall blocking connection
    - Network connectivity

### No Data Appearing

!!! warning "No traffic data"
**Verify:**

    - Correct network interface name
    - Interface is active: `ip link show <interface>`
    - Agent has permissions to read interface stats
    - Agent is actually sending data (check logs)

### Permission Errors

!!! error "Permission denied reading interface"
**Linux Solution:**

    Run with sudo or give capabilities:
    ```bash
    sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/python3
    ```

## API Access

Get traffic data via API:

```bash
# Get current traffic
curl http://localhost:3000/api/traffic/current

# Get historical data
curl http://localhost:3000/api/traffic/history?hours=24
```

See [Traffic API Reference](../api/traffic.md) for full documentation.

## Best Practices

1. **Choose Correct Interface**: Monitor the interface with internet traffic
2. **Appropriate Interval**: Balance data granularity with performance
3. **Run as Service**: Ensure agent starts on boot
4. **Monitor Resources**: Traffic agent uses minimal CPU/memory
5. **Secure Connection**: Use HTTPS for agent-to-Komandorr communication

## Related Documentation

- [Traffic Agent Configuration](../configuration/traffic-agent.md)
- [API Reference - Traffic](../api/traffic.md)
- [Troubleshooting Guide](../guides/troubleshooting.md)
