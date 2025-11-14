# Quick Start

Get Komandorr up and running in 5 minutes.

## Step 1: Install Komandorr

=== "Docker"

    ```bash
    docker run -d \
      --name komandorr \
      -p 3000:3000 \
      -v $(pwd)/data:/app/data \
      cyb3rgh05t/komandorr:latest
    ```

=== "Docker Compose"

    ```bash
    curl -o docker-compose.yml https://raw.githubusercontent.com/cyb3rgh05t/komandorr/main/docker-compose.yml
    docker-compose up -d
    ```

## Step 2: Access the Dashboard

1. Open your browser to `http://localhost:3000`
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin`

!!! warning "Security"
Change the default password immediately in Settings!

## Step 3: Add Your First Service

1. Navigate to **Services** page
2. Click **Add Service** button
3. Fill in the details:

```
Name: My Website
URL: https://example.com
Type: Website
Group: Production
Check Interval: 60 seconds
```

4. Click **Save**

## Step 4: Monitor Status

Your service will appear on the Dashboard with real-time status:

- :material-check-circle: **Green** - Service is up
- :material-alert-circle: **Red** - Service is down
- :material-clock-outline: **Gray** - No data yet

## Step 5: View Metrics

Click on a service card to view:

- Response time history
- Uptime percentage
- Recent status changes
- Detailed logs

## Optional: Configure Plex Integration

To monitor your Plex Media Server:

1. Get your Plex token from [Plex.tv](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)
2. Navigate to **Settings**
3. Enter your Plex server URL and token
4. Enable VOD Streams monitoring

## Optional: Enable Traffic Monitoring

1. Install the traffic agent on your server:

```bash
pip install -r traffic/requirements.txt
python traffic/traffic_agent.py
```

2. Configure the agent endpoint in Settings
3. View traffic graphs on the Traffic page

## Next Steps

- [Configure more services](../features/services.md)
- [Set up service groups](../configuration/services.md)
- [Customize themes](../features/themes.md)
- [Explore the API](../api/index.md)

## Need Help?

- Check the [Troubleshooting Guide](../guides/troubleshooting.md)
- Review [Configuration Options](../configuration/environment.md)
- [Report an issue](https://github.com/cyb3rgh05t/komandorr/issues)
