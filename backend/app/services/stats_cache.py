"""
Background Statistics Cache Service

Pre-calculates and caches dashboard statistics to improve performance.
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.utils.logger import logger


class StatsCache:
    """Background service to pre-calculate and cache dashboard statistics"""

    def __init__(self):
        self.stats: Dict[str, Any] = {}
        self.last_update: Optional[datetime] = None
        self.update_interval = 60  # seconds
        self.running = False
        self.task: Optional[asyncio.Task] = None

    async def start_background_refresh(self):
        """Background task to refresh stats periodically"""
        self.running = True
        logger.info(
            f"Starting background stats cache refresh (every {self.update_interval}s)"
        )

        # Initial calculation
        try:
            await self._calculate_stats()
        except Exception as e:
            logger.error(f"Error during initial stats calculation: {e}")

        while self.running:
            try:
                await asyncio.sleep(self.update_interval)
                if not self.running:
                    break
                await self._calculate_stats()
            except asyncio.CancelledError:
                logger.info("Stats cache refresh task cancelled")
                break
            except Exception as e:
                logger.error(f"Error refreshing stats: {e}")
                # Continue running even if one update fails

    async def _calculate_stats(self):
        """Calculate all dashboard statistics"""
        try:
            from app.services.monitor import monitor
            from app.api.plex import load_plex_config

            stats = {
                "services": await self._get_service_stats(),
                "plex": await self._get_plex_stats(),
                "traffic": await self._get_traffic_stats(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            self.stats = stats
            self.last_update = datetime.now(timezone.utc)
            logger.debug(
                f"Stats cache refreshed: {stats['services']['total']} services, "
                f"{stats['services']['online']} online"
            )

        except Exception as e:
            logger.error(f"Error calculating stats: {e}")
            raise

    async def _get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        try:
            from app.services.monitor import monitor

            services = monitor.get_all_services()
            online_count = sum(1 for s in services if s.status == "online")
            offline_count = sum(1 for s in services if s.status == "offline")
            problem_count = sum(1 for s in services if s.status == "problem")

            return {
                "total": len(services),
                "online": online_count,
                "offline": offline_count,
                "problem": problem_count,
            }
        except Exception as e:
            logger.error(f"Error getting service stats: {e}")
            return {"total": 0, "online": 0, "offline": 0, "problem": 0}

    async def _get_plex_stats(self) -> Dict[str, Any]:
        """Get Plex statistics"""
        try:
            from app.api.plex import load_plex_config, fetch_plex_statistics
            from app.database import db, PlexStatsDB

            config = load_plex_config()
            plex_stats = {
                "configured": False,
                "peak_concurrent": 0,
                "total_users": 0,
                "total_movies": 0,
                "total_tv_shows": 0,
            }

            if config and config.get("url") and config.get("token"):
                plex_stats["configured"] = True

                # Get peak concurrent from database
                session = db.get_session()
                try:
                    stats_db = session.query(PlexStatsDB).first()
                    if stats_db:
                        plex_stats["peak_concurrent"] = stats_db.peak_concurrent or 0

                    # Fetch live statistics
                    total_users, total_movies, total_tv_shows = (
                        await fetch_plex_statistics(config["url"], config["token"])
                    )
                    plex_stats["total_users"] = total_users
                    plex_stats["total_movies"] = total_movies
                    plex_stats["total_tv_shows"] = total_tv_shows

                except Exception as e:
                    logger.debug(f"Error fetching Plex stats: {e}")
                finally:
                    session.close()

            return plex_stats

        except Exception as e:
            logger.error(f"Error getting Plex stats: {e}")
            return {
                "configured": False,
                "peak_concurrent": 0,
                "total_users": 0,
                "total_movies": 0,
                "total_tv_shows": 0,
            }

    async def _get_traffic_stats(self) -> Dict[str, Any]:
        """Get traffic statistics summary"""
        try:
            from app.database import db, TrafficHistoryDB
            from datetime import datetime, timedelta
            from sqlalchemy import func

            session = db.get_session()
            try:
                # Get last 24 hours of traffic
                yesterday = datetime.now() - timedelta(hours=24)

                result = (
                    session.query(
                        func.sum(TrafficHistoryDB.total_down).label("total_download"),
                        func.sum(TrafficHistoryDB.total_up).label("total_upload"),
                    )
                    .filter(TrafficHistoryDB.timestamp >= yesterday)
                    .first()
                )

                total_download = int(result.total_download or 0) if result else 0
                total_upload = int(result.total_upload or 0) if result else 0

                return {
                    "last_24h_download_bytes": total_download,
                    "last_24h_upload_bytes": total_upload,
                    "last_24h_total_bytes": total_download + total_upload,
                }

            finally:
                session.close()

        except Exception as e:
            logger.error(f"Error getting traffic stats: {e}")
            return {
                "last_24h_download_bytes": 0,
                "last_24h_upload_bytes": 0,
                "last_24h_total_bytes": 0,
            }

    def get_stats(self) -> Dict[str, Any]:
        """Get cached stats"""
        if not self.stats:
            return {
                "services": {"total": 0, "online": 0, "offline": 0, "warning": 0},
                "plex": {
                    "configured": False,
                    "peak_concurrent": 0,
                    "total_users": 0,
                    "total_movies": 0,
                    "total_tv_shows": 0,
                },
                "traffic": {
                    "last_24h_download_bytes": 0,
                    "last_24h_upload_bytes": 0,
                    "last_24h_total_bytes": 0,
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cached": False,
            }

        return {**self.stats, "cached": True}

    def stop(self):
        """Stop the background refresh task"""
        self.running = False
        if self.task:
            self.task.cancel()

    async def force_refresh(self):
        """Force an immediate refresh of stats"""
        logger.info("Forcing stats cache refresh")
        await self._calculate_stats()


# Global instance
stats_cache = StatsCache()
