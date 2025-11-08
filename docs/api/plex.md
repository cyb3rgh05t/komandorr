# Plex API

API endpoints for Plex integration.

## Endpoints

### Get Configuration

```http
GET /api/plex/config
```

Returns current Plex configuration.

### Save Configuration

```http
POST /api/plex/config
Content-Type: application/json

{
  "server_url": "http://plex:32400",
  "token": "your-token"
}
```

### Validate Connection

```http
POST /api/plex/validate
Content-Type: application/json

{
  "server_url": "http://plex:32400",
  "token": "your-token"
}
```

Returns validation result.

### Get Activities

```http
GET /api/plex/activities
```

Returns current Plex downloads and streams.

### Get Downloads (Alias)

```http
GET /api/downloads
```

Alias for `/api/plex/activities`.

## Response Format

See [API Overview](overview.md) for authentication and error handling.
