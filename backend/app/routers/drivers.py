from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models, schemas, auth
import shutil
import os
import re
import logging
from datetime import date, time, datetime
from sqlalchemy import func, and_, or_
import uuid
from app.auth import get_password_hash
from datetime import datetime, date, time
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
            role=user.role
        ),
        agency_id=driver.agency_id,
        date_of_birth=driver.date_of_birth,
        gender=driver.gender,
        status=driver.status,
        verification_status=driver.verification_status,
        city=driver.city,
        state=driver.state,
        pincode=driver.pincode,
        emergency_contact_name=driver.emergency_contact_name,
        emergency_contact_number=driver.emergency_contact_number,
        driving_license_number=driver.driving_license_number,
        license_expiry_date=driver.license_expiry_date,
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
    phone_number: str = Form(...),
    driving_license_number: str = Form(...),
    license_expiry_date: str = Form(...),
    password: str = Form(...),
    email: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    aadhar_number: Optional[str] = Form(None),
   
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
    photo_path = None
    police_path = None
    medical_path = None
   
    try:
        if aadhar_document:
            aadhar_path = save_upload_file(aadhar_document, upload_dir)
        if driver_photo:
            photo_path = save_upload_file(driver_photo, upload_dir)
        if police_verification_certificate:
            police_path = save_upload_file(police_verification_certificate, upload_dir)
        if medical_fitness_certificate:
            medical_path = save_upload_file(medical_fitness_certificate, upload_dir)
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        # Clean up any uploaded files if one fails
        for path in [aadhar_path, photo_path, police_path, medical_path]:
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
            driving_license_number=driving_license_number,
            license_expiry_date=parsed_license_expiry,
            date_of_birth=parse_date(date_of_birth),
            gender=gender,
            blood_group=blood_group,
            aadhar_number=aadhar_number,
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
    # Start with a base query that joins Driver and User
    query = (
        db.query(models.Driver)
        .join(models.User, models.Driver.id == models.User.id)
        .options(joinedload(models.Driver.user))
    )
    
   # Apply agency filter for all users (including super_admin)

    query = query.filter(models.User.agency_id == current_user.agency_id)
    
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
    
    # Map to response model (user is already loaded)
    driver_responses = []

    for driver in drivers:

        if hasattr(driver, 'user') and driver.user:

            driver_responses.append(map_driver_response(driver, driver.user))

        else:

            # Handle case where user is not loaded (shouldn't happen with joinedload)

            driver_responses.append(map_driver_response(driver, None))

   

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
    phone_number: Optional[str] = Form(None),
    driving_license_number: Optional[str] = Form(None),
    license_expiry_date: Optional[str] = Form(None),
   
    email: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    aadhar_number: Optional[str] = Form(None),
   
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
 
    # Update Driver fields
    if driving_license_number: db_driver.driving_license_number = driving_license_number
    if license_expiry_date:
        d = parse_date(license_expiry_date)
        if d: db_driver.license_expiry_date = d
   
    if date_of_birth: db_driver.date_of_birth = parse_date(date_of_birth)
    if gender: db_driver.gender = gender
    if blood_group: db_driver.blood_group = blood_group
    if aadhar_number: db_driver.aadhar_number = aadhar_number
   
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
    if driver_photo: db_driver.driver_photo = save_upload_file(driver_photo, upload_dir)
    if police_verification_certificate: db_driver.police_verification_certificate = save_upload_file(police_verification_certificate, upload_dir)
    if medical_fitness_certificate: db_driver.medical_fitness_certificate = save_upload_file(medical_fitness_certificate, upload_dir)
   
    db.commit()
    db.refresh(db_driver)
    db.refresh(db_user)
   
    return map_driver_response(db_driver, db_user)
 
@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: str, # str
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    result = db.query(models.Driver, models.User).join(models.User, models.Driver.id == models.User.id).filter(models.Driver.id == driver_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Driver not found")
   
    db_driver, db_user = result
   
    if current_user.agency_id and db_user.agency_id != current_user.agency_id:
        if current_user.role != models.UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized")
           
    # Delete both Driver and User? Or just Driver?
    # Usually we delete both if the User account was only for the driver.
    # Note: cascade delete might handle this if configured, but let's be explicit.
    db.delete(db_driver)
    db.delete(db_user)

    db.commit()

   

    return None  # Return proper response for 204 status



# list available drivers within a specific time range

@router.get("/available/drivers", response_model=List[schemas.DriverResponse])
def get_available_drivers(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    start_time: time = Query(..., description="Start time (HH:MM:SS)"),
    end_time: time = Query(..., description="End time (HH:MM:SS)"),
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
 
        # 1️ TIME OVERLAP CHECK
        time_overlap = and_(
            models.TripSchedule.start_time < end_time,
            models.TripSchedule.end_time > start_time
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
        available_drivers = (
            db.query(models.Driver)
            .join(models.User)
            .options(joinedload(models.Driver.user))
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
                models.User.agency_id == current_user.agency_id,
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

