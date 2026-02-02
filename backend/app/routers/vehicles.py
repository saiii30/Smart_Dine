from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pathlib import Path
import shutil
import os

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter()

# Configure upload directory
UPLOAD_DIR = Path("uploads/vehicles")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def save_upload_file(file: UploadFile, vehicle_id: int, file_type: str) -> str:
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
        required_fields = ['vehicle_brand', 'vehicle_model', 'manufacturing_year', 'vehicle_registration_number', 'vehicle_type', 'seating_capacity']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
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
                detail=f"Error processing file uploads: {str(file_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating vehicle: {str(e)}"
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
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all vehicles for the current user"""
    vehicles = db.query(models.Vehicle).filter(
        models.Vehicle.user_id == current_user.id
    ).offset(skip).limit(limit).all()

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
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific vehicle by ID"""
    db_vehicle = db.query(models.Vehicle).filter(
        models.Vehicle.id == vehicle_id
    ).first()
    
    if not db_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )
    
    # Check if the current user has permission to view this vehicle
    if db_vehicle.user_id != current_user.id and current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this vehicle"
        )
    
    return db_vehicle

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
        
        # Check permissions
        if db_vehicle.user_id != current_user.id and current_user.role != models.UserRole.SUPER_ADMIN:
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
        
        # Delete associated files
        if db_vehicle.insurance_copy:
            delete_old_file(db_vehicle.insurance_copy)
        if db_vehicle.policy_certificate:
            delete_old_file(db_vehicle.policy_certificate)
        if db_vehicle.registration_certificate:
            delete_old_file(db_vehicle.registration_certificate)
        if db_vehicle.pollution_certificate:
            delete_old_file(db_vehicle.pollution_certificate)
        
        # Delete the vehicle
        db.delete(db_vehicle)
        db.commit()
        
        return {"message": "Vehicle deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
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
    
    # Check permissions
    if db_vehicle.user_id != current_user.id and current_user.role != models.UserRole.SUPER_ADMIN:
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