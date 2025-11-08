# VOD Streams (Plex Integration)

Monitor your Plex Media Server activities in real-time with the VOD Streams feature.

## Overview

The VOD Streams page provides live monitoring of Plex Media Server activities, including:

- Downloads and sync operations
- Active streams
- Transcoding sessions
- Media processing status

## Features

### Real-time Activity Monitoring

Track all Plex server activities:

- **Downloads**: Media being downloaded or synced
- **Streams**: Active playback sessions
- **Transcoding**: Media being transcoded
- **Paused**: Temporarily paused operations

### Activity Information

Each activity shows:

- **Title & Subtitle**: Media name and episode/season info
- **Progress Bar**: Visual progress indicator (0-100%)
- **Type Badge**: Activity type (download, stream, transcode, pause)
- **Status**: Current state of the operation

### Search & Filter

Quickly find activities:

- **Real-time Search**: Filter as you type
- **Search Fields**: Title, subtitle, activity type
- **Auto-reset**: Returns to page 1 on new search

### Pagination

Handle large activity lists:

- **10 Items Per Page**: Clean, organized display
- **Page Navigation**: Previous/Next buttons
- **Page Counter**: Current page and total pages

### Statistics

Three summary cards show:

- **Total Activities**: All current operations
- **Online**: Active downloads and syncs
- **Problem**: Failed or errored activities

### Auto-Refresh

Stay up-to-date automatically:

- **10-Second Refresh**: Live updates every 10 seconds
- **LIVE Indicator**: Shows real-time status
- **Manual Refresh**: Force refresh with button

## Setup

### Prerequisites

- Plex Media Server running and accessible
- Plex token for authentication

### Configuration

1. Navigate to **Settings**
2. Scroll to **Plex Server Settings**
3. Enter your Plex server URL:
   ```
   http://your-plex-server:32400
   ```
4. Enter your Plex token ([How to find](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/))
5. Click **Test Connection**
6. If successful (green button), click **Save Configuration**

### Finding Your Plex Token

1. Log into Plex Web App
2. Play any media item
3. Click the info icon (ⓘ)
4. Click "View XML"
5. Look for `X-Plex-Token` in the URL

Or follow the [official guide](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/).

## Using VOD Streams

### Viewing Activities

1. Click **VOD Streams** in the sidebar
2. See all current Plex activities
3. Use search to filter specific items

### Activity Types

Different badge colors indicate activity types:

| Type      | Badge Color | Description                   |
| --------- | ----------- | ----------------------------- |
| Download  | Blue        | Media being downloaded/synced |
| Stream    | Green       | Active streaming session      |
| Transcode | Orange      | Media being transcoded        |
| Pause     | Gray        | Paused operation              |

### Progress Tracking

Progress bars show completion:

- **0%**: Just started
- **50%**: Halfway complete
- **100%**: Finished

### Search Examples

Search for:

- Movie name: `Avatar`
- TV show: `Breaking Bad`
- Season: `S01`
- Episode: `E05`
- Activity type: `download`

## Understanding Activities

### Download Activities

Downloads from `/activities` endpoint:

```json
{
  "title": "Movie Title",
  "subtitle": "2023",
  "progress": 45,
  "type": "download"
}
```

**Indicates:**

- User downloading media for offline viewing
- Plex sync operation in progress
- Mobile or desktop app sync

### Stream Activities

Live streams from `/status/sessions` endpoint:

```json
{
  "title": "TV Show",
  "subtitle": "S01E01 - Episode Name",
  "progress": 23,
  "type": "stream"
}
```

**Indicates:**

- Active playback session
- User watching content
- Real-time streaming

### Transcode Operations

Media being converted:

```json
{
  "title": "4K Movie",
  "subtitle": "Transcoding to 1080p",
  "progress": 67,
  "type": "transcode"
}
```

**Indicates:**

- Format conversion in progress
- Quality adjustment for client
- Codec compatibility processing

## Troubleshooting

### No Activities Showing

**Possible causes:**

1. **No Active Operations**: No current downloads or streams
2. **Connection Issue**: Plex server not reachable
3. **Wrong Token**: Invalid authentication token
4. **URL Error**: Incorrect server URL

**Solutions:**

1. Verify Plex is running: `http://your-plex-server:32400/web`
2. Test connection in Settings
3. Check token is correct
4. Ensure URL includes port (`:32400`)

### "Not Configured" Message

Plex settings missing:

1. Go to **Settings**
2. Configure Plex Server Settings
3. Save configuration
4. Return to VOD Streams page

### Activities Not Updating

1. Check auto-refresh is enabled (LIVE indicator)
2. Manually click refresh button
3. Check browser console for errors
4. Verify backend is running

### Connection Failed

```
Error: Failed to connect to Plex server
```

**Check:**

- Server URL is correct
- Plex server is running
- Network connectivity
- Firewall rules
- Port 32400 is accessible

## API Endpoints

VOD Streams uses these backend endpoints:

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

### Get Activities

```http
GET /api/plex/activities
```

Returns combined activities from both downloads and streams.

## Best Practices

### Network Configuration

- Use local network address for faster responses
- Avoid remote connections if possible
- Consider reverse proxy for HTTPS

### Token Security

- Keep token private
- Don't commit to version control
- Rotate tokens periodically
- Use environment variables in production

### Performance

- Auto-refresh is optimized (10s interval)
- Pagination handles large lists efficiently
- Search is client-side (instant results)

## Limitations

- Shows only current/active operations
- No historical data
- Limited to Plex's API capabilities
- Requires valid Plex Pass for some features

## Future Enhancements

Planned improvements:

- [ ] Activity history and logs
- [ ] Download speed tracking
- [ ] Client device information
- [ ] Cancel/pause operations
- [ ] Notifications for new downloads
- [ ] Export activity data

## Related

- [Configuration: Plex Server](../configuration/plex.md)
- [API Reference: Plex](../api/plex.md)
- [Dashboard](dashboard.md)
