# Services Configuration

Configure and manage your monitored services.

## Service Definition

Services are stored in `backend/data/services.json`:

```json
{
  "id": "uuid",
  "name": "Service Name",
  "url": "https://example.com",
  "type": "website",
  "group": "Production",
  "interval": 60,
  "description": "Description",
  "enabled": true
}
```

## Fields

- **id**: Unique identifier (auto-generated)
- **name**: Display name
- **url**: Endpoint to monitor
- **type**: Service type (website, app, panel, server)
- **group**: Optional grouping
- **interval**: Check interval in seconds
- **description**: Service description
- **enabled**: Enable/disable monitoring

## Managing Services

Use the Services page in the UI to add, edit, or delete services.
