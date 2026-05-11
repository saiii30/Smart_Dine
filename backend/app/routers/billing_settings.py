from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app import models
from app.database import get_db
 
router = APIRouter(tags=["Billing Settings"])
 
# Pydantic models for request/response
class BillingSettingsCreate(BaseModel):
    agency_id: str
    company_id: Optional[str] = None
    vehicle_brand: str
    vehicle_name: str
    vehicle_type: str
    fuel_type: str
    seating_capacity: int
    price: float = Field(..., gt=0)
 
    @field_validator("vehicle_brand", "vehicle_name", "vehicle_type", "fuel_type")
    def validate_strings(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()
 
class BillingSettingsUpdate(BaseModel):
    vehicle_brand: Optional[str] = None
    vehicle_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    fuel_type: Optional[str] = None
    seating_capacity: Optional[int] = None
    price: Optional[float] = None  # Allow 0, will validate in endpoint
    company_id: Optional[str] = None
 
    @field_validator("vehicle_brand", "vehicle_name", "vehicle_type", "fuel_type")
    def validate_strings(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError("Field cannot be empty")
        return v.strip() if v else v
 
class BillingSettingsResponse(BaseModel):
    id: str
    agency_id: str
    company_id: Optional[str] = None
    vehicle_brand: str
    vehicle_name: str
    vehicle_type: str
    fuel_type: str
    seating_capacity: int
    price: float = Field(..., gt=0)
    created_at: datetime
    updated_at: Optional[datetime] = None
 
    @field_validator("vehicle_brand", "vehicle_name", "vehicle_type", "fuel_type")
    def validate_strings(cls, v):
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()
 
    class Config:
        from_attributes = True
 
# =========================
# POST - CREATE BILLING SETTING
# =========================
@router.post("/billing-settings", response_model=BillingSettingsResponse)
def create_billing_setting(
    agency_id: str = Form(...),
    company_id: Optional[str] = Form(None),
    vehicle_brand: str = Form(...),
    vehicle_name: str = Form(...),
    vehicle_type: str = Form(...),
    fuel_type: str = Form(...),
    seating_capacity: int = Form(...),
    price: float = Form(...),
    db: Session = Depends(get_db)
):
    """
    Create a new billing setting for a vehicle
    """
    try:
        # Verify agency exists
        agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
        if not agency:
            raise HTTPException(404, "Agency not found")
       
        # Convert empty string to None for proper NULL handling
        if company_id is not None and not company_id.strip():
            company_id = None
       
        # If company_id provided (not None), verify company exists and belongs to agency
        if company_id:
            company = db.query(models.Company).filter(
                models.Company.id == company_id,
                models.Company.agency_id == agency_id
            ).first()
            if not company:
                raise HTTPException(404, "Company not found or doesn't belong to this agency")
       
        # Check if billing setting already exists for this vehicle brand
        query = db.query(models.BillingSettings).filter(
            models.BillingSettings.agency_id == agency_id,
            models.BillingSettings.vehicle_brand == vehicle_brand
        )
       
        # Handle company_id filter correctly (NULL vs specific company)
        if company_id:
            query = query.filter(models.BillingSettings.company_id == company_id)
        else:
            query = query.filter(models.BillingSettings.company_id.is_(None))
           
        existing_setting = query.first()
       
        if existing_setting:
            raise HTTPException(400, f"Billing setting for vehicle brand '{vehicle_brand}' already exists")
       
        # Create new billing setting
        new_setting = models.BillingSettings(
            agency_id=agency_id,
            company_id=company_id,
            vehicle_brand=vehicle_brand,
            vehicle_name=vehicle_name,
            vehicle_type=vehicle_type,
            fuel_type=fuel_type,
            seating_capacity=seating_capacity,
            price=price
        )
       
        db.add(new_setting)
        db.commit()
        db.refresh(new_setting)
       
        return new_setting
       
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Database error: {str(e)}")
 
# =========================
# GET - GET ALL BILLING SETTINGS
# =========================
@router.get("/billing-settings", response_model=List[BillingSettingsResponse])
def get_billing_settings(
    agency_id: Optional[str] = None,
    company_id: Optional[str] = None,
    vehicle_brand: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get billing settings with optional filters
    """
    try:
        query = db.query(models.BillingSettings)
       
        if agency_id:
            query = query.filter(models.BillingSettings.agency_id == agency_id)
        if company_id:
            query = query.filter(models.BillingSettings.company_id == company_id)
        if vehicle_brand:
            query = query.filter(models.BillingSettings.vehicle_brand.ilike(f"%{vehicle_brand}%"))
       
        settings = query.limit(limit).all()
       
        return settings
       
    except Exception as e:
        raise HTTPException(500, f"Error retrieving billing settings: {str(e)}")
 
# =========================
# GET - GET BILLING SETTINGS BY AGENCY
# =========================
@router.get("/billing-settings/agency/{agency_id}", response_model=List[BillingSettingsResponse])
def get_billing_settings_by_agency(
    agency_id: str,
    company_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all billing settings for a specific agency
    """
    try:
        # Verify agency exists
        agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
        if not agency:
            raise HTTPException(404, "Agency not found")
       
        query = db.query(models.BillingSettings).filter(models.BillingSettings.agency_id == agency_id)
       
        if company_id:
            query = query.filter(models.BillingSettings.company_id == company_id)
       
        settings = query.all()
       
        return settings
       
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error retrieving billing settings: {str(e)}")
 
# =========================
# GET - GET BILLING SETTING BY ID
# =========================
@router.get("/billing-settings/{setting_id}", response_model=BillingSettingsResponse)
def get_billing_setting(setting_id: str, db: Session = Depends(get_db)):
    """
    Get a specific billing setting by ID
    """
    try:
        setting = db.query(models.BillingSettings).filter(models.BillingSettings.id == setting_id).first()
       
        if not setting:
            raise HTTPException(404, "Billing setting not found")
       
        return setting
       
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error retrieving billing setting: {str(e)}")
 
# =========================
# PUT - UPDATE BILLING SETTING
# =========================
@router.put("/billing-settings/{setting_id}", response_model=BillingSettingsResponse)
def update_billing_setting(
    setting_id: str,
    agency_id: str = Form(...),  # Required for ownership verification
    vehicle_brand: Optional[str] = Form(None),
    vehicle_name: Optional[str] = Form(None),
    vehicle_type: Optional[str] = Form(None),
    fuel_type: Optional[str] = Form(None),
    seating_capacity: Optional[int] = Form(None),
    price: Optional[float] = Form(None),
    company_id: Optional[str] = Form(None),  # Optional - can update company association
    db: Session = Depends(get_db)
):
    """
    Update a billing setting using setting_id and agency_id.
   
    Only provide the fields you want to update:
    - vehicle_brand (optional)
    - vehicle_name (optional)
    - vehicle_type (optional)
    - fuel_type (optional)
    - seating_capacity (optional)
    - price (optional)
    - company_id (optional - can be NULL for agency-level)
   
    agency_id is required for security verification.
    """
    try:
        # Find the billing setting
        setting = db.query(models.BillingSettings).filter(models.BillingSettings.id == setting_id).first()
       
        if not setting:
            raise HTTPException(404, "Billing setting not found")
       
        # Verify agency ownership (agency_id is now required)
        if setting.agency_id != agency_id:
            raise HTTPException(403, "You don't have permission to update this billing setting")
       
        # If company_id provided and different from current, verify it belongs to same agency
        if company_id and company_id.strip() and company_id != setting.company_id:
            company = db.query(models.Company).filter(
                models.Company.id == company_id,
                models.Company.agency_id == setting.agency_id
            ).first()
            if not company:
                raise HTTPException(404, "Company not found or doesn't belong to this agency")
            setting.company_id = company_id
        # If company_id is empty or None, set to NULL for agency-level billing setting
        elif company_id is not None and not company_id.strip():
            setting.company_id = None
       
        # Update only provided fields
        if vehicle_brand:
            # Check for duplicate vehicle brand
            query = db.query(models.BillingSettings).filter(
                models.BillingSettings.agency_id == setting.agency_id,
                models.BillingSettings.vehicle_brand == vehicle_brand,
                models.BillingSettings.id != setting_id
            )
           
            # Handle company_id filter correctly (NULL vs specific company)
            if setting.company_id:
                query = query.filter(models.BillingSettings.company_id == setting.company_id)
            else:
                query = query.filter(models.BillingSettings.company_id.is_(None))
               
            existing_setting = query.first()
           
            if existing_setting:
                raise HTTPException(400, f"Billing setting for vehicle brand '{vehicle_brand}' already exists")
           
            setting.vehicle_brand = vehicle_brand
       
        if vehicle_name:
            setting.vehicle_name = vehicle_name
       
        if vehicle_type:
            setting.vehicle_type = vehicle_type
       
        if fuel_type:
            setting.fuel_type = fuel_type
       
        if seating_capacity is not None:
            setting.seating_capacity = seating_capacity
       
        if price is not None:
            if price < 0:
                raise HTTPException(400, "Price cannot be negative")
            if price == 0:
                raise HTTPException(400, "Price cannot be zero")
            setting.price = price
       
        db.commit()
        db.refresh(setting)
       
        return setting
       
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error updating billing setting: {str(e)}")
 
# =========================
# DELETE - DELETE BILLING SETTING
# =========================
@router.delete("/billing-settings/{setting_id}")
def delete_billing_setting(
    setting_id: str,
    agency_id: Optional[str] = Form(None),  # For verification
    db: Session = Depends(get_db)
):
    """
    Delete a billing setting
    """
    try:
        # Find the billing setting
        setting = db.query(models.BillingSettings).filter(models.BillingSettings.id == setting_id).first()
       
        if not setting:
            raise HTTPException(404, "Billing setting not found")
       
        # If agency_id provided, verify ownership
        if agency_id and setting.agency_id != agency_id:
            raise HTTPException(403, "You don't have permission to delete this billing setting")
       
        db.delete(setting)
        db.commit()
       
        return {
            "status": "success",
            "message": "Billing setting deleted successfully",
            "setting_id": setting_id
        }
       
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error deleting billing setting: {str(e)}")
 
 