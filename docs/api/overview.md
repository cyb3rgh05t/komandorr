# API Overview

Komandorr provides a comprehensive RESTful API built with FastAPI, offering complete programmatic access to all features.

## Base URL

**Local Development:**

```
http://localhost:8000
```

**Docker Deployment:**

```
http://your-server:8000
```

## API Documentation

Komandorr includes interactive API documentation powered by Swagger UI.

### Access Swagger UI

Visit the `/docs` endpoint:

```
http://localhost:8000/docs
```

Features:

- **Dark Theme**: Matches Komandorr's design
- **Try It Out**: Test endpoints directly in browser
- **Request/Response Examples**: See sample data
- **Authentication**: Test with your credentials
- **Download OpenAPI Spec**: Get the full API specification

### OpenAPI Specification

Download the raw OpenAPI JSON:

```
http://localhost:8000/openapi.json
```

Use this with:

- Postman
- Insomnia
- API clients and code generators

## Authentication

### Basic Auth (Optional)

When `ENABLE_AUTH=true`, all endpoints require Basic Authentication:

```http
GET /api/services
Authorization: Basic base64(username:password)
```

**Example with curl:**

```bash
curl -u admin:password http://localhost:8000/api/services
```

**Example with JavaScript:**

```javascript
const headers = {
  Authorization: "Basic " + btoa("admin:password"),
};

fetch("http://localhost:8000/api/services", { headers })
  .then((res) => res.json())
  .then((data) => console.log(data));
```

### No Authentication

When `ENABLE_AUTH=false`, all endpoints are publicly accessible.

## Response Format

### Success Response

```json
{
  "data": { ... },
  "status": "success"
}
```

or

```json
{
  "services": [ ... ]
}
```

### Error Response

```json
{
  "detail": "Error message here"
}
```

**HTTP Status Codes:**

| Code | Meaning          |
| ---- | ---------------- |
| 200  | Success          |
| 201  | Created          |
| 400  | Bad Request      |
| 401  | Unauthorized     |
| 404  | Not Found        |
| 422  | Validation Error |
| 500  | Server Error     |

## API Endpoints

### Core Endpoints

| Endpoint       | Method | Description       |
| -------------- | ------ | ----------------- |
| `/api/health`  | GET    | Health check      |
| `/api/config`  | GET    | Get configuration |
| `/api/version` | GET    | Get version info  |

### Services

| Endpoint                   | Method | Description         |
| -------------------------- | ------ | ------------------- |
| `/api/services`            | GET    | List all services   |
| `/api/services`            | POST   | Create service      |
| `/api/services/{id}`       | GET    | Get service by ID   |
| `/api/services/{id}`       | PUT    | Update service      |
| `/api/services/{id}`       | DELETE | Delete service      |
| `/api/services/{id}/check` | POST   | Manual health check |

### Plex

| Endpoint               | Method | Description          |
| ---------------------- | ------ | -------------------- |
| `/api/plex/config`     | GET    | Get Plex config      |
| `/api/plex/config`     | POST   | Save Plex config     |
| `/api/plex/validate`   | POST   | Validate connection  |
| `/api/plex/activities` | GET    | Get activities       |
| `/api/downloads`       | GET    | Alias for activities |

### Traffic

| Endpoint                    | Method | Description         |
| --------------------------- | ------ | ------------------- |
| `/api/traffic/update`       | POST   | Update traffic data |
| `/api/traffic/summary`      | GET    | Get traffic summary |
| `/api/traffic/{service_id}` | GET    | Get service traffic |

### Authentication

| Endpoint           | Method | Description       |
| ------------------ | ------ | ----------------- |
| `/api/auth/status` | GET    | Check auth status |

## Rate Limiting

Currently, there are **no rate limits** on API endpoints.

!!! warning "Production Deployment"
Consider implementing rate limiting when deploying to production, especially for public-facing instances.

## CORS

CORS is configured via the `CORS_ORIGINS` environment variable.

**Default origins:**

```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
```

**Custom origins:**

```bash
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Versioning

The API version is included in responses:

```json
{
  "version": "1.4.0",
  "latest_version": "1.4.0",
  "update_available": false
}
```

Current API version: **v1.4.0**

No breaking changes are planned. Future versions will maintain backward compatibility.

## Client Libraries

Currently, official client libraries are not available. However, you can:

1. **Generate from OpenAPI**: Use code generators like:

   - [openapi-generator](https://github.com/OpenAPITools/openapi-generator)
   - [swagger-codegen](https://github.com/swagger-api/swagger-codegen)

2. **Use HTTP Libraries**: Any standard HTTP client works:
   - JavaScript: `fetch`, `axios`
   - Python: `requests`, `httpx`
   - Go: `net/http`
   - PHP: `guzzle`

## Examples

### List Services

```bash
curl http://localhost:8000/api/services
```

```python
import requests

response = requests.get('http://localhost:8000/api/services')
services = response.json()['services']
```

### Create Service

```bash
curl -X POST http://localhost:8000/api/services \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "My Website",
    "url": "https://example.com",
    "type": "website",
    "interval": 60
  }'
```

```python
import requests

service = {
    "name": "My Website",
    "url": "https://example.com",
    "type": "website",
    "interval": 60
}

response = requests.post(
    'http://localhost:8000/api/services',
    json=service
)
```

### Get Plex Activities

```bash
curl http://localhost:8000/api/plex/activities
```

```javascript
const activities = await fetch(
  "http://localhost:8000/api/plex/activities"
).then((res) => res.json());

console.log(activities);
```

## Best Practices

### Error Handling

Always check status codes and handle errors:

```javascript
const response = await fetch("/api/services");

if (!response.ok) {
  const error = await response.json();
  console.error("API Error:", error.detail);
  return;
}

const data = await response.json();
```

### Request Timeouts

Set appropriate timeouts:

```python
import requests

try:
    response = requests.get(
        'http://localhost:8000/api/services',
        timeout=5
    )
except requests.Timeout:
    print('Request timed out')
```

### Retry Logic

Implement retries for transient failures:

```python
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

session = requests.Session()
retry = Retry(total=3, backoff_factor=0.3)
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)

response = session.get('http://localhost:8000/api/services')
```

## API Reference

Detailed endpoint documentation:

- [Services API](services.md)
- [Plex API](plex.md)
- [Traffic API](traffic.md)
- [Authentication API](auth.md)

## Interactive Testing

Use the Swagger UI at `/docs` for:

- Exploring available endpoints
- Testing requests with different parameters
- Viewing response schemas
- Understanding required fields
- Downloading OpenAPI specification

## Support

Need help with the API?

- 📖 [Read the full documentation](https://cyb3rgh05t.github.io/komandorr)
- 🐛 [Report API bugs](https://github.com/cyb3rgh05t/komandorr/issues)
- 💬 [Ask questions](https://github.com/cyb3rgh05t/komandorr/discussions)
