"""Background tasks for periodic data collection"""

import asyncio
from datetime import datetime, timezone
from app.utils.logger import logger
from app.database import db, WatchHistoryDB
from app.api.plex import load_plex_config
from typing import Optional


class WatchHistorySync:
    """Background task to sync Plex watch history to database"""

    def __init__(self):
        self.running = False
        self.task: Optional[asyncio.Task] = None

    async def sync_watch_history(self):
        """Fetch watch history from Plex and store in database"""
        try:
            config = load_plex_config()
            if not config:
                logger.debug("Plex not configured, skipping watch history sync")
                return

            plex_url = config["url"].rstrip("/")
            token = config["token"]

            from plexapi.server import PlexServer

            # Set shorter timeout to avoid blocking
            try:
                plex = PlexServer(plex_url, token, timeout=15)
            except Exception as conn_error:
                logger.warning(f"Could not connect to Plex server: {conn_error}")
                return

            # Fetch history (limit to last 200 items to keep it manageable)
            logger.info("Syncing Plex watch history to database...")
            history_entries = plex.history(maxresults=200)

            # Build account lookup
            account_lookup = {}
            try:
                for account in plex.systemAccounts():
                    name = (
                        getattr(account, "name", None)
                        or getattr(account, "username", None)
                        or getattr(account, "title", None)
                        or "Unknown User"
                    )
                    account_id = str(getattr(account, "id", ""))
                    if account_id:
                        account_lookup[account_id] = name
            except Exception as exc:
                logger.warning(f"Failed to build account lookup: {exc}")

            session = db.get_session()
            new_count = 0
            updated_count = 0

            try:
                for entry in history_entries:
                    try:
                        # Extract user info
                        user_name = "Unknown"
                        user_id = None
                        email = None

                        account = getattr(entry, "account", None)
                        if account:
                            user_name = (
                                getattr(account, "title", None)
                                or getattr(account, "name", None)
                                or getattr(account, "username", None)
                                or "Unknown"
                            )
                            user_id = getattr(account, "id", None)

                        if not user_id:
                            user_id = getattr(entry, "accountID", None)

                        if user_id and str(user_id) in account_lookup:
                            user_name = account_lookup[str(user_id)]

                        # Extract media info
                        media_type = getattr(entry, "type", "unknown")
                        title = getattr(entry, "title", None)

                        # Skip entries without a title
                        if not title:
                            logger.debug(
                                f"Skipping entry without title (rating_key: {getattr(entry, 'ratingKey', 'unknown')})"
                            )
                            continue

                        grandparent_title = getattr(entry, "grandparentTitle", None)
                        parent_index = getattr(entry, "parentIndex", None)
                        index = getattr(entry, "index", None)
                        rating_key = getattr(entry, "ratingKey", None)

                        # Viewing info
                        viewed_at = getattr(entry, "viewedAt", None)
                        if not viewed_at:
                            continue  # Skip if no timestamp

                        # Check if this entry already exists
                        query = session.query(WatchHistoryDB).filter(
                            WatchHistoryDB.rating_key == rating_key,
                            WatchHistoryDB.viewed_at == viewed_at.replace(tzinfo=None),
                        )

                        # Add user_id filter only if user_id exists
                        if user_id:
                            query = query.filter(WatchHistoryDB.user_id == str(user_id))

                        existing = query.first()

                        if existing:
                            # Update view count if re-watched
                            existing.view_count = int(getattr(entry, "viewCount", 1))  # type: ignore
                            updated_count += 1
                            continue

                        # Get duration and metadata
                        duration = getattr(entry, "duration", None)
                        view_count = int(getattr(entry, "viewCount", 1))
                        view_offset = getattr(entry, "viewOffset", 0)

                        content_rating = getattr(entry, "contentRating", None)
                        studio = getattr(entry, "studio", None)
                        summary = getattr(entry, "summary", None)
                        year = getattr(entry, "year", None)
                        rating = getattr(entry, "rating", None)

                        genres = []
                        try:
                            genre_objs = getattr(entry, "genres", [])
                            genres = [g.tag for g in genre_objs] if genre_objs else []
                        except:
                            pass

                        # Fetch metadata if missing
                        if rating_key and (
                            not duration or not content_rating or not genres
                        ):
                            try:
                                media_item = plex.fetchItem(rating_key)
                                if not duration:
                                    duration = getattr(media_item, "duration", 0)
                                if not content_rating:
                                    content_rating = getattr(
                                        media_item, "contentRating", None
                                    )
                                if not studio:
                                    studio = getattr(media_item, "studio", None)
                                if not summary:
                                    summary = getattr(media_item, "summary", None)
                                if not year:
                                    year = getattr(media_item, "year", None)
                                if not rating:
                                    rating = getattr(media_item, "rating", None)
                                if not genres:
                                    try:
                                        genre_objs = getattr(media_item, "genres", [])
                                        genres = (
                                            [g.tag for g in genre_objs]
                                            if genre_objs
                                            else []
                                        )
                                    except Exception:
                                        pass
                            except Exception as fetch_error:
                                logger.debug(
                                    f"Could not fetch metadata for {rating_key}: {fetch_error}"
                                )

                        # Get thumbnail
                        thumb = None
                        if media_type == "episode":
                            thumb = getattr(entry, "grandparentThumb", None)
                        if not thumb:
                            thumb = getattr(entry, "thumb", None)
                        if thumb and not thumb.startswith("http"):
                            thumb = f"{plex_url}{thumb}?X-Plex-Token={token}"

                        # Convert to seconds
                        duration_seconds = int(duration / 1000) if duration else 0
                        view_offset_seconds = (
                            int(view_offset / 1000) if view_offset else 0
                        )

                        # Calculate progress
                        progress = 0
                        if duration_seconds > 0 and view_offset_seconds > 0:
                            progress = (view_offset_seconds / duration_seconds) * 100

                        # Create new entry
                        new_entry = WatchHistoryDB(
                            user_id=str(user_id) if user_id else None,
                            email=email,
                            username=user_name,
                            type=media_type,
                            title=title,
                            grandparent_title=grandparent_title,
                            parent_index=parent_index,
                            index=index,
                            rating_key=rating_key,
                            viewed_at=viewed_at.replace(tzinfo=None),
                            duration=duration_seconds,
                            view_offset=view_offset_seconds,
                            progress=progress,
                            view_count=view_count,
                            rating=rating,
                            year=year,
                            thumb=thumb,
                            content_rating=content_rating,
                            studio=studio,
                            summary=summary,
                            genres=",".join(genres) if genres else None,
                        )

                        session.add(new_entry)
                        new_count += 1

                    except Exception as item_error:
                        logger.error(f"Error processing history item: {item_error}")
                        continue

                session.commit()
                logger.info(
                    f"Watch history sync complete: {new_count} new, {updated_count} updated"
                )

            except Exception as db_error:
                logger.error(f"Database error during sync: {db_error}")
                session.rollback()
            finally:
                session.close()

        except Exception as e:
            logger.error(f"Error syncing watch history: {e}")

    async def start_sync_loop(self, interval: int = 900):
        """Start the background sync loop (default: every 15 minutes)"""
        self.running = True
        logger.info(f"Starting watch history sync loop (every {interval}s)")

        # Wait a bit before first sync to let the server fully start
        await asyncio.sleep(10)

        while self.running:
            try:
                await self.sync_watch_history()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                logger.info("Watch history sync loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in watch history sync loop: {e}")
                await asyncio.sleep(60)  # Wait a minute before retrying

    def stop(self):
        """Stop the sync loop"""
        self.running = False
        if self.task:
            self.task.cancel()


# Global instance
watch_history_sync = WatchHistorySync()
