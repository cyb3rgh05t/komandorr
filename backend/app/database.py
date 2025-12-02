"""Database models and utilities for SQLite storage"""

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Float,
    DateTime,
    Integer,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
from pathlib import Path
from app.utils.logger import logger

Base = declarative_base()


class ServiceDB(Base):
    """SQLAlchemy model for Service"""

    __tablename__ = "services"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, default="offline")
    last_check = Column(DateTime, nullable=True)  # Store as naive UTC
    response_time = Column(Float, nullable=True)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    group = Column(String, nullable=True)
    enabled = Column(Boolean, default=True)

    # Traffic metrics (current state)
    bandwidth_up = Column(Float, default=0.0)
    bandwidth_down = Column(Float, default=0.0)
    total_up = Column(Float, default=0.0)
    total_down = Column(Float, default=0.0)
    max_bandwidth = Column(Float, nullable=True)  # Maximum bandwidth capacity in MB/s
    traffic_last_updated = Column(DateTime, nullable=True)  # Store as naive UTC

    # Relationships
    response_history = relationship(
        "ResponseHistoryDB", back_populates="service", cascade="all, delete-orphan"
    )
    traffic_history = relationship(
        "TrafficHistoryDB", back_populates="service", cascade="all, delete-orphan"
    )


class ResponseHistoryDB(Base):
    """SQLAlchemy model for Response Time History"""

    __tablename__ = "response_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)  # Store as naive UTC
    response_time = Column(Float, nullable=False)

    # Relationship
    service = relationship("ServiceDB", back_populates="response_history")


class TrafficHistoryDB(Base):
    """SQLAlchemy model for Traffic History"""

    __tablename__ = "traffic_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)  # Store as naive UTC
    bandwidth_up = Column(Float, nullable=False)
    bandwidth_down = Column(Float, nullable=False)
    total_up = Column(Float, nullable=False)
    total_down = Column(Float, nullable=False)

    # Relationship
    service = relationship("ServiceDB", back_populates="traffic_history")


class PlexStatsDB(Base):
    """SQLAlchemy model for Plex Statistics (peak tracking only)"""

    __tablename__ = "plex_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Statistics - only peak_concurrent is actually stored/tracked
    peak_concurrent = Column(Integer, default=0)
    last_updated = Column(DateTime, nullable=True)  # Store as naive UTC


class InviteDB(Base):
    """SQLAlchemy model for Plex Invitations"""

    __tablename__ = "invites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False, index=True)

    # Invite settings
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
    created_by = Column(String, nullable=True)  # Admin username who created it
    expires_at = Column(DateTime, nullable=True)  # When the invite expires

    # Usage settings
    usage_limit = Column(
        Integer, nullable=True
    )  # Max times it can be used (null = unlimited)
    used_count = Column(Integer, default=0)  # Times it has been used

    # Plex settings
    allow_sync = Column(Boolean, default=False)  # Allow downloads/sync
    allow_camera_upload = Column(Boolean, default=False)  # Allow camera uploads
    allow_channels = Column(Boolean, default=False)  # Allow Live TV/channels
    plex_home = Column(Boolean, default=False)  # Invite to Plex Home vs Friend

    # Library access (comma-separated library IDs or "all")
    libraries = Column(String, default="all")  # "all" or "1,2,3"

    # Status
    is_active = Column(Boolean, default=True)

    # Relationship to users who redeemed this invite
    users = relationship("PlexUserDB", back_populates="invite")


class PlexUserDB(Base):
    """SQLAlchemy model for Plex Users created via invites"""

    __tablename__ = "plex_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, nullable=True)
    plex_id = Column(String, nullable=True)  # Plex user ID
    thumb = Column(String, nullable=True)  # Plex avatar URL

    # Invite relationship
    invite_id = Column(Integer, ForeignKey("invites.id"), nullable=False)
    invite = relationship("InviteDB", back_populates="users")

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
    last_seen = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # When the user account expires

    # Status
    is_active = Column(Boolean, default=True)


class WatchHistoryDB(Base):
    """SQLAlchemy model for Plex Watch History"""

    __tablename__ = "watch_history"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # User info
    user_id = Column(String, nullable=True, index=True)  # Plex user ID
    email = Column(String, nullable=True, index=True)
    username = Column(String, nullable=True)

    # Media info
    type = Column(String, nullable=False)  # movie, episode, track
    title = Column(String, nullable=False)
    grandparent_title = Column(String, nullable=True)  # Series name for episodes
    parent_index = Column(Integer, nullable=True)  # Season number
    index = Column(Integer, nullable=True)  # Episode number
    rating_key = Column(String, nullable=True, index=True)  # Plex rating key

    # Viewing info
    viewed_at = Column(DateTime, nullable=False, index=True)  # When it was watched
    duration = Column(Integer, nullable=False)  # Duration in seconds
    view_offset = Column(Integer, default=0)  # Watch position in seconds
    progress = Column(Float, default=0.0)  # Progress percentage
    view_count = Column(Integer, default=1)  # Number of times watched

    # Metadata
    rating = Column(Float, nullable=True)  # Rating (e.g., 8.5)
    year = Column(Integer, nullable=True)  # Release year
    thumb = Column(String, nullable=True)  # Thumbnail URL
    content_rating = Column(String, nullable=True)  # PG-13, TV-MA, etc.
    studio = Column(String, nullable=True)  # Studio/network
    summary = Column(String, nullable=True)  # Description
    genres = Column(String, nullable=True)  # Comma-separated genres

    # Timestamps
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Add unique constraint to prevent duplicate entries
    # This is based on user + rating_key + viewed_at
    __table_args__ = (
        UniqueConstraint(
            "user_id", "rating_key", "viewed_at", name="_watch_history_uc"
        ),
    )


class Database:
    """Database connection and session management"""

    def __init__(self, db_path: str = "data/komandorr.db"):
        """Initialize database connection"""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        # Create engine with SQLite
        self.engine = create_engine(
            f"sqlite:///{self.db_path}",
            echo=False,  # Set to True for SQL logging
            connect_args={"check_same_thread": False},  # Needed for SQLite
        )

        # Create session factory
        self.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )

        # Create tables
        self._create_tables()

    def _create_tables(self):
        """Create all tables if they don't exist"""
        Base.metadata.create_all(bind=self.engine)
        logger.info(f"Database initialized at {self.db_path}")

        # Run migrations for existing databases
        self._migrate_database()

    def _migrate_database(self):
        """Apply database migrations for schema updates"""
        try:
            import sqlite3

            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()

            # Check if new columns exist in services table
            cursor.execute("PRAGMA table_info(services)")
            service_columns = [row[1] for row in cursor.fetchall()]

            # Add max_bandwidth column if it doesn't exist
            if "max_bandwidth" not in service_columns:
                logger.info("Adding max_bandwidth column to services table")
                cursor.execute("ALTER TABLE services ADD COLUMN max_bandwidth REAL")

            # Check if new columns exist in plex_stats table
            cursor.execute("PRAGMA table_info(plex_stats)")
            columns = [row[1] for row in cursor.fetchall()]

            # Add total_users column if it doesn't exist
            if "total_users" not in columns:
                logger.info("Adding total_users column to plex_stats table")
                cursor.execute(
                    "ALTER TABLE plex_stats ADD COLUMN total_users INTEGER DEFAULT 0"
                )

            # Add total_movies column if it doesn't exist
            if "total_movies" not in columns:
                logger.info("Adding total_movies column to plex_stats table")
                cursor.execute(
                    "ALTER TABLE plex_stats ADD COLUMN total_movies INTEGER DEFAULT 0"
                )

            # Add total_tv_shows column if it doesn't exist
            if "total_tv_shows" not in columns:
                logger.info("Adding total_tv_shows column to plex_stats table")
                cursor.execute(
                    "ALTER TABLE plex_stats ADD COLUMN total_tv_shows INTEGER DEFAULT 0"
                )

            # Check if new columns exist in plex_users table
            cursor.execute("PRAGMA table_info(plex_users)")
            plex_users_columns = [row[1] for row in cursor.fetchall()]

            # Add expires_at column if it doesn't exist
            if "expires_at" not in plex_users_columns:
                logger.info("Adding expires_at column to plex_users table")
                cursor.execute("ALTER TABLE plex_users ADD COLUMN expires_at DATETIME")

            # Add thumb column if it doesn't exist
            if "thumb" not in plex_users_columns:
                logger.info("Adding thumb column to plex_users table")
                cursor.execute("ALTER TABLE plex_users ADD COLUMN thumb TEXT")

            # Check if watch_history table exists
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='watch_history'"
            )
            if not cursor.fetchone():
                logger.info("watch_history table doesn't exist, it will be created")

            conn.commit()
            conn.close()
            logger.info("Database migration completed successfully")
        except Exception as e:
            logger.error(f"Error during database migration: {e}")

    def get_session(self):
        """Get a new database session"""
        return self.SessionLocal()

    def close(self):
        """Close database connection"""
        self.engine.dispose()
        logger.info("Database connection closed")


# Global database instance
db = Database()
