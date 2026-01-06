from datetime import datetime, timedelta
from typing import Optional
import re
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

# Security settings
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Bcrypt has a 72-byte limit, so we truncate if necessary
    # Apply the same truncation logic as in get_password_hash
    password_bytes = plain_password.encode('utf-8')

    if len(password_bytes) > 72:
        # Truncate to 72 bytes, but ensure we don't cut in the middle of a character
        truncated = password_bytes[:72]
        # Remove any incomplete trailing bytes (continuation bytes start with 10xxxxxx)
        while truncated and (truncated[-1] & 0b11000000) == 0b10000000:
            truncated = truncated[:-1]
        # Ensure we can decode it properly
        try:
            password = truncated.decode('utf-8')
        except UnicodeDecodeError:
            # If decoding fails, remove one more byte and try again
            truncated = truncated[:-1]
            password = truncated.decode('utf-8', errors='ignore')
    else:
        password = plain_password
    # Ensure the final password bytes are <= 72
    final_bytes = password.encode('utf-8')
    if len(final_bytes) > 72:
        # Last resort: force truncate to 72 bytes
        password = password_bytes[:72].decode('utf-8', errors='ignore')

    return pwd_context.verify(password, hashed_password)

def get_password_hash(password: str) -> str:
    # Bcrypt has a 72-byte limit, so we truncate if necessary
    # Truncate safely to avoid cutting multi-byte characters
    password_bytes = password.encode('utf-8')

    if len(password_bytes) > 72:
        # Truncate to 72 bytes, but ensure we don't cut in the middle of a character
        truncated = password_bytes[:72]
        # Remove any incomplete trailing bytes (continuation bytes start with 10xxxxxx)
        while truncated and (truncated[-1] & 0b11000000) == 0b10000000:
            truncated = truncated[:-1]
        # Ensure we can decode it properly
        try:
            password = truncated.decode('utf-8')
        except UnicodeDecodeError:
            # If decoding fails, remove one more byte and try again
            truncated = truncated[:-1]
            password = truncated.decode('utf-8', errors='ignore')
    else:
        password = password
    # Ensure the final password bytes are <= 72
    final_bytes = password.encode('utf-8')
    if len(final_bytes) > 72:
        # Last resort: force truncate to 72 bytes
        password = password_bytes[:72].decode('utf-8', errors='ignore')

    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_phone(db: Session, phone: str):
    # Only attempt to query phone if the User model has a phone attribute
    if not hasattr(models.User, 'phone'):
        return None
    return db.query(models.User).filter(models.User.phone == phone).first()

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
    # Accept numbers with optional leading + and between 7 and 15 digits
    return re.match(r"^\+?\d{7,15}$", v) is not None

def authenticate_user(db: Session, identifier: str, password: str):
    # Determine whether identifier is email or mobile, then lookup
    user = None
    if _is_email(identifier):
        user = get_user_by_email(db, identifier)
    elif _is_mobile(identifier):
        # normalize phone before lookup
        phone = _normalize_phone(identifier)
        user = get_user_by_phone(db, phone)
    else:
        # Fallback: try email first, then phone
        user = get_user_by_email(db, identifier) or get_user_by_phone(db, identifier)

    if not user:
        return False
    if not verify_password(password, user.hashed_password):
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
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

