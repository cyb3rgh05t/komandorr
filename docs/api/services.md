# Services API

API endpoints for managing services.

## Endpoints

### List Services

```http
GET /api/services
```

Returns array of all services.

### Get Service

```http
GET /api/services/{id}
```

Returns specific service by ID.

### Create Service

```http
POST /api/services
Content-Type: application/json

{
  "name": "My Service",
  "url": "https://example.com",
  "type": "website",
  "interval": 60
}
```

### Update Service

```http
PUT /api/services/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "interval": 120
}
```

### Delete Service

```http
DELETE /api/services/{id}
```

### Manual Check

```http
POST /api/services/{id}/check
```

Triggers immediate health check.

## Response Format

See [API Overview](overview.md) for response format and authentication details.
