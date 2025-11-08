# Traffic API

API endpoints for traffic monitoring.

## Endpoints

### Update Traffic Data

```http
POST /api/traffic/update
Content-Type: application/json

{
  "service_id": "uuid",
  "upload_mbps": 2.5,
  "download_mbps": 5.1
}
```

Used by traffic agents to report data.

### Get Traffic Summary

```http
GET /api/traffic/summary
```

Returns traffic summary for all services.

### Get Service Traffic

```http
GET /api/traffic/{service_id}
```

Returns traffic data for specific service.

## Data Format

Traffic values are in MB/s (megabytes per second).

## Response Format

See [API Overview](overview.md) for details.
