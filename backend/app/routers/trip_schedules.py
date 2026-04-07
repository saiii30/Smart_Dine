from fastapi import APIRouter, Depends, HTTPException , Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime , date, time, timedelta
import uuid
import json
import logging

from ..database import get_db
from .. import models, schemas, auth

def parse_time(t):
    """Parse time from various formats"""
    if isinstance(t, time):
        return t
    if isinstance(t, str):
        try:
            return datetime.strptime(t, "%H:%M").time()
        except ValueError:
            try:
                return datetime.strptime(t, "%H:%M:%S").time()
            except ValueError:
                return None
    return None

router = APIRouter(tags=["Trip Schedules"])
logger = logging.getLogger(__name__)

# -------------------------------------------------------
# Base Query
# -------------------------------------------------------

def _base_query(db: Session):
    return db.query(models.TripSchedule).options(
        joinedload(models.TripSchedule.vehicle),
        joinedload(models.TripSchedule.driver).joinedload(models.Driver.user),
        joinedload(models.TripSchedule.company)
    )

def _serialize_trip(trip):
    if not trip:
        return None

    # Convert route_point
    route_point = None
    if trip.route_point:
        try:
            route_point = json.loads(trip.route_point)
        except:
            route_point = None

    return {
        "id": trip.id,
        "agency_id": trip.agency_id,
        "user_id": trip.user_id,
        "company_id": trip.company_id,
        "company_name": trip.company.company_name if trip.company else None,
        "company_branch": trip.company.company_branch if trip.company else None,

        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "one_way_start_time": trip.one_way_start_time,
        "two_way_start_time": trip.two_way_start_time,
        "end_time": trip.end_time,
        "starting_point": trip.starting_point,
        "end_point": trip.end_point,
        "way": trip.way,
        "trip_type": trip.trip_type,

        "vehicle_id": trip.vehicle_id,
        "driver_id": trip.driver_id,
        "passenger_count": trip.passenger_count,
        "notes": trip.notes,

        "distance_km": trip.distance_km,
        "duration_min": trip.duration_min,
        "starting_lat": trip.starting_lat,
        "starting_lng": trip.starting_lng,
        "end_lat": trip.end_lat,
        "end_lng": trip.end_lng,

        "route_point": route_point,
        "status": trip.status,
        "driver_response": trip.driver_response,
        "driver_reason": trip.driver_reason,
        "driver_response_at": trip.driver_response_at,
        "status_updated_at": trip.status_updated_at,
        "one_way_isActive": trip.one_way_is_active,      # Frontend expects camelCase
        "two_way_isActive": trip.two_way_is_active,      # Frontend expects camelCase

        "is_active": trip.is_active,
        "created_at": trip.created_at,
        "updated_at": trip.updated_at,

        # IMPORTANT PART
        "vehicle_registration_number": trip.vehicle.vehicle_registration_number
        if trip.vehicle else None,

        "driver_name": trip.driver.user.name
        if trip.driver and trip.driver.user else None,
    }

# -------------------------------------------------------
# Helper Functions
# -------------------------------------------------------

def calculate_trip_end_time(schedule_data: dict) -> Optional[time]:
    """
    Calculate end time based on trip type and start times
    
    Logic:
    - One-way trip: End Time = one_way_start_time + duration + 20min buffer
    - Two-way trip: Calculate each leg separately, use later end time
      * First leg: one_way_start_time + duration + 20min buffer
      * Return leg: two_way_start_time + duration + 20min buffer
      * Overall end time = max(first_leg_end, return_leg_end)
    - No general start_time field exists - trip must be one-way or two-way
    
    For two-way trips, each leg is calculated separately and the later
    end time is used to ensure complete trip coverage.
    
    Args:
        schedule_data: Dictionary containing trip schedule data
        
    Returns:
        time: Calculated end time, or None if calculation fails
    """
    try:
        duration_min = schedule_data.get('duration_min')
        if not duration_min:
            return None
            
        # Check which trip type is active - properly handle boolean values
        one_way_is_active = schedule_data.get('one_way_is_active')
        two_way_is_active = schedule_data.get('two_way_is_active')
        
        # CRITICAL DEBUG: Log flags immediately with types and values
        print(f"DEBUG FLAGS: one_way={one_way_is_active} (type: {type(one_way_is_active)}), two_way={two_way_is_active} (type: {type(two_way_is_active)})")  # Console print
        print(f"DEBUG SCHEDULE_DATA: {schedule_data}")  # Console print
        logger.info(f"FLAGS -> one_way: {one_way_is_active}, two_way: {two_way_is_active}")
        
        # Check the conditions explicitly
        print(f"DEBUG CONDITIONS:")
        print(f"  one_way_is_active and not two_way_is_active: {one_way_is_active and not two_way_is_active}")
        print(f"  two_way_is_active: {two_way_is_active}")
        print(f"  one_way_is_active: {one_way_is_active}")
        
        # 🔥 SIMPLE LOGIC: Use specific start time based on trip type
        if one_way_is_active and not two_way_is_active:
            # One-way trip: one_way_is_active=true, two_way_is_active=false
            start_time = parse_time(schedule_data.get('one_way_start_time'))
            
            logger.info(f"One-way trip calculation - duration: {duration_min}")
            logger.info(f"Using one_way_start_time: {start_time}")
            
            # Validation: one-way requires one_way_start_time
            if not start_time:
                logger.error("One-way trip requires one_way_start_time")
                return None
                
            # Calculate end time
            end_datetime = datetime.combine(date.today(), start_time) + timedelta(minutes=duration_min + 20)
            logger.info(f"One-way trip: {start_time} -> {end_datetime.time()}")
            return end_datetime.time()
            
        elif two_way_is_active:
            # Two-way trip: one_way_is_active=true, two_way_is_active=true
            start_time = parse_time(schedule_data.get('two_way_start_time'))
            
            logger.info(f"Two-way trip calculation - duration: {duration_min}")
            logger.info(f"Using two_way_start_time: {start_time}")
            
            # Validation: two-way requires two_way_start_time
            if not start_time:
                logger.error("Two-way trip requires two_way_start_time")
                raise HTTPException(400, "Two-way trip requires two_way_start_time")
                return None
                
            # Calculate end time
            end_datetime = datetime.combine(date.today(), start_time) + timedelta(minutes=duration_min + 20)
            logger.info(f"Two-way trip: {start_time} -> {end_datetime.time()}")
            return end_datetime.time()
            
        else:
            # No general start_time field exists - trip must be one-way or two-way
            logger.error("No valid trip type flags found")
            return None
        
    except Exception as e:
        logger.error(f"Error calculating end time: {str(e)}")
        return None

# -------------------------------------------------------
# Serialize route_point (JSON string → List)
# -------------------------------------------------------

def _serialize_route_point(trip):
    if trip and trip.route_point:
        if isinstance(trip.route_point, str):
            try:
                trip.route_point = json.loads(trip.route_point)
            except:
                trip.route_point = None
    return trip


# -------------------------------------------------------
# Validation & Conflict Check
# -------------------------------------------------------
 
def _validate_trip(
    db: Session,
    schedule: schemas.TripScheduleCreate,
    current_user: models.User,
    exclude_trip_id: Optional[str] = None
):
 
    # Validate Company
    company = db.query(models.Company).filter(
        models.Company.id == schedule.company_id,
        models.Company.agency_id == current_user.agency_id
    ).first()
 
    if not company:
        raise HTTPException(404, "Company not found or unauthorized")
 
    # Validate Vehicle
    if schedule.vehicle_id:
        vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == schedule.vehicle_id,
            models.Vehicle.agency_id == current_user.agency_id
        ).first()
 
        if not vehicle:
            raise HTTPException(404, "Vehicle not found or unauthorized")
 
    # Validate Driver
    if schedule.driver_id:
        driver = db.query(models.Driver).filter(
            models.Driver.id == schedule.driver_id,
            models.Driver.agency_id == current_user.agency_id
        ).first()
 
        if not driver:
            raise HTTPException(404, "Driver not found or unauthorized")
 
    # Overlap Conflict - Check based on trip type
    # First calculate the proposed end time for validation
    schedule_data = schedule.dict()
    calculated_end_time = calculate_trip_end_time(schedule_data)
    
    if not calculated_end_time:
        raise HTTPException(400, "Cannot calculate end time for trip validation")
    
    # Build time conflict conditions dynamically based on what's provided
    conflict_conditions = []
    
    # One-way trip overlap check
    if schedule.one_way_start_time is not None:
        conflict_conditions.append(
            and_(
                models.TripSchedule.one_way_is_active == True,
                models.TripSchedule.one_way_start_time.isnot(None),
                models.TripSchedule.one_way_start_time < calculated_end_time,
                models.TripSchedule.end_time > schedule.one_way_start_time
            )
        )
    
    # Two-way trip overlap checks
    if schedule.two_way_start_time is not None:
        # First leg overlap
        if schedule.one_way_start_time is not None:
            conflict_conditions.append(
                and_(
                    models.TripSchedule.two_way_is_active == True,
                    models.TripSchedule.one_way_start_time != None,
                    models.TripSchedule.one_way_start_time < calculated_end_time,
                    models.TripSchedule.end_time > schedule.one_way_start_time
                )
            )
        
        # Return leg overlap
        conflict_conditions.append(
            and_(
                models.TripSchedule.two_way_is_active == True,
                models.TripSchedule.two_way_start_time != None,
                models.TripSchedule.two_way_start_time < calculated_end_time,
                models.TripSchedule.end_time > schedule.two_way_start_time
            )
        )
    
    # Use OR to combine all conflict conditions
    time_conflict = or_(*conflict_conditions) if conflict_conditions else False
   
 
    conflict_query = db.query(models.TripSchedule).filter(
        models.TripSchedule.is_active == True,
        models.TripSchedule.start_date <= schedule.end_date,
        models.TripSchedule.end_date >= schedule.start_date,
        time_conflict
    )
 
    if exclude_trip_id:
        conflict_query = conflict_query.filter(
            models.TripSchedule.id != exclude_trip_id
        )
 
    if schedule.vehicle_id:
        if conflict_query.filter(
            models.TripSchedule.vehicle_id == schedule.vehicle_id
        ).first():
            raise HTTPException(400, "Vehicle already assigned during this time")
 
    if schedule.driver_id:
        if conflict_query.filter(
            models.TripSchedule.driver_id == schedule.driver_id
        ).first():
            raise HTTPException(400, "Driver already assigned during this time")
 

# -------------------------------------------------------
# CREATE
# -------------------------------------------------------
@router.post("/", response_model=schemas.TripScheduleResponse, status_code=201)
def create_trip(
    schedule: schemas.TripScheduleCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"=== Creating new trip ===")
        logger.info(f"Input schedule data: {schedule.dict()}")
        
        _validate_trip(db, schedule, current_user)
        logger.info("Validation passed")

        # Convert to dict and keep boolean fields even if False
        schedule_dict = schedule.dict()
        print(f"🔴 DEBUG CREATE RAW DATA: {schedule_dict}")  # Console print
        
        # Only exclude truly None values, but keep boolean False values
        data = {k: v for k, v in schedule_dict.items() 
                 if v is not None or isinstance(v, bool)}
        print(f"🔴 DEBUG CREATE FILTERED DATA: {data}")  # Console print
        logger.info(f"Filtered data: {data}")

        # Remove keys that are set manually
        data.pop("agency_id", None)
        data.pop("user_id", None)

        if "route_point" in data and data["route_point"] is not None:
            data["route_point"] = json.dumps(data["route_point"])

        # Calculate and set end_time based on trip type and duration
        logger.info(f"Calculating end time with data: {data}")
        calculated_end_time = calculate_trip_end_time(data)
        logger.info(f"Calculated end time result: {calculated_end_time}")
        
        if calculated_end_time:
            data["end_time"] = calculated_end_time
            logger.info(f"Added end_time to data: {calculated_end_time}")
            logger.info(f"Final data being saved: {data}")
        else:
            logger.error(f"Failed to calculate end time for trip with data: {data}")
            raise HTTPException(400, "Cannot calculate end time - check start times and duration")

        # Create the trip with explicit fields
        trip = models.TripSchedule(
            id=str(uuid.uuid4()),
            agency_id=current_user.agency_id,  # Set explicitly here
            user_id=current_user.id,          # Set explicitly here
            **data
        )
        
        # Log the created trip object
        logger.info(f"Created trip object - end_time: {trip.end_time}, one_way_start_time: {trip.one_way_start_time}, two_way_start_time: {trip.two_way_start_time}")
        logger.info(f"Trip object type - end_time type: {type(trip.end_time)}")

        db.add(trip)
        db.commit()
        logger.info("Trip committed to database")
        db.refresh(trip)
        logger.info(f"Trip refreshed - end_time: {trip.end_time}")

        # Return the full trip with relationships
        trip = _base_query(db).filter(
            models.TripSchedule.id == trip.id
        ).first()

        return _serialize_trip(trip)
 
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create trip error: {str(e)}", exc_info=True)
        raise HTTPException(500, "Error creating trip")
 
# -------------------------------------------------------
# GET ALL
# -------------------------------------------------------

@router.get("/", response_model=List[schemas.TripScheduleResponse])
def get_trips(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
     # Filter based on user role
    if current_user.role == models.UserRole.IT_COMPANY:
        # IT Login: Filter by both agency AND company
        trips = _base_query(db).filter(
            models.TripSchedule.agency_id == current_user.agency_id,
            models.TripSchedule.company_id == current_user.company_id
        ).all()
    else:
        # Agency Login: Filter by agency only
        trips = _base_query(db).filter(
            models.TripSchedule.agency_id == current_user.agency_id
        ).all()

    return [_serialize_trip(t) for t in trips]

# -------------------------------------------------------
# GET BY ID
# -------------------------------------------------------

@router.get("/{trip_id}", response_model=schemas.TripScheduleResponse)
def get_trip(
    trip_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Filter based on user role
    if current_user.role == models.UserRole.IT_COMPANY:
        # IT Login: Filter by both agency AND company
        trip = _base_query(db).filter(
            models.TripSchedule.id == trip_id,
            models.TripSchedule.agency_id == current_user.agency_id,
            models.TripSchedule.company_id == current_user.company_id
        ).first()
    else:
        # Agency Login: Filter by agency only
        trip = _base_query(db).filter(
            models.TripSchedule.id == trip_id,
            models.TripSchedule.agency_id == current_user.agency_id
        ).first()

    if not trip:
        raise HTTPException(404, "Trip not found")

    return _serialize_trip(trip)

# -------------------------------------------------------
# UPDATE
# -------------------------------------------------------
@router.put("/{trip_id}", response_model=schemas.TripScheduleResponse)
def update_trip(
    trip_id: str,
    schedule: schemas.TripScheduleUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        trip = _base_query(db).filter(
            models.TripSchedule.id == trip_id,
            models.TripSchedule.agency_id == current_user.agency_id
        ).first()

        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        # Log raw schedule data to debug alias mapping
        raw_schedule_data = schedule.dict()
        print(f"🔴 DEBUG RAW SCHEDULE DATA: {raw_schedule_data}")  # Console print
        logger.info(f"Raw schedule data: {raw_schedule_data}")
        
        # Don't use exclude_unset for boolean fields to ensure they're included
        update_data = {k: v for k, v in raw_schedule_data.items() 
                     if v is not None or isinstance(v, bool)}
        print(f"🔴 DEBUG UPDATE DATA: {update_data}")  # Console print
        
        # Log the update data for debugging
        logger.info(f"Update data for trip {trip_id}: {update_data}")
        logger.info(f"Current trip data - one_way_start_time: {trip.one_way_start_time}, two_way_start_time: {trip.two_way_start_time}")
        logger.info(f"Current trip flags - one_way_is_active: {trip.one_way_is_active}, two_way_is_active: {trip.two_way_is_active}")
        logger.info(f"Boolean fields in update_data - one_way_is_active: {update_data.get('one_way_is_active')}, two_way_is_active: {update_data.get('two_way_is_active')}")

        # Check if we need to recalculate end time
        should_recalculate_end_time = any(key in update_data for key in [
            'duration_min', 'one_way_is_active', 'two_way_is_active', 
            'one_way_start_time', 'two_way_start_time'
        ])

        logger.info(f"Should recalculate end time: {should_recalculate_end_time}")
        logger.info(f"Keys in update_data: {list(update_data.keys())}")

        if should_recalculate_end_time:
            # Get current trip data and merge with update data
            current_data = {
                'duration_min': trip.duration_min,
                'one_way_is_active': trip.one_way_is_active,
                'two_way_is_active': trip.two_way_is_active,
                'one_way_start_time': trip.one_way_start_time,
                'two_way_start_time': trip.two_way_start_time,
            }
            current_data.update(update_data)
            
            logger.info(f"=== BEFORE CALCULATION ===")
            logger.info(f"Current trip flags - one_way_is_active: {trip.one_way_is_active}, two_way_is_active: {trip.two_way_is_active}")
            logger.info(f"Update data flags - one_way_is_active: {update_data.get('one_way_is_active')}, two_way_is_active: {update_data.get('two_way_is_active')}")
            logger.info(f"Merged data for end time calculation: {current_data}")
            logger.info(f"Specific values - duration: {current_data.get('duration_min')}, one_way_start: {current_data.get('one_way_start_time')}, two_way_start: {current_data.get('two_way_start_time')}")
            
            # Calculate new end time
            print(f"DEBUG: Calculating end time with data: {current_data}")  # Console print
            calculated_end_time = calculate_trip_end_time(current_data)
            print(f"DEBUG: Calculated end time result: {calculated_end_time}")  # Console print
            
            if calculated_end_time:
                update_data['end_time'] = calculated_end_time
                print(f"DEBUG: Adding end_time to update_data: {calculated_end_time}")  # Console print
                logger.info(f"=== CALCULATION SUCCESS ===")
                logger.info(f"Recalculated end time: {calculated_end_time} for trip {trip_id}")
            else:
                print(f"DEBUG: End time calculation failed - not updating end_time")  # Console print
                logger.error(f"=== CALCULATION FAILED ===")
                logger.error(f"Failed to recalculate end time for trip {trip_id} with data: {current_data}")
                # Don't update end_time if calculation failed, but continue with other updates

        for key, value in update_data.items():

            if key == "route_point" and value is not None:
                setattr(trip, key, json.dumps(value))  

            else:
                setattr(trip, key, value)

        db.commit()
        db.refresh(trip)

        trip = _base_query(db).filter(
            models.TripSchedule.id == trip.id
        ).first()

        return _serialize_trip(trip)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update trip error: {str(e)}", exc_info=True)
        raise HTTPException(500, "Error updating trip")
# -------------------------------------------------------
# DELETE
# -------------------------------------------------------

@router.delete("/{trip_id}", status_code=204)
def delete_trip(
    trip_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
     # Filter based on user role
    if current_user.role == models.UserRole.IT_COMPANY:
        # IT Login: Filter by both agency AND company
        trip = db.query(models.TripSchedule).filter(
            models.TripSchedule.id == trip_id,
            models.TripSchedule.agency_id == current_user.agency_id,
            models.TripSchedule.company_id == current_user.company_id
        ).first()
    else:
        # Agency Login: Filter by agency only
        trip = db.query(models.TripSchedule).filter(
            models.TripSchedule.id == trip_id,
            models.TripSchedule.agency_id == current_user.agency_id
        ).first()

    if not trip:
        raise HTTPException(404, "Trip not found")

    db.delete(trip)
    db.commit()
    return None

 

# -------------------------------------------------------

# GET TRIPS BY DRIVER + AGENCY

# -------------------------------------------------------

 

@router.get("/agency/{agency_id}/driver/{driver_id}",

            response_model=List[schemas.TripScheduleResponse])

def get_trips_by_driver_and_agency(

    agency_id: str,

    driver_id: str,

    start_date: Optional[date] = Query(None),

    end_date: Optional[date] = Query(None),

    status_filter: Optional[str] = Query(None),

    current_user: models.User = Depends(auth.get_current_active_user),

    db: Session = Depends(get_db)

):

 

    if str(current_user.agency_id) != str(agency_id):

        raise HTTPException(403, "Unauthorized")

 

    query = _base_query(db).filter(

        models.TripSchedule.driver_id == driver_id,

        models.TripSchedule.agency_id == agency_id

    )

 

    if start_date:

        query = query.filter(models.TripSchedule.start_date >= start_date)

 

    if end_date:

        query = query.filter(models.TripSchedule.start_date <= end_date)

 

    if status_filter:

        query = query.filter(models.TripSchedule.status == status_filter)

 

    return query.order_by(
        models.TripSchedule.start_date,
        # Order by one-way start time first, then two-way start time
        models.TripSchedule.one_way_start_time,
        models.TripSchedule.two_way_start_time
    ).all()

 

# -------------------------------------------------------
# DRIVER UPDATE
# -------------------------------------------------------

@router.put("/driver/{trip_id}", response_model=schemas.TripScheduleResponse)
def update_trip_by_driver(
    trip_id: str,
    update: schemas.TripUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):

 

    trip = _base_query(db).filter(

        models.TripSchedule.id == trip_id,

        models.TripSchedule.driver_id == current_user.driver.id

    ).first()

 

    if not trip:

        raise HTTPException(404, "Trip not assigned to this driver")

 

    update_data = update.dict(exclude_unset=True)

 

    if update_data.get("route_point"):

        update_data["route_point"] = json.dumps(update_data["route_point"])

 

    for field, value in update_data.items():

        setattr(trip, field, value)

 

    trip.updated_at = datetime.utcnow()

 

    db.commit()

    db.refresh(trip)

 

    return trip

 

# -------------------------------------------------------
# ACTIVE TRIPS
# -------------------------------------------------------

@router.get("/agency/{agency_id}/active",
           response_model=List[schemas.TripScheduleResponse])

def get_active_trips(
    agency_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):

    if str(current_user.agency_id) != str(agency_id):
        raise HTTPException(403, "Unauthorized")
    now = datetime.utcnow()
    return _base_query(db).filter(
        models.TripSchedule.agency_id == agency_id,
        models.TripSchedule.is_active == True,
        models.TripSchedule.start_date <= now.date(),
        models.TripSchedule.end_date >= now.date(),
        # Check if either one-way or two-way trip is currently active
        or_(
            # One-way trips
            and_(
                models.TripSchedule.one_way_is_active == True,
                models.TripSchedule.one_way_start_time <= now.time(),
                models.TripSchedule.end_time >= now.time()
            ),
            # Two-way trips - check each leg separately
            and_(
                models.TripSchedule.two_way_is_active == True,
                or_(
                    # Currently in first leg (one-way start time)
                    and_(
                        models.TripSchedule.one_way_start_time <= now.time(),
                        models.TripSchedule.end_time >= now.time()
                    ),
                    # Currently in return leg (two-way start time)
                    and_(
                        models.TripSchedule.two_way_start_time <= now.time(),
                        models.TripSchedule.end_time >= now.time()
                    )
                )
            )
        )
    ).all()

# -------------------------------------------------------
# GET TRIP STATUS
# -------------------------------------------------------

@router.get("/{trip_id}/status",
            response_model=schemas.TripStatusResponse)

def get_trip_status(
    trip_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)

):

    from ..utils.trip_scheduler import check_trip_active_status

    trip = _base_query(db).filter(
        models.TripSchedule.id == trip_id,
        models.TripSchedule.agency_id == current_user.agency_id

    ).first()

 

    if not trip:

        raise HTTPException(404, "Trip not found")

 

    is_active = check_trip_active_status(trip)

 

    if is_active != trip.is_active:

        trip.is_active = is_active

        trip.status_updated_at = datetime.utcnow()

        db.commit()

        db.refresh(trip)

    return {
        "trip_id": trip.id,
        "is_active": is_active,
        "status_updated_at": trip.status_updated_at,
        "end_time": trip.end_time
    }
    
# -------------------------------------------------------
# DRIVER RESPONSE - NEW UNIFIED API
# -------------------------------------------------------

@router.put("/{trip_id}/driver-response",
            response_model=schemas.TripScheduleResponse)
def update_driver_response(
    trip_id: str,
    payload: schemas.DriverResponseUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Unified API for driver to accept or decline trips"""
    trip = _base_query(db).filter(
        models.TripSchedule.id == trip_id,
        models.TripSchedule.driver_id == current_user.driver.id
    ).first()
 
    if not trip:
        raise HTTPException(404, "Trip not assigned to this driver")
 
    # Update driver response
    trip.driver_response = payload.driver_response
    trip.driver_reason = payload.driver_reason
    trip.driver_response_at = datetime.utcnow()
    trip.updated_at = datetime.utcnow()
 
    # Update status automatically
    if payload.driver_response == "accepted":
        trip.status = "ACTIVE"
        trip.is_active = True
        
        # 🔴 CRITICAL: Recalculate end_time when driver accepts trip
        current_data = {
            'duration_min': trip.duration_min,
            'one_way_is_active': trip.one_way_is_active,
            'two_way_is_active': trip.two_way_is_active,
            'one_way_start_time': trip.one_way_start_time,
            'two_way_start_time': trip.two_way_start_time,
        }
        
        logger.info(f"Driver accepted trip - recalculating end time with data: {current_data}")
        calculated_end_time = calculate_trip_end_time(current_data)
        
        if calculated_end_time:
            trip.end_time = calculated_end_time
            logger.info(f"Updated end_time for accepted trip: {calculated_end_time}")
        else:
            logger.error(f"Failed to calculate end_time for accepted trip with data: {current_data}")
            
    elif payload.driver_response == "declined":
        trip.status = "INACTIVE"
        trip.is_active = False
        # Reset both one-way and two-way active flags when declined
        trip.one_way_is_active = False
        trip.two_way_is_active = False
 
    db.commit()
    db.refresh(trip)
    
    # Load relationships for response
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first() if trip.vehicle_id else None
    driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first() if trip.driver_id else None
    company = db.query(models.Company).filter(models.Company.id == trip.company_id).first() if trip.company_id else None
    
    return schemas.TripScheduleResponse(
        id=trip.id,
        agency_id=trip.agency_id,
        user_id=trip.user_id,
        company_id=trip.company_id,
        company_name=company.company_name if company else trip.company_name,
        company_branch=company.company_branch if company else trip.company_branch,
        start_date=trip.start_date,
        end_date=trip.end_date,
        starting_point=trip.starting_point,
        end_point=trip.end_point,
        one_way_start_time=trip.one_way_start_time,
        two_way_start_time=trip.two_way_start_time,
        end_time=trip.end_time,
        way=trip.way,
        trip_type=trip.trip_type,
        vehicle_id=trip.vehicle_id,
        driver_id=trip.driver_id,
        passenger_count=trip.passenger_count,
        notes=trip.notes,
        distance_km=trip.distance_km,
        duration_min=trip.duration_min,
        starting_lat=trip.starting_lat,
        starting_lng=trip.starting_lng,
        end_lat=trip.end_lat,
        end_lng=trip.end_lng,
        route_point=json.loads(trip.route_point) if trip.route_point else None,
        status=trip.status,
        driver_response=trip.driver_response,
        driver_reason=trip.driver_reason,
        driver_response_at=trip.driver_response_at,
        status_updated_at=trip.status_updated_at,
        one_way_isActive=trip.one_way_is_active,      # Frontend expects camelCase
        two_way_isActive=trip.two_way_is_active,      # Frontend expects camelCase
        is_active=trip.is_active,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        vehicle_registration_number=vehicle.vehicle_registration_number if vehicle else None,
        driver_name=driver.user.name if (driver and driver.user) else None
    )