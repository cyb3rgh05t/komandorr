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
    """SQLAlchemy model for Plex Statistics and Configuration"""

    __tablename__ = "plex_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Configuration
    server_url = Column(String, nullable=True)
    server_token = Column(String, nullable=True)
    server_name = Column(String, nullable=True)

    # Statistics
    peak_concurrent = Column(Integer, default=0)
    total_users = Column(Integer, default=0)
    total_movies = Column(Integer, default=0)
    total_tv_shows = Column(Integer, default=0)
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

    # Status
    is_active = Column(Boolean, default=True)


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
