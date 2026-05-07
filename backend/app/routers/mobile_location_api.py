from fastapi import APIRouter, Depends, Form, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import asyncio
from app import models
from app.database import get_db
from datetime import datetime, timezone

 
router = APIRouter(tags=["Mobile Location"])
 
# =========================
# POST - CREATE NEW LOCATION RECORD
# =========================
@router.post("/location", response_model=dict)
def create_location(
    driver_id: str = Form(...),
    trip_id: str = Form(...),
    agency_id: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy: Optional[float] = Form(None),
    speed: Optional[float] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(True),
    company_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Create a new location record - returns location_id for future updates
    """
    try:
        print(f" Creating new location record:")
        print(f"  driver_id: {driver_id}")
        print(f"  trip_id: {trip_id}")
        print(f"  agency_id: {agency_id}")
        print(f"  latitude: {latitude}")
        print(f"  longitude: {longitude}")
        print(f"  accuracy: {accuracy}")
        print(f"  speed: {speed}")
       
        # Parse date fields if provided
        parsed_start_date = None
        if start_date:
            try:
                parsed_start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            except ValueError:
                parsed_start_date = None
 
        parsed_end_date = None
        if end_date:
            try:
                parsed_end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            except ValueError:
                parsed_end_date = None

        # Create new location record
        new_location = models.DriverLocation(
            driver_id=driver_id,
            trip_id=trip_id,
            agency_id=agency_id,
            company_id=company_id,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            speed=speed,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            is_active=is_active,
            timestamp=datetime.now(timezone.utc)
        )
        
        db.add(new_location)
        db.commit()
        db.refresh(new_location)  # Get the generated ID
 
        return {
            "status": "success",
            "message": "Location created successfully",
            "driver_id": driver_id,
            "trip_id": trip_id,
            "location_id": new_location.id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
       
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Database error: {str(e)}")

# =========================
# PUT - UPDATE LOCATION RECORD BY ID
# =========================
@router.put("/location/{location_id}", response_model=dict)
def update_location(
    location_id: int,
    driver_id: str = Form(...),  # Verify ownership
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    accuracy: Optional[float] = Form(None),
    speed: Optional[float] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    agency_id: Optional[str] = Form(None),
    company_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Update an existing location record by location_id
    Requires driver_id for security verification
    """
    try:
        print(f" Updating location record {location_id} for driver {driver_id}")
        
        # Find the location record and verify driver ownership
        existing_location = db.query(models.DriverLocation).filter(
            models.DriverLocation.id == location_id,
            models.DriverLocation.driver_id == driver_id
        ).first()
        
        if not existing_location:
            raise HTTPException(404, f"Location with ID {location_id} not found for driver {driver_id}")
        
        # Update only provided fields
        if latitude is not None:
            existing_location.latitude = latitude
        if longitude is not None:
            existing_location.longitude = longitude
        if accuracy is not None:
            existing_location.accuracy = accuracy
        if speed is not None:
            existing_location.speed = speed
        if is_active is not None:
            existing_location.is_active = is_active
        if agency_id is not None:
            existing_location.agency_id = agency_id
        if company_id is not None:
            existing_location.company_id = company_id
            
        # Parse date fields if provided
        if start_date:
            try:
                existing_location.start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            except ValueError:
                existing_location.start_date = None
                
        if end_date:
            try:
                existing_location.end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            except ValueError:
                existing_location.end_date = None
        
        # Always update timestamp on modification
        existing_location.timestamp = datetime.now(timezone.utc)
        
        db.commit()
 
        return {
            "status": "success",
            "message": "Location updated successfully",
            "driver_id": driver_id,
            "location_id": location_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
       
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Database error: {str(e)}")
 
# =========================
# POST - GET FROM TRIPSCHEDULE AND POST TO DRIVERLOCATION
# =========================
@router.post("/route-point/transfer/{trip_id}")
def transfer_route_point(trip_id: str, db: Session = Depends(get_db)):
    try:
        print(f" Starting transfer for trip: {trip_id}")
        now = datetime.utcnow()
 
        trip = db.query(models.TripSchedule).filter(
            models.TripSchedule.id == trip_id
        ).first()
 
        if not trip:
            raise HTTPException(404, "Trip not found")
 
        print(f"Found trip: {trip.id}")
        # Get route_point from TripSchedule
        print(f" Route point type: {type(trip.route_point)}")
        print(f"Route point value: {trip.route_point}")
 
        #  Handle empty
        if not trip.route_point:
            print("No route point found")
            return {"status": "success", "count": 0}
 
        # Convert safely
        if isinstance(trip.route_point, str):
            try:
                route_point_data = json.loads(trip.route_point)
                print(f"JSON parsed successfully")
            except json.JSONDecodeError:
                raise HTTPException(400, "Invalid JSON in TripSchedule")
 
        #  Ensure list
        if not isinstance(route_point_data, list):
            print(f"Route point is not a list: {type(route_point_data)}")
            raise HTTPException(400, "route_point must be a list")
 
        print(f" Processing {len(route_point_data)} route point")
 
        # Convert safely to minimal
        minimal_points = []
 
        for i, p in enumerate(route_point_data):
            if not isinstance(p, dict):
                print(f"Skipping non-dict item at index {i}: {p}")
                continue  # skip bad data
 
            minimal_points.append({
                "passenger_id": p.get("passenger_id"),
                "passenger_name": p.get("passenger_name"),
                "passenger_phone": p.get("passenger_phone"),
                "pickup": p.get("pickup", False),
                "timestamp": p.get("timestamp")
            })
 
        print(f"Created {len(minimal_points)} minimal points")
 
        #  Handle corrupted route_point data in DriverLocation
        try:
            location = db.query(models.DriverLocation).filter(
                models.DriverLocation.trip_id == trip_id
            ).first()
            print(f" DriverLocation found: {location is not None}")
        except json.JSONDecodeError:
            print("Found corrupted route_point data, clearing it...")
            # Clear corrupted data and retry
            from sqlalchemy import text
            db.execute(
                text("UPDATE driver_locations SET route_point = NULL WHERE trip_id = :trip_id"),
                {"trip_id": trip_id}
            )
            db.commit()
           
            # Retry query
            location = db.query(models.DriverLocation).filter(
                models.DriverLocation.trip_id == trip_id
            ).first()
            print(f"DriverLocation found after cleanup: {location is not None}")
 
        if not location:
            print("Creating new DriverLocation")
            location = models.DriverLocation(
                driver_id=trip.driver_id,
                trip_id=trip_id,
                agency_id=trip.agency_id,
                route_point=minimal_points,
                timestamp=now
            )
            db.add(location)
        else:
            print(" Updating existing DriverLocation")
            location.route_point = minimal_points
            location.timestamp = now
 
        print("Committing to database...")
        db.commit()
        print(" Successfully committed!")
 
        return {
            "status": "success",
            "trip_id": trip_id,
            "count": len(minimal_points)
        }
 
    except Exception as e:
        print(f"Error in transfer_route_point: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(500, str(e))
 
# =========================
# POST - STORE ROUTE POINT JSON
# =========================
@router.post("/route-points", response_model=dict)
def store_route_point_json(
    trip_id: str = Form(...),
    location_id: int = Form(...),
    driver_id: str = Form(...),
    agency_id: str = Form(...),  # Add agency_id as required
    route_point: str = Form(...),  # JSON object from frontend
    db: Session = Depends(get_db)
):
    """
    Store route_point JSON data directly exactly as frontend sends
    """
    try:
        # Parse the JSON from frontend
        parsed_route_point = json.loads(route_point)
       
        # Find existing location record
        existing_location = db.query(models.DriverLocation).filter(
            models.DriverLocation.driver_id == driver_id,
            models.DriverLocation.trip_id == trip_id,
            models.DriverLocation.id == location_id
        ).first()
       
        if existing_location:
            # Update route point
            existing_location.route_point = parsed_route_point
            # Use frontend timestamp if available, otherwise use current time
            if parsed_route_point and len(parsed_route_point) > 0:
                latest_timestamp = parsed_route_point[-1].get("timestamp")
                if latest_timestamp:
                    try:
                        existing_location.timestamp = datetime.fromisoformat(latest_timestamp.replace('Z', '+00:00'))
                    except (ValueError, TypeError):
                        existing_location.timestamp = datetime.utcnow()
                else:
                    existing_location.timestamp = datetime.utcnow()
            else:
                existing_location.timestamp = datetime.utcnow()
            db.commit()
            message = "Route point updated"
        else:
            # Throw error - location must exist first
            raise HTTPException(404, "Location record not found. Please create location first using /api/mobile/location")
       
        return {
            "status": "success",
            "message": message,
            "trip_id": trip_id,
            "driver_id": driver_id,
            "route_point_count": len(parsed_route_point) if isinstance(parsed_route_point, list) else 1
        }
       
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON in route_point")
    except Exception as e:
        raise HTTPException(500, f"Database error: {str(e)}")
 
# =========================
# GET - SIMPLE LOCATION RETRIEVAL
# =========================
@router.get("/locations", response_model=List[Dict[str, Any]])
def get_locations_simple(
    driver_id: Optional[str] = None,
    trip_id: Optional[str] = None,
    agency_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Simple location retrieval with optional filters
    """
    try:
        query = db.query(models.DriverLocation)
       
        if driver_id:
            query = query.filter(models.DriverLocation.driver_id == driver_id)
        if trip_id:
            query = query.filter(models.DriverLocation.trip_id == trip_id)
        if agency_id:
            query = query.filter(models.DriverLocation.agency_id == agency_id)
       
        locations = query.limit(limit).all()
       
        result = []
        for location in locations:
            location_data = {
                "driver_id": location.driver_id,
                "trip_id": location.trip_id,
                "agency_id": location.agency_id,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "accuracy": location.accuracy,
                "speed": location.speed,
                "timestamp": location.timestamp.isoformat() if location.timestamp else None,
                "route_point": location.route_point,
                "is_active": location.is_active
            }
            result.append(location_data)
       
        return result
       
    except Exception as e:
        raise HTTPException(500, f"Error retrieving locations: {str(e)}")

# =========================
# PUT - DEACTIVATE LOCATION TRACKING
# =========================
@router.put("/location/deactivate/{driver_id}")
def deactivate_location_tracking(
    driver_id: str,
    location_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Deactivate location tracking for a driver (sets is_active to false)
    """
    try:
        # Find the most recent active location record for this driver
        location = db.query(models.DriverLocation).filter(
            models.DriverLocation.driver_id == driver_id,
            models.DriverLocation.is_active == True,
            models.DriverLocation.id == location_id
        ).order_by(models.DriverLocation.timestamp.desc()).first()
       
        if not location:
            raise HTTPException(404, f"No active location records found for driver: {driver_id}")
       
        # Update record to inactive
        location.is_active = False
        location.end_date = datetime.now(timezone.utc)
       
        # Update TripSchedule fields based on trip type and completion
        trip_schedule = db.query(models.TripSchedule).filter(
            models.TripSchedule.id == location.trip_id,
            models.TripSchedule.driver_id == driver_id,
            models.TripSchedule.agency_id == location.agency_id
        ).first()
        
        if trip_schedule:
            if trip_schedule.way == "one_way":
                # One-way trip complete: update one_way_is_active
                trip_schedule.one_way_is_active = False
                trip_schedule.is_active = False
            elif trip_schedule.way == "two_way":
                # Two-way trip: check which leg is completing
                if trip_schedule.one_way_is_active == True:
                    # First leg (one-way) complete
                    trip_schedule.one_way_is_active = False
                elif trip_schedule.two_way_is_active == True:
                    # Second leg (two-way) complete
                    trip_schedule.two_way_is_active = False
                    trip_schedule.is_active = False  # Both legs complete
            
            trip_schedule.updated_at = datetime.now(timezone.utc)
       
        db.commit()
       
        return {
            "status": "success",
            "message": f"Deactivated location tracking for driver: {driver_id}",
            "driver_id": driver_id,
            "location_id": location.id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
       
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error deactivating location tracking: {str(e)}")

from sqlalchemy import text

@router.get("/locations/all", response_model=List[Dict[str, Any]])
def get_all_locations(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("""
            SELECT id, trip_id, is_active
            FROM driver_locations
            ORDER BY timestamp DESC
        """))

        rows = result.fetchall()

        data = []
        for row in rows:
            data.append({
                "id": row.id,
                "trip_id": row.trip_id,
                "is_active": row.is_active
            })

        return data

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(500, str(e))

        
# =========================
# PUT - DEACTIVATE LOCATION TRACKING
# =========================
@router.put("/location/deactivate/{driver_id}")
def deactivate_location_tracking(
    driver_id: str,
    location_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Deactivate location tracking for a driver (sets is_active to false)
    """
    try:
        # Find the most recent active location record for this driver
        location = db.query(models.DriverLocation).filter(
            models.DriverLocation.driver_id == driver_id,
            models.DriverLocation.is_active == True,
            models.DriverLocation.id == location_id
        ).order_by(models.DriverLocation.timestamp.desc()).first()
       
        if not location:
            raise HTTPException(404, f"No active location records found for driver: {driver_id}")
       
        # Update the record to inactive
        location.is_active = False
        location.end_date = datetime.now(timezone.utc)
       
        db.commit()
       
        return {
            "status": "success",
            "message": f"Deactivated location tracking for driver: {driver_id}",
            "driver_id": driver_id,
            "location_id": location.id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
       
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Error deactivating location tracking: {str(e)}")
 
@router.websocket("/ws/driver/{driver_id}")
async def websocket_live_tracking(websocket: WebSocket, driver_id: str):
    """
    WebSocket endpoint for live driver location tracking
    Polls database for latest location and sends updates when changed
    """
    await websocket.accept()
    print(f"WebSocket connected: {driver_id}")
 
    # Use dependency injection for proper database session management
    db = next(get_db())
   
    # Track last sent location to avoid duplicate sends
    last_lat = None
    last_lng = None
    last_timestamp = None
    last_route_point = None
 
    try:
        while True:
            db = next(get_db())   # 🔥 NEW session every time

            location = db.query(models.DriverLocation).filter(
            models.DriverLocation.driver_id == driver_id
            ).order_by(models.DriverLocation.timestamp.desc()).first()

            lat = None
            lng = None
            route_point = None
            current_timestamp = None

            if location:
                lat = location.latitude
                lng = location.longitude
                route_point = location.route_point
                current_timestamp = location.timestamp

            if lat != last_lat or lng != last_lng or current_timestamp != last_timestamp or route_point != last_route_point:
                data = {
                "type": "location_update",
                "driver_id": driver_id,
                "latitude": lat,
                "longitude": lng,
                "route_point" : route_point,
                "timestamp": current_timestamp.isoformat() if current_timestamp else None
                }

                await websocket.send_text(json.dumps(data))
                print("📡 Sent NEW data:", lat, lng)

                last_lat = lat
                last_lng = lng
                last_timestamp = current_timestamp
                last_route_point = route_point

            db.close()   # 🔥 IMPORTANT
            await asyncio.sleep(2)
        print(f" WebSocket disconnected: {driver_id}")

    except Exception as e:
        print(f"WebSocket error for {driver_id}: {str(e)}")
        try:
            await websocket.close()
        except:
            pass
 
    finally:
        db.close()
        print(" DB session closed")

