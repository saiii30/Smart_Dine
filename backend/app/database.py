import os
from pathlib import Path
from sqlalchemy import create_engine, exc
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv, find_dotenv

# Load environment variables from .env file with robust path handling
def load_environment():
    """
    Load environment variables with multiple fallback strategies.
    """
    # Strategy 1: Use explicit path from environment variable
    explicit_env_path = os.getenv("ENV_FILE_PATH")
    if explicit_env_path and Path(explicit_env_path).exists():
        load_dotenv(dotenv_path=explicit_env_path)
        if os.getenv("DEBUG", "false").lower() == "true":
            print(f"Loaded environment from: {explicit_env_path}")
        return
    
    # Strategy 2: Use find_dotenv to search for .env file
    env_file = find_dotenv()
    if env_file:
        load_dotenv(dotenv_path=env_file)
        if os.getenv("DEBUG", "false").lower() == "true":
            print(f"Loaded environment from: {env_file}")
        return
    
    # Strategy 3: Use relative path as fallback
    project_root = Path(__file__).parent.parent
    env_path = project_root / '.env'
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        if os.getenv("DEBUG", "false").lower() == "true":
            print(f"Loaded environment from: {env_path}")
        return
    
    # Warning if no .env file found
    print("WARNING: No .env file found. Using system environment variables only.")

# Load environment variables
try:
    load_environment()
except Exception as e:
    print(f"ERROR loading environment: {e}")
    # Continue with system environment variables

# Database URL — PostgreSQL in production; local SQLite fallback for demos
DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./smartdine.db"

# Print database info for debugging (without credentials)
if os.getenv("DEBUG", "false").lower() == "true":
    # Mask credentials in debug output
    masked_url = DATABASE_URL
    if "@" in masked_url:
        # Replace credentials with ***
        parts = masked_url.split("@")
        if len(parts) >= 2:
            cred_part = parts[0]
            if "://" in cred_part:
                protocol_part = cred_part.split("://")[0]
                masked_url = f"{protocol_part}://***@{parts[1]}"
    print(f"Using database at: {masked_url}")

# Database configuration from environment variables with error handling
def get_database_config():
    """
    Get database configuration with validation and error handling.
    Returns: dict with validated configuration
    """
    config = {}
    
    try:
        config['pool_size'] = int(os.getenv("DB_POOL_SIZE", "20"))
        if config['pool_size'] < 1 or config['pool_size'] > 100:
            raise ValueError("DB_POOL_SIZE must be between 1 and 100")
    except ValueError as e:
        print(f"WARNING: Invalid DB_POOL_SIZE, using default. Error: {e}")
        config['pool_size'] = 20
    
    try:
        config['max_overflow'] = int(os.getenv("DB_MAX_OVERFLOW", "30"))
        if config['max_overflow'] < 0 or config['max_overflow'] > 100:
            raise ValueError("DB_MAX_OVERFLOW must be between 0 and 100")
    except ValueError as e:
        print(f"WARNING: Invalid DB_MAX_OVERFLOW, using default. Error: {e}")
        config['max_overflow'] = 30
    
    try:
        config['pool_recycle'] = int(os.getenv("DB_POOL_RECYCLE", "3600"))
        if config['pool_recycle'] < 300:  # Minimum 5 minutes
            raise ValueError("DB_POOL_RECYCLE must be at least 300 seconds")
    except ValueError as e:
        print(f"WARNING: Invalid DB_POOL_RECYCLE, using default. Error: {e}")
        config['pool_recycle'] = 3600
    
    config['db_echo'] = os.getenv("DB_ECHO", "false").lower() == "true"
    
    return config

# Get validated database configuration
db_config = get_database_config()

# Create engine with PostgreSQL optimizations and error handling
try:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
            echo=db_config["db_echo"],
            future=True,
        )
    else:
        engine = create_engine(
            DATABASE_URL,
            pool_size=db_config["pool_size"],
            max_overflow=db_config["max_overflow"],
            pool_pre_ping=True,
            pool_recycle=db_config["pool_recycle"],
            echo=db_config["db_echo"],
            future=True,
        )
    
    if os.getenv("DEBUG", "false").lower() == "true":
        print(f"Database engine created successfully with pool_size={db_config['pool_size']}")
        
except exc.ArgumentError as e:
    error_msg = f"Invalid database URL: {e}"
    print(f"CRITICAL ERROR: {error_msg}")
    raise ValueError(f"Database configuration error: {error_msg}")
except exc.DBAPIError as e:
    error_msg = f"Database connection error: {e}"
    print(f"CRITICAL ERROR: {error_msg}")
    raise ValueError(f"Database connection error: {error_msg}")
except Exception as e:
    error_msg = f"Unexpected database error: {e}"
    print(f"CRITICAL ERROR: {error_msg}")
    raise ValueError(f"Database initialization error: {error_msg}")

# Create session factory with error handling
try:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    if os.getenv("DEBUG", "false").lower() == "true":
        print("Session factory created successfully")
except Exception as e:
    error_msg = f"Failed to create session factory: {e}"
    print(f"CRITICAL ERROR: {error_msg}")
    raise ValueError(f"Session factory error: {error_msg}")

# Base class for models
Base = declarative_base()

# Database connection validation
def test_database_connection():
    """
    Test database connectivity and return connection status.
    Returns: (is_connected: bool, message: str)
    """
    try:
        with engine.connect() as connection:
            # Simple test query
            result = connection.execute("SELECT 1")
            if os.getenv("DEBUG", "false").lower() == "true":
                print("Database connection test: SUCCESS")
            return True, "Database connection successful"
    except Exception as e:
        error_msg = f"Database connection failed: {str(e)}"
        print(f"ERROR: {error_msg}")
        return False, error_msg

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()