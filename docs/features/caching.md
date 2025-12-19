# Caching System

Komandorr v3.0.0 extends the enterprise-grade caching system introduced in v2.5.0, further improving performance and reducing load on Plex servers and databases.

## What's New in v3.0.0

- Redis-backed cache for Plex sessions (10s TTL) to cut repeated `/status/sessions` calls
- Redis caching for live stats (30s), standard stats (60s), and recent media (5m)
- Cache warm/clear routines now cover the new Redis keys, and cache stats lists expected keys for quick verification
- Watch-history sync also clears its Redis entry to prevent stale data

## Overview

The caching system is implemented in three phases:

1. **Phase 1: Plex Activities Cache** - In-memory caching of Plex API activities
2. **Phase 2: Watch History & Library Cache** - Database query and library caching
3. **Phase 3: Background Stats & Cache Warming** - Pre-calculated statistics and automatic cache refresh

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Requests                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Endpoints                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ /activities  │  │ /watch-history│  │   /stats     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cache Layer (In-Memory)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Activities Cache (5s TTL, 80% hit rate)            │   │
│  │  Watch History Cache (5min TTL)                     │   │
│  │  Library Cache (5min TTL)                           │   │
│  │  Background Stats Cache (60s refresh)               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Sources (on cache miss)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Plex API    │  │   SQLite DB  │  │ Redis (opt)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Background Services (asyncio)                   │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Stats Calc   │  │ Cache Warmer │                        │
│  │ (every 60s)  │  │ (every 2s)   │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Performance Benefits

### Response Time Improvements

| Endpoint                        | Before Cache | After Cache | Improvement   |
| ------------------------------- | ------------ | ----------- | ------------- |
| `GET /api/plex/activities`      | ~5 seconds   | <1 second   | 80-90% faster |
| `GET /api/plex/watch-history`   | 2-3 seconds  | <1 second   | 60-70% faster |
| `GET /api/plex/stats/dashboard` | 3-5 seconds  | <100ms      | 95%+ faster   |

### Resource Reduction

- **83% fewer Plex API calls** - Activities cache prevents repeated API requests
- **80% fewer database queries** - Watch history cache eliminates redundant scans
- **100% pre-calculated stats** - Dashboard stats computed in background

### Cache Hit Rates

During normal operation with multiple rapid requests:

- **Activities Cache**: 80% hit rate (5-second TTL)
- **Watch History Cache**: High hit rate during browsing sessions (5-minute TTL)
- **Background Stats**: 100% hit rate (always fresh, updated every 60s)

## Cache Layers

### 1. Plex Activities Cache

**TTL:** 5 seconds  
**Purpose:** Reduce Plex API calls during active monitoring  
**Storage:** Module-level dictionary in `backend/app/api/plex.py`

**Features:**

- Timestamp-based expiry checking
- Hit/miss tracking for performance monitoring
- Stale cache fallback on API errors
- Cache age reporting in responses

**Example:**

```python
_activity_cache = {
    "data": None,          # Cached activities list
    "timestamp": None,     # datetime of last fetch
    "hits": 0,             # Cache hit counter
    "misses": 0            # Cache miss counter
}
```

### 2. Watch History Cache

**TTL:** 5 minutes (300 seconds)  
**Purpose:** Reduce database queries for watch history  
**Storage:** Module-level dictionary in `backend/app/api/plex.py`

**Features:**

- Automatic invalidation on manual sync
- Database query elimination during dashboard loads
- Same hit/miss tracking as activities cache

**Invalidation triggers:**

- Manual sync via `POST /api/plex/watch-history/sync`
- Cache TTL expiry
- Manual cache clear via `POST /api/plex/cache/clear`

### 3. Library Cache

**TTL:** 5 minutes (300 seconds)  
**Purpose:** Cache Plex library sections during invite workflows  
**Storage:** Module-level dictionary in `backend/app/utils/plex_invite.py`

**Key strategy:** `{server_url_prefix}:{token_prefix}` for multi-server support

### 4. Background Statistics Cache

**Refresh Interval:** 60 seconds  
**Purpose:** Pre-calculate expensive dashboard statistics  
**Storage:** Module-level dictionary in `backend/app/services/stats_cache.py`

**Aggregated data:**

- Service health (total, online, offline counts)
- Plex library totals (movies, shows, seasons, episodes)
- Traffic statistics (30-day totals)

**Process:**

```
┌─────────────────────────────────────────────────┐
│  Background Task (every 60s)                    │
│  ┌──────────────────────────────────────────┐  │
│  │  1. Query all services (monitor.py)      │  │
│  │  2. Query Plex stats (database.py)       │  │
│  │  3. Query traffic history (database.py)  │  │
│  │  4. Aggregate and store in cache         │  │
│  │  5. Sleep 60s, repeat                    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Cache Warming

The cache warming service ensures caches stay fresh and prevents cold cache scenarios.

**Configuration:**

- Check interval: 2 seconds
- Warming threshold: 80% of TTL
- Warmed caches: Activities, Watch History

**Logic:**

```python
if cache_age >= (ttl * 0.8):  # 80% threshold
    # Proactively refresh cache
    await warm_cache()
```

**Example:** Activities cache with 5s TTL warms at 4 seconds age.

## Redis Support (Optional)

For multi-instance deployments, Komandorr supports optional Redis distributed caching.

**Configuration:**

```bash
# .env file
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_password_here
```

**Features:**

- Automatic fallback to in-memory cache if Redis unavailable
- Graceful degradation maintains system reliability
- Full CRUD operations (set, get, delete, clear)
- Connection health monitoring

**Use cases:**

- Load-balanced multi-instance setups
- Docker Swarm/Kubernetes deployments
- Shared cache across multiple Komandorr instances

## API Endpoints

### Cache Statistics

**Endpoint:** `GET /api/plex/cache/stats`

Returns detailed metrics for all cache layers:

```bash
curl http://localhost:8000/api/plex/cache/stats
```

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
    }
  ],
  "redis": {
    "type": "memory",
    "enabled": false,
    "connected": false
  }
}
```

### Clear Caches

**Endpoint:** `POST /api/plex/cache/clear`

Clears all cache layers and resets counters:

```bash
curl -X POST http://localhost:8000/api/plex/cache/clear
```

**Use cases:**

- Testing cache behavior
- Force fresh data after Plex changes
- Troubleshooting stale data

### Warm Caches

**Endpoint:** `POST /api/plex/cache/warm`

Manually triggers cache warming for all layers:

```bash
curl -X POST http://localhost:8000/api/plex/cache/warm
```

**Use cases:**

- Prepare caches after server restart
- Pre-load data before high-traffic period
- Force immediate refresh

### Dashboard Statistics

**Endpoint:** `GET /api/plex/stats/dashboard`

Returns pre-calculated statistics (sub-100ms response):

```bash
curl http://localhost:8000/api/plex/stats/dashboard
```

## Configuration

### Environment Variables

```bash
# Redis Configuration (optional)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# Cache TTLs (hardcoded, future enhancement)
# CACHE_ACTIVITIES_TTL=5
# CACHE_WATCH_HISTORY_TTL=300
# CACHE_LIBRARY_TTL=300
# STATS_REFRESH_INTERVAL=60
```

### Tuning Recommendations

**High-traffic environments:**

- Enable Redis for distributed caching
- Consider increasing activities TTL to 10s
- Reduce stats refresh interval to 30s

**Low-traffic environments:**

- In-memory cache sufficient
- Default TTLs work well
- No Redis needed

**Development:**

- Use lower TTLs (1-2s) for rapid testing
- Monitor cache stats during development
- Clear caches frequently

## Monitoring

### Cache Health Indicators

**Good cache performance:**

- Hit rate >70% for activities cache
- Hit rate >80% for watch history cache
- Background stats updating every 60s
- Cache age within TTL bounds

**Poor cache performance:**

- Hit rate <50% (TTL too short or traffic too spread out)
- Frequent cache misses on sequential requests
- Stale cache fallback errors in logs

### Logging

Cache operations are logged at INFO level:

```
INFO: Cache miss - fetching fresh activities from Plex
INFO: Cache hit - returning cached activities (age: 2.3s)
INFO: Background stats updated successfully
INFO: Cache warmer refreshed activities cache at 80% TTL
```

## Best Practices

1. **Monitor hit rates** - Use `/api/plex/cache/stats` to track performance
2. **Clear caches after changes** - After Plex server updates, clear caches
3. **Warm caches proactively** - Before high-traffic periods, warm caches
4. **Enable Redis for scale** - Multi-instance deployments benefit from Redis
5. **Review logs regularly** - Watch for stale cache fallback errors

## Troubleshooting

### Cache not working

**Symptoms:** Cache statistics show 0 hits, all misses

**Solutions:**

- Ensure requests are within TTL window (5s for activities)
- Check if caching code is present in plex.py
- Verify no errors in logs during cache operations

### Stale data returned

**Symptoms:** Old data returned despite recent changes

**Solutions:**

- Clear all caches: `POST /api/plex/cache/clear`
- Check TTL settings (may be too long)
- Verify cache invalidation triggers working

### Redis connection failures

**Symptoms:** "Redis not available" in cache stats, fallback to memory

**Solutions:**

- Check Redis server is running: `redis-cli ping`
- Verify connection settings in .env file
- Review Redis logs for authentication errors
- System automatically falls back to memory cache

### High memory usage

**Symptoms:** Backend process memory growing over time

**Solutions:**

- Review cached data size (especially large libraries)
- Consider shorter TTLs to expire data faster
- Enable Redis to offload memory from backend
- Monitor with cache stats endpoint

## Technical Implementation

### Cache Structure

All caches follow this pattern:

```python
_cache_name = {
    "data": None,         # Cached data (varies by cache)
    "timestamp": None,    # datetime of last update
    "hits": 0,            # Hit counter
    "misses": 0           # Miss counter
}
```

### TTL Checking

```python
def is_cache_valid(cache_dict, ttl_seconds):
    if cache_dict["timestamp"] is None:
        return False
    age = (datetime.now() - cache_dict["timestamp"]).total_seconds()
    return age < ttl_seconds
```

### Background Task Integration

Background tasks are managed via FastAPI lifespan context:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    stats_task = asyncio.create_task(stats_cache.start_background_refresh())
    warmer_task = asyncio.create_task(cache_warmer.start())

    yield  # Application runs

    # Shutdown
    stats_task.cancel()
    warmer_task.cancel()
```

## Future Enhancements

Potential improvements for future versions:

- Configurable TTLs via environment variables
- Cache eviction policies (LRU, LFU)
- Per-user cache segregation
- Cache compression for large datasets
- Prometheus metrics export
- Cache warming on specific events (not just TTL)
- Distributed cache with Redis Cluster support

## Related Documentation

- [API Documentation](../api/plex.md) - Cache endpoint reference
- [Plex Configuration](../configuration/plex.md) - Plex server setup guide
- [Configuration Guide](../configuration/index.md) - Environment setup
- [Quick Start Guide](../getting-started/quickstart.md) - Getting started with Komandorr

## Version History

- **v3.0.0** - Redis-backed coverage expansion

  - Sessions cache (10s TTL) to reduce `/status/sessions` calls
  - Live stats cache (30s TTL) and stats cache (60s TTL)
  - Recent media cache (5m TTL) for heavy library queries
  - Cache warm/clear routines manage new Redis keys; cache stats lists expected keys
  - Watch history sync clears Redis entry to avoid stale data

- **v2.5.0** - Initial caching system release (Phase 1-3)
  - Plex activities cache (5s TTL)
  - Watch history cache (5min TTL)
  - Library cache (5min TTL)
  - Background stats aggregation (60s refresh)
  - Cache warming service (80% TTL threshold)
  - Optional Redis support
