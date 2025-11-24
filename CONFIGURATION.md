# Configuration Management

Komandorr uses a two-tier configuration system:

## 1. Environment Variables (Container/Server Level)

**File:** `.env` (local development) or `docker-compose.yml` (Docker)

**Purpose:** Server startup and deployment-level security parameters

**Settings:**

- `HOST` - Server bind address (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)
- `DEBUG` - Debug mode (default: false)
- `CORS_ORIGINS` - Comma-separated list of allowed origins (deployment-level security)

**Note:** These cannot be changed at runtime and require a server restart.

## 2. Application Settings (Runtime Configuration)

**File:** `backend/data/config.json`

**Purpose:** All application settings that can be changed via the Settings UI

**Settings:**

### Authentication

```json
"auth": {
  "enabled": false,
  "username": "admin",
  "password": "admin"
}
```

### Logging

```json
"logging": {
  "level": "INFO",
  "enable_file": true
}
```

### General

```json
"general": {
  "timezone": "UTC"
}
```

### API Configuration

```json
"api": {
  "github_token": "",
  "tmdb_api_key": ""
}
```

### Plex Server

```json
"plex": {
  "server_url": "",
  "server_token": "",
  "server_name": "Plex Server"
}
```

## Configuration Priority

1. **config.json** (highest priority - managed via Settings UI)
2. **Environment variables** (docker-compose.yml or .env)
3. **Hardcoded defaults** (in config.py)

## For Docker Users

Edit `docker-compose.yml` to set server-level parameters (HOST, PORT, DEBUG).
All other settings are managed through the Settings UI or by editing the mounted `config.json` file.

## For Local Development

1. Copy `backend/.env.example` to `backend/.env`
2. Copy `backend/data/config.json.example` to `backend/data/config.json`
3. Configure settings via the Settings UI at `http://localhost:8000/settings`
