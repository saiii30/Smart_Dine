from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models
from pydantic import BaseModel
 
router = APIRouter(tags=["Vehicle List"])
 
 
# =========================
# RESPONSE SCHEMA
# =========================
class VehicleListResponse(BaseModel):
    id: int
    vehicle_brand: str
    vehicle_name: str
    vehicle_type: str
    fuel_type: str
    seating_capacity: int
 
    class Config:
        from_attributes = True
 
 
# =========================
# GET ALL VEHICLES
# =========================
@router.get("/vehicle-list", response_model=List[VehicleListResponse])
def get_vehicle_list(db: Session = Depends(get_db)):
    """
    Get all vehicle list data
    """
    try:
        vehicles = db.query(models.VehicleList).all()
 
        return vehicles
 
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching vehicle list: {str(e)}"
        )
 
 