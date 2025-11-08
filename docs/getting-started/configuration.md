# Configuration

Complete configuration guide for Komandorr.

## Environment Variables

Komandorr is configured using environment variables. You can set these in:

- `.env` file in the project root
- `docker-compose.yml` environment section
- System environment variables

### Core Settings

#### `ENABLE_AUTH`

Enable or disable authentication.

```bash
ENABLE_AUTH=false  # Default: false
```

**Values:**

- `true`: Enable basic authentication
- `false`: Disable authentication (open access)

#### `TIMEZONE`

Set the application timezone for logs and timestamps.

```bash
TIMEZONE=Europe/Berlin  # Default: UTC
```

**Examples:**

- `America/New_York`
- `Asia/Tokyo`
- `Europe/London`

[List of timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

#### `DEBUG`

Enable debug mode for detailed logging.

```bash
DEBUG=false  # Default: false
```

**Values:**

- `true`: Enable debug logging
- `false`: Standard logging only

### Authentication Settings

When `ENABLE_AUTH=true`, configure credentials:

#### `AUTH_USERNAME`

Username for authentication.

```bash
AUTH_USERNAME=admin  # Default: admin
```

#### `AUTH_PASSWORD`

Password for authentication.

```bash
AUTH_PASSWORD=your-secure-password  # Default: admin
```

!!! warning "Security"
**Change the default password** before exposing Komandorr to the internet!

### CORS Settings

Configure allowed origins for API access.

#### `CORS_ORIGINS`

Comma-separated list of allowed origins.

```bash
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

**Default:**

```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
```

### Backend Settings

#### `HOST`

Backend server host address.

```bash
HOST=0.0.0.0  # Default: 0.0.0.0
```

#### `PORT`

Backend server port.

```bash
PORT=8000  # Default: 8000
```

#### `RELOAD`

Enable auto-reload for development.

```bash
RELOAD=false  # Default: false
```

!!! note
Set `RELOAD=true` only in development. Disable in production.

## Configuration Files

### Services Configuration

Services are stored in `backend/data/services.json`:

```json
{
  "services": [
    {
      "id": "uuid-here",
      "name": "My Website",
      "url": "https://example.com",
      "type": "website",
      "group": "Production",
      "interval": 60,
      "description": "Main website",
      "icon": "globe",
      "enabled": true,
      "status": "online",
      "last_check": "2025-01-08T10:30:00Z",
      "response_time": 150
    }
  ]
}
```

**Fields:**

- `id`: Unique identifier (UUID)
- `name`: Service display name
- `url`: Service endpoint URL
- `type`: Service type (website, app, panel, server)
- `group`: Optional group name
- `interval`: Check interval in seconds
- `description`: Service description
- `icon`: Icon name (from Lucide icons)
- `enabled`: Enable/disable monitoring
- `status`: Current status (online, offline, error)
- `last_check`: Last check timestamp
- `response_time`: Response time in milliseconds

### Plex Configuration

Plex settings are stored in `backend/data/plex_config.json`:

```json
{
  "server_url": "http://plex-server:32400",
  "token": "your-plex-token-here"
}
```

**Configuration via UI:**

1. Go to Settings → Plex Server Settings
2. Enter server URL and token
3. Click Test Connection
4. Click Save Configuration

**Finding your Plex token:**

- [Official Guide](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)

### Traffic Configuration

Traffic agents are configured per service using the agent script:

```bash
python traffic_agent.py --setup
```

**Required information:**

- Backend URL: `http://komandorr-server:8000`
- Service ID: Copy from service card in Komandorr UI

## Docker Compose Configuration

Example `docker-compose.yml`:

```yaml
version: "3.8"

services:
  komandorr:
    image: ghcr.io/cyb3rgh05t/komandorr:latest
    container_name: komandorr
    ports:
      - "3000:80" # Frontend
      - "8000:8000" # Backend
    volumes:
      - ./backend/data:/app/backend/data
      - ./backend/logs:/app/backend/logs
    environment:
      # Core Settings
      ENABLE_AUTH: "false"
      TIMEZONE: "Europe/Berlin"
      DEBUG: "false"

      # Authentication (if ENABLE_AUTH=true)
      AUTH_USERNAME: "admin"
      AUTH_PASSWORD: "your-secure-password"

      # CORS
      CORS_ORIGINS: "http://localhost:3000"

      # Backend
      HOST: "0.0.0.0"
      PORT: "8000"
      RELOAD: "false"
    restart: unless-stopped
```

## Frontend Configuration

Frontend API endpoint is configured in `frontend/vite.config.js`:

```javascript
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

## Monitoring Configuration

### Check Intervals

Configure how often services are checked:

| Interval   | Use Case                                     |
| ---------- | -------------------------------------------- |
| 30s        | Critical services requiring immediate alerts |
| 60s        | Standard monitoring (recommended)            |
| 300s (5m)  | Low-priority services                        |
| 900s (15m) | Infrequent checks                            |

### Auto-Refresh Intervals

| Feature        | Refresh Rate | Configurable       |
| -------------- | ------------ | ------------------ |
| VOD Streams    | 10 seconds   | In code only       |
| Traffic Data   | 30 seconds   | In code only       |
| Service Status | 60 seconds   | Via check interval |

## Advanced Configuration

### Custom Themes

Themes are defined in `frontend/src/index.css`. To add a custom theme:

```css
[data-theme="custom"] {
  --color-primary: #your-color;
  --color-background: #your-bg;
  /* ... more variables ... */
}
```

Then add to theme dropdown in `ThemeDropdown.jsx`.

### Custom Icons

Icons are from [Lucide React](https://lucide.dev/icons/). To add new icons:

1. Import in component: `import { YourIcon } from 'lucide-react'`
2. Use: `<YourIcon className="h-5 w-5" />`

### Logging Configuration

Logging is configured in `backend/app/utils/logger.py`:

```python
# Log levels
logging.DEBUG    # Detailed debug information
logging.INFO     # General information (default)
logging.WARNING  # Warning messages
logging.ERROR    # Error messages
logging.CRITICAL # Critical errors
```

Set `DEBUG=true` to enable DEBUG level logging.

## Best Practices

### Production Deployment

```bash
# Use environment file
ENABLE_AUTH=true
AUTH_PASSWORD=strong-random-password-here
DEBUG=false
RELOAD=false
CORS_ORIGINS=https://yourdomain.com

# Use volumes for persistence
volumes:
  - ./data:/app/backend/data
  - ./logs:/app/backend/logs

# Use restart policy
restart: unless-stopped
```

### Security

1. **Enable Authentication**: Set `ENABLE_AUTH=true`
2. **Strong Passwords**: Use complex passwords
3. **HTTPS**: Use reverse proxy with SSL
4. **Restrict CORS**: Only allow necessary origins
5. **Regular Updates**: Keep Komandorr updated

### Performance

1. **Check Intervals**: Don't check too frequently
2. **Service Count**: Monitor 100+ services efficiently
3. **Traffic Agents**: Use one agent per server
4. **Log Rotation**: Implement log rotation

## Next Steps

- [Services Configuration](../configuration/services.md)
- [Plex Configuration](../configuration/plex.md)
- [Traffic Agent Setup](../configuration/traffic-agent.md)
- [Environment Variables Reference](../configuration/environment.md)
