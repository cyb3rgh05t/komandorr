# \*arr Activity Monitor

Monitor download activity from Sonarr and Radarr directly in Komandorr.

## Features

- **Real-time Queue Monitoring**: View active downloads from both Sonarr and Radarr
- **Progress Tracking**: See download progress, speed, and time remaining
- **Status Indicators**: Visual indicators for download status (downloading, completed, failed, etc.)
- **Combined View**: Single dashboard showing all \*arr activity
- **Search & Filter**: Quickly find specific downloads
- **Auto-refresh**: Automatic updates every 5 seconds

## Configuration

Add the following to your `backend/data/config.json`:

```json
{
  "arr": {
    "sonarr": {
      "url": "http://localhost:8989",
      "api_key": "your-sonarr-api-key-here"
    },
    "radarr": {
      "url": "http://localhost:7878",
      "api_key": "your-radarr-api-key-here"
    }
  }
}
```

### Getting API Keys

**Sonarr:**

1. Open Sonarr web interface
2. Go to Settings → General
3. Copy the API Key

**Radarr:**

1. Open Radarr web interface
2. Go to Settings → General
3. Copy the API Key

## API Endpoints

The backend provides the following endpoints:

- `GET /api/arr-activity/queue` - Get combined download queue
- `GET /api/arr-activity/queue/status` - Get queue status summary
- `GET /api/arr-activity/history` - Get recent download history
- `GET /api/arr-activity/system/status` - Get system status

## Usage

1. Configure Sonarr/Radarr URLs and API keys in config.json
2. Restart the backend
3. Navigate to the "\*arr Activity" page in the sidebar
4. View real-time download activity

## Troubleshooting

**No downloads showing:**

- Verify Sonarr/Radarr URLs are accessible from the backend
- Check API keys are correct
- Ensure services are configured in config.json
- Check backend logs for connection errors

**Connection errors:**

- Make sure URLs include http:// or https://
- Verify firewall rules allow backend to connect to \*arr services
- Test API keys directly using curl or Postman

## Architecture

```
Frontend (React)
    ↓
arrActivityApi.js (API service)
    ↓
Backend (FastAPI) /api/arr-activity/*
    ↓
Sonarr/Radarr API v3
```

## Future Enhancements

- [ ] Add history view with pagination
- [ ] Manual queue management (remove/reorder)
- [ ] Download speed graphs
- [ ] Push notifications for completed downloads
- [ ] Support for additional \*arr services (Lidarr, Readarr, etc.)
