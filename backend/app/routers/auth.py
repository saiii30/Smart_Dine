from datetime import timedelta
import json
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    
    # Check if user already exists
    db_user = auth.get_user_by_email(db, email=user.email)

    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        company_name=user.company_name,
        role=models.UserRole.TRAVEL_PROVIDER
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@router.post("/test-register")
def test_register(data: dict):
    """Test endpoint to see what data is being received"""
    try:
        user = schemas.UserCreate(**data)
        return {"message": "Validation passed", "user": user.dict()}
    except Exception as e:
        return {"error": str(e), "data_received": data}


# Public endpoint for login dropdown: returns all agencies (id and agency_name)
@router.get("/agencies", response_model=List[schemas.AgencyDropdown])
def public_agencies(db: Session = Depends(get_db)):
    agencies = db.query(models.Agency).all()
    # Return minimal fields for dropdown
    return [{"id": a.id, "agency_name": a.agency_name} for a in agencies]

