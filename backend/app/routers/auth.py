from datetime import datetime, timedelta
import json
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List
from pydantic import BaseModel, EmailStr
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()
from uuid import uuid4 
@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        # Validate input data
        if not user.email and not user.contact_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either email or contact number is required"
            )
        
        # Check if user already exists with the same email or phone
        existing_user = db.query(models.User).filter(
            (models.User.email == user.email) | 
            (models.User.contact_number == user.contact_number)
        ).first()
        
        if existing_user:
            if existing_user.email and existing_user.email == user.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            if existing_user.contact_number and existing_user.contact_number == user.contact_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )
        
        # Check if agency exists
        try:
            from uuid import UUID
            agency_uuid = UUID(user.agency_id)
            db_agency = db.query(models.Agency).filter(
                models.Agency.id == str(agency_uuid)
            ).first()
            
            if not db_agency:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Agency with ID {user.agency_id} not found"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid agency ID format. Must be a valid UUID."
            )
        
        # Create new user with hashed password
        hashed_password = auth.get_password_hash(user.password)
        db_user = models.User(
            id=str(uuid4()),
            email=user.email,
            password_hash=hashed_password,
            name=user.name,
            contact_number=user.contact_number,
            agency_id=user.agency_id,
            role=user.role,
            is_active=True
        )
        
        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            # Get the agency name for the response
            agency = db.query(models.Agency).filter(models.Agency.id == user.agency_id).first()
            
            # Return the user data with all required fields
            return {
                "id": db_user.id,
                "name": db_user.name,
                "email": db_user.email,
                "contact_number": db_user.contact_number,
                "role": db_user.role.value if hasattr(db_user.role, 'value') else db_user.role,
                "is_active": db_user.is_active,
                "created_at": db_user.created_at,
                "updated_at": db_user.updated_at,
                "last_login": db_user.last_login,
                "agency_name": agency.agency_name if agency else None
            }
            
        except Exception as db_error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user: {str(db_error)}"
            )
            
    except HTTPException as http_exc:
        if db.in_transaction():
            db.rollback()
        raise http_exc
        
    except Exception as e:
        if db.in_transaction():
            db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Unexpected error during registration: {error_details}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration. Please try again."
        )
class LoginRequest(BaseModel):
    username: str  # Can be email or phone
    password: str
    agency_id: str  # Agency ID from dropdown

@router.post("/login", response_model=schemas.Token)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    # First try to authenticate with the provided credentials
    user = auth.authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify user belongs to the selected agency
    if user.agency_id and str(user.agency_id) != login_data.agency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to the selected agency"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login time
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Generate access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email if user.email else user.contact_number},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": schemas.UserResponse.from_orm(user)
    }

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

