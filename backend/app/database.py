from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Database URL - using SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tms.db")

connect_args = {}
if "sqlite" in DATABASE_URL:
    # allow connections from multiple threads and increase busy timeout
    connect_args = {"check_same_thread": False, "timeout": 30}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

# For SQLite, enable WAL journal mode and set busy timeout on each new connection
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            # Write-ahead logging improves concurrent read/write behavior
            cursor.execute("PRAGMA journal_mode=WAL;")
            # busy_timeout in milliseconds
            cursor.execute("PRAGMA busy_timeout=30000;")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

