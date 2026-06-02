from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get database URL from .env file
DATABASE_URL = os.getenv("DATABASE_URL")

# Create the database engine
# Keep connections healthy and allow a slightly larger pool for background work.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
    pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
)

# Create a session factory
# A session is like a conversation with the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
# All our models will inherit from this
Base = declarative_base()

# Dependency to get database session
# This will be used in our API endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
