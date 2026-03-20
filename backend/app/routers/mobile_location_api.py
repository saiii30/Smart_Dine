from fastapi import APIRouter, Form, Query, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict, List, Union
from datetime import datetime
from pydantic import BaseModel
import json
 
from app import models, schemas, auth
from app.database import get_db
import asyncio
 
router = APIRouter(tags=["Mobile Location"])
 
# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}
# Store latest driver positions
driver_positions: Dict[str, dict] = {}
 
@router.post("/api/mobile/location", response_model=schemas.LocationResponse)
def upsert_location_mobile(
    driver_id: str = Form(...),
    trip_id: str = Form(...),
    agency_id: str = Form(...),
    trip_type: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy: Optional[float] = Form(None),
    speed: Optional[float] = Form(None),
    heading: Optional[float] = Form(None),
    vehicle_id: Optional[str] = Form(None),
    storage_type: Optional[str] = Form(None),
    timestamp: Optional[str] = Form(None),
    route_point: Optional[str] = Form(None),
    time_window_seconds: int = Form(30),
    db: Session = Depends(get_db)
):
    """
    Mobile app location update endpoint.
   
    Supports form data input only.
    This is the primary endpoint for mobile app location updates.
    """
    print("📥 Using /api/mobile/location endpoint")
    print(f"📱 Mobile app data: driver_id={driver_id}, lat={latitude}, lng={longitude}, heading={heading}, vehicle_id={vehicle_id}")
   
    try:
        # Validate driver exists
        driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found"
            )
       
        # Validate trip exists
        trip = db.query(models.TripSchedule).filter(models.TripSchedule.id == trip_id).first()
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )
       
        # Validate agency exists
        agency = db.query(models.Agency).filter(models.Agency.id == agency_id).first()
        if not agency:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agency not found"
            )
       
        # Parse route_point JSON for route trips
        route_point_data = None
        if trip_type == "route" and route_point and route_point.strip() and route_point.lower() != 'null':
            try:
                route_point_data = json.loads(route_point)
               
                # Handle both single object and array of objects
                if isinstance(route_point_data, dict):
                    # Single passenger object
                    required_fields = ['passenger_id', 'passenger_name', 'passenger_phone', 'pickup', 'timestamp']
                    for field in required_fields:
                        if field not in route_point_data:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Missing required field in route_point: {field}"
                            )
                elif isinstance(route_point_data, list):
                    # Array of passenger objects
                    for i, passenger in enumerate(route_point_data):
                        required_fields = ['passenger_id', 'passenger_name', 'passenger_phone', 'pickup', 'timestamp']
                        for field in required_fields:
                            if field not in passenger:
                                raise HTTPException(
                                    status_code=status.HTTP_400_BAD_REQUEST,
                                    detail=f"Missing required field in route_point[{i}]: {field}"
                                )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="route_point must be a JSON object or array of objects"
                    )
               
                print(f"✅ Parsed route_point_data with structure: {route_point_data}")
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid route_point JSON format"
                )
       
        # Check if location record exists for this trip (regardless of time window)
        existing_location = db.query(models.DriverLocation).filter(
            models.DriverLocation.driver_id == driver_id,
            models.DriverLocation.trip_id == trip_id
        ).first()
       
        if existing_location:
            # UPDATE existing record
            existing_location.latitude = latitude
            existing_location.longitude = longitude
            existing_location.accuracy = accuracy
            existing_location.speed = speed
            existing_location.timestamp = datetime.utcnow()
            
# Safely update route_point
        
            if route_point_data:
                try:
                    existing_points = existing_location.route_point

                    #  Handle NULL
                    if not existing_points:
                        existing_points = []

                    # If stored as STRING → convert to list
                    if isinstance(existing_points, str):
                        try:
                            existing_points = json.loads(existing_points)
                        except:
                            existing_points = []

                    # Ensure it's a list check with surekaa
                    if not isinstance(existing_points, list):
                        existing_points = []

                    # Append new data
                    if isinstance(route_point_data, list):
                        existing_points.extend(route_point_data)
                    else:
                        existing_points.append(route_point_data)

                    #  Assign back
                    existing_location.route_point = existing_points

                except Exception as e:
                    print(f" route_point update error: {e}")
                    existing_location.route_point = []
                    
            db.commit()
            db.refresh(existing_location)
           
            location = existing_location
            action = "updated"
            print(f"🔄 Updated existing location for driver {driver_id} on trip {trip_id}")
        else:
            # CREATE new record
            location = models.DriverLocation(
                driver_id=driver_id,
                trip_id=trip_id,
                agency_id=agency_id,
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
                speed=speed,
                route_point=route_point_data,
                timestamp=datetime.utcnow(),
            )
           
            db.add(location)
            db.commit()
            db.refresh(location)
           
            action = "created"
            print(f"Created new location for driver {driver_id} on trip {trip_id}")
       
        # Update cache for WebSocket
        driver_positions[driver_id] = {
            "latitude": latitude,
            "longitude": longitude,
            "speed": speed,
            "timestamp": location.timestamp.isoformat(),
            "trip_id": trip_id,
            "agency_id": agency_id,
            "route_point": route_point_data,
            "heading": heading,
            "vehicle_id": vehicle_id,
            "storage_type": storage_type,
            "mobile_timestamp": timestamp
        }


        #  FIX: safely convert route_point before returning rollback error check with sureka
        route_point_value = location.route_point

        if isinstance(route_point_value, str):
            try:
                route_point_value = json.loads(route_point_value)
            except:
                route_point_value = []

        return schemas.LocationResponse(
            id=location.id,
            driver_id=location.driver_id,
            agency_id=location.agency_id,
            latitude=location.latitude,
            longitude=location.longitude,
            accuracy=location.accuracy,
            speed=location.speed,
            timestamp=location.timestamp,
            trip_id=location.trip_id,
            route_point=route_point_value
        )
       
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upsert location record: {str(e)}"
        )
 
@router.get("/api/mobile/locations", response_model=List[schemas.LocationResponse])
def get_locations_mobile(
    driver_id: Optional[str] = None,
    agency_id: Optional[str] = None,
    trip_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get locations with flexible filtering.
   
    - All parameters are optional
    - If no parameters provided, returns all locations (limited by limit)
    - Can filter by one, two, or all three parameters
    - Results ordered by timestamp (most recent first)
    """
   
    # Start with base query
    query = db.query(models.DriverLocation)
   
    # Apply filters if provided
    if driver_id:
        query = query.filter(models.DriverLocation.driver_id == driver_id)
    if agency_id:
        query = query.filter(models.DriverLocation.agency_id == agency_id)
    if trip_id:
        query = query.filter(models.DriverLocation.trip_id == trip_id)
   
    # Order by timestamp (most recent first) and limit
    locations = query.order_by(models.DriverLocation.timestamp.desc()).limit(limit).all()
   
    return locations
 
@router.get("/api/mobile/drivers/active")
def get_active_drivers_mobile():
    """Get list of currently active drivers (with WebSocket connections)"""
    return {
        "active_drivers": list(active_connections.keys()),
        "count": len(active_connections),
        "positions": driver_positions
    }
 
@router.delete("/api/mobile/location/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location_mobile(
    location_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete location by ID"""
    location = db.query(models.DriverLocation).filter(models.DriverLocation.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
   
    # Optional: Check if user belongs to the same agency
    if str(location.agency_id) != str(current_user.agency_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this location"
        )
   
    db.delete(location)
    db.commit()
    return None
 
@router.websocket("/ws/mobile/{driver_id}")
async def mobile_location_websocket(websocket: WebSocket, driver_id: str):
    """WebSocket endpoint for mobile app location updates.
    """
    await websocket.accept()
   
    # Store connection
    active_connections[driver_id] = websocket
    print(f"📱 Mobile app for driver {driver_id} connected via WebSocket")
   
    try:
        while True:
            # Receive location data from mobile app
            try:
                # Try to receive JSON message first
                data = await websocket.receive_json()
            except:
                # If JSON fails, try to receive as text and parse
                text_data = await websocket.receive_text()
                try:
                    data = json.loads(text_data)
                except json.JSONDecodeError:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid JSON format. Please send valid JSON data.",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    continue
           
            # Validate required fields
            required_fields = ['latitude', 'longitude', 'trip_id', 'agency_id', 'trip_type']
            missing_fields = [field for field in required_fields if field not in data]
           
            if missing_fields:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Missing required fields: {', '.join(missing_fields)}",
                    "required_fields": required_fields,
                    "timestamp": datetime.utcnow().isoformat()
                })
                continue
           
            # Validate data types
            try:
                latitude = float(data['latitude'])
                longitude = float(data['longitude'])
                trip_id = str(data['trip_id'])
                agency_id = str(data['agency_id'])
                trip_type = str(data['trip_type'])
               
                # Validate lat/lng ranges
                if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid coordinates. Latitude must be -90 to 90, longitude must be -180 to 180",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    continue
                   
            except (ValueError, TypeError) as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Invalid data type for coordinates: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat()
                })
                continue
           
            # Handle route_point for route trips
            route_point_data = None
            if trip_type == "route" and data.get('route_point'):
                route_point_data = data['route_point']
               
                # Validate route_point structure
                required_route_fields = ['passenger_id', 'passenger_name', 'passenger_phone', 'pickup', 'timestamp']
                missing_route_fields = [field for field in required_route_fields if field not in route_point_data]
               
                if missing_route_fields:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Missing required route_point fields: {', '.join(missing_route_fields)}",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    continue
            elif trip_type == "shuttle":
                route_point_data = None
           
            # Save to database
            try:
                # Get database session
                db = next(get_db())
               
                # Validate driver exists
                driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
                if not driver:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Driver {driver_id} not found",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    db.close()
                    continue
               
                # Validate trip exists
                trip = db.query(models.TripSchedule).filter(models.TripSchedule.id == trip_id).first()
                if not trip:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Trip {trip_id} not found",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    db.close()
                    continue
               
                # Create location record
                location = models.DriverLocation(
                    driver_id=driver_id,
                    trip_id=trip_id,
                    agency_id=agency_id,
                    latitude=latitude,
                    longitude=longitude,
                    accuracy=data.get('accuracy'),
                    speed=data.get('speed'),
                    route_point=route_point_data
                )
               
                db.add(location)
                db.commit()
                db.refresh(location)
               
                # Update driver position cache for monitoring
                driver_positions[driver_id] = {
                    "latitude": latitude,
                    "longitude": longitude,
                    "speed": data.get('speed'),
                    "timestamp": location.timestamp.isoformat(),
                    "trip_id": trip_id,
                    "agency_id": agency_id,
                    "route_point": route_point_data
                }
               
                # Broadcast to monitoring clients
                await broadcast_location_update(driver_id, driver_positions[driver_id])
               
                # Send confirmation to mobile app
                await websocket.send_json({
                    "type": "success",
                    "message": "Location updated successfully",
                    "location_id": location.id,
                    "timestamp": location.timestamp.isoformat(),
                    "data": {
                        "latitude": latitude,
                        "longitude": longitude,
                        "speed": data.get('speed'),
                        "trip_id": trip_id
                    }
                })
               
                print(f" Mobile app {driver_id}: Location saved ({latitude}, {longitude})")
                db.close()
               
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Database error: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat()
                })
                if 'db' in locals():
                    db.close()
           
    except WebSocketDisconnect:
        # Clean up on disconnect
        if driver_id in active_connections:
            del active_connections[driver_id]
        if driver_id in driver_positions:
            del driver_positions[driver_id]
        print(f" Mobile app for driver {driver_id} disconnected")
    except Exception as e:
        print(f" Mobile WebSocket error for driver {driver_id}: {e}")
        if driver_id in active_connections:
            del active_connections[driver_id]
 

async def broadcast_location_update(driver_id: str, position_data: dict):
    """Broadcast location update to monitoring clients"""

    message = {
        "type": "location_update",
        "driver_id": driver_id,
        "data": position_data,
        "timestamp": datetime.utcnow().isoformat()
    }

    print(f"Broadcasting update for driver {driver_id}")


@router.get("/api/mobile/routepoints/{trip_id}")
def get_routepoints(trip_id: str, db: Session = Depends(get_db)):
    location = db.query(models.DriverLocation).filter(
        models.DriverLocation.trip_id == trip_id
    ).first()

    if not location or not location.route_point:
        return []

    route_point_value = location.route_point

    #  FIX: handle string JSON
    if isinstance(route_point_value, str):
        try:
            route_point_value = json.loads(route_point_value)
        except:
            route_point_value = []

    return route_point_value

@router.put("/api/mobile/routepoints/pickup")
def update_pickup_status(
    trip_id: str,
    passenger_id: str,
    db: Session = Depends(get_db)
):
    location = db.query(models.DriverLocation).filter(
        models.DriverLocation.trip_id == trip_id
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Trip not found")

    route_points = location.route_point or []

    #  handle string JSON
    if isinstance(route_points, str):
        try:
            route_points = json.loads(route_points)
        except:
            route_points = []

    updated = False

    for p in route_points:
        if p.get("passenger_id") == passenger_id:
            p["pickup"] = True
            p["timestamp"] = datetime.utcnow().isoformat()
            updated = True

    if not updated:
        raise HTTPException(status_code=404, detail="Passenger not found")

    location.route_point = route_points
    db.commit()
    db.refresh(location)

    return {"message": "Pickup updated successfully"}



    # TODO: send message to websocket monitor clients
    return        
   
    # # Optional: Check if user belongs to the same agency
    #     # if str(locations.agency_id) != str(current_user.agency_id):
    #             raise HTTPException(
    #                 status_code=status.HTTP_403_FORBIDDEN,
    #                 detail="Not authorized to delete this location"
    #             )
        
    #         #db.delete(locations)
    #         #db.commit()
    # return None

    
 
 