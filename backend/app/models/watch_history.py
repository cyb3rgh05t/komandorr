"""Watch history model for Plex watch history tracking"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class WatchHistoryItem(BaseModel):
    """Plex watch history item"""

    id: int
    user_id: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    type: str  # movie, episode, track
    title: str
    grandparent_title: Optional[str] = None
    parent_index: Optional[int] = None
    index: Optional[int] = None
    viewed_at: datetime
    duration: int  # seconds
    view_offset: int  # seconds
    progress: float  # percentage
    view_count: int
    rating: Optional[float] = None
    year: Optional[int] = None
    thumb: Optional[str] = None
    content_rating: Optional[str] = None
    studio: Optional[str] = None
    summary: Optional[str] = None
    genres: List[str] = []
    rating_key: Optional[str] = None

    class Config:
        from_attributes = True
