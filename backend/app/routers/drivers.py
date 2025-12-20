from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()

@router.post("/", response_model=schemas.DriverResponse, status_code=status.HTTP_201_CREATED)
def create_driver(
    driver: schemas.DriverCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check if license number already exists
    db_driver = db.query(models.Driver).filter(
        models.Driver.license_number == driver.license_number
    ).first()
    if db_driver:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License number already exists"
        )
    
    db_driver = models.Driver(**driver.dict(), owner_id=current_user.id)
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver

@router.get("/", response_model=List[schemas.DriverResponse])
def read_drivers(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    drivers = db.query(models.Driver).filter(
        models.Driver.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    return drivers

@router.get("/{driver_id}", response_model=schemas.DriverResponse)
def read_driver(
    driver_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id,
        models.Driver.owner_id == current_user.id
    ).first()
    if db_driver is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    return db_driver

@router.put("/{driver_id}", response_model=schemas.DriverResponse)
def update_driver(
    driver_id: int,
    driver_update: schemas.DriverUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id,
        models.Driver.owner_id == current_user.id
    ).first()
    if db_driver is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    
    update_data = driver_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_driver, field, value)
    
    db.commit()
    db.refresh(db_driver)
    return db_driver

@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id,
        models.Driver.owner_id == current_user.id
    ).first()
    if db_driver is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    db.delete(db_driver)
    db.commit()
    return None

