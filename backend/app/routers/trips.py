from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from app.database import get_db
from app import models, schemas, auth

router = APIRouter()

def generate_trip_code(company_id: int, db: Session) -> str:
    """Generate a unique trip code based on company ID and sequence number"""
    # Get company name abbreviation
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        return ""
    
    # Get company name initials (first 3 letters, uppercase, remove spaces and special chars)
    company_initials = ''.join(c for c in company.name[:3].upper() if c.isalnum())
    if not company_initials:
        company_initials = "TRP"  # Default if company name has no alphanumeric chars
    
    # Get the highest trip number for this company (check existing trip codes)
    existing_trips = db.query(models.Trip).filter(
        models.Trip.company_id == company_id,
        models.Trip.trip_code.isnot(None),
        models.Trip.trip_code != ""
    ).all()
    
    max_num = 0
    for trip in existing_trips:
        if trip.trip_code and trip.trip_code.startswith(company_initials + "-"):
            try:
                num_part = trip.trip_code.split("-")[-1]
                num = int(num_part)
                max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass
    
    # Generate code: COMPANY-001, COMPANY-002, etc.
    trip_code = f"{company_initials}-{str(max_num + 1).zfill(3)}"
    
    # Ensure uniqueness
    existing = db.query(models.Trip).filter(models.Trip.trip_code == trip_code).first()
    counter = 1
    while existing:
        trip_code = f"{company_initials}-{str(max_num + 1 + counter).zfill(3)}"
        existing = db.query(models.Trip).filter(models.Trip.trip_code == trip_code).first()
        counter += 1
    
    return trip_code

# Company endpoints
@router.post("/companies/", response_model=schemas.CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company: schemas.CompanyCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    if company.service_end_date <= company.service_start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service end date must be after service start date"
        )
    
    db_company = models.Company(**company.dict(), owner_id=current_user.id)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/companies/", response_model=List[schemas.CompanyResponse])
def read_companies(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    companies = db.query(models.Company).filter(
        models.Company.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    return companies

@router.get("/companies/{company_id}", response_model=schemas.CompanyResponse)
def read_company(
    company_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    if db_company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return db_company

@router.put("/companies/{company_id}", response_model=schemas.CompanyResponse)
def update_company(
    company_id: int,
    company_update: schemas.CompanyUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    if db_company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    update_data = company_update.dict(exclude_unset=True)
    
    # Validate dates if both are being updated
    if 'service_start_date' in update_data and 'service_end_date' in update_data:
        if update_data['service_end_date'] <= update_data['service_start_date']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service end date must be after service start date"
            )
    elif 'service_start_date' in update_data:
        if db_company.service_end_date <= update_data['service_start_date']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service end date must be after service start date"
            )
    elif 'service_end_date' in update_data:
        if update_data['service_end_date'] <= db_company.service_start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service end date must be after service start date"
            )
    
    for field, value in update_data.items():
        setattr(db_company, field, value)
    
    db.commit()
    db.refresh(db_company)
    return db_company

@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    if db_company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    db.delete(db_company)
    db.commit()
    return None

# Trip endpoints
@router.post("/", response_model=schemas.TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    trip: schemas.TripCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Find or create company
    db_company = db.query(models.Company).filter(
        models.Company.name == trip.company_name,
        models.Company.owner_id == current_user.id
    ).first()
    
    if db_company is None:
        # Create new company with default dates
        from datetime import datetime, timedelta
        today = datetime.now()
        db_company = models.Company(
            owner_id=current_user.id,
            name=trip.company_name,
            service_start_date=today,
            service_end_date=today + timedelta(days=365)  # Default 1 year
        )
        db.add(db_company)
        db.flush()  # Flush to get the company ID
    
    # Generate trip code
    trip_code = generate_trip_code(db_company.id, db)
    
    # Verify vehicles and drivers belong to user and check for conflicts
    assigned_vehicles = set()
    assigned_drivers = set()
    
    if trip.schedules:
        for schedule in trip.schedules:
            if schedule.vehicle_id:
                # Check if vehicle is already assigned to another schedule
                existing_schedule = db.query(models.TripSchedule).filter(
                    models.TripSchedule.vehicle_id == schedule.vehicle_id,
                    models.TripSchedule.departure_datetime == schedule.departure_datetime
                ).first()
                if existing_schedule:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Vehicle is already assigned to another trip at this time"
                    )
                
                # Verify vehicle belongs to user
                db_vehicle = db.query(models.Vehicle).filter(
                    models.Vehicle.id == schedule.vehicle_id,
                    models.Vehicle.owner_id == current_user.id
                ).first()
                if db_vehicle is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Vehicle with id {schedule.vehicle_id} not found"
                    )
                assigned_vehicles.add(schedule.vehicle_id)
            
            if schedule.driver_id:
                # Check if driver is already assigned to another schedule
                existing_schedule = db.query(models.TripSchedule).filter(
                    models.TripSchedule.driver_id == schedule.driver_id,
                    models.TripSchedule.departure_datetime == schedule.departure_datetime
                ).first()
                if existing_schedule:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Driver is already assigned to another trip at this time"
                    )
                
                # Verify driver belongs to user
                db_driver = db.query(models.Driver).filter(
                    models.Driver.id == schedule.driver_id,
                    models.Driver.owner_id == current_user.id
                ).first()
                if db_driver is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Driver with id {schedule.driver_id} not found"
                    )
                assigned_drivers.add(schedule.driver_id)
    
    # Create trip
    trip_data = trip.dict(exclude={'schedules', 'company_name'})
    db_trip = models.Trip(**trip_data, owner_id=current_user.id, company_id=db_company.id, trip_code=trip_code)
    db.add(db_trip)
    db.flush()  # Flush to get the trip ID
    
    # Create schedules
    if trip.schedules:
        for schedule in trip.schedules:
            db_schedule = models.TripSchedule(**schedule.dict(), trip_id=db_trip.id)
            db.add(db_schedule)
    
    db.commit()
    db.refresh(db_trip)
    
    # Load relationships for response
    db_trip = db.query(models.Trip).filter(models.Trip.id == db_trip.id).first()
    
    # Build response with nested data
    trip_response = schemas.TripResponse(
        id=db_trip.id,
        owner_id=db_trip.owner_id,
        company_id=db_trip.company_id,
        trip_code=db_trip.trip_code,
        name=db_trip.name,
        address=db_trip.address,
        is_active=db_trip.is_active,
        created_at=db_trip.created_at,
        updated_at=db_trip.updated_at,
        company_name=db_company.name if db_company else "",
        schedules=[schemas.TripScheduleResponse(
            id=s.id,
            trip_id=s.trip_id,
            destination=s.destination,
            departure_datetime=s.departure_datetime,
            vehicle_id=s.vehicle_id,
            driver_id=s.driver_id,
            passenger_count=s.passenger_count,
            notes=s.notes,
            created_at=s.created_at,
            updated_at=s.updated_at,
            vehicle_number=s.vehicle.vehicle_number if s.vehicle else None,
            driver_name=s.driver.full_name if s.driver else None
        ) for s in db_trip.schedules]
    )
    
    return trip_response

@router.get("/", response_model=List[schemas.TripResponse])
def read_trips(
    skip: int = 0,
    limit: int = 100,
    company_id: int = None,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Trip).filter(
        models.Trip.owner_id == current_user.id
    )
    
    if company_id:
        query = query.filter(models.Trip.company_id == company_id)
    
    trips = query.offset(skip).limit(limit).all()
    
    # Build responses with nested data
    result = []
    for trip in trips:
        company = db.query(models.Company).filter(models.Company.id == trip.company_id).first()
        result.append(schemas.TripResponse(
            id=trip.id,
            owner_id=trip.owner_id,
            company_id=trip.company_id,
            trip_code=trip.trip_code,
            name=trip.name,
            address=trip.address,
            is_active=trip.is_active,
            created_at=trip.created_at,
            updated_at=trip.updated_at,
            company_name=company.name if company else "",
            schedules=[schemas.TripScheduleResponse(
                id=s.id,
                trip_id=s.trip_id,
                destination=s.destination,
                departure_datetime=s.departure_datetime,
                vehicle_id=s.vehicle_id,
                driver_id=s.driver_id,
                passenger_count=s.passenger_count,
                notes=s.notes,
                created_at=s.created_at,
                updated_at=s.updated_at,
                vehicle_number=s.vehicle.vehicle_number if s.vehicle else None,
                driver_name=s.driver.full_name if s.driver else None
            ) for s in trip.schedules]
        ))
    
    return result

@router.get("/{trip_id}", response_model=schemas.TripResponse)
def read_trip(
    trip_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user.id
    ).first()
    if db_trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    company = db.query(models.Company).filter(models.Company.id == db_trip.company_id).first()
    
    return schemas.TripResponse(
        id=db_trip.id,
        owner_id=db_trip.owner_id,
        company_id=db_trip.company_id,
        trip_code=db_trip.trip_code,
        name=db_trip.name,
        address=db_trip.address,
        is_active=db_trip.is_active,
        created_at=db_trip.created_at,
        updated_at=db_trip.updated_at,
        company_name=company.name if company else "",
        schedules=[schemas.TripScheduleResponse(
            id=s.id,
            trip_id=s.trip_id,
            destination=s.destination,
            departure_datetime=s.departure_datetime,
            vehicle_id=s.vehicle_id,
            driver_id=s.driver_id,
            passenger_count=s.passenger_count,
            notes=s.notes,
            created_at=s.created_at,
            updated_at=s.updated_at,
            vehicle_number=s.vehicle.vehicle_number if s.vehicle else None,
            driver_name=s.driver.full_name if s.driver else None
        ) for s in db_trip.schedules]
    )

@router.put("/{trip_id}", response_model=schemas.TripResponse)
def update_trip(
    trip_id: int,
    trip_update: schemas.TripUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user.id
    ).first()
    if db_trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Handle company name update
    update_data = trip_update.dict(exclude_unset=True)
    company = None
    if 'company_name' in update_data:
        company_name = update_data.pop('company_name')
        # Find or create company
        db_company = db.query(models.Company).filter(
            models.Company.name == company_name,
            models.Company.owner_id == current_user.id
        ).first()
        
        if db_company is None:
            # Create new company with default dates
            from datetime import datetime, timedelta
            today = datetime.now()
            db_company = models.Company(
                owner_id=current_user.id,
                name=company_name,
                service_start_date=today,
                service_end_date=today + timedelta(days=365)  # Default 1 year
            )
            db.add(db_company)
            db.flush()
        
        db_trip.company_id = db_company.id
        company = db_company
    
    for field, value in update_data.items():
        setattr(db_trip, field, value)
    
    if not company:
        company = db.query(models.Company).filter(models.Company.id == db_trip.company_id).first()
    
    db.commit()
    db.refresh(db_trip)
    
    company = db.query(models.Company).filter(models.Company.id == db_trip.company_id).first()
    
    return schemas.TripResponse(
        id=db_trip.id,
        owner_id=db_trip.owner_id,
        company_id=db_trip.company_id,
        trip_code=db_trip.trip_code,
        name=db_trip.name,
        address=db_trip.address,
        is_active=db_trip.is_active,
        created_at=db_trip.created_at,
        updated_at=db_trip.updated_at,
        company_name=company.name if company else "",
        schedules=[schemas.TripScheduleResponse(
            id=s.id,
            trip_id=s.trip_id,
            destination=s.destination,
            departure_datetime=s.departure_datetime,
            vehicle_id=s.vehicle_id,
            driver_id=s.driver_id,
            passenger_count=s.passenger_count,
            notes=s.notes,
            created_at=s.created_at,
            updated_at=s.updated_at,
            vehicle_number=s.vehicle.vehicle_number if s.vehicle else None,
            driver_name=s.driver.full_name if s.driver else None
        ) for s in db_trip.schedules]
    )

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user.id
    ).first()
    if db_trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    db.delete(db_trip)
    db.commit()
    return None

# Trip Schedule endpoints
@router.post("/{trip_id}/schedules/", response_model=schemas.TripScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_trip_schedule(
    trip_id: int,
    schedule: schemas.TripScheduleCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_trip = db.query(models.Trip).filter(
        models.Trip.id == trip_id,
        models.Trip.owner_id == current_user.id
    ).first()
    if db_trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    # Validate vehicle and driver assignments
    if schedule.vehicle_id:
        # Check if vehicle is already assigned to another schedule at this time
        existing_schedule = db.query(models.TripSchedule).filter(
            models.TripSchedule.vehicle_id == schedule.vehicle_id,
            models.TripSchedule.departure_datetime == schedule.departure_datetime,
            models.TripSchedule.id != schedule.id if hasattr(schedule, 'id') else True
        ).first()
        if existing_schedule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is already assigned to another trip at this time"
            )
        
        # Verify vehicle belongs to user
        db_vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == schedule.vehicle_id,
            models.Vehicle.owner_id == current_user.id
        ).first()
        if db_vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )
    
    if schedule.driver_id:
        # Check if driver is already assigned to another schedule at this time
        existing_schedule = db.query(models.TripSchedule).filter(
            models.TripSchedule.driver_id == schedule.driver_id,
            models.TripSchedule.departure_datetime == schedule.departure_datetime,
            models.TripSchedule.id != schedule.id if hasattr(schedule, 'id') else True
        ).first()
        if existing_schedule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver is already assigned to another trip at this time"
            )
        
        # Verify driver belongs to user
        db_driver = db.query(models.Driver).filter(
            models.Driver.id == schedule.driver_id,
            models.Driver.owner_id == current_user.id
        ).first()
        if db_driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found"
            )
    
    db_schedule = models.TripSchedule(**schedule.dict(), trip_id=trip_id)
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    # Load relationships for response
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == db_schedule.vehicle_id).first() if db_schedule.vehicle_id else None
    driver = db.query(models.Driver).filter(models.Driver.id == db_schedule.driver_id).first() if db_schedule.driver_id else None
    
    return schemas.TripScheduleResponse(
        id=db_schedule.id,
        trip_id=db_schedule.trip_id,
        destination=db_schedule.destination,
        departure_datetime=db_schedule.departure_datetime,
        vehicle_id=db_schedule.vehicle_id,
        driver_id=db_schedule.driver_id,
        passenger_count=db_schedule.passenger_count,
        notes=db_schedule.notes,
        created_at=db_schedule.created_at,
        updated_at=db_schedule.updated_at,
        vehicle_number=vehicle.vehicle_number if vehicle else None,
        driver_name=driver.full_name if driver else None
    )

@router.put("/schedules/{schedule_id}", response_model=schemas.TripScheduleResponse)
def update_trip_schedule(
    schedule_id: int,
    schedule_update: schemas.TripScheduleUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_schedule = db.query(models.TripSchedule).join(models.Trip).filter(
        models.TripSchedule.id == schedule_id,
        models.Trip.owner_id == current_user.id
    ).first()
    if db_schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    update_data = schedule_update.dict(exclude_unset=True)
    
    # Get new values for validation
    new_vehicle_id = update_data.get('vehicle_id', db_schedule.vehicle_id)
    new_driver_id = update_data.get('driver_id', db_schedule.driver_id)
    new_departure_datetime = update_data.get('departure_datetime', db_schedule.departure_datetime)
    
    # Validate vehicle assignment
    if new_vehicle_id:
        existing_schedule = db.query(models.TripSchedule).filter(
            models.TripSchedule.vehicle_id == new_vehicle_id,
            models.TripSchedule.departure_datetime == new_departure_datetime,
            models.TripSchedule.id != schedule_id
        ).first()
        if existing_schedule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is already assigned to another trip at this time"
            )
        
        db_vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == new_vehicle_id,
            models.Vehicle.owner_id == current_user.id
        ).first()
        if db_vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )
    
    # Validate driver assignment
    if new_driver_id:
        existing_schedule = db.query(models.TripSchedule).filter(
            models.TripSchedule.driver_id == new_driver_id,
            models.TripSchedule.departure_datetime == new_departure_datetime,
            models.TripSchedule.id != schedule_id
        ).first()
        if existing_schedule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver is already assigned to another trip at this time"
            )
        
        db_driver = db.query(models.Driver).filter(
            models.Driver.id == new_driver_id,
            models.Driver.owner_id == current_user.id
        ).first()
        if db_driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found"
            )
    
    for field, value in update_data.items():
        setattr(db_schedule, field, value)
    
    db.commit()
    db.refresh(db_schedule)
    
    # Load relationships for response
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == db_schedule.vehicle_id).first() if db_schedule.vehicle_id else None
    driver = db.query(models.Driver).filter(models.Driver.id == db_schedule.driver_id).first() if db_schedule.driver_id else None
    
    return schemas.TripScheduleResponse(
        id=db_schedule.id,
        trip_id=db_schedule.trip_id,
        destination=db_schedule.destination,
        departure_datetime=db_schedule.departure_datetime,
        vehicle_id=db_schedule.vehicle_id,
        driver_id=db_schedule.driver_id,
        passenger_count=db_schedule.passenger_count,
        notes=db_schedule.notes,
        created_at=db_schedule.created_at,
        updated_at=db_schedule.updated_at,
        vehicle_number=vehicle.vehicle_number if vehicle else None,
        driver_name=driver.full_name if driver else None
    )

@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip_schedule(
    schedule_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_schedule = db.query(models.TripSchedule).join(models.Trip).filter(
        models.TripSchedule.id == schedule_id,
        models.Trip.owner_id == current_user.id
    ).first()
    if db_schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    db.delete(db_schedule)
    db.commit()
    return None


