from fastapi import APIRouter, Depends, HTTPException , Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime , date
import uuid
import json
import logging

from ..database import get_db
from .. import models, schemas, auth

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

    # Convert route_points
    route_points = None
    if trip.route_points:
        try:
            route_points = json.loads(trip.route_points)
        except:
            route_points = None

    return {
        "id": trip.id,
        "agency_id": trip.agency_id,
        "user_id": trip.user_id,
        "company_id": trip.company_id,
        "company_name": trip.company.company_name if trip.company else None,
        "company_branch": trip.company.company_branch if trip.company else None,

        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "start_time": trip.start_time,
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

        "route_points": route_points,

        "is_active": trip.is_active,
        "created_at": trip.created_at,
        "updated_at": trip.updated_at,

        # 🔥 IMPORTANT PART
        "vehicle_registration_number": trip.vehicle.vehicle_registration_number
        if trip.vehicle else None,

        "driver_name": trip.driver.user.name
        if trip.driver and trip.driver.user else None,
    }

# -------------------------------------------------------
# Serialize route_points (JSON string → List)
# -------------------------------------------------------

def _serialize_route_points(trip):
    if trip and trip.route_points:
        if isinstance(trip.route_points, str):
            try:
                trip.route_points = json.loads(trip.route_points)
            except:
                trip.route_points = None
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
 
    # Overlap Conflict
    conflict_query = db.query(models.TripSchedule).filter(
        models.TripSchedule.is_active == True,
        models.TripSchedule.start_date <= schedule.end_date,
        models.TripSchedule.end_date >= schedule.start_date,
        models.TripSchedule.start_time < schedule.end_time,
        models.TripSchedule.end_time > schedule.start_time,
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
        _validate_trip(db, schedule, current_user)
 
        # Convert to dict and remove None values
        data = {k: v for k, v in schedule.dict(exclude_unset=True).items() if v is not None}
 
        # Remove keys that are set manually
        data.pop("agency_id", None)
        data.pop("user_id", None)
 
        if "route_points" in data and data["route_points"] is not None:
            data["route_points"] = json.dumps(data["route_points"])
 
        # Create the trip with explicit fields
        trip = models.TripSchedule(
            id=str(uuid.uuid4()),
            agency_id=current_user.agency_id,  # Set explicitly here
            user_id=current_user.id,          # Set explicitly here
            **data
        )
 
        db.add(trip)
        db.commit()
        db.refresh(trip)
 
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

        update_data = schedule.dict(exclude_unset=True)

        for key, value in update_data.items():

            if key == "route_points" and value is not None:
                setattr(trip, key, json.dumps(value))  # 🔥 IMPORTANT FIX

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

        models.TripSchedule.start_time

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

 

    if update_data.get("route_points"):

        update_data["route_points"] = json.dumps(update_data["route_points"])

 

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
        models.TripSchedule.start_time <= now.time(),
        models.TripSchedule.end_time >= now.time(),
    ).all()

 

# -------------------------------------------------------
# MANUAL STATUS UPDATE
# -------------------------------------------------------
@router.get("/update-status",
            response_model=List[schemas.TripStatusResponse])

def update_trip_statuses(

    current_user: models.User = Depends(auth.get_current_active_user),

    db: Session = Depends(get_db)

):

 

    from ..utils.trip_scheduler import update_trip_schedule_status

 

    return update_trip_schedule_status(db)

 

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

        "status_updated_at": trip.status_updated_at

    }