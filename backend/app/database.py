import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Database URL - using SQLite with the specified path
DATABASE_URL = os.getenv("DATABASE_URL")

# Print the database URL for debugging
print(f"Using database at: {DATABASE_URL}")

# Configure connection args for SQLite
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {
        "timeout": 30,
        "check_same_thread": False,
        "isolation_level": None,
        "uri": True
    }

# Create engine with connection pooling and other optimizations
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    poolclass=None,
    echo=True,
    future=True
)

# For SQLite, enable WAL journal mode and set busy timeout
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-2000")  # 2MB cache
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.execute("PRAGMA busy_timeout=30000")  # 30 seconds
            cursor.close()
        except Exception as e:
            print(f"Warning: Could not set SQLite PRAGMAs: {e}")

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()