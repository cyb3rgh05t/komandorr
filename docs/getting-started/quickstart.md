# Quick Start

Get started with Komandorr in 5 minutes!

## Step 1: Install & Run

Using Docker Compose (recommended):

```bash
git clone https://github.com/cyb3rgh05t/komandorr.git
cd komandorr
docker-compose up -d
```

Wait for the containers to start, then open `http://localhost:3000`.

## Step 2: Add Your First Service

1. Click the **Services** tab in the sidebar
2. Click the **Add Service** button (➕)
3. Fill in the service details:

```yaml
Name: My Website
URL: https://example.com
Type: Website
Group: Production (optional)
Check Interval: 60 seconds
Description: My main website
```

4. Click **Add Service**

Your service will appear on the dashboard with its current status!

## Step 3: Customize Your Dashboard

### Change Theme

1. Click your username in the top-right corner
2. Select **Theme**
3. Choose from: Dark, Plex, Jellyfin, Emby, and more

### Change Language

1. Click your username in the top-right corner
2. Select **Language**
3. Choose: English or Deutsch (German)

## Step 4: Configure Plex (Optional)

Monitor your Plex Media Server activities:

1. Go to **Settings**
2. Scroll to **Plex Server Settings**
3. Enter your Plex server URL: `http://your-plex-server:32400`
4. Add your [Plex token](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)
5. Click **Test Connection**
6. Click **Save Configuration**

Now visit the **VOD Streams** tab to see live Plex activities!

## Step 5: Set Up Traffic Monitoring (Optional)

Monitor bandwidth usage per service:

### Install Traffic Agent

On your server (where services run):

```bash
# Download the agent
wget https://raw.githubusercontent.com/cyb3rgh05t/komandorr/main/traffic/traffic_agent.py

# Install dependencies
pip install psutil requests

# Configure the agent
python traffic_agent.py --setup
```

Provide:

- Komandorr backend URL: `http://your-komandorr-server:8000`
- Service ID: (copy from service card in Komandorr)

### Start the Agent

```bash
# Run manually (for testing)
python traffic_agent.py

# Or install as systemd service
sudo python traffic_agent.py --install-service
```

Traffic data will appear on your Dashboard service cards!

## Common Tasks

### View Service Monitoring

Click the **Monitor** tab to see:

- All services with status
- Response times
- Last check timestamps
- Error messages (if any)

### Check API Documentation

Visit `http://localhost:8000/docs` to explore the API with Swagger UI.

### View Application Logs

```bash
# Docker
docker-compose logs -f backend

# Manual installation
tail -f backend/logs/app.log
```

## What's Next?

Now that you have Komandorr running, explore more features:

- [**Dashboard**](../features/dashboard.md): Learn about service groups and organization
- [**VOD Streams**](../features/vod-streams.md): Deep dive into Plex integration
- [**Traffic Monitoring**](../features/traffic.md): Advanced traffic monitoring setup
- [**Configuration**](configuration.md): Complete configuration guide
- [**Authentication**](../features/authentication.md): Secure your dashboard

## Quick Reference

### Default Ports

- Frontend: `3000`
- Backend: `8000`

### Data Locations

- Services: `backend/data/services.json`
- Plex Config: `backend/data/plex_config.json`
- Logs: `backend/logs/`

### Environment Variables

```bash
ENABLE_AUTH=false          # Enable/disable authentication
TIMEZONE=Europe/Berlin     # Your timezone
DEBUG=false                # Debug mode
```

[Full Configuration Reference](configuration.md){ .md-button }

## Need Help?

- 📖 [Full Documentation](../index.md)
- 🐛 [Report Issues](https://github.com/cyb3rgh05t/komandorr/issues)
- 💬 [Discussions](https://github.com/cyb3rgh05t/komandorr/discussions)
