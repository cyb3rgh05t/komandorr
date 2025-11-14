# Service Monitoring

Monitor the health and performance of your web services, applications, and infrastructure.

## Overview

Komandorr's service monitoring provides real-time health checks with customizable intervals, service grouping, and detailed performance metrics.

## Adding Services

### Via Web Interface

1. Navigate to the **Services** page
2. Click **Add Service**
3. Configure the service:

```
Name: Production API
URL: https://api.example.com
Type: API
Group: Production
Check Interval: 60 seconds
Enabled: Yes
```

4. Click **Save**

### Via API

```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API",
    "url": "https://api.example.com",
    "type": "app",
    "group": "Production",
    "interval": 60,
    "enabled": true
  }'
```

## Service Types

Komandorr supports different service types:

| Type        | Icon                      | Description                          |
| ----------- | ------------------------- | ------------------------------------ |
| **Website** | :material-web:            | Public websites and web applications |
| **App**     | :material-application:    | Internal applications and services   |
| **Panel**   | :material-view-dashboard: | Admin panels and dashboards          |
| **Server**  | :material-server:         | Server endpoints and APIs            |

## Service Groups

Organize services into logical groups:

- **Production** - Live production services
- **Staging** - Pre-production testing environment
- **Development** - Development environment
- **Infrastructure** - Core infrastructure components

### Creating Groups

Groups are created automatically when you assign a service to a group name.

## Monitoring Metrics

For each service, Komandorr tracks:

### Status

- **Up** :material-check-circle:{ .success } - Service is responding (HTTP 200-299)
- **Down** :material-alert-circle:{ .error } - Service is not responding or error
- **Unknown** :material-help-circle:{ .muted } - No data available yet

### Response Time

- Current response time in milliseconds
- Historical response time graph (last 100 points)
- Average, min, and max response times

### Uptime

- Uptime percentage calculation
- Last checked timestamp
- Total checks performed

## Check Intervals

Configure how often each service is checked:

- **Minimum**: 30 seconds
- **Default**: 60 seconds
- **Maximum**: 3600 seconds (1 hour)

!!! tip "Performance"
Higher check intervals reduce server load but provide less granular monitoring.

## Service Actions

### Edit Service

Update service configuration at any time through the web interface.

### Delete Service

Remove a service and all its historical data.

### Disable/Enable

Temporarily disable monitoring without deleting the service.

### Check Now

Manually trigger an immediate health check.

## Advanced Features

### Custom Headers

Add custom HTTP headers to health check requests (coming soon).

### Expected Status Codes

Configure which HTTP status codes indicate success (coming soon).

### Timeout Configuration

Set custom timeout values per service (coming soon).

## Best Practices

1. **Group Logically**: Organize services by environment or function
2. **Appropriate Intervals**: Balance monitoring frequency with resource usage
3. **Descriptive Names**: Use clear, descriptive names for easy identification
4. **Regular Reviews**: Periodically review and clean up unused services

## Related Documentation

- [Configuration Guide](../configuration/services.md)
- [API Reference](../api/services.md)
- [Dashboard Overview](../features/index.md)
