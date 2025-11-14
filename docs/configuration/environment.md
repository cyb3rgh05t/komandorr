# Environment Variables

Configure Komandorr using environment variables for Docker deployments and system-level settings.

## General Settings

### ADMIN_PASSWORD

Admin account password.

- **Required**: Yes
- **Default**: `admin`
- **Example**: `ADMIN_PASSWORD=SecureP@ssw0rd!`

!!! danger "Change Default Password"
Always change the default password in production!

### CHECK_INTERVAL

Global service check interval in seconds.

- **Required**: No
- **Default**: `60`
- **Range**: `30-3600`
- **Example**: `CHECK_INTERVAL=120`

### LOG_LEVEL

Logging verbosity level.

- **Required**: No
- **Default**: `INFO`
- **Options**: `DEBUG`, `INFO`, `WARN`, `ERROR`
- **Example**: `LOG_LEVEL=DEBUG`

## Plex Integration

### PLEX_URL

Plex Media Server URL.

- **Required**: No (required for VOD features)
- **Format**: `http://hostname:port`
- **Example**: `PLEX_URL=http://192.168.1.100:32400`

### PLEX_TOKEN

Plex authentication token.

- **Required**: No (required with PLEX_URL)
- **Example**: `PLEX_TOKEN=zxcvbnmasdfghjkl1234567890`

[How to get Plex token →](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)

## Traffic Monitoring

### TRAFFIC_ENABLED

Enable traffic monitoring feature.

- **Required**: No
- **Default**: `false`
- **Example**: `TRAFFIC_ENABLED=true`

### TRAFFIC_INTERFACE

Network interface to monitor.

- **Required**: No
- **Default**: `eth0`
- **Example**: `TRAFFIC_INTERFACE=eno1`

## Database

### DATABASE_PATH

SQLite database file path.

- **Required**: No
- **Default**: `data/komandorr.db`
- **Example**: `DATABASE_PATH=/app/data/komandorr.db`

## Server Configuration

### HOST

Server bind address.

- **Required**: No
- **Default**: `0.0.0.0`
- **Example**: `HOST=127.0.0.1`

### PORT

Server port.

- **Required**: No
- **Default**: `3000`
- **Example**: `PORT=8080`

### CORS_ORIGINS

Allowed CORS origins (comma-separated).

- **Required**: No
- **Default**: `*`
- **Example**: `CORS_ORIGINS=http://localhost:3000,https://komandorr.example.com`

## Docker Example

### Docker Run

```bash
docker run -d \
  --name komandorr \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e ADMIN_PASSWORD=SecurePassword123 \
  -e CHECK_INTERVAL=60 \
  -e LOG_LEVEL=INFO \
  -e PLEX_URL=http://192.168.1.100:32400 \
  -e PLEX_TOKEN=your-plex-token \
  -e TRAFFIC_ENABLED=true \
  -e TRAFFIC_INTERFACE=eth0 \
  cyb3rgh05t/komandorr:latest
```

### Docker Compose

```yaml
version: "3.8"

services:
  komandorr:
    image: cyb3rgh05t/komandorr:latest
    container_name: komandorr
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      # General
      - ADMIN_PASSWORD=SecurePassword123
      - CHECK_INTERVAL=60
      - LOG_LEVEL=INFO

      # Plex
      - PLEX_URL=http://plex-server:32400
      - PLEX_TOKEN=your-plex-token

      # Traffic
      - TRAFFIC_ENABLED=true
      - TRAFFIC_INTERFACE=eth0

      # Server
      - HOST=0.0.0.0
      - PORT=3000
    restart: unless-stopped
```

## .env File

Create a `.env` file for easier management:

```bash
# General Settings
ADMIN_PASSWORD=SecurePassword123
CHECK_INTERVAL=60
LOG_LEVEL=INFO

# Plex Integration
PLEX_URL=http://192.168.1.100:32400
PLEX_TOKEN=your-plex-token-here

# Traffic Monitoring
TRAFFIC_ENABLED=true
TRAFFIC_INTERFACE=eth0

# Database
DATABASE_PATH=/app/data/komandorr.db

# Server
HOST=0.0.0.0
PORT=3000
CORS_ORIGINS=*
```

Use with Docker Compose:

```yaml
version: "3.8"

services:
  komandorr:
    image: cyb3rgh05t/komandorr:latest
    env_file:
      - .env
    ports:
      - "${PORT}:${PORT}"
    volumes:
      - ./data:/app/data
```

## Environment Priority

Configuration loading order (highest priority first):

1. **Environment Variables**
2. **Configuration File** (`config.json`)
3. **Default Values**

## Security Best Practices

!!! warning "Sensitive Data" - Never commit `.env` files to version control - Add `.env` to `.gitignore` - Use secrets management in production - Rotate credentials regularly - Use strong passwords (12+ characters)

## Validation

Komandorr validates environment variables on startup:

- **Type checking** (string, number, boolean)
- **Range validation** (min/max values)
- **Format validation** (URLs, tokens)
- **Required field** checking

Errors are logged on startup if validation fails.

## Related Documentation

- [Configuration Overview](index.md)
- [Services Configuration](services.md)
- [Plex Configuration](plex.md)
- [Docker Deployment](../guides/docker.md)
