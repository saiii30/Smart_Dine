from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app import models, schemas, auth
import shutil
import os
import re
import logging
from datetime import datetime, date, time, timedelta
from sqlalchemy import func, and_, or_
import uuid
from app.auth import get_password_hash
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def map_driver_response(driver, user):
    """Map driver and user models to a DriverResponse schema."""
    return schemas.DriverResponse(
        id=driver.id,
        user=schemas.UserBase(
            id=user.id,
            name=user.name,
            email=user.email,
            contact_number=user.contact_number,
            role=user.role,
            password_hash=user.password_hash  # Include password hash to indicate if password exists
        ),
        agency_id=driver.agency_id,
        employee_id=driver.employee_id,
        date_of_birth=driver.date_of_birth,
        gender=driver.gender,
        blood_group=driver.blood_group,
        aadhar_number=driver.aadhar_number,
        pan_card_number=driver.pan_card_number,
        driving_license_number=driver.driving_license_number,
        license_expiry_date=driver.license_expiry_date,
        
        # Documents
        aadhar_document=driver.aadhar_document,
        pan_card=driver.pan_card,
        driving_license_document=driver.driving_license_document,
        personal_resume=driver.personal_resume,
        driver_photo=driver.driver_photo,
        police_verification_certificate=driver.police_verification_certificate,
        medical_fitness_certificate=driver.medical_fitness_certificate,
        
        verification_status=driver.verification_status,
        status=driver.status,
        current_address=driver.current_address,
        city=driver.city,
        state=driver.state,
        pincode=driver.pincode,
        emergency_contact_name=driver.emergency_contact_name,
        emergency_contact_number=driver.emergency_contact_number,
        previous_employer_experience=driver.previous_employer_experience,
        languages_spoken=driver.languages_spoken,
        shift_preference=driver.shift_preference,
        assigned_vehicle_id=driver.assigned_vehicle_id,
        notes=driver.notes,
        is_active=user.is_active,  # Set is_active from user model
        created_at=driver.created_at,
        updated_at=driver.updated_at
    )

router = APIRouter(tags=["Drivers"])

# Helper to save upload file
def save_upload_file(upload_file: UploadFile, destination_folder: str) -> str:
    try:
        os.makedirs(destination_folder, exist_ok=True)
        # Use UUID to prevent collisions
        file_ext = os.path.splitext(upload_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(destination_folder, unique_filename)
       
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return file_path
    finally:
        upload_file.file.close()

def delete_old_file(file_path: str) -> None:
    """Delete an old file if it exists"""
    if file_path:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")

def validate_phone_number(phone: str) -> str:
    """Validate and clean phone number."""
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
   
    # Remove all non-digit characters
    cleaned = ''.join(filter(str.isdigit, phone))
   
    # Check length (allowing 10 digits for standard Indian numbers)
    if len(cleaned) < 10:
        raise HTTPException(status_code=400, detail="Phone number must be at least 10 digits")
    if len(cleaned) > 15:
        raise HTTPException(status_code=400, detail="Phone number is too long")
   
    # Take last 10 digits (handles country codes)
    if len(cleaned) > 10:
        cleaned = cleaned[-10:]
   
    return cleaned
 
@router.post("/", response_model=schemas.DriverResponse, status_code=status.HTTP_201_CREATED)
async def create_driver(
    full_name: str = Form(...),
    employee_id: Optional[str] = Form(None),
    phone_number: str = Form(...),
    driving_license_number: str = Form(...),
    license_expiry_date: str = Form(...),
    password: str = Form(...),
    email: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    aadhar_number: Optional[str] = Form(None),
    pan_card_number: Optional[str] = Form(None),
   
    verification_status: str = Form('Pending'),
    status: str = Form('Active'),
   
    current_address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    pincode: Optional[str] = Form(None),
   
    emergency_contact_name: Optional[str] = Form(None),
    emergency_contact_number: Optional[str] = Form(None),
   
    previous_employer_experience: Optional[str] = Form(None),
    languages_spoken: Optional[str] = Form(None),
    shift_preference: Optional[str] = Form(None),
    assigned_vehicle_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
   
    aadhar_document: Optional[UploadFile] = File(None),
    pan_card: Optional[UploadFile] = File(None),
    driving_license_document: Optional[UploadFile] = File(None),
    personal_resume: Optional[UploadFile] = File(None),
    driver_photo: Optional[UploadFile] = File(None),
    police_verification_certificate: Optional[UploadFile] = File(None),
    medical_fitness_certificate: Optional[UploadFile] = File(None),
   
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    logger.info(f"Creating new driver: {full_name} ({phone_number})")
   
    # Clean and validate phone number
    try:
        phone_number = validate_phone_number(phone_number)
    except HTTPException as e:
        logger.error(f"Phone number validation failed: {e.detail}")
        raise e
   
    # Check for existing driver with same license
    existing_license = db.query(models.Driver).filter(
        models.Driver.driving_license_number == driving_license_number
    ).first()
   
    if existing_license:
        logger.warning(f"Driver with license {driving_license_number} already exists")
        raise HTTPException(
            status_code=400,
            detail="A driver with this license number already exists"
        )
   
    # Check for existing user with same phone or email
    existing_user = db.query(models.User).filter(
        (models.User.contact_number == phone_number) |
        (models.User.email == email if email else False)
    ).first()
   
    if existing_user:
        conflict_field = "phone number" if existing_user.contact_number == phone_number else "email"
        logger.warning(f"User with this {conflict_field} already exists")
        raise HTTPException(
            status_code=400,
            detail=f"A user with this {conflict_field} already exists"
        )
 
    # Date helper
    def parse_date(date_str: Optional[str]):
        if not date_str or date_str in ('undefined', 'null', ''): return None
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            try:
                return datetime.strptime(date_str, "%Y-%m-%d")
            except:
                return None
   
    parsed_license_expiry = parse_date(license_expiry_date)
    if not parsed_license_expiry: raise HTTPException(status_code=400, detail="Invalid license expiry date")
 
    # Handle file uploads with error handling
    upload_dir = "uploads/drivers"
    aadhar_path = None
    pan_card_path = None
    driving_license_doc_path = None
    personal_resume_path = None
    photo_path = None
    police_path = None
    medical_path = None
    
    try:
        if aadhar_document:
            aadhar_path = save_upload_file(aadhar_document, upload_dir)
        if pan_card:
            pan_card_path = save_upload_file(pan_card, upload_dir)
        if driving_license_document:
            driving_license_doc_path = save_upload_file(driving_license_document, upload_dir)
        if personal_resume:
            personal_resume_path = save_upload_file(personal_resume, upload_dir)
        if driver_photo:
            photo_path = save_upload_file(driver_photo, upload_dir)
        if police_verification_certificate:
            police_path = save_upload_file(police_verification_certificate, upload_dir)
        if medical_fitness_certificate:
            medical_path = save_upload_file(medical_fitness_certificate, upload_dir)
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        # Clean up any uploaded files if one fails
        for path in [aadhar_path, pan_card_path, driving_license_doc_path, personal_resume_path, photo_path, police_path, medical_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process file uploads: {str(e)}"
        )
 
    v_id = int(assigned_vehicle_id) if assigned_vehicle_id and assigned_vehicle_id.isdigit() else None
 
    # Create user and driver in a transaction
    try:
        # 1. Create User
        new_user_id = str(uuid.uuid4())
        if not password:
            raise HTTPException(status_code=400, detail="Password is required")
        hashed_pwd = get_password_hash(password)
        # Get the agency_id from the current user
        agency_id = getattr(current_user, 'agency_id', None)
       
        new_user = models.User(
            id=new_user_id,
            name=full_name,
            email=email,
            contact_number=phone_number,
            password_hash=hashed_pwd,
            role=models.UserRole.DRIVER,
            is_active=(status == 'Active'),
            agency_id=agency_id
        )
        db.add(new_user)
   
        # 2. Create Driver
        new_driver = models.Driver(
            id=new_user_id,
            agency_id=agency_id,
            employee_id=employee_id,
            driving_license_number=driving_license_number,
            license_expiry_date=parsed_license_expiry,
            date_of_birth=parse_date(date_of_birth),
            gender=gender,
            blood_group=blood_group,
            aadhar_number=aadhar_number,
            pan_card_number=pan_card_number,
            verification_status=verification_status,
            status=status,
            current_address=current_address,
            city=city,
            state=state,
            pincode=pincode,
            emergency_contact_name=emergency_contact_name,
            emergency_contact_number=emergency_contact_number,
            previous_employer_experience=previous_employer_experience,
            languages_spoken=languages_spoken,
            shift_preference=shift_preference,
            assigned_vehicle_id=v_id,
            notes=notes,
            aadhar_document=aadhar_path,
            pan_card=pan_card_path,
            driving_license_document=driving_license_doc_path,
            personal_resume=personal_resume_path,
            driver_photo=photo_path,
            police_verification_certificate=police_path,
            medical_fitness_certificate=medical_path
        )
        db.add(new_driver)
       
        # Commit the transaction
        db.commit()
        db.refresh(new_user)
        db.refresh(new_driver)
       
        logger.info(f"Successfully created driver {new_user_id}")
        return map_driver_response(new_driver, new_user)
       
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating driver: {str(e)}", exc_info=True)
       
        # Clean up uploaded files if any
        for path in [aadhar_path, photo_path, police_path, medical_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
       
        error_detail = str(e)
        if "UNIQUE constraint failed" in error_detail:
            if "users.email" in error_detail:
                error_detail = "Email already in use"
            elif "users.contact_number" in error_detail:
                error_detail = "Phone number already in use"
            elif "drivers.driving_license_number" in error_detail:
                error_detail = "Driving license number already exists"
       
        raise HTTPException(
            status_code=400 if "already exists" in error_detail.lower() else 500,
            detail=error_detail
        )
 
@router.get("/", response_model=List[schemas.DriverResponse])
def read_drivers(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a list of drivers with optional filtering.
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return
    - **status**: Filter by driver status (e.g., 'Active', 'Inactive')
    """
    # Start with a base query with eager loading
    query = db.query(models.Driver).options(joinedload(models.Driver.user))
    
    # Add join only for filtering on User fields
    query = query.join(models.User).filter(
        models.User.agency_id == current_user.agency_id
    )
    
    # Apply status filter if provided
    if status:
        query = query.filter(models.Driver.status == status)
    
    # Apply pagination and ordering
    drivers = (
        query.order_by(models.User.name)
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Map to response model (user is already loaded via joinedload)
    driver_responses = [
        map_driver_response(driver, driver.user)
        for driver in drivers
    ]

    return driver_responses


@router.get("/{driver_id}", response_model=schemas.DriverResponse)
def read_driver(
    driver_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a single driver by ID with all related data.
    
    - **driver_id**: The ID of the driver to retrieve
    """
    # Query driver with eager loading of user data
    driver = (
        db.query(models.Driver)
        .options(joinedload(models.Driver.user))
        .filter(models.Driver.id == driver_id)
        .first()
    )
    
    if not driver or not driver.user:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Access control
    # Access control - restrict to same agency for all users including super_admin

    if (current_user.agency_id != driver.user.agency_id and

        current_user.id != driver_id):

        raise HTTPException(status_code=403, detail="Not authorized to access this driver")
    
    return driver
 
@router.put("/{driver_id}", response_model=schemas.DriverResponse)
async def update_driver(
    driver_id: str, 
    full_name: Optional[str] = Form(None),
    employee_id: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    driving_license_number: Optional[str] = Form(None),
    license_expiry_date: Optional[str] = Form(None),
    password: Optional[str] = Form(None),  # Add password field for updates
    
    email: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    aadhar_number: Optional[str] = Form(None),
    pan_card_number: Optional[str] = Form(None),
   
    verification_status: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
   
    current_address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    pincode: Optional[str] = Form(None),
   
    emergency_contact_name: Optional[str] = Form(None),
    emergency_contact_number: Optional[str] = Form(None),
   
    previous_employer_experience: Optional[str] = Form(None),
    languages_spoken: Optional[str] = Form(None),
    shift_preference: Optional[str] = Form(None),
    assigned_vehicle_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
   
    aadhar_document: Optional[UploadFile] = File(None),
    pan_card: Optional[UploadFile] = File(None),
    driving_license_document: Optional[UploadFile] = File(None),
    personal_resume: Optional[UploadFile] = File(None),
    driver_photo: Optional[UploadFile] = File(None),
    police_verification_certificate: Optional[UploadFile] = File(None),
    medical_fitness_certificate: Optional[UploadFile] = File(None),
   
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get the driver and user from the database
    result = db.query(models.Driver, models.User).join(
        models.User, models.Driver.id == models.User.id
    ).filter(models.Driver.id == driver_id).first()
   
    if not result:
        raise HTTPException(status_code=404, detail="Driver not found")
       
    db_driver, db_user = result
   
    # Check permissions
    if current_user.agency_id and db_user.agency_id != current_user.agency_id:
            raise HTTPException(status_code=403, detail="Not authorized")
   
    # Date helper
    def parse_date(date_str: Optional[str]):
        if not date_str or date_str in ('undefined', 'null', ''):
            return None
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            try:
                return datetime.strptime(date_str, "%Y-%m-%d")
            except:
                return None
 
    # Update User fields
    if full_name: db_user.name = full_name
    if phone_number: db_user.contact_number = phone_number
    if email is not None: db_user.email = email
    if status:
        db_user.is_active = (status == "Active")
    
    # Update password only if a new one is provided
    if password and password.strip():
        db_user.password_hash = get_password_hash(password.strip())
        logger.info(f"Password updated for driver {driver_id}")
 
    # Update Driver fields
    if employee_id: db_driver.employee_id = employee_id
    if driving_license_number: db_driver.driving_license_number = driving_license_number
    if license_expiry_date:
        d = parse_date(license_expiry_date)
        if d: db_driver.license_expiry_date = d
   
    if date_of_birth: db_driver.date_of_birth = parse_date(date_of_birth)
    if gender: db_driver.gender = gender
    if blood_group: db_driver.blood_group = blood_group
    if aadhar_number: db_driver.aadhar_number = aadhar_number
    if pan_card_number: db_driver.pan_card_number = pan_card_number
   
    if verification_status: db_driver.verification_status = verification_status
    if status: db_driver.status = status
   
    if current_address: db_driver.current_address = current_address
    if city: db_driver.city = city
    if state: db_driver.state = state
    if pincode: db_driver.pincode = pincode
   
    if emergency_contact_name: db_driver.emergency_contact_name = emergency_contact_name
    if emergency_contact_number: db_driver.emergency_contact_number = emergency_contact_number
   
    if previous_employer_experience: db_driver.previous_employer_experience = previous_employer_experience
    if languages_spoken: db_driver.languages_spoken = languages_spoken
    if shift_preference: db_driver.shift_preference = shift_preference
    if assigned_vehicle_id is not None:
         db_driver.assigned_vehicle_id = int(assigned_vehicle_id) if assigned_vehicle_id.isdigit() else None
   
    if notes: db_driver.notes = notes
 
    # Files
    upload_dir = "uploads/drivers"
    if aadhar_document: db_driver.aadhar_document = save_upload_file(aadhar_document, upload_dir)
    if pan_card: db_driver.pan_card = save_upload_file(pan_card, upload_dir)
    if driving_license_document: db_driver.driving_license_document = save_upload_file(driving_license_document, upload_dir)
    if personal_resume: db_driver.personal_resume = save_upload_file(personal_resume, upload_dir)
    if driver_photo: db_driver.driver_photo = save_upload_file(driver_photo, upload_dir)
    if police_verification_certificate: db_driver.police_verification_certificate = save_upload_file(police_verification_certificate, upload_dir)
    if medical_fitness_certificate: db_driver.medical_fitness_certificate = save_upload_file(medical_fitness_certificate, upload_dir)
   
    db.commit()
    db.refresh(db_driver)
    db.refresh(db_user)
    
    return map_driver_response(db_driver, db_user)

@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # Get the driver to delete
        db_driver = db.query(models.Driver).filter(
            models.Driver.id == driver_id
        ).first()
        
        if not db_driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found"
            )
        
        # Check permissions - restrict to same agency for all users including super_admin
        if db_driver.agency_id != current_user.agency_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this driver"
            )
        
        # Delete associated files
        if db_driver.aadhar_document:
            delete_old_file(db_driver.aadhar_document)
        if db_driver.pan_card:
            delete_old_file(db_driver.pan_card)
        if db_driver.driving_license_document:
            delete_old_file(db_driver.driving_license_document)
        if db_driver.personal_resume:
            delete_old_file(db_driver.personal_resume)
        if db_driver.driver_photo:
            delete_old_file(db_driver.driver_photo)
        if db_driver.police_verification_certificate:
            delete_old_file(db_driver.police_verification_certificate)
        if db_driver.medical_fitness_certificate:
            delete_old_file(db_driver.medical_fitness_certificate)
        
        # Check for associated trip schedules
        associated_trips = db.query(models.TripSchedule).filter(
            models.TripSchedule.driver_id == driver_id
        ).all()
        
        if associated_trips:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete driver: It is associated with {len(associated_trips)} trip(s). Please reassign or delete the trips first."
            )
        
        # Check for assigned vehicles
        assigned_vehicles = db.query(models.Vehicle).filter(
            models.Vehicle.assigned_driver_id == driver_id
        ).all()
        
        if assigned_vehicles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete driver: It is assigned to {len(assigned_vehicles)} vehicle(s). Please reassign the vehicles first."
            )
        
        # Delete the driver and associated user
        # First delete the driver record
        db.delete(db_driver)
        
        # Then delete the associated user record
        db_user = db.query(models.User).filter(
            models.User.id == driver_id
        ).first()
        
        if db_user:
            db.delete(db_user)
        
        db.commit()
        
        return {"message": "Driver deleted successfully"}
        
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error deleting driver {driver_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete driver: It has associated records (trips, vehicles, or other dependencies). Please remove these associations first."
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting driver {driver_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting driver: {str(e)}"
        )

@router.get("/check-phone/{phone_number}")
def check_phone_number(
    phone_number: str,
    db: Session = Depends(get_db)
):
    """Check if phone number is already in use"""
    # Clean and validate phone number
    try:
        cleaned_phone = validate_phone_number(phone_number)
    except HTTPException:
        return {"exists": True, "message": "Invalid phone number format"}
    
    # Check if phone number exists in users table
    existing_user = db.query(models.User).filter(
        models.User.contact_number == cleaned_phone
    ).first()
    
    if existing_user:
        return {"exists": True, "driver_id": existing_user.id, "message": "Phone number already in use"}
    
    return {"exists": False, "message": "Phone number available"}

@router.get("/check-aadhar/{aadhar_number}")
def check_aadhar_number(
    aadhar_number: str,
    db: Session = Depends(get_db)
):
    """Check if Aadhar number is already in use"""
    # Clean and validate Aadhar number (remove non-digits)
    if not aadhar_number:
        return {"exists": False, "message": "Aadhar number not provided"}
    
    cleaned_aadhar = ''.join(filter(str.isdigit, aadhar_number))
    
    # Basic Aadhar validation (12 digits)
    if len(cleaned_aadhar) != 12:
        return {"exists": True, "message": "Invalid Aadhar number format"}
    
    # Check if Aadhar number exists in drivers table
    existing_driver = db.query(models.Driver).filter(
        models.Driver.aadhar_number == cleaned_aadhar
    ).first()
    
    if existing_driver:
        return {"exists": True, "driver_id": existing_driver.id, "message": "Aadhar number already exists"}
    
    return {"exists": False, "message": "Aadhar number available"}

@router.get("/check-pan/{pan_card_number}")
def check_pan_number(
    pan_card_number: str,
    db: Session = Depends(get_db)
):
    """Check if PAN card number is already in use"""
    # Clean and validate PAN number
    if not pan_card_number:
        return {"exists": False, "message": "PAN card number not provided"}
    
    # Basic PAN validation (format: ABCDE1234F)
    pan_pattern = re.compile(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$')
    if not pan_pattern.match(pan_card_number.upper()):
        return {"exists": True, "message": "Invalid PAN card number format"}
    
    # Check if PAN number exists in drivers table
    existing_driver = db.query(models.Driver).filter(
        models.Driver.pan_card_number == pan_card_number.upper()
    ).first()
    
    if existing_driver:
        return {"exists": True, "driver_id": existing_driver.id, "message": "PAN card number already exists"}
    
    return {"exists": False, "message": "PAN card number available"}

# list available drivers within a specific time range
@router.get("/available/drivers", response_model=List[schemas.DriverResponse])
def get_available_drivers(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    one_way_start_time: time = Query(None, description="One-way trip start time (HH:MM:SS)"),
    two_way_start_time: time = Query(None, description="Two-way trip start time (HH:MM:SS)"),
    duration_min: int = Query(..., description="Trip duration in minutes"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Returns all active drivers who are NOT engaged in any trip
    during the given date range AND time window.
 
    Business Logic:
    Driver is unavailable only if:
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
 
        # 1️ TIME OVERLAP CHECK - Check against existing trips
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
 
        # 2️ DATE OVERLAP CHECK
        date_overlap = and_(
            models.TripSchedule.start_date <= end_date,
            models.TripSchedule.end_date >= start_date
        )
 
        # 3️ FINAL OVERLAP CONDITION
        overlap_condition = and_(
            time_overlap,
            date_overlap
        )
 
        # 4️ QUERY AVAILABLE DRIVERS
        query = db.query(models.Driver).options(joinedload(models.Driver.user))
        
        # Add join only for filtering on User fields
        query = query.join(models.User).filter(
            models.User.agency_id == current_user.agency_id
        )
        
        available_drivers = (
            query
            .outerjoin(
                models.TripSchedule,
                and_(
                    models.Driver.id == models.TripSchedule.driver_id,
                    models.TripSchedule.agency_id == current_user.agency_id,
                    models.TripSchedule.is_active == True,
                    overlap_condition
                )
            )
            .filter(
                models.Driver.status == "Active",
                models.User.is_active == True,
                models.TripSchedule.id.is_(None)  # No overlapping trip
            )
            .all()
        )
 
        return available_drivers
 
    except Exception as e:
        logger.error(
            f"Error fetching available drivers: {str(e)}\n{traceback.format_exc()}"
        )
        raise HTTPException(
            status_code=500,
            detail="Error fetching available drivers"
        )
 