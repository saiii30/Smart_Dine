# backend/app/utils/trip_scheduler.py
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

def update_trip_schedule_status():
    """
    Update is_active status of trip schedules based on end_date
    Runs daily at 12:30 AM to activate future trips
    """
    db = next(get_db())
    try:
        current_date = datetime.now().date()
        updated_count = 0
        
        # 1. Deactivate trips that have ended (past end_date)
        past_trips = db.query(models.TripSchedule)\
            .filter(
                models.TripSchedule.end_date < current_date,
                models.TripSchedule.is_active == True
            )\
            .all()
        
        for trip in past_trips:
            trip.is_active = False
            trip.status_updated_at = datetime.now()
            # Reset both one-way and two-way active flags when trip ends
            trip.one_way_is_active = False
            trip.two_way_is_active = False
            updated_count += 1
        
        # 2. Activate future trips (today or future dates)
        future_trips = db.query(models.TripSchedule)\
            .filter(
                models.TripSchedule.end_date >= current_date,
                models.TripSchedule.is_active == False
            )\
            .all()
        
        for trip in future_trips:
            trip.is_active = True
            trip.status_updated_at = datetime.now()
            # Set default one-way active (can be changed by frontend)
            if not trip.one_way_is_active and not trip.two_way_is_active:
                trip.one_way_is_active = True
                trip.two_way_is_active = False
            updated_count += 1
        
        db.commit()
        return {
            "status": "success", 
            "updated": updated_count,
            "deactivated": len(past_trips),
            "activated": len(future_trips)
        }
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def check_trip_active_status(trip) -> bool:
    """
    Check if a trip should be active based on its end date
    Note: end_time is commented out in model, so only check by date
    """
    if not trip.end_date:
        return False
    
    current_date = datetime.now().date()
    
    # If end date is today or in the future, trip is active
    if trip.end_date >= current_date:
        return True
    # If end date is in the past, trip is not active
    else:
        return False