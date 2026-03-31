from fastapi import APIRouter, Depends, Form, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import asyncio
from app import models
from app.database import get_db
 
router = APIRouter(tags=["Mobile Location"])
 
# =========================
# POST - SIMPLE UPSERT LOCATION
# =========================
@router.post("/location", response_model=dict)
def upsert_location_mobile(
    driver_id: str = Form(...),
    trip_id: str = Form(...),
    agency_id: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy: Optional[float] = Form(None),
    speed: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Simple upsert location - store what frontend sends
    """
    try:
        print(f"📍 Received location data:")
        print(f"  driver_id: {driver_id}")
        print(f"  trip_id: {trip_id}")
        print(f"  agency_id: {agency_id}")
        print(f"  latitude: {latitude}")
        print(f"  longitude: {longitude}")
        print(f"  accuracy: {accuracy}")
        print(f"  speed: {speed}")
       
        # Check if location exists for this driver/trip
        existing_location = db.query(models.DriverLocation).filter(
            models.DriverLocation.driver_id == driver_id,
            models.DriverLocation.trip_id == trip_id
        ).first()
       
        if existing_location:
            # Update existing record
            existing_location.latitude = latitude
            existing_location.longitude = longitude
            existing_location.accuracy = accuracy
            existing_location.speed = speed
            existing_location.agency_id = agency_id  # ✅ Update agency_id
            existing_location.timestamp = datetime.utcnow()
            db.commit()
            message = "Location updated"
        else:
            # Create new record
            new_location = models.DriverLocation(
                driver_id=driver_id,
                trip_id=trip_id,
                agency_id=agency_id,
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
                speed=speed,
                timestamp=datetime.utcnow()
            )
            db.add(new_location)
            db.commit()
            message = "Location created"
       
        return {
            "status": "success",
            "message": message,
            "driver_id": driver_id,
            "trip_id": trip_id,
            "timestamp": datetime.utcnow().isoformat()
        }
       
    except Exception as e:
        raise HTTPException(500, f"Database error: {str(e)}")
 
# =========================
# POST - GET FROM TRIPSCHEDULE AND POST TO DRIVERLOCATION
# =========================
@router.post("/route-points/transfer/{trip_id}")
def transfer_route_points(trip_id: str, db: Session = Depends(get_db)):
    try:
        print(f" Starting transfer for trip: {trip_id}")
        now = datetime.utcnow()
 
        trip = db.query(models.TripSchedule).filter(
            models.TripSchedule.id == trip_id
        ).first()
 
        if not trip:
            raise HTTPException(404, "Trip not found")
 
        print(f"Found trip: {trip.id}")
        route_points = trip.route_points
        print(f" Route points type: {type(route_points)}")
        print(f"Route points value: {route_points}")
 
        #  Handle empty
        if not route_points:
            print("No route points found")
            return {"status": "success", "count": 0}
 
        # Convert safely
        if isinstance(route_points, str):
            try:
                route_points = json.loads(route_points)
                print(f"JON parsed successfully")
            except json.JSONDecodeError:
                raise HTTPException(400, "Invalid JSON in TripSchedule")
 
        #  Ensure list
        if not isinstance(route_points, list):
            print(f"Route points is not a list: {type(route_points)}")
            raise HTTPException(400, "route_points must be a list")
 
        print(f" Processing {len(route_points)} route points")
 
        # Convert safely to minimal
        minimal_points = []
 
        for i, p in enumerate(route_points):
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
 
        # 🔧 Handle corrupted route_point data in DriverLocation
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
        print(f"Error in transfer_route_points: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(500, str(e))
 
# =========================
# POST - STORE ROUTE POINTS JSON
# =========================
@router.post("/route-points", response_model=dict)
def store_route_points_json(
    trip_id: str = Form(...),
    driver_id: str = Form(...),
    agency_id: str = Form(...),  # Add agency_id as required
    route_points: str = Form(...),  # JSON object from frontend
    db: Session = Depends(get_db)
):
    """
    Store route points JSON object exactly as frontend sends
    """
    try:
        # Parse the JSON from frontend
        parsed_route_points = json.loads(route_points)
       
        # Find existing location record
        existing_location = db.query(models.DriverLocation).filter(
            models.DriverLocation.driver_id == driver_id,
            models.DriverLocation.trip_id == trip_id
        ).first()
       
        if existing_location:
            # Update route points
            existing_location.route_point = parsed_route_points
            # Use frontend timestamp if available, otherwise use current time
            if parsed_route_points and len(parsed_route_points) > 0:
                latest_timestamp = parsed_route_points[-1].get("timestamp")
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
            message = "Route points updated"
        else:
            # Throw error - location must exist first
            raise HTTPException(404, "Location record not found. Please create location first using /api/mobile/location")
       
        return {
            "status": "success",
            "message": message,
            "trip_id": trip_id,
            "driver_id": driver_id,
            "route_points_count": len(parsed_route_points) if isinstance(parsed_route_points, list) else 1
        }
       
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON in route_points")
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
                "route_point": location.route_point
            }
            result.append(location_data)
       
        return result
       
    except Exception as e:
        raise HTTPException(500, f"Error retrieving locations: {str(e)}")
 
# =========================
# WEBSOCKET - LIVE TRACKING
# =========================
@router.websocket("/ws/{driver_id}")
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
                "route_points" : route_point,
                "timestamp": current_timestamp.isoformat() if current_timestamp else None
                }

                await websocket.send_text(json.dumps(data))
                print("📡 Sent NEW data:", lat, lng)

                last_lat = lat
                last_lng = lng
                last_timestamp = current_timestamp
                last_rount_point = route_point

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
 
"""
# =========================
# WEBSOCKET - PASSENGER TRACKING
# =========================
@router.websocket("/ws/passenger/{trip_id}")
async def websocket_passenger_tracking(websocket: WebSocket, trip_id: str):
   
    WebSocket endpoint for passengers to track driver location
   
    await websocket.accept()
    print(f" Passenger WebSocket connected for trip: {trip_id}")
   
    try:
        while True:
            # In a real implementation, you would:
            # 1. Subscribe to driver location updates for this trip
            # 2. Send real-time updates when driver moves
           
            # For now, send periodic updates
            await websocket.receive_text()  # Keep connection alive
           
            # Get latest driver location
            # This would be replaced with real-time broadcasting
            status_data = {
                "type": "trip_status",
                "trip_id": trip_id,
                "message": "Driver location tracking active",
                "timestamp": datetime.utcnow().isoformat()
            }
           
            await websocket.send_text(json.dumps(status_data))
           
    except WebSocketDisconnect:
        print(f" Passenger WebSocket disconnected for trip: {trip_id}")
    except Exception as e:
        print(f" Passenger WebSocket error for {trip_id}: {str(e)}")
        await websocket.close()
"""