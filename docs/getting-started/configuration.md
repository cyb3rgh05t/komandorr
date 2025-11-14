# Configuration

Configure Komandorr to monitor your services and integrate with your infrastructure.

## Configuration Methods

Komandorr can be configured using:

1. **Environment Variables** - For Docker deployments
2. **Configuration Files** - For manual installations
3. **Web Interface** - Runtime configuration through the UI

## Basic Configuration

### Environment Variables

Set these environment variables in your Docker deployment:

| Variable         | Description                              | Default | Required |
| ---------------- | ---------------------------------------- | ------- | -------- |
| `PLEX_URL`       | Plex server URL                          | -       | No       |
| `PLEX_TOKEN`     | Plex authentication token                | -       | No       |
| `CHECK_INTERVAL` | Service check interval (seconds)         | 60      | No       |
| `LOG_LEVEL`      | Logging level (DEBUG, INFO, WARN, ERROR) | INFO    | No       |
| `ADMIN_PASSWORD` | Admin password                           | admin   | Yes      |

### Configuration File

Create `backend/data/config.json`:

```json
{
  "check_interval": 60,
  "plex": {
    "url": "http://your-plex-server:32400",
    "token": "your-plex-token"
  },
  "traffic": {
    "enabled": true,
    "interface": "eth0"
  }
}
```

## Service Configuration

Services are configured through the web interface or by editing `backend/data/services.json`:

```json
{
  "services": [
    {
      "name": "My Website",
      "url": "https://example.com",
      "type": "website",
      "group": "Production",
      "interval": 60,
      "enabled": true
    }
  ]
}
```

### Service Properties

- **name**: Display name for the service
- **url**: URL to monitor (HTTP/HTTPS)
- **type**: Service type (`website`, `app`, `panel`, `server`)
- **group**: Organization group
- **interval**: Check interval in seconds (overrides global)
- **enabled**: Enable/disable monitoring

## Advanced Configuration

For advanced configuration options, see:

- [Services Configuration](../configuration/services.md)
- [Plex Integration](../configuration/plex.md)
- [Traffic Monitoring](../configuration/traffic-agent.md)
- [Environment Variables](../configuration/environment.md)

## Next Steps

- [Quick Start Guide](quickstart.md)
- [Add your first service](../features/services.md)
