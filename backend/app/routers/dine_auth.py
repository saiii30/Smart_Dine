from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    get_user_by_email,
)
from app.database import get_db

router = APIRouter()

@router.post(
    "/register",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED
)
def register(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # 1. Only ADMIN can create users
    if current_user.role != models.DineUserRole.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="Only ADMIN can register users"
        )

    # 2. Check duplicate email
    existing_user = get_user_by_email(db, str(payload.email).lower())
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # 3. Role MUST come from request (admin decides)
    role = payload.role.upper()

    allowed_roles = {r.value for r in models.DineUserRole}
    if role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid role"
        )

    # 4. Create user
    user = models.User(
        email=str(payload.email).lower(),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=role,
        branch_id=payload.branch_id
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

@router.post("/token", response_model=schemas.Token)
def login_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.id})
    return schemas.Token(access_token=token)


@router.post("/login", response_model=schemas.Token)
def login_json(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, str(payload.email), payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return schemas.Token(access_token=create_access_token({"sub": user.id}))


@router.get("/me", response_model=schemas.UserOut)
def me(current: models.User = Depends(get_current_active_user)):
    return current
