from typing import List, Optional, Dict, Any
from datetime import datetime, time, date
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from pathlib import Path
import shutil
import os
from sqlalchemy import and_, or_, func
import traceback
from datetime import timedelta

import logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

from .. import models, schemas, auth
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter()

# Configure upload directory
UPLOAD_DIR = Path("uploads/vehicles")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def save_upload_file(file: UploadFile, vehicle_id: str, file_type: str) -> str:
    """Save an uploaded file and return the relative path"""
    if not file or not file.filename:
        return None
        
    file_ext = Path(file.filename).suffix.lower()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{file_type}_{vehicle_id}_{timestamp}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Ensure the directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save the file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return str(file_path.relative_to("uploads"))

def delete_old_file(file_path: str) -> None:
    """Delete an old file if it exists"""
    if file_path:
        full_path = Path("uploads") / file_path
        try:
            if full_path.exists():
                full_path.unlink()
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")

def sanitize_vehicle_obj(vehicle: Any) -> Any:
    """Helper to sanitize vehicle object fields for response validation"""
    if vehicle and hasattr(vehicle, 'seating_capacity') and isinstance(vehicle.seating_capacity, str):
        try:
            val = vehicle.seating_capacity
            if '+' in val:
                # Handle "4+1" format -> 5
                vehicle.seating_capacity = sum(int(x.strip()) for x in val.split('+') if x.strip().isdigit())
            else:
                vehicle.seating_capacity = int(val)
        except (ValueError, TypeError):
            pass
    return vehicle

def process_vehicle_data(form_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process and validate form data for vehicle creation/update"""
    # Filter out UploadFile objects and empty values
    exclude_fields = {'insurance_copy', 'policy_certificate', 'registration_certificate', 'pollution_certificate'}
    data = {
        k: v for k, v in form_data.items() 
        if v not in (None, '') and k not in exclude_fields and not isinstance(v, UploadFile)
    }
    
    # Convert string dates to datetime objects
    date_fields = ['insurance_date', 'insurance_expiry', 'registration_date', 
                  'registration_expiry', 'puc_expiry', 'insurance_renewal_date', 'service_expiry']
    
    for field in date_fields:
        if field in data and isinstance(data[field], str):
            try:
                # Handle YYYY-MM-DD format from frontend
                if len(data[field]) == 10 and data[field].count('-') == 2:
                    data[field] = datetime.strptime(data[field], '%Y-%m-%d')
                else:
                    data[field] = datetime.fromisoformat(data[field].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                data[field] = None
    
    # Convert string booleans to actual booleans
    bool_fields = ['fire_extinguisher_available', 'first_aid_kit_available', 'is_active']
    for field in bool_fields:
        if field in data:
            if isinstance(data[field], str):
                data[field] = data[field].lower() in ('true', '1', 'yes')
            elif isinstance(data[field], bool):
                data[field] = data[field]
            else:
                data[field] = bool(data[field])
    
    # Convert string numbers to integers
    int_fields = ['seating_capacity', 'manufacturing_year']
    for field in int_fields:
        if field in data and data[field] is not None:
            try:
                val = str(data[field])
                if field == 'seating_capacity' and '+' in val:
                    data[field] = sum(int(x.strip()) for x in val.split('+') if x.strip().isdigit())
                else:
                    data[field] = int(data[field])
            except (ValueError, TypeError):
                pass
    
    return data

@router.post(
    "/", 
    response_model=schemas.VehicleResponse, 
    status_code=status.HTTP_201_CREATED,
    tags=["Vehicles"],
    summary="Create a new vehicle",
    description="Create a new vehicle with the provided details. Supports file uploads for documents.")
async def create_vehicle(
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # Parse the form data
        form_data = await request.form()
        data = process_vehicle_data(dict(form_data))
        
        # Check for required fields
        required_fields = ['vehicle_brand', 'vehicle_model', 'manufacturing_year', 'vehicle_registration_number', 'rc_number', 'vehicle_type', 'seating_capacity', 'fuel_type', 'registration_date', 'registration_expiry', 'insurance_number', 'insurance_date', 'insurance_expiry', 'service_expiry', 'puc_expiry']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            logger.error(f"Missing required fields: {missing_fields}")
            logger.error(f"Form data received: {list(data.keys())}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"missing_fields": missing_fields}
            )
        
        # Check if vehicle with same registration number exists
        existing_vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.vehicle_registration_number == data['vehicle_registration_number']
        ).first()
        
        if existing_vehicle:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle with this registration number already exists"
            )
        
        # Create new vehicle with the processed data
        db_vehicle = models.Vehicle(
            **data,
            user_id=current_user.id,
            agency_id=current_user.agency_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(db_vehicle)
        db.flush()  # Get the vehicle ID for file naming
        
        # Handle file uploads if any
        files = {
            'insurance_copy': form_data.get('insurance_copy'),
            'policy_certificate': form_data.get('policy_certificate'),
            'registration_certificate': form_data.get('registration_certificate'),
            'pollution_certificate': form_data.get('pollution_certificate')
        }
        
        try:
            # Save uploaded files
            for file_field, file_upload in files.items():
                if hasattr(file_upload, 'filename') and file_upload.filename:
                    file_path = save_upload_file(file_upload, db_vehicle.id, file_field)
                    if hasattr(db_vehicle, file_field):
                        # Directly set the attribute on the model (e.g. insurance_copy, policy_certificate)
                        setattr(db_vehicle, file_field, file_path)
            
            db.commit()
            db.refresh(db_vehicle)
            return db_vehicle
            
        except Exception as file_error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing file uploads"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating vehicle"
        )

@router.get(
    "/", 
    response_model=List[schemas.VehicleResponse],
    tags=["Vehicles"],
    summary="Get all vehicles",
    description="Retrieve a list of all vehicles for the authenticated user.")
def get_vehicles(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a list of vehicles with optional filtering.
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **status**: Filter by vehicle status (e.g., 'Active', 'In Maintenance')
    - **vehicle_type**: Filter by vehicle type (e.g., 'Car', 'Truck')
    """
    # Start with a base query
    query = db.query(models.Vehicle)
    
    
    query = query.filter(models.Vehicle.agency_id == current_user.agency_id)
    
    # Apply filters if provided
    if status:
        query = query.filter(models.Vehicle.vehicle_status == status)
    if vehicle_type:
        query = query.filter(models.Vehicle.vehicle_type == vehicle_type)
    
    # Apply pagination and ordering
    vehicles = (
        query.order_by(models.Vehicle.vehicle_registration_number)
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Sanitize data for response
    for v in vehicles:
        sanitize_vehicle_obj(v)
    return vehicles

@router.get(
    "/{vehicle_id}", 
    response_model=schemas.VehicleResponse,
    tags=["Vehicles"],
    summary="Get vehicle by ID",
    description="Retrieve detailed information about a specific vehicle.")
def get_vehicle(
    vehicle_id: int,
    include_maintenance: bool = False,
    include_trips: bool = False,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a single vehicle by ID with optional related data.
    
    - **vehicle_id**: The ID of the vehicle to retrieve
    - **include_maintenance**: Include maintenance history (default: False)
    - **include_trips**: Include trip history (default: False)
    """
    # Start with a base query
    query = db.query(models.Vehicle)
    
    # Eager load relationships if requested
    if include_maintenance:
        query = query.options(joinedload(models.Vehicle.maintenance_records))
    if include_trips:
        query = query.options(joinedload(models.Vehicle.trips))
    
    # Get the vehicle
    vehicle = query.filter(models.Vehicle.id == vehicle_id).first()
    
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Check if user has access to this vehicle - restrict to same agency for all users including super_admin

    if vehicle.agency_id != current_user.agency_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this vehicle")
    
    return vehicle

@router.put(
    "/{vehicle_id}", 
    response_model=schemas.VehicleResponse,
    tags=["Vehicles"],
    summary="Update a vehicle",
    description="Update an existing vehicle's information.")

async def update_vehicle(
    vehicle_id: int,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # Get the existing vehicle
        db_vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == vehicle_id
        ).first()
        
        if not db_vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )
        
        # Check permissions - restrict to same agency for all users including super_admin

        if db_vehicle.agency_id != current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this vehicle"
            )
        
        # Parse the form data
        form_data = await request.form()
        data = process_vehicle_data(dict(form_data))
        
        # Check if registration number is being updated and if it's already taken
        if 'vehicle_registration_number' in data and data['vehicle_registration_number'] != db_vehicle.vehicle_registration_number:
            existing = db.query(models.Vehicle).filter(
                models.Vehicle.vehicle_registration_number == data['vehicle_registration_number'],
                models.Vehicle.id != vehicle_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A vehicle with this registration number already exists"
                )
        
        # Handle file uploads if any
        files = {
            'insurance_copy': form_data.get('insurance_copy'),
            'policy_certificate': form_data.get('policy_certificate'),
            'registration_certificate': form_data.get('registration_certificate'),
            'pollution_certificate': form_data.get('pollution_certificate')
        }
        
        try:
            # Update vehicle fields
            for key, value in data.items():
                if hasattr(db_vehicle, key) and value is not None:
                    setattr(db_vehicle, key, value)
            
            # Process file uploads
            for file_field, file_upload in files.items():
                if hasattr(file_upload, 'filename') and file_upload.filename:
                    # Delete old file if it exists
                    if hasattr(db_vehicle, file_field):
                         old_file = getattr(db_vehicle, file_field)
                         if old_file:
                             delete_old_file(old_file)
                    
                         # Save new file
                         file_path = save_upload_file(file_upload, db_vehicle.id, file_field)
                         setattr(db_vehicle, file_field, file_path)
            
            db_vehicle.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(db_vehicle)
            return db_vehicle
            
        except Exception as file_error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing file uploads: {str(file_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating vehicle: {str(e)}"
        )

@router.delete(
    "/{vehicle_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Vehicles"],
    summary="Delete a vehicle",
    description="Delete a vehicle by ID. This action cannot be undone.")

def delete_vehicle(
    vehicle_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # Get the vehicle to delete
        db_vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == vehicle_id
        ).first()
        
        if not db_vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )
        
        # Check permissions
        if db_vehicle.user_id != current_user.id and current_user.role != models.UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this vehicle"
            )
        elif db_vehicle.agency_id != current_user.agency_id:

            raise HTTPException(

                status_code=status.HTTP_403_FORBIDDEN,

                detail="Not authorized to delete this vehicle"

            )
        
        # Delete associated files
        if db_vehicle.insurance_copy:
            delete_old_file(db_vehicle.insurance_copy)
        if db_vehicle.policy_certificate:
            delete_old_file(db_vehicle.policy_certificate)
        if db_vehicle.registration_certificate:
            delete_old_file(db_vehicle.registration_certificate)
        if db_vehicle.pollution_certificate:
            delete_old_file(db_vehicle.pollution_certificate)
        
        # Check for associated trip schedules
        associated_trips = db.query(models.TripSchedule).filter(
            models.TripSchedule.vehicle_id == vehicle_id
        ).all()
        
        if associated_trips:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete vehicle: It is associated with {len(associated_trips)} trip(s). Please reassign or delete the trips first."
            )
        
        # Delete the vehicle
        db.delete(db_vehicle)
        db.commit()
        
        return {"message": "Vehicle deleted successfully"}
        
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error deleting vehicle {vehicle_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete vehicle: It has associated records (trips, schedules, or other dependencies). Please remove these associations first."
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting vehicle {vehicle_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting vehicle: {str(e)}"
        )

@router.get(
    "/{vehicle_id}/documents/{document_type}",
    tags=["Vehicles"],
    summary="Get vehicle document",
    description="Retrieve a specific document for a vehicle.")

async def get_vehicle_document(
    vehicle_id: int,
    document_type: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieve a vehicle document file"""
    db_vehicle = db.query(models.Vehicle).filter(
        models.Vehicle.id == vehicle_id
    ).first()
    
    if not db_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )
    
    # Check permissions - restrict to same agency for all users including super_admin

    if db_vehicle.agency_id != current_user.agency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this document"
        )
    
    # Get the file path based on document type
    file_path = None
    if document_type == 'insurance' and db_vehicle.insurance_copy:
        file_path = Path("uploads") / db_vehicle.insurance_copy
    elif document_type == 'policy' and db_vehicle.policy_certificate:
        file_path = Path("uploads") / db_vehicle.policy_certificate
    elif document_type == 'registration' and db_vehicle.registration_certificate:
        file_path = Path("uploads") / db_vehicle.registration_certificate
    elif document_type == 'pollution' and db_vehicle.pollution_certificate:
        file_path = Path("uploads") / db_vehicle.pollution_certificate
    else:
        # Try finding by exact column name match if short type doesn't work?
        # No, let's keep it restricted.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document type '{document_type}' not found or not available"
        )
    
    if not file_path or not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found"
        )
    
    # Determine content type based on file extension
    content_type = "application/octet-stream"
    if file_path.suffix.lower() in ['.jpg', '.jpeg']:
        content_type = "image/jpeg"
    elif file_path.suffix.lower() == '.png':
        content_type = "image/png"
    elif file_path.suffix.lower() == '.pdf':
        content_type = "application/pdf"
    
    return FileResponse(
        file_path, 
        filename=file_path.name,
        media_type=content_type
    )

# list available vehicles within a specific time range
@router.get("/available/vehicles", response_model=List[schemas.VehicleResponse])
def get_available_vehicles(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    one_way_start_time: time = Query(None, description="One-way trip start time (HH:MM:SS)"),
    two_way_start_time: time = Query(None, description="Two-way trip start time (HH:MM:SS)"),
    duration_min: int = Query(..., description="Trip duration in minutes"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns all active vehicles NOT engaged in trips
    during given date range AND time window.
 
    Business Rule:
    Vehicle unavailable only if:
    (time overlaps) AND (date overlaps)
    """
 
    try:
        # Calculate proposed trip end time based on trip type and duration
        proposed_start_time = None
        proposed_end_time = None
       
        if one_way_start_time:
            proposed_start_time = one_way_start_time
            # Calculate end time with 20-minute buffer
            start_datetime = datetime.combine(date.today(), proposed_start_time)
            end_datetime = start_datetime + timedelta(minutes=duration_min) + timedelta(minutes=20)
            proposed_end_time = end_datetime.time()
        elif two_way_start_time:
            proposed_start_time = two_way_start_time
            # Calculate end time with 20-minute buffer
            start_datetime = datetime.combine(date.today(), proposed_start_time)
            end_datetime = start_datetime + timedelta(minutes=duration_min) + timedelta(minutes=20)
            proposed_end_time = end_datetime.time()
        else:
            raise HTTPException(
                status_code=400,
                detail="Either one_way_start_time or two_way_start_time must be provided"
            )
 
        # 1️⃣ TIME OVERLAP CHECK - Check against existing trips
        time_overlap = and_(
            # Case 1: One-way trip active - check one_way_start_time
            or_(
                and_(
                    models.TripSchedule.one_way_is_active == True,
                    models.TripSchedule.one_way_start_time < proposed_end_time,
                    models.TripSchedule.end_time > proposed_start_time
                ),
                # Case 2: Two-way trip active - check two_way_start_time
                and_(
                    models.TripSchedule.two_way_is_active == True,
                    models.TripSchedule.two_way_start_time < proposed_end_time,
                    models.TripSchedule.end_time > proposed_start_time
                )
            )
        )
 
        # 2️⃣ DATE OVERLAP CHECK
        date_overlap = and_(
            models.TripSchedule.start_date <= end_date,
            models.TripSchedule.end_date >= start_date
        )
 
        # 3️⃣ FINAL OVERLAP CONDITION
        overlap_condition = and_(
            time_overlap,
            date_overlap
        )
 
        # 4️⃣ QUERY AVAILABLE VEHICLES
        available_vehicles = (
            db.query(models.Vehicle)
            .join(models.User)  # vehicle belongs to agency/user
            .outerjoin(
                models.TripSchedule,
                and_(
                    models.Vehicle.id == models.TripSchedule.vehicle_id,
                    models.TripSchedule.agency_id == current_user.agency_id,
                    models.TripSchedule.is_active == True,
                    overlap_condition
                )
            )
            .filter(
                models.Vehicle.vehicle_status == "Active",
                models.User.is_active == True,
                models.User.agency_id == current_user.agency_id,
                models.TripSchedule.id.is_(None)  # No overlapping trip
            )
            .all()
        )
 
        return available_vehicles
 
    except Exception as e:
        logger.error(
            f"Error fetching available vehicles: {str(e)}\n{traceback.format_exc()}"
        )
        raise HTTPException(
            status_code=500,
            detail="Error fetching available vehicles"
        )

@router.get("/check-registration/{registration_number}")
def check_vehicle_registration(
    registration_number: str,
    db: Session = Depends(get_db)
):
    """Check if vehicle registration number is already in use"""
    if not registration_number:
        return {"exists": False, "message": "Registration number not provided"}
    
    # Check if registration number exists in vehicles table
    existing_vehicle = db.query(models.Vehicle).filter(
        models.Vehicle.vehicle_registration_number == registration_number
    ).first()
    
    if existing_vehicle:
        return {"exists": True, "vehicle_id": existing_vehicle.id, "message": "Registration number already exists"}
    
    return {"exists": False, "message": "Registration number available"}

@router.get("/check-rc/{rc_number}")
def check_vehicle_rc(
    rc_number: str,
    db: Session = Depends(get_db)
):
    """Check if vehicle RC number is already in use"""
    if not rc_number:
        return {"exists": False, "message": "RC number not provided"}
    
    # Check if RC number exists in vehicles table
    existing_vehicle = db.query(models.Vehicle).filter(
        models.Vehicle.rc_number == rc_number
    ).first()
    
    if existing_vehicle:
        return {"exists": True, "vehicle_id": existing_vehicle.id, "message": "RC number already exists"}
    
    return {"exists": False, "message": "RC number available"}