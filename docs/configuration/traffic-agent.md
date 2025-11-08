# Traffic Agent Configuration

Set up the traffic monitoring agent on remote servers.

## Installation

```bash
# Download agent
wget https://raw.githubusercontent.com/cyb3rgh05t/komandorr/main/traffic/traffic_agent.py

# Install dependencies
pip install psutil requests

# Configure
python traffic_agent.py --setup
```

## Configuration

Provide:

- Komandorr backend URL: `http://your-server:8000`
- Service ID: Copy from Komandorr UI

## Running the Agent

### Manual

```bash
python traffic_agent.py
```

### As Service (systemd)

```bash
sudo python traffic_agent.py --install-service
sudo systemctl start traffic-agent
sudo systemctl enable traffic-agent
```

## Verification

Check logs and verify traffic data appears in Komandorr dashboard.

See [Traffic Monitoring](../features/traffic.md) for details.
