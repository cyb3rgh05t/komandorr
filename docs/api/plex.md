# Plex API

API endpoints for Plex integration, VOD streams, and cache management.

For detailed implementation information, see [Caching System](../features/caching.md).

## Activity Endpoints

### Get Plex Activities

`GET /api/plex/activities`

Returns currently active Plex activities (downloads, optimizations, etc.).

**Caching:** Results cached for 5 seconds with 80% hit rate during active monitoring.

**Response:**

```json
{
  "error": false,
  "activities": [
    {
      "uuid": "08188773-7908-4f38-ac6a-7c6a35af5002",
      "title": "Media download by Username",
      "subtitle": "Movie Title",
      "type": "media.download",
      "progress": 97.0,
      "raw_data": { ... }
    }
  ],
  "cached": true,
  "timestamp": "2025-12-15T14:28:03.896247",
  "cache_age": 1.4
}
```

### Get Watch History

`GET /api/plex/watch-history`

Returns watch history for all Plex users.

**Caching:** Results cached for 5 minutes (300 seconds). Cache invalidated on manual sync.

**Query Parameters:**

- `limit` (optional): Maximum number of records to return

**Response:**

```json
{
  "error": false,
  "history": [
    {
      "id": 1,
      "user_id": 123,
      "username": "john_doe",
      "title": "Movie Title",
      "watched_at": "2025-12-15T10:30:00"
    }
  ],
  "cached": true,
  "timestamp": "2025-12-15T14:28:03"
}
```

### Sync Watch History

`POST /api/plex/watch-history/sync`

Manually triggers watch history synchronization from Plex server.

**Cache Impact:** Clears watch history cache to ensure fresh data on next request.

**Response:**

```json
{
  "success": true,
  "message": "Watch history sync completed",
  "records_updated": 150
}
```

## Statistics Endpoints

### Get Dashboard Statistics

`GET /api/plex/stats/dashboard`

Returns pre-calculated dashboard statistics (updated every 60 seconds in background).

**Performance:** Sub-100ms response time vs 3-5s without caching.

**Response:**

```json
{
  "services": {
    "total": 18,
    "online": 15,
    "offline": 3
  },
  "plex": {
    "movies": 20624,
    "shows": 1951,
    "seasons": 8432,
    "episodes": 45678
  },
  "traffic": {
    "total_30d": 2.4,
    "unit": "TB"
  },
  "timestamp": "2025-12-15T14:27:15.108287"
}
```

## Cache Management Endpoints

### Get Cache Statistics

`GET /api/plex/cache/stats`

Returns detailed statistics for all cache layers including hit rates, TTLs, and Redis status.

**Response:**

```json
{
  "caches": [
    {
      "name": "plex_activities",
      "hits": 4,
      "misses": 1,
      "total_requests": 5,
      "hit_rate": "80.0%",
      "ttl_seconds": 5,
      "cached": true,
      "cache_age_seconds": 1.4
    },
    {
      "name": "watch_history",
      "hits": 0,
      "misses": 0,
      "total_requests": 0,
      "hit_rate": "0.0%",
      "ttl_seconds": 300,
      "cached": false,
      "cache_age_seconds": null
    },
    {
      "name": "background_stats",
      "enabled": true,
      "last_update": "2025-12-15T13:27:15.108287+00:00",
      "update_interval": 60
    }
  ],
  "timestamp": "2025-12-15T14:28:05.282112",
  "redis": {
    "type": "memory",
    "enabled": false,
    "connected": false,
    "total_keys": 0
  }
}
```

**Cache Metrics:**

- `hits`: Number of requests served from cache
- `misses`: Number of requests requiring fresh data fetch
- `hit_rate`: Percentage of requests served from cache
- `cache_age_seconds`: Age of current cached data
- `ttl_seconds`: Time-to-live before cache expires

### Clear All Caches

`POST /api/plex/cache/clear`

Clears all cache layers and resets hit/miss counters.

**Use Cases:**

- Testing cache behavior
- Force fresh data fetch after Plex server changes
- Troubleshooting stale data issues

**Response:**

```json
{
  "success": true,
  "message": "All caches cleared successfully",
  "cleared": ["plex_activities", "watch_history", "library_cache"]
}
```

### Warm All Caches

`POST /api/plex/cache/warm`

Proactively refreshes all cache layers with fresh data.

**Use Cases:**

- Prepare caches after server restart
- Ensure caches contain latest data before high-traffic period
- Force background refresh without waiting for TTL expiry

**Response:**

```json
{
  "success": true,
  "message": "All caches warmed successfully",
  "warmed": ["plex_activities", "watch_history", "library_cache"]
}
```

## Library Endpoints

### Get Streams

`GET /api/plex/streams`

Returns currently active Plex streams.

### Get Library

`GET /api/plex/library`

Returns Plex library information.

**Caching:** Library sections cached for 5 minutes per server URL + token combination.

## Cache Performance

The Komandorr caching system provides significant performance improvements:

| Endpoint                    | Without Cache | With Cache | Improvement   |
| --------------------------- | ------------- | ---------- | ------------- |
| `/api/plex/activities`      | ~5s           | <1s        | 80-90% faster |
| `/api/plex/watch-history`   | 2-3s          | <1s        | 60-70% faster |
| `/api/plex/stats/dashboard` | 3-5s          | <100ms     | 95%+ faster   |

**Cache Hit Rates:**

- Plex Activities: 80% during normal operation (5s TTL)
- Watch History: High hit rate during dashboard browsing (5min TTL)
- Background Stats: 100% hit rate (pre-calculated every 60s)

**Resource Reduction:**

- 83% fewer Plex API calls
- 80% fewer database queries for watch history
- Consistent sub-second response times

## Configuration

Cache behavior can be configured via environment variables:

```bash
# Optional Redis support (falls back to in-memory if unavailable)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
```

For detailed implementation information, see [CACHE_IMPLEMENTATION.md](../CACHE_IMPLEMENTATION.md) and [PHASE3_QUICKSTART.md](../PHASE3_QUICKSTART.md).
