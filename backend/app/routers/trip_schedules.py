import logging
logger = logging.getLogger(__name__)
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(
    tags=["Trip Schedules"],
    dependencies=[Depends(auth.get_current_active_user)]
)


@router.post("/", response_model=schemas.TripScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_trip_schedule(
    schedule: schemas.TripScheduleCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    
    # Validate vehicle and driver assignments
    if schedule.vehicle_id:
        # Check if vehicle is already assigned to another schedule at the same time
        existing_schedule = db.query(models.TripSchedule).filter(
            models.TripSchedule.vehicle_id == schedule.vehicle_id,
            models.TripSchedule.start_time == schedule.start_time,
            models.TripSchedule.id != schedule.id if hasattr(schedule, 'id') else True
        ).first()
        if existing_schedule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is already assigned to another trip at this time"
            )
        
        # Verify vehicle belongs to user's agency
        db_vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == schedule.vehicle_id,
            models.Vehicle.agency_id == current_user.agency_id
        ).first()
        if db_vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found or not authorized"
            )
    
    if schedule.driver_id:
        # Check if driver is already assigned to another schedule at the same time
        existing_schedule = db.query(models.TripSchedule).filter(
            models.TripSchedule.driver_id == schedule.driver_id,
            models.TripSchedule.start_time == schedule.start_time,
            models.TripSchedule.id != schedule.id if hasattr(schedule, 'id') else True
        ).first()
        if existing_schedule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver is already assigned to another trip at this time"
            )
        
        # Verify driver belongs to user's agency
        db_driver = db.query(models.Driver).filter(
            models.Driver.id == schedule.driver_id,
            models.Driver.agency_id == current_user.agency_id
        ).first()
        if db_driver is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found or not authorized"
            )
    
    # Validate company exists and belongs to user's agency
    db_company = db.query(models.Company).filter(
        models.Company.id == schedule.company_id,
        models.Company.agency_id == current_user.agency_id
    ).first()
    
    if not db_company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found or not authorized"
        )
    
    # Create the trip schedule with only the fields that exist in the model
    schedule_data = schedule.dict()
    
    # Only keep fields that exist in the TripSchedule model
    valid_fields = {
        'company_id', 'company_name', 'company_branch',
        'start_date', 'end_date', 'start_time', 'end_time',
        'starting_point', 'end_point', 'way', 'trip_type',
        'vehicle_id', 'driver_id', 'passenger_count', 'notes', 'is_active'
    }
    
    filtered_data = {k: v for k, v in schedule_data.items() if k in valid_fields}
    
    db_schedule = models.TripSchedule(
        id=str(uuid.uuid4()),  # Generate UUID for the schedule
        agency_id=current_user.agency_id,
        user_id=current_user.id,
        **filtered_data
    )
    
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    # Load relationships for response
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == db_schedule.vehicle_id).first() if db_schedule.vehicle_id else None
    driver = db.query(models.Driver).filter(models.Driver.id == db_schedule.driver_id).first() if db_schedule.driver_id else None
    
    return schemas.TripScheduleResponse(
        id=db_schedule.id,
        agency_id=db_schedule.agency_id,
        user_id=db_schedule.user_id,
        company_id=db_schedule.company_id,
        company_name=db_schedule.company_name,
        company_branch=db_schedule.company_branch,
        start_date=db_schedule.start_date,
        end_date=db_schedule.end_date,
        starting_point=db_schedule.starting_point,
        end_point=db_schedule.end_point,
        start_time=db_schedule.start_time,
        end_time=db_schedule.end_time,
        way=db_schedule.way,
        trip_type=db_schedule.trip_type,
        vehicle_id=db_schedule.vehicle_id,
        driver_id=db_schedule.driver_id,
        passenger_count=db_schedule.passenger_count,
        notes=db_schedule.notes,
        is_active=db_schedule.is_active,
        created_at=db_schedule.created_at,
        updated_at=db_schedule.updated_at,
        vehicle_registration_number=vehicle.vehicle_registration_number if vehicle else None,
        driver_name=driver.user.name if (driver and driver.user) else None
    )

@router.get("/{schedule_id}", response_model=schemas.TripScheduleResponse)
async def get_trip_schedule(
    schedule_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_schedule = db.query(models.TripSchedule).filter(
        models.TripSchedule.id == schedule_id,
        models.TripSchedule.agency_id == current_user.agency_id
    ).first()
    
    if db_schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip schedule not found or not authorized"
        )
    
    # Load relationships for response
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == db_schedule.vehicle_id).first() if db_schedule.vehicle_id else None
    driver = db.query(models.Driver).filter(models.Driver.id == db_schedule.driver_id).first() if db_schedule.driver_id else None
    company = db.query(models.Company).filter(models.Company.id == db_schedule.company_id).first() if db_schedule.company_id else None
    
    # Create response with relationships
    response = {
        **db_schedule.__dict__,
        "vehicle_registration_number": vehicle.vehicle_registration_number if vehicle else None,
        "driver_name": driver.user.name if (driver and hasattr(driver, 'user') and driver.user) else None,
        "company_name": company.company_name if company else None,
        "company_branch": company.company_branch if company else None
    }
    
    return schemas.TripScheduleResponse(**response)

    
@router.get("/", response_model=List[schemas.TripScheduleResponse])
async def get_trip_schedules(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    schedules = db.query(models.TripSchedule).filter(
        models.TripSchedule.agency_id == current_user.agency_id
    ).offset(skip).limit(limit).all()
    
    result = []
    for schedule in schedules:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == schedule.vehicle_id).first() if schedule.vehicle_id else None
        driver = db.query(models.Driver).filter(models.Driver.id == schedule.driver_id).first() if schedule.driver_id else None
        company = db.query(models.Company).filter(models.Company.id == schedule.company_id).first() if schedule.company_id else None
        
        # Get the driver's name from the user relationship
        driver_name = driver.user.name if (driver and hasattr(driver, 'user') and driver.user) else None
        
        result.append(schemas.TripScheduleResponse(
            id=schedule.id,
            agency_id=schedule.agency_id,  # Added agency_id
            user_id=schedule.user_id,  # Added user_id
            company_id=schedule.company_id,
            company_name=company.company_name if company else schedule.company_name,
            company_branch=company.company_branch if company else schedule.company_branch,
            start_date=schedule.start_date,
            end_date=schedule.end_date,
            starting_point=schedule.starting_point,
            end_point=schedule.end_point,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            way=schedule.way,
            trip_type=schedule.trip_type,
            vehicle_id=schedule.vehicle_id,
            driver_id=schedule.driver_id,
            passenger_count=schedule.passenger_count,
            notes=schedule.notes,
            is_active=schedule.is_active,  # Added is_active
            created_at=schedule.created_at,
            updated_at=schedule.updated_at,
            vehicle_registration_number=vehicle.vehicle_registration_number if vehicle else None,
            driver_name=driver_name
        ))
    
    return result

@router.put("/{schedule_id}", response_model=schemas.TripScheduleResponse)
async def update_trip_schedule(
    schedule_id: str,
    schedule_update: schemas.TripScheduleUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        # Start transaction
        db_schedule = db.query(models.TripSchedule).filter(
            models.TripSchedule.id == schedule_id,
            models.TripSchedule.agency_id == current_user.agency_id
        ).first()
        
        if not db_schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Schedule not found or not authorized"
            )

        # Create a copy of current data for logging
        original_data = {c.name: getattr(db_schedule, c.name) for c in db_schedule.__table__.columns}
        
        # Get update data and log the update
        update_data = schedule_update.dict(exclude_unset=True)
        logger.info(f"Updating schedule {schedule_id}. Original: {original_data}, Updates: {update_data}")

        # Validate and update relationships
        if 'vehicle_id' in update_data:
            if update_data['vehicle_id']:
                vehicle = db.query(models.Vehicle).filter(
                    models.Vehicle.id == update_data['vehicle_id'],
                    models.Vehicle.agency_id == current_user.agency_id
                ).first()
                if not vehicle:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Vehicle not found or not authorized"
                    )
            else:
                update_data['vehicle_id'] = None

        if 'driver_id' in update_data:
            if update_data['driver_id']:
                driver = db.query(models.Driver).filter(
                    models.Driver.id == update_data['driver_id'],
                    models.Driver.agency_id == current_user.agency_id
                ).first()
                if not driver:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Driver not found or not authorized"
                    )
            else:
                update_data['driver_id'] = None

        # Update the schedule
        for field, value in update_data.items():
            if hasattr(db_schedule, field):
                setattr(db_schedule, field, value)

        db_schedule.updated_at = datetime.now(timezone.utc)
        
        # Commit changes
        db.commit()
        db.refresh(db_schedule)

        # Get updated data with relationships
        updated_schedule = db.query(models.TripSchedule).get(schedule_id)
        if not updated_schedule:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve updated schedule"
            )

        # Build response
        response_data = {
            **{c.name: getattr(updated_schedule, c.name) for c in updated_schedule.__table__.columns},
            "vehicle_registration_number": updated_schedule.vehicle.vehicle_registration_number if updated_schedule.vehicle_id else None,
            "driver_name": updated_schedule.driver.user.name if (updated_schedule.driver_id and updated_schedule.driver and hasattr(updated_schedule.driver, 'user') and updated_schedule.driver.user) else None,
            "company_name": updated_schedule.company.company_name if updated_schedule.company_id else getattr(updated_schedule, 'company_name', None),
            "company_branch": updated_schedule.company.company_branch if updated_schedule.company_id else getattr(updated_schedule, 'company_branch', None)
        }

        logger.info(f"Successfully updated schedule {schedule_id}")
        return schemas.TripScheduleResponse(**response_data)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating schedule {schedule_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update schedule: {str(e)}"
        )

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip_schedule(
    schedule_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    db_schedule = db.query(models.TripSchedule).filter(
        models.TripSchedule.id == schedule_id,
        models.TripSchedule.agency_id == current_user.agency_id
    ).first()
    
    if db_schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found or not authorized"
        )
    
    db.delete(db_schedule)
    db.commit()
    return None
