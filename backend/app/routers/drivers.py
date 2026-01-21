from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
import shutil
import os
from datetime import datetime

from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
import shutil
import os
from datetime import datetime
import uuid
# Import password hasher (assuming utils or auth has it)
# We need to verify where get_password_hash is. checking auth.
from app.auth import get_password_hash 

router = APIRouter()

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

# Helper to merge User and Driver for response
def map_driver_response(driver_obj: models.Driver, user_obj: models.User):
    # If using Pydantic's from_orm, we might need a transient object or dict
    # Since we have a flat schema DriverResponse, we can populate it manually
    return schemas.DriverResponse(
        id=driver_obj.id, # String now
        user_id=user_obj.id, # Redundant but part of schema
        full_name=user_obj.name,
        phone_number=user_obj.contact_number or "",
        email=user_obj.email,
        
        date_of_birth=driver_obj.date_of_birth,
        gender=driver_obj.gender,
        blood_group=driver_obj.blood_group,
        
        aadhar_number=driver_obj.aadhar_number,
        driving_license_number=driver_obj.driving_license_number,
        license_expiry_date=driver_obj.license_expiry_date,
        
        aadhar_document=driver_obj.aadhar_document,
        driver_photo=driver_obj.driver_photo,
        police_verification_certificate=driver_obj.police_verification_certificate,
        medical_fitness_certificate=driver_obj.medical_fitness_certificate,
        
        verification_status=driver_obj.verification_status,
        status=driver_obj.status,
        is_active=user_obj.is_active, # Driver status vs User active? Logic choice.
        
        current_address=driver_obj.current_address,
        city=driver_obj.city,
        state=driver_obj.state,
        pincode=driver_obj.pincode,
        
        emergency_contact_name=driver_obj.emergency_contact_name,
        emergency_contact_number=driver_obj.emergency_contact_number,
        
        previous_employer_experience=driver_obj.previous_employer_experience,
        languages_spoken=driver_obj.languages_spoken,
        shift_preference=driver_obj.shift_preference,
        assigned_vehicle_id=driver_obj.assigned_vehicle_id,
        notes=driver_obj.notes,
        created_at=driver_obj.created_at,
        updated_at=driver_obj.updated_at
    )

@router.post("/", response_model=schemas.DriverResponse, status_code=status.HTTP_201_CREATED)
async def create_driver(
    full_name: str = Form(...),
    phone_number: str = Form(...),
    driving_license_number: str = Form(...),
    license_expiry_date: str = Form(...),
    
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
    # Check if license exists
    if db.query(models.Driver).filter(models.Driver.driving_license_number == driving_license_number).first():
        raise HTTPException(status_code=400, detail="Driving license number already exists")
    
    # Check if user (phone/email) exists?
    # Ideally checking phone/email availability in User table
    if db.query(models.User).filter(models.User.contact_number == phone_number).first():
        # Edge case: If User exists but is not a driver? We could theoretically upgrade them, but for strictness let's error or assume separate user.
        # Requirement: "A user may or may not be a driver".
        raise HTTPException(status_code=400, detail="User with this phone number already exists")

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

    # File uploads
    upload_dir = "uploads/drivers"
    aadhar_path = save_upload_file(aadhar_document, upload_dir) if aadhar_document else None
    photo_path = save_upload_file(driver_photo, upload_dir) if driver_photo else None
    police_path = save_upload_file(police_verification_certificate, upload_dir) if police_verification_certificate else None
    medical_path = save_upload_file(medical_fitness_certificate, upload_dir) if medical_fitness_certificate else None

    v_id = int(assigned_vehicle_id) if assigned_vehicle_id and assigned_vehicle_id.isdigit() else None

    # 1. Create User
    new_user_id = str(uuid.uuid4())
    # Default password
    hashed_pwd = get_password_hash("Driver@123")
    
    # Get the agency_id from the current user
    # The driver will belong to the same agency as the current user
    agency_id = current_user.agency_id if hasattr(current_user, 'agency_id') else None
    
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
        id=new_user_id, # Link IDs
        # Removed full_name, etc.
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
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    db.refresh(new_user)
    db.refresh(new_driver)
    
    return map_driver_response(new_driver, new_user)

@router.get("/", response_model=List[schemas.DriverResponse])
def read_drivers(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Determine the Agency ID to filter by.
    # If current_user is admin, show drivers in their agency.
    agency_id = current_user.agency_id
    
    # Query Drivers joined with Users, filtered by User.agency_id == agency_id
    query = db.query(models.Driver, models.User).join(models.User, models.Driver.id == models.User.id)
    
    if agency_id:
        query = query.filter(models.User.agency_id == agency_id)
    # If no agency_id (maybe Super Admin?), maybe return all? Or maybe filter by user.id if hierarchy is strictly 1-level?
    # Let's assume simple agency tenancy.
    
    results = query.offset(skip).limit(limit).all()
    
    return [map_driver_response(d, u) for d, u in results]

@router.get("/{driver_id}", response_model=schemas.DriverResponse)
def read_driver(
    driver_id: str, # Changed int to str
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Join Driver and User
    result = db.query(models.Driver, models.User).join(models.User, models.Driver.id == models.User.id).filter(models.Driver.id == driver_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Driver not found")
        
    driver, user = result
    # Access control: check if user belongs to same agency
    if current_user.agency_id and user.agency_id != current_user.agency_id:
        # Assuming strict simple tenancy.
        # If current_user is the driver themselves, allow.
        if current_user.id != driver_id:
             raise HTTPException(status_code=403, detail="Not authorized")

    return map_driver_response(driver, user)

@router.put("/{driver_id}", response_model=schemas.DriverResponse)
async def update_driver(
    driver_id: str, # Changed to str
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
        if current_user.role != models.UserRole.SUPER_ADMIN:
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
    return None

