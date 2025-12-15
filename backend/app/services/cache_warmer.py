"""
Cache Warming Service

Automatically refreshes caches before they expire to avoid cold starts.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional
from app.utils.logger import logger


class CacheWarmer:
    """Background service to warm caches before they expire"""

    def __init__(self):
        self.running = False
        self.task: Optional[asyncio.Task] = None
        self.check_interval = 2  # Check every 2 seconds

    async def start_warming(self):
        """Start the cache warming loop"""
        self.running = True
        logger.info("Starting cache warming service")

        while self.running:
            try:
                await asyncio.sleep(self.check_interval)
                if not self.running:
                    break
                await self._warm_caches()
            except asyncio.CancelledError:
                logger.info("Cache warming task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in cache warming: {e}")

    async def _warm_caches(self):
        """Check and warm caches that are about to expire"""
        try:
            from app.api.plex import (
                _activity_cache,
                _watch_history_cache,
                get_plex_activities,
                get_watch_history,
            )

            now = datetime.now()

            # Warm activities cache (refresh when 80% of TTL elapsed)
            if await self._should_warm(_activity_cache, now):
                logger.debug("Warming Plex activities cache")
                try:
                    await get_plex_activities()
                except Exception as e:
                    logger.debug(f"Failed to warm activities cache: {e}")

            # Warm watch history cache (refresh when 80% of TTL elapsed)
            if await self._should_warm(_watch_history_cache, now):
                logger.debug("Warming watch history cache")
                try:
                    await get_watch_history()
                except Exception as e:
                    logger.debug(f"Failed to warm watch history cache: {e}")

        except Exception as e:
            logger.error(f"Error warming caches: {e}")

    async def _should_warm(self, cache: dict, now: datetime) -> bool:
        """Check if a cache should be warmed (80% of TTL elapsed)"""
        if cache.get("data") is None or cache.get("last_fetched") is None:
            return False

        ttl_seconds = cache.get("ttl_seconds", 0)
        if ttl_seconds == 0:
            return False

        last_fetched = cache.get("last_fetched")
        if not isinstance(last_fetched, datetime):
            return False

        elapsed = (now - last_fetched).total_seconds()
        warm_threshold = ttl_seconds * 0.8  # Warm at 80% of TTL

        # Only warm if we're past 80% but before expiry
        return warm_threshold <= elapsed < ttl_seconds

    def stop(self):
        """Stop the cache warming service"""
        self.running = False
        if self.task:
            self.task.cancel()


# Global instance
cache_warmer = CacheWarmer()
