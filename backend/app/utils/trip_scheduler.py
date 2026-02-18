# backend/app/utils/trip_scheduler.py
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

def update_trip_schedule_status():
    """
    Update is_active status of trip schedules based on end_date
    """
    db = next(get_db())
    try:
        current_date = datetime.now().date()
        updated_count = 0
        
        # Get all active trips that might need to be deactivated
        trips_to_update = db.query(models.TripSchedule)\
            .filter(
                models.TripSchedule.end_date < current_date,
                models.TripSchedule.is_active == True
            )\
            .all()
        
        # Update each trip
        for trip in trips_to_update:
            trip.is_active = False
            trip.status_updated_at = datetime.now()
            updated_count += 1
        
        db.commit()
        return {"status": "success", "updated": updated_count}
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def check_trip_active_status(trip) -> bool:
    """
    Check if a trip should be active based on its end date and end time
    """
    if not trip.end_date:
        return False
    
    now = datetime.now()
    current_date = now.date()
    current_time = now.time()
    
    # If end date is in the future, trip is still active
    if trip.end_date > current_date:
        return True
    # If end date is today, check the time
    elif trip.end_date == current_date and trip.end_time:
        return trip.end_time > current_time
    # If end date is in the past, trip is not active
    else:
        return False