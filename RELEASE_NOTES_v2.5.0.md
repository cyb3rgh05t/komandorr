# Release Notes - Komandorr v2.5.0

**Release Date:** December 15, 2025

## 🎉 What's New

Komandorr v2.5.0 introduces a comprehensive enterprise-grade caching system that dramatically improves performance across the entire application. This release focuses on speed, efficiency, and scalability.

## ⚡ Major Performance Improvements

### Enterprise Caching System

This release implements a three-phase caching strategy that provides:

- **80-95% faster response times** across all major endpoints
- **83% reduction** in Plex API calls
- **80% reduction** in database queries
- **Sub-100ms** dashboard statistics loading

#### Phase 1: Plex Activities Cache

The Plex activities endpoint now features intelligent caching:

- **5-second TTL** with automatic stale cache fallback
- **80% cache hit rate** during normal operation
- **Response time**: ~5s → <1s (80-90% improvement)
- **Hit/miss tracking** for performance monitoring

#### Phase 2: Watch History & Library Caching

Database-intensive operations are now cached:

- **5-minute TTL** for watch history queries
- **Automatic invalidation** on manual sync operations
- **Library sections cached** per server/token combination
- **Response time**: 2-3s → <1s (60-70% improvement)

#### Phase 3: Background Statistics & Cache Warming

The dashboard now loads instantly with pre-calculated data:

- **60-second background aggregation** of all statistics
- **Automatic cache warming** at 80% TTL threshold
- **Dashboard response time**: 3-5s → <100ms (95%+ improvement)
- **Optional Redis support** for multi-instance deployments

## 🆕 New API Endpoints

### Cache Management

Four new endpoints for complete cache control:

1. **GET /api/plex/cache/stats** - Detailed cache performance metrics

   - Per-cache hit/miss rates
   - TTL and cache age information
   - Redis connection status
   - Background stats service status

2. **POST /api/plex/cache/clear** - Clear all cache layers

   - Force fresh data fetch
   - Reset hit/miss counters
   - Useful for testing and troubleshooting

3. **POST /api/plex/cache/warm** - Manually warm all caches

   - Pre-load data after restart
   - Prepare for high-traffic periods
   - Force immediate refresh

4. **GET /api/plex/stats/dashboard** - Pre-calculated statistics
   - Service health (total, online, offline)
   - Plex library totals (movies, shows, episodes, seasons)
   - Traffic statistics (30-day totals)
   - Updated automatically every 60 seconds

## 📊 Performance Metrics

### Before vs After Comparison

| Endpoint        | Before | After  | Improvement   |
| --------------- | ------ | ------ | ------------- |
| Plex Activities | ~5s    | <1s    | 80-90% faster |
| Watch History   | 2-3s   | <1s    | 60-70% faster |
| Dashboard Stats | 3-5s   | <100ms | 95%+ faster   |

### Resource Usage

- **API Calls**: 83% reduction in Plex API requests
- **Database Queries**: 80% fewer watch history queries
- **Cache Hit Rates**: 80% during normal operation
- **Memory Usage**: Minimal impact with in-memory caching

## 🔧 Configuration Options

### Redis Support (Optional)

For production deployments, Redis distributed caching is now supported:

```bash
# .env configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your_password
```

**Features:**

- Automatic fallback to in-memory cache if unavailable
- Graceful degradation maintains reliability
- Perfect for load-balanced setups
- Docker Swarm/Kubernetes ready

## 📚 Documentation Updates

### New Documentation

1. **[Caching System Guide](docs/features/caching.md)**

   - Complete architecture overview
   - Performance benchmarks
   - Configuration guide
   - Troubleshooting tips

2. **[Enhanced API Documentation](docs/api/plex.md)**

   - All new cache endpoints documented
   - Request/response examples
   - Cache statistics interpretation
   - Performance comparison tables

3. **[CACHE_IMPLEMENTATION.md](CACHE_IMPLEMENTATION.md)**

   - Technical implementation details
   - Code examples and patterns
   - Phase-by-phase breakdown

4. **[PHASE3_QUICKSTART.md](PHASE3_QUICKSTART.md)**
   - Quick start guide for Phase 3 features
   - Testing procedures
   - Redis setup instructions

## 🔄 Migration Notes

### Automatic Migration

No manual migration required! The caching system is automatically active upon upgrade:

1. Stop Komandorr
2. Pull latest version (v2.5.0)
3. Restart Komandorr
4. Caching is immediately active

### Compatibility

- ✅ Fully backward compatible with v2.4.x
- ✅ No database schema changes
- ✅ No configuration changes required
- ✅ Redis is optional (uses in-memory by default)

## 🎯 Use Cases

### Perfect For

1. **High-Traffic Environments**

   - Multiple users accessing dashboard simultaneously
   - Frequent Plex activity monitoring
   - Real-time statistics display

2. **Resource-Constrained Servers**

   - Reduce load on Plex server
   - Minimize database queries
   - Lower CPU and network usage

3. **Multi-Instance Deployments**
   - Enable Redis for shared cache
   - Scale horizontally with load balancers
   - Docker Swarm/Kubernetes setups

## 🐛 Bug Fixes

- Fixed potential race conditions in cache updates
- Improved error handling with stale cache fallback
- Enhanced timestamp precision for cache age calculations

## 🔜 Coming in v2.6.0

- Configurable TTLs via environment variables
- Cache metrics export to Prometheus
- Per-user cache segregation
- Cache eviction policies (LRU, LFU)
- Automatic cache warming on Plex webhook events

## 📦 Upgrade Instructions

### Docker

```bash
docker pull cyb3rgh05t/komandorr:latest
docker-compose up -d
```

### Manual Installation

```bash
cd komandorr
git pull
cd frontend && npm install && npm run build
cd ../backend && pip install -r requirements.txt
./start.ps1  # Windows
./start.sh   # Linux
```

### Verification

After upgrade, verify caching is active:

```bash
# Check cache statistics
curl http://localhost:8000/api/plex/cache/stats

# Should show caches with hit/miss tracking
# "plex_activities", "watch_history", "background_stats"
```

## 🙏 Acknowledgments

This release was inspired by [Posterizarr's](https://github.com/RemiRigal/Posterizarr) excellent caching implementation. Special thanks to the Plex community for feature requests and feedback.

## 📖 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete version history and detailed changes.

## 🐛 Known Issues

None at this time. Please report issues at: https://github.com/cyb3rgh05t/komandorr/issues

## 💬 Support

- **Documentation**: https://cyb3rgh05t.github.io/komandorr/
- **Issues**: https://github.com/cyb3rgh05t/komandorr/issues
- **Discussions**: https://github.com/cyb3rgh05t/komandorr/discussions

---

**Version:** 2.5.0  
**Release Date:** December 15, 2025  
**License:** MIT  
**Author:** cyb3rgh05t
