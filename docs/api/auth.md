# Authentication API

API endpoint for checking authentication status.

## Endpoint

### Get Auth Status

```http
GET /api/auth/status
```

Returns authentication status.

## Response

```json
{
  "enabled": true
}
```

or

```json
{
  "enabled": false
}
```

## Usage

Frontend uses this to determine whether to show login screen.

## Authentication

When `ENABLE_AUTH=true`, all API endpoints require Basic Authentication.

See [API Overview](overview.md) for authentication details.
