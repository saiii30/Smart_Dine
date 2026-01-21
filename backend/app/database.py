from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Database URL - using SQLite for development with WAL mode enabled
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tms.db?mode=rwc&timeout=30&check_same_thread=false")

# Configure connection args for SQLite
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {
        "timeout": 30,  # 30 seconds timeout
        "check_same_thread": False,
        "isolation_level": None,  # Let SQLite handle transactions
        "uri": True  # Enable URI format for connection string
    }

# Create engine with connection pooling and other optimizations
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    poolclass=None,  # Don't use connection pooling with SQLite
    echo=True,      # Enable SQL query logging for debugging
    future=True     # Use SQLAlchemy 2.0 style APIs
)

# For SQLite, enable WAL journal mode and set busy timeout on each new connection
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            # Enable WAL mode for better concurrency
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=30000")  # 30 seconds
            cursor.execute("PRAGMA cache_size=-2000")    # 2MB cache
            cursor.execute("PRAGMA foreign_keys=OFF")     # Disable foreign key constraints to allow SQLAlchemy to handle cascades
            cursor.execute("PRAGMA temp_store=MEMORY")   # Store temp tables in memory
            cursor.execute("PRAGMA journal_size_limit=32768")  # 32MB WAL file limit
        except Exception as e:
            print(f"Error setting SQLite PRAGMAs: {e}")
        finally:
            if cursor:
                cursor.close()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()  # Ensure changes are committed
    except Exception:
        db.rollback()  # Rollback on error
        raise
    finally:
        db.close()  # Always close the session