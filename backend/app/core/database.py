"""
Database configuration and connection management
"""

import structlog
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings

logger = structlog.get_logger()

# Create the SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DatabaseManager:
    """Database connection and lifecycle management."""
    
    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal
    
    async def initialize(self):
        """Initialize database connections."""
        try:
            # Test the connection
            with self.engine.connect() as conn:
                logger.info("Database connection established successfully")
        except Exception as e:
            logger.error("Failed to connect to database", error=str(e))
            raise
    
    async def close(self):
        """Close database connections."""
        try:
            self.engine.dispose()
            logger.info("Database connections closed")
        except Exception as e:
            logger.error("Error closing database connections", error=str(e))
    
    def create_tables(self):
        """Create all database tables."""
        try:
            # Import all models here to ensure they are registered
            from app.models.user import User
            from app.models.document import Document
            
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error("Failed to create database tables", error=str(e))
            raise


# Create global database manager instance
database_manager = DatabaseManager() 