# Dashboard

The Dashboard is the main landing page of Komandorr, providing an at-a-glance view of all your monitored services.

## Overview

The Dashboard displays all your services in a clean, organized layout with real-time status updates, traffic information, and service grouping capabilities.

## Features

### Service Cards

Each service is displayed in a card showing:

- **Service Name**: The display name of your service
- **Status Indicator**: Color-coded status (🟢 Online, 🔴 Offline, ⚠️ Error)
- **Service Type**: Icon and label (Website, App, Panel, Server)
- **Description**: Optional service description
- **Response Time**: Last measured response time in milliseconds
- **Last Check**: Time since last health check
- **Traffic Data**: Upload/download speeds (if configured)

### Service Groups

Organize services into logical groups:

- **Tabbed Interface**: Multiple groups displayed as tabs
- **Group Counts**: Badge showing number of services per group
- **Ungrouped Services**: Services without a group appear in "All Services"

### Status Colors

Services are color-coded by status:

| Status     | Color  | Meaning                     |
| ---------- | ------ | --------------------------- |
| 🟢 Online  | Green  | Service responding normally |
| 🔴 Offline | Red    | Service not responding      |
| ⚠️ Error   | Yellow | Service error or timeout    |

### Traffic Integration

When traffic monitoring is configured:

- **Upload Speed**: Blue upward arrow with MB/s
- **Download Speed**: Green downward arrow with MB/s
- **Real-time Updates**: Refreshes every 30 seconds
- **Conditional Display**: Only shows when bandwidth > 0

## Using the Dashboard

### Viewing Services

1. Navigate to **Dashboard** from the sidebar
2. View all services at once or switch between groups
3. Click on a service card to see more details

### Service Actions

Each service card provides quick actions:

- **Open URL**: Click the service name to open in new tab
- **View Details**: Click card for full service information
- **Quick Status**: Glance at color-coded status

### Organizing with Groups

Create groups to organize services:

1. Go to **Services** page
2. Add or edit a service
3. Enter a group name (e.g., "Production", "Development", "Media")
4. Services with the same group name appear together

**Examples of groups:**

- `Production` - Live production services
- `Development` - Development environment
- `Media` - Plex, Jellyfin, Emby servers
- `Infrastructure` - DNS, VPN, Monitoring tools

### Auto-Refresh

The Dashboard automatically updates service status:

- **Check Interval**: Configurable per service (default: 60 seconds)
- **Visual Updates**: Status changes reflected in real-time
- **Traffic Refresh**: Every 30 seconds

## Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│                    Dashboard                         │
├─────────────────────────────────────────────────────┤
│  [Production] [Development] [Media] [All Services]  │ ← Group Tabs
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Service1 │  │ Service2 │  │ Service3 │          │
│  │ 🟢 Online│  │ 🟢 Online│  │ 🔴 Offline│         │
│  │ 45ms     │  │ 120ms    │  │ Timeout  │          │
│  │ ↑ 2.5MB/s│  │ ↑ 0.8MB/s│  │          │          │
│  │ ↓ 5.1MB/s│  │ ↓ 1.2MB/s│  │          │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Best Practices

### Service Naming

Use clear, descriptive names:

- ✅ `Plex Media Server`
- ✅ `Website - Production`
- ✅ `VPN Gateway`
- ❌ `srv1`
- ❌ `test`

### Grouping Strategy

Organize by:

- **Environment**: Production, Staging, Development
- **Function**: Media, Infrastructure, Applications
- **Location**: US-East, EU-West, Asia-Pacific
- **Priority**: Critical, Important, Monitoring

### Check Intervals

Set appropriate intervals:

- **Critical Services**: 30-60 seconds
- **Standard Services**: 60-120 seconds
- **Low Priority**: 300-900 seconds (5-15 minutes)

!!! warning "Performance"
Too many services with short intervals can impact performance. Balance monitoring needs with system resources.

## Customization

### Themes

Change the Dashboard appearance:

1. Click your username → **Theme**
2. Choose from: Dark, Plex, Jellyfin, Emby, etc.
3. Theme applies instantly

### Language

Switch language:

1. Click your username → **Language**
2. Select English or Deutsch (German)

## Keyboard Shortcuts

| Shortcut       | Action                         |
| -------------- | ------------------------------ |
| `Tab`          | Navigate between service cards |
| `Enter`        | Open selected service URL      |
| `Ctrl/Cmd + K` | Focus search (if available)    |

## Troubleshooting

### Services Not Updating

1. Check backend is running: `http://localhost:8000/api/health`
2. Verify service URL is correct
3. Check logs: `backend/logs/app.log`

### Traffic Not Showing

1. Ensure traffic agent is running on the server
2. Verify service ID matches in agent configuration
3. Check network connectivity between agent and Komandorr

### Groups Not Appearing

1. Ensure multiple services have the same group name
2. Check for typos in group names
3. Refresh the page

## Related Pages

- [Service Monitoring](services.md) - Manage services
- [Traffic Monitoring](traffic.md) - Set up traffic tracking
- [Themes](themes.md) - Customize appearance
