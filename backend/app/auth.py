from datetime import datetime, timedelta, timezone
from typing import Optional
import os
import re
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Bcrypt has a 72-byte limit, so truncate if necessary
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    else:
        password = plain_password

    return pwd_context.verify(password, hashed_password)

def get_password_hash(password: str) -> str:
    # Bcrypt has a 72-byte limit, so truncate if necessary
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    else:
        password = password

    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    current_time = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = current_time + expires_delta
    else:
        expire = current_time + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire.timestamp(), 
        "type": "access",
        "iat": current_time.timestamp()
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    current_time = datetime.now(timezone.utc)
    expire = current_time + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire.timestamp(), "type": "refresh", "iat": current_time.timestamp()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength according to security policy.
    Returns (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if len(password) > 128:
        return False, "Password must not exceed 128 characters"
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    if not has_upper:
        return False, "Password must contain at least one uppercase letter"
    
    if not has_lower:
        return False, "Password must contain at least one lowercase letter"
    
    if not has_digit:
        return False, "Password must contain at least one digit"
    
    if not has_special:
        return False, "Password must contain at least one special character"
    
    # Check for common weak patterns
    if password.lower() in ["password", "12345678", "qwerty123", "admin123"]:
        return False, "Password is too common and weak"
    
    # Check for sequential characters
    if any(ord(password[i]) + 1 == ord(password[i + 1]) and 
           ord(password[i + 1]) + 1 == ord(password[i + 2]) 
           for i in range(len(password) - 2)):
        return False, "Password cannot contain sequential characters"
    
    return True, "Password meets security requirements"

def validate_jwt_payload(payload: dict, expected_type: str = "access") -> tuple[bool, str]:
    """
    Validate JWT payload contents beyond basic checks.
    Returns (is_valid, error_message)
    """
    # Check required fields
    required_fields = ["sub", "exp", "type", "iat"]
    for field in required_fields:
        if field not in payload:
            return False, f"Missing required field: {field}"
    
    # Validate token type
    if payload.get("type") != expected_type:
        return False, f"Invalid token type. Expected: {expected_type}, Got: {payload.get('type')}"
    
    # Validate user ID format
    user_id = payload.get("sub")
    if not user_id or not isinstance(user_id, str):
        return False, "Invalid user ID in token"
    
    # Check if token is not from the future (clock skew protection)
    iat = payload.get("iat")
    if iat and isinstance(iat, (int, float)):
        current_time = datetime.now(timezone.utc).timestamp()
        if iat > current_time + 300:  # Allow 5 minutes clock skew
            return False, "Token issued in the future"
    
    return True, "Token payload is valid"

def verify_refresh_token(token: str, db: Session):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Enhanced payload validation
        is_valid, error_msg = validate_jwt_payload(payload, "refresh")
        if not is_valid:
            raise credentials_exception
        
        user_id = payload.get("sub")
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_phone(db: Session, phone: str):
    return db.query(models.User).filter(models.User.contact_number == phone).first()

def _normalize_phone(value: str) -> str:
    # Remove spaces, dashes and parentheses
    return re.sub(r"[\s\-()]+", "", value)

def _is_email(value: str) -> bool:
    # Simple email detection
    if not value or '@' not in value:
        return False
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value) is not None

def _is_mobile(value: str) -> bool:
    if not value:
        return False
    v = _normalize_phone(value)
    
    # Indian mobile numbers: +91 followed by 10 digits (starting with 6-9)
    if v.startswith('+91'):
        return re.match(r'^\+91[6-9]\d{9}$', v) is not None
    
    # Indian numbers without country code: 10 digits (starting with 6-9)
    if len(v) == 10 and v[0] in '6789':
        return True
    
    # International numbers: + followed by country code and number, total 10-15 digits
    if v.startswith('+'):
        return re.match(r'^\+\d{10,15}$', v) is not None
    
    # Fallback: 10-15 digit numbers (less strict)
    return re.match(r'^\d{10,15}$', v) is not None

def authenticate_user(db: Session, username: str, password: str, login_type: str = "auto"):
    """
    Authenticate user with explicit login type or auto-detection.
    
    Args:
        db: Database session
        username: Email or phone number
        password: User password
        login_type: "email", "phone", or "auto" (default)
    
    Returns:
        User object if authentication successful, False otherwise
    """
    user = None
    
    if login_type == "email":
        if not _is_email(username):
            return False
        user = get_user_by_email(db, username)
    
    elif login_type == "phone":
        if not _is_mobile(username):
            return False
        phone = _normalize_phone(username)
        user = get_user_by_phone(db, phone)
    
    else:  # auto-detection
        if _is_email(username):
            user = get_user_by_email(db, username)
        elif _is_mobile(username):
            phone = _normalize_phone(username)
            user = get_user_by_phone(db, phone)
        else:
            # Invalid format - don't try fallback for security
            return False

    if not user:
        return False
    
    if not verify_password(password, user.password_hash):
        return False

    return user



async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Enhanced payload validation
        is_valid, error_msg = validate_jwt_payload(payload, "access")
        if not is_valid:
            raise credentials_exception
        
        user_id = payload.get("sub")
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user




async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

