# VOD Streams (Plex Integration)

Monitor and display your Plex Media Server video-on-demand streams directly in Komandorr.

## Overview

The VOD Streams feature integrates seamlessly with Plex Media Server to provide insights into your media library and active streams.

## Prerequisites

- Plex Media Server installed and running
- Plex authentication token
- Network access to Plex server from Komandorr

## Configuration

### 1. Get Your Plex Token

Find your Plex authentication token:

1. Open a media item in Plex Web App
2. Click **Get Info** (ℹ️ icon)
3. Click **View XML**
4. Look for `X-Plex-Token` in the URL

Or follow [Plex's official guide](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/).

### 2. Configure Komandorr

=== "Web Interface"

    1. Navigate to **Settings**
    2. Find **Plex Integration** section
    3. Enter Plex URL: `http://your-plex-server:32400`
    4. Enter your Plex Token
    5. Click **Save**

=== "Environment Variables"

    ```bash
    PLEX_URL=http://your-plex-server:32400
    PLEX_TOKEN=your-authentication-token
    ```

=== "Configuration File"

    ```json
    {
      "plex": {
        "url": "http://your-plex-server:32400",
        "token": "your-authentication-token"
      }
    }
    ```

### 3. Verify Connection

After configuration:

1. Go to **VOD Streams** page
2. If configured correctly, you'll see your Plex library information
3. Active streams will appear in real-time

## Features

### Library Overview

View your Plex library statistics:

- Total movies
- Total TV shows
- Total episodes
- Total music tracks

### Active Streams

Monitor currently playing content:

- **Media Title** - What's being watched
- **User** - Who's watching
- **Player** - Device/app being used
- **Progress** - Playback position
- **Quality** - Stream quality (1080p, 4K, etc.)
- **Bandwidth** - Current bandwidth usage

### Recently Added

See recently added content to your library:

- Movie additions
- TV show episodes
- Release dates
- Thumbnails and posters

## Display Options

Customize how VOD streams are displayed:

- Grid view or list view
- Sort by title, date, or user
- Filter by media type
- Group by user or device

## Use Cases

### Home Users

- Monitor kids' screen time
- See what family members are watching
- Track bandwidth usage

### Server Administrators

- Monitor concurrent streams
- Identify bandwidth-heavy users
- Track server performance

### Media Collectors

- Keep track of library growth
- Monitor recent additions
- View library statistics

## Troubleshooting

### Connection Failed

!!! error "Cannot connect to Plex"
**Causes:**

    - Incorrect URL or port
    - Invalid authentication token
    - Network connectivity issues
    - Firewall blocking access

    **Solutions:**

    - Verify Plex server is running
    - Check URL includes `http://` or `https://`
    - Confirm port is 32400 (default)
    - Test connection from Komandorr server: `curl http://plex-server:32400`

### No Streams Showing

!!! warning "Streams not appearing" - Ensure something is actually playing - Check Plex server has playback activity - Refresh the VOD Streams page - Verify token has necessary permissions

### Authentication Errors

!!! error "Authentication failed" - Generate a new Plex token - Ensure token hasn't expired - Check token is copied completely - Verify Plex account has server access

## Security Considerations

!!! warning "Security Best Practices" - **Never expose** your Plex token publicly - Use HTTPS for Plex connections when possible - Restrict network access to Plex server - Regularly rotate authentication tokens - Use Plex's built-in user permissions

## API Access

Access VOD stream data programmatically:

```bash
curl http://localhost:3000/api/plex/streams
```

See [Plex API Reference](../api/plex.md) for full documentation.

## Related Documentation

- [Plex Configuration](../configuration/plex.md)
- [API Reference - Plex](../api/plex.md)
- [Troubleshooting](../guides/troubleshooting.md)
