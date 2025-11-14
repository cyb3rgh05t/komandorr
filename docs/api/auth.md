# Authentication API

API endpoints for authentication and user management.

## Login

`POST /api/auth/login`

```json
{
  "username": "admin",
  "password": "password"
}
```

Returns JWT token for subsequent requests.
