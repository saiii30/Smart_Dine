from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from datetime import date, datetime, time
import uuid
import json
import logging

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/api/trip-schedules",
    tags=["Trip Schedules"],
)

logger = logging.getLogger(__name__)

def _validate_trip_schedule(
    db: Session,
    schedule: schemas.TripScheduleCreate,
    current_user: models.User,
    exclude_trip_id: str = None
) -> None:
    """Validate trip schedule data and check for conflicts."""
    # Check vehicle availability if assigned
    if schedule.vehicle_id:
        # Check for time conflicts with other trips
        conflict_query = db.query(models.TripSchedule).filter(
            models.TripSchedule.vehicle_id == schedule.vehicle_id,
            models.TripSchedule.start_time == schedule.start_time,
            models.TripSchedule.id != exclude_trip_id if exclude_trip_id else True
        )
        
        if conflict_query.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is already assigned to another trip at this time"
            )
        
        # Verify vehicle exists and belongs to the agency
        vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == schedule.vehicle_id,
            models.Vehicle.agency_id == current_user.agency_id
        ).first()
        
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found or not authorized"
            )
    
    # Check driver availability if assigned
    if schedule.driver_id:
        # Check for time conflicts with other trips
        conflict_query = db.query(models.TripSchedule).filter(
            models.TripSchedule.driver_id == schedule.driver_id,
            models.TripSchedule.start_time == schedule.start_time,
            models.TripSchedule.id != exclude_trip_id if exclude_trip_id else True
        )
        
        if conflict_query.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver is already assigned to another trip at this time"
            )
        
        # Verify driver exists and belongs to the agency
        driver = db.query(models.Driver).filter(
            models.Driver.id == schedule.driver_id,
            models.Driver.agency_id == current_user.agency_id
        ).first()
        
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found or not authorized"
            )
    
    # Verify company exists and belongs to the agency
    company = db.query(models.Company).filter(
        models.Company.id == schedule.company_id,
        models.Company.agency_id == current_user.agency_id
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found or not authorized"
        )

def _get_trip_query(db: Session):
    """Helper function to get a base query with eager loading."""
    return db.query(models.TripSchedule).options(
        joinedload(models.TripSchedule.vehicle),
        joinedload(models.TripSchedule.driver).joinedload(models.Driver.user),
        joinedload(models.TripSchedule.company)
    )

@router.post("/", response_model=schemas.TripScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_trip_schedule(
    schedule: schemas.TripScheduleCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new trip schedule."""
    try:
        # Validate the trip schedule data
        _validate_trip_schedule(db, schedule, current_user)
        
        # Prepare the data for creation
        schedule_data = schedule.dict(exclude_unset=True)
        
        # Handle route_points serialization
        if 'route_points' in schedule_data and schedule_data['route_points'] is not None:
            schedule_data['route_points'] = json.dumps(schedule_data['route_points'])
        
        # Create the trip schedule
        db_schedule = models.TripSchedule(
            id=str(uuid.uuid4()),
            agency_id=current_user.agency_id,
            user_id=current_user.id,
            **schedule_data
        )
        
        db.add(db_schedule)
        db.commit()
        
        # Reload the schedule with all relationships
        db_schedule = _get_trip_query(db).filter(
            models.TripSchedule.id == db_schedule.id
        ).first()
        
        return db_schedule

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating trip schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the trip schedule"
        )

@router.get("/{schedule_id}", response_model=schemas.TripScheduleResponse)
async def get_trip_schedule(
    schedule_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific trip schedule by ID."""
    db_schedule = _get_trip_query(db).filter(
        models.TripSchedule.id == schedule_id,
        models.TripSchedule.agency_id == current_user.agency_id
    ).first()

    if not db_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip schedule not found"
        )

    return db_schedule

@router.get("/", response_model=List[schemas.TripScheduleResponse])
async def get_trip_schedules(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all trip schedules for the current user's agency."""
    trip_schedules = _get_trip_query(db).filter(
        models.TripSchedule.agency_id == current_user.agency_id
    ).offset(skip).limit(limit).all()
    
    return trip_schedules

@router.put("/{schedule_id}", response_model=schemas.TripScheduleResponse)
async def update_trip_schedule(
    schedule_id: str,
    schedule: schemas.TripScheduleUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a trip schedule."""
    try:
        # Get the existing trip schedule
        db_schedule = _get_trip_query(db).filter(
            models.TripSchedule.id == schedule_id,
            models.TripSchedule.agency_id == current_user.agency_id
        ).first()

        if not db_schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip schedule not found"
            )

        # Convert to a create schema for validation
        create_schema = schemas.TripScheduleCreate(
            **{**db_schedule.__dict__, **schedule.dict(exclude_unset=True)}
        )
        
        # Validate the updated data
        _validate_trip_schedule(db, create_schema, current_user, exclude_trip_id=schedule_id)

        # Update the model instance
        update_data = schedule.dict(exclude_unset=True)
        
        # Handle route_points serialization if present
        if 'route_points' in update_data and update_data['route_points'] is not None:
            update_data['route_points'] = json.dumps(update_data['route_points'])
        
        # Update fields
        for field, value in update_data.items():
            setattr(db_schedule, field, value)
        
        db_schedule.updated_at = datetime.utcnow()
        db.commit()
        
        # Reload with all relationships
        db.refresh(db_schedule)
        return db_schedule

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating trip schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the trip schedule"
        )

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip_schedule(
    schedule_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a trip schedule."""
    try:
        db_schedule = _get_trip_query(db).filter(
            models.TripSchedule.id == schedule_id,
            models.TripSchedule.agency_id == current_user.agency_id
        ).first()

        if not db_schedule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip schedule not found"
            )

        db.delete(db_schedule)
        db.commit()
        return None

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting trip schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the trip schedule"
        )


 # get all trips assigned to driver id
@router.get("/agency/{agency_id}/driver/{driver_id}", response_model=List[schemas.TripScheduleResponse])
async def get_trips_by_driver_and_agency(
    agency_id: str,
    driver_id: str,
    start_date: Optional[date] = Query(None, description="Filter trips starting on or after this date"),
    end_date: Optional[date] = Query(None, description="Filter trips starting on or before this date"),
    status: Optional[str] = Query(None, description="Filter by trip status"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all trips assigned to a specific driver within a specific agency.
    Uses SQLAlchemy relationships and Pydantic ORM mode for optimized queries.
    """
    from sqlalchemy.orm import joinedload
    
    # Check if the current user has access to the requested agency
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN] and str(current_user.agency_id) != str(agency_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access trips from this agency"
        )

    # Verify the driver exists and belongs to the specified agency
    driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id,
        models.Driver.agency_id == agency_id
    ).first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found in the specified agency"
        )
    
    # Build the base query with eager loading of relationships
    query = db.query(models.TripSchedule).options(
        joinedload(models.TripSchedule.vehicle),
        joinedload(models.TripSchedule.driver).joinedload(models.Driver.user),
        joinedload(models.TripSchedule.company)
    ).filter(
        models.TripSchedule.driver_id == driver_id,
        models.TripSchedule.agency_id == agency_id
    )
    
    # Apply date filters if provided
    if start_date:
        query = query.filter(models.TripSchedule.start_date >= start_date)
    if end_date:
        query = query.filter(models.TripSchedule.start_date <= end_date)
    if status:
        query = query.filter(models.TripSchedule.status == status)
    
    # Execute query and return results
    trips = query.order_by(
        models.TripSchedule.start_date,
        models.TripSchedule.start_time
    ).all()
    
    return trips
 
@router.put("/driver/{trip_id}", response_model=schemas.TripScheduleResponse)
async def update_trip_by_driver(
    trip_id: str,
    trip_update: schemas.TripUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update trip details by driver."""
    try:
        # Get the trip schedule with relationships
        db_trip = _get_trip_query(db).filter(
            models.TripSchedule.id == trip_id,
            models.TripSchedule.driver_id == current_user.driver.id
        ).first()

        if not db_trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found or not assigned to this driver"
            )

        # Update the trip with the new data
        update_data = trip_update.dict(exclude_unset=True)
        
        # Handle route_points serialization if present
        if 'route_points' in update_data and update_data['route_points'] is not None:
            update_data['route_points'] = json.dumps(update_data['route_points'])
        
        # Update the model instance
        for field, value in update_data.items():
            setattr(db_trip, field, value)
        
        db_trip.updated_at = datetime.utcnow()
        db.commit()
        
        # Reload with all relationships
        db.refresh(db_trip)
        return db_trip

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating trip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the trip"
        )

@router.get("/agency/{agency_id}/active-trips", response_model=List[schemas.TripScheduleResponse])
async def get_active_trips_for_agency(
    agency_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all active trips for an agency."""
    # Check if the current user has access to the requested agency
    if (current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN] and 
        str(current_user.agency_id) != str(agency_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access trips from this agency"
        )

    current_time = datetime.utcnow().time()
    current_date = datetime.utcnow().date()

    # Get all active trips for the agency
    active_trips = _get_trip_query(db).filter(
        models.TripSchedule.agency_id == agency_id,
        models.TripSchedule.is_active == True,
        models.TripSchedule.start_date <= current_date,
        models.TripSchedule.end_date >= current_date,
        models.TripSchedule.start_time <= current_time,
        models.TripSchedule.end_time >= current_time
    ).all()

    return active_trips

@router.get("/update-status", response_model=List[schemas.TripStatusResponse])
async def update_trip_statuses(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually trigger an update of trip statuses based on current time."""
    from ..utils.trip_scheduler import update_trip_schedule_status

    try:
        updated_trips = update_trip_schedule_status(db)
        return updated_trips
    except Exception as e:
        logger.error(f"Error updating trip statuses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating trip statuses"
        )

@router.get("/{trip_id}/status", response_model=schemas.TripStatusResponse)
async def get_trip_status(
    trip_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get the status of a specific trip."""
    from ..utils.trip_scheduler import check_trip_active_status

    trip = _get_trip_query(db).filter(
        models.TripSchedule.id == trip_id,
        models.TripSchedule.agency_id == current_user.agency_id
    ).first()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    is_active = check_trip_active_status(trip)
    
    # Update the trip status if needed
    if is_active != trip.is_active:
        trip.is_active = is_active
        trip.status_updated_at = datetime.utcnow()
        db.commit()
        db.refresh(trip)

    return {
        "trip_id": trip.id,
        "is_active": is_active,
        "end_date": trip.end_date,
        "current_date": datetime.utcnow(),
        "status_updated_at": trip.status_updated_at
    }
