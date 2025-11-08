# Plex Configuration

Configure Plex Media Server integration for VOD monitoring.

## Setup

1. Navigate to **Settings** → **Plex Server Settings**
2. Enter your Plex server URL
3. Enter your Plex token
4. Test connection
5. Save configuration

## Finding Your Plex Token

[Official Plex Guide](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)

## Configuration File

Settings are stored in `backend/data/plex_config.json`:

```json
{
  "server_url": "http://plex-server:32400",
  "token": "your-token-here"
}
```

## Troubleshooting

- Ensure Plex server is accessible from Komandorr
- Check token is valid
- Verify port 32400 is open
- Test URL in browser: `http://your-plex:32400/web`

See [VOD Streams](../features/vod-streams.md) for usage.
