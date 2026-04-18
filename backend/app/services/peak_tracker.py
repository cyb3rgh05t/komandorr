"""
Background Peak Tracker Service

Periodically polls Plex activities and updates peak concurrent stream counts
in the database, independent of any frontend/browser being open.
"""

import asyncio
import httpx
from datetime import datetime, timezone
from app.utils.logger import logger


class PeakTracker:
    def __init__(self):
        self.running = False
        self.interval = 10  # seconds
        self.task = None

    async def start_tracking(self):
        """Background task to poll Plex activities and track peaks"""
        self.running = True
        logger.info(f"Starting background peak tracker (every {self.interval}s)")

        while self.running:
            try:
                await asyncio.sleep(self.interval)
                if not self.running:
                    break
                await self._check_and_update_peak()
            except asyncio.CancelledError:
                logger.info("Peak tracker task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in peak tracker: {e}")

    def stop(self):
        self.running = False

    async def _check_and_update_peak(self):
        """Fetch current activity count from Plex and update peaks if needed"""
        try:
            from app.api.plex import load_plex_config

            config = load_plex_config()
            if not config:
                return

            url = config.get("url", "").rstrip("/")
            token = config.get("token", "")
            if not url or not token:
                return

            activity_count = 0
            async with httpx.AsyncClient(timeout=15.0) as client:
                headers = {"X-Plex-Token": token, "Accept": "application/json"}

                # Count activities
                try:
                    resp = await client.get(f"{url}/activities", headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        activities = data.get("MediaContainer", {}).get("Activity", [])
                        activity_count += len(activities)
                except Exception as e:
                    logger.debug(f"Peak tracker: error fetching /activities: {e}")

                # Count sessions
                try:
                    resp = await client.get(f"{url}/status/sessions", headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        sessions = data.get("MediaContainer", {}).get("Metadata", [])
                        activity_count += len(sessions)
                except Exception as e:
                    logger.debug(f"Peak tracker: error fetching /status/sessions: {e}")

            if activity_count == 0:
                return

            # Update peaks in DB
            from app.database import db, PlexStatsDB, DailyPeakDB

            session = db.get_session()
            try:
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                updated = False

                # All-time peak
                stats = session.query(PlexStatsDB).first()
                if not stats:
                    stats = PlexStatsDB(
                        peak_concurrent=activity_count, last_updated=now
                    )
                    session.add(stats)
                    updated = True
                elif activity_count > stats.peak_concurrent:
                    stats.peak_concurrent = activity_count  # type: ignore
                    stats.last_updated = now  # type: ignore
                    updated = True

                # Daily peak
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                daily = (
                    session.query(DailyPeakDB).filter(DailyPeakDB.date == today).first()
                )
                if not daily:
                    daily = DailyPeakDB(
                        date=today, peak_concurrent=activity_count, updated_at=now
                    )
                    session.add(daily)
                    updated = True
                elif activity_count > daily.peak_concurrent:
                    daily.peak_concurrent = activity_count  # type: ignore
                    daily.updated_at = now  # type: ignore
                    updated = True

                if updated:
                    session.commit()
                    from app.services.redis_cache import cache_delete

                    cache_delete("plex:stats")
                    logger.debug(
                        f"Peak tracker: updated peaks (count={activity_count})"
                    )
            finally:
                session.close()

        except Exception as e:
            logger.warning(f"Peak tracker error: {e}")


peak_tracker = PeakTracker()
