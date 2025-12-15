# Komandorr v2.5.0 - Cache System Quick Reference

## 📊 Cache Statistics at a Glance

```bash
# View all cache metrics
curl http://localhost:8000/api/plex/cache/stats
```

## 🎯 Quick Commands

```bash
# Clear all caches
curl -X POST http://localhost:8000/api/plex/cache/clear

# Warm all caches
curl -X POST http://localhost:8000/api/plex/cache/warm

# Get dashboard stats (cached)
curl http://localhost:8000/api/plex/stats/dashboard

# Get Plex activities (cached)
curl http://localhost:8000/api/plex/activities

# Get watch history (cached)
curl http://localhost:8000/api/plex/watch-history
```

## ⚡ Performance Numbers

| Metric                  | Value             |
| ----------------------- | ----------------- |
| **Activities Response** | <1s (was ~5s)     |
| **Dashboard Stats**     | <100ms (was 3-5s) |
| **Cache Hit Rate**      | 80%+              |
| **API Call Reduction**  | 83%               |
| **DB Query Reduction**  | 80%               |

## 🔧 Cache Configuration

### Cache TTLs (Time-To-Live)

```
┌─────────────────────┬───────────┬──────────────┐
│ Cache Type          │ TTL       │ Use Case     │
├─────────────────────┼───────────┼──────────────┤
│ Plex Activities     │ 5 seconds │ Real-time    │
│ Watch History       │ 5 minutes │ Browsing     │
│ Library Sections    │ 5 minutes │ Invites      │
│ Background Stats    │ 60 seconds│ Dashboard    │
└─────────────────────┴───────────┴──────────────┘
```

### Redis Setup (Optional)

```bash
# .env configuration
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
```

**When to use Redis:**

- Multi-instance deployments
- Load-balanced setups
- Docker Swarm / Kubernetes
- High-availability requirements

## 📈 Monitoring Cache Health

### Good Performance Indicators

✅ Cache hit rate >70%  
✅ Response times <1 second  
✅ Background stats updating every 60s  
✅ No stale cache errors in logs

### Warning Signs

⚠️ Hit rate <50%  
⚠️ Frequent cache misses on sequential requests  
⚠️ "Stale cache fallback" errors in logs  
⚠️ Redis connection failures (if enabled)

## 🔍 Cache Response Fields

### Activities Response

```json
{
  "activities": [...],
  "cached": true,           // Is data from cache?
  "timestamp": "...",       // When was data fetched
  "cache_age": 1.4          // How old is cached data (seconds)
}
```

### Cache Stats Response

```json
{
  "caches": [
    {
      "name": "plex_activities",
      "hits": 4, // Requests served from cache
      "misses": 1, // Requests requiring fresh fetch
      "hit_rate": "80.0%", // Percentage of cache hits
      "ttl_seconds": 5, // Time before expiry
      "cached": true, // Is cache populated?
      "cache_age_seconds": 1.4 // Current cache age
    }
  ],
  "redis": {
    "type": "memory", // "redis" or "memory"
    "enabled": false, // Redis enabled?
    "connected": false // Redis connected?
  }
}
```

## 🛠️ Troubleshooting

### Cache Not Working

**Problem:** All requests show "cached": false

**Solutions:**

1. Make requests within TTL window (5s for activities)
2. Check logs for cache-related errors
3. Verify caching code is present in plex.py

```bash
# Test rapid requests
for i in {1..5}; do
  curl http://localhost:8000/api/plex/activities
  sleep 0.5
done
```

### Stale Data

**Problem:** Old data returned despite recent changes

**Solutions:**

1. Clear caches manually
   ```bash
   curl -X POST http://localhost:8000/api/plex/cache/clear
   ```
2. Wait for TTL expiry (5s for activities, 5min for history)
3. Trigger sync for watch history
   ```bash
   curl -X POST http://localhost:8000/api/plex/watch-history/sync
   ```

### Redis Connection Issues

**Problem:** Redis configured but not connecting

**Solutions:**

1. Verify Redis is running
   ```bash
   redis-cli ping  # Should return "PONG"
   ```
2. Check connection settings in .env
3. Review Redis logs for auth errors
4. System will automatically fall back to memory cache

## 📚 Documentation Links

- **Full Guide:** [docs/features/caching.md](docs/features/caching.md)
- **API Reference:** [docs/api/plex.md](docs/api/plex.md)
- **Implementation:** [CACHE_IMPLEMENTATION.md](CACHE_IMPLEMENTATION.md)
- **Phase 3 Guide:** [PHASE3_QUICKSTART.md](PHASE3_QUICKSTART.md)
- **Release Notes:** [RELEASE_NOTES_v2.5.0.md](RELEASE_NOTES_v2.5.0.md)

## 💡 Best Practices

1. **Monitor regularly** - Check `/api/plex/cache/stats` daily
2. **Clear after updates** - Clear caches after Plex server changes
3. **Warm proactively** - Use `/cache/warm` before high traffic
4. **Enable Redis for scale** - Multi-instance setups benefit greatly
5. **Review logs** - Watch for cache errors and warnings

## 🎯 Common Use Cases

### Testing Cache Performance

```bash
# Rapid fire 5 requests
for i in {1..5}; do
  echo "Request $i:"
  curl -s http://localhost:8000/api/plex/activities | jq '.cached, .cache_age'
done

# Check final statistics
curl -s http://localhost:8000/api/plex/cache/stats | jq '.caches[0] | {hits, misses, hit_rate}'
```

Expected output:

- Request 1: `"cached": false` (miss)
- Requests 2-5: `"cached": true` (hits)
- Final hit rate: ~80%

### Monitoring Dashboard Load Time

```bash
# Without cache (first call or after clear)
time curl -s http://localhost:8000/api/plex/stats/dashboard > /dev/null

# With cache (subsequent calls)
time curl -s http://localhost:8000/api/plex/stats/dashboard > /dev/null
```

Expected:

- First call: 3-5 seconds
- Subsequent: <100ms (95%+ faster)

### Verifying Background Stats

```bash
# Check last update time
curl -s http://localhost:8000/api/plex/cache/stats | \
  jq '.caches[] | select(.name=="background_stats") | .last_update'

# Wait 60+ seconds, check again - timestamp should update
```

## 🚀 Performance Tips

### For High-Traffic Sites

```bash
# Reduce check intervals
# Activities TTL: 5s → 10s
# Stats refresh: 60s → 30s

# Enable Redis
REDIS_ENABLED=true
```

### For Development

```bash
# Use shorter TTLs for testing
# Activities TTL: 5s → 1s
# Clear cache frequently

curl -X POST http://localhost:8000/api/plex/cache/clear
```

## 📊 Benchmark Your System

```bash
#!/bin/bash
# Save as benchmark_cache.sh

echo "=== Komandorr Cache Benchmark ==="
echo ""

echo "1. Clear all caches..."
curl -s -X POST http://localhost:8000/api/plex/cache/clear > /dev/null

echo "2. First request (cache miss)..."
time1=$(date +%s.%N)
curl -s http://localhost:8000/api/plex/activities > /dev/null
time2=$(date +%s.%N)
miss_time=$(echo "$time2 - $time1" | bc)
echo "   Time: ${miss_time}s"

echo "3. Second request (cache hit)..."
time1=$(date +%s.%N)
curl -s http://localhost:8000/api/plex/activities > /dev/null
time2=$(date +%s.%N)
hit_time=$(echo "$time2 - $time1" | bc)
echo "   Time: ${hit_time}s"

improvement=$(echo "scale=2; (($miss_time - $hit_time) / $miss_time) * 100" | bc)
echo ""
echo "Performance improvement: ${improvement}%"

echo ""
echo "4. Final cache statistics:"
curl -s http://localhost:8000/api/plex/cache/stats | \
  jq '.caches[] | select(.name=="plex_activities") | {hits, misses, hit_rate}'
```

---

**Version:** 2.5.0  
**Last Updated:** December 15, 2025  
**Quick Reference:** Keep this card handy for daily operations!
