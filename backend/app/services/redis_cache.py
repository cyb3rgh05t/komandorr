"""
Redis Cache Layer (Optional)

Provides a distributed cache layer using Redis for multi-instance deployments.
Falls back to in-memory cache if Redis is not available.

To enable Redis caching:
1. Install redis: pip install redis
2. Set environment variables:
   - REDIS_ENABLED=true
   - REDIS_HOST=localhost (default)
   - REDIS_PORT=6379 (default)
   - REDIS_DB=0 (default)
   - REDIS_PASSWORD=<your-password> (optional)
"""

import json
import os
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from app.utils.logger import logger

# Check if Redis is available and enabled
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "false").lower() == "true"
REDIS_AVAILABLE = False

if REDIS_ENABLED:
    try:
        import redis

        REDIS_AVAILABLE = True
        logger.info("Redis library available")
    except ImportError:
        logger.warning(
            "Redis caching enabled but redis library not installed. "
            "Install with: pip install redis"
        )
        REDIS_AVAILABLE = False


class RedisCache:
    """Redis cache wrapper with fallback to in-memory cache"""

    def __init__(self):
        self.redis_client: Optional[Any] = None
        self.memory_cache: Dict[str, Any] = {}
        self.enabled = REDIS_ENABLED and REDIS_AVAILABLE

        if self.enabled:
            try:
                import redis

                redis_host = os.getenv("REDIS_HOST", "localhost")
                redis_port = int(os.getenv("REDIS_PORT", "6379"))
                redis_db = int(os.getenv("REDIS_DB", "0"))
                redis_password = os.getenv("REDIS_PASSWORD", None)

                self.redis_client = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    db=redis_db,
                    password=redis_password,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2,
                )

                # Test connection
                self.redis_client.ping()
                logger.info(
                    f"Redis cache initialized: {redis_host}:{redis_port} (DB: {redis_db})"
                )

            except Exception as e:
                logger.warning(
                    f"Failed to connect to Redis: {e}. Using in-memory cache."
                )
                self.redis_client = None
                self.enabled = False

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """
        Set a cache value with TTL

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl_seconds: Time-to-live in seconds

        Returns:
            True if successful, False otherwise
        """
        try:
            if self.redis_client:
                # Use Redis
                serialized = json.dumps(value, default=str)
                self.redis_client.setex(key, ttl_seconds, serialized)
                return True
            else:
                # Fallback to memory cache
                expiry = datetime.now() + timedelta(seconds=ttl_seconds)
                self.memory_cache[key] = {"value": value, "expiry": expiry}
                return True

        except Exception as e:
            logger.error(f"Error setting cache key '{key}': {e}")
            return False

    def get(self, key: str) -> Optional[Any]:
        """
        Get a cache value

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found or expired
        """
        try:
            if self.redis_client:
                # Use Redis
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
                return None
            else:
                # Fallback to memory cache
                cached = self.memory_cache.get(key)
                if cached:
                    if datetime.now() < cached["expiry"]:
                        return cached["value"]
                    else:
                        # Expired, remove it
                        del self.memory_cache[key]
                return None

        except Exception as e:
            logger.error(f"Error getting cache key '{key}': {e}")
            return None

    def delete(self, key: str) -> bool:
        """
        Delete a cache key

        Args:
            key: Cache key to delete

        Returns:
            True if successful, False otherwise
        """
        try:
            if self.redis_client:
                self.redis_client.delete(key)
                return True
            else:
                self.memory_cache.pop(key, None)
                return True

        except Exception as e:
            logger.error(f"Error deleting cache key '{key}': {e}")
            return False

    def clear(self) -> bool:
        """
        Clear all cache keys

        Returns:
            True if successful, False otherwise
        """
        try:
            if self.redis_client:
                # Only clear keys with specific prefix to avoid affecting other apps
                pattern = "komandorr:*"
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
                return True
            else:
                self.memory_cache.clear()
                return True

        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            if self.redis_client:
                info = self.redis_client.info("stats")
                return {
                    "type": "redis",
                    "enabled": True,
                    "connected": True,
                    "total_keys": self.redis_client.dbsize(),
                    "hits": info.get("keyspace_hits", 0),
                    "misses": info.get("keyspace_misses", 0),
                }
            else:
                # Clean up expired keys first
                now = datetime.now()
                expired_keys = [
                    k for k, v in self.memory_cache.items() if v["expiry"] < now
                ]
                for k in expired_keys:
                    del self.memory_cache[k]

                return {
                    "type": "memory",
                    "enabled": False,
                    "connected": False,
                    "total_keys": len(self.memory_cache),
                }

        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {
                "type": "unknown",
                "enabled": False,
                "connected": False,
                "error": str(e),
            }


# Global instance
redis_cache = RedisCache()


# Helper functions for easier usage
def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> bool:
    """Set a cache value (wrapper for RedisCache.set)"""
    return redis_cache.set(f"komandorr:{key}", value, ttl_seconds)


def cache_get(key: str) -> Optional[Any]:
    """Get a cache value (wrapper for RedisCache.get)"""
    return redis_cache.get(f"komandorr:{key}")


def cache_delete(key: str) -> bool:
    """Delete a cache key (wrapper for RedisCache.delete)"""
    return redis_cache.delete(f"komandorr:{key}")


def cache_clear() -> bool:
    """Clear all cache keys (wrapper for RedisCache.clear)"""
    return redis_cache.clear()
