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

    def get_session(self):
        """Get a new database session"""
        return self.SessionLocal()

    def close(self):
        """Close database connection"""
        self.engine.dispose()
        logger.info("Database connection closed")


# Global database instance
db = Database()
