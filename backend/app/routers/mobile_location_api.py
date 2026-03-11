from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from datetime import datetime
from app.database import get_db
from app import models, schemas, auth
import json
import asyncio

router = APIRouter(tags=["Mobile Location"])

# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}
# Store latest driver positions
driver_positions: Dict[str, dict] = {}

@router.post("/location", response_model=schemas.LocationResponse)
def upsert_location(
    driver_id: str,
    trip_id: str,
    agency_id: str,
    trip_type: str,  # "shuttle" or "route"
    latitude: float,
    longitude: float,
    accuracy: Optional[float] = None,
    speed: Optional[float] = None,
    route_point: Optional[str] = None,  # JSON string for route type trips
    time_window_seconds: int = 30,  # Customizable time window for upsert
    db: Session = Depends(get_db)
):
    """
    UPSERT location record with customizable time window.
    
    - Updates if location exists within time_window_seconds for same driver AND same trip
    - Creates new record if no recent location exists or different trip
    - Default time window: 30 seconds
    - Set time_window_seconds=0 to always create new records
    - trip_type: "shuttle" or "route" (validated by frontend)
    - route_point: JSON string with passenger data for route trips, null for shuttle trips
    """
    
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
                # Validate the new RoutePoint structure
                required_fields = ['passenger_id', 'passenger_name', 'phonenumber', 'status', 'timestamp']
                for field in required_fields:
                    if field not in route_point_data:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Missing required field in route_point: {field}"
                        )
                
                # Optional fields for route tracking
                optional_fields = ['starting_point', 'end_point', 'starting_lat', 'starting_lng', 'end_lat', 'end_lng']
                
                print(f"✅ Parsed route_point_data with structure: {list(route_point_data.keys())}")
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid route_point JSON format"
                )
        # For shuttle trips or when route_point is null/empty, keep route_point_data as None
        
        # UPSERT LOGIC with customizable time window - check for same driver AND same trip
        from datetime import timedelta
        recent_time = datetime.utcnow() - timedelta(seconds=time_window_seconds)
        
        recent_location = db.query(models.DriverLocation).filter(
            models.DriverLocation.driver_id == driver_id,
            models.DriverLocation.trip_id == trip_id,  # Also check for same trip
            models.DriverLocation.timestamp >= recent_time
        ).order_by(models.DriverLocation.timestamp.desc()).first()
        
        if recent_location and time_window_seconds > 0:
            # UPDATE existing record for same trip
            recent_location.latitude = latitude
            recent_location.longitude = longitude
            recent_location.accuracy = accuracy
            recent_location.speed = speed
            recent_location.route_point = route_point_data
            # trip_id already matches, no need to update
            
            db.commit()
            db.refresh(recent_location)
            
            location = recent_location
            action = "updated"
            print(f"🔄 Updated existing location for driver {driver_id} on trip {trip_id}")
        else:
            # CREATE new record (different trip or no recent location)
            location = models.DriverLocation(
                driver_id=driver_id,
                trip_id=trip_id,
                agency_id=agency_id,
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
                speed=speed,
                route_point=route_point_data
            )
            
            db.add(location)
            db.commit()
            db.refresh(location)
            
            action = "created"
            print(f"✅ Created new location for driver {driver_id} on trip {trip_id}")
        
        # Expected route_point structure for route trips
        expected_structure = {
            "route_point_structure": {
                "passenger_id": "string (UUID)",
                "passenger_name": "string", 
                "phonenumber": "string",
                "status": "string (pickup/dropped)",
                "timestamp": "string (ISO datetime)",
                "starting_point": "string (optional)",
                "end_point": "string (optional)",
                "starting_lat": "float (optional)",
                "starting_lng": "float (optional)",
                "end_lat": "float (optional)",
                "end_lng": "float (optional)"
            }
        }
        
        # Update cache for WebSocket
        driver_positions[driver_id] = {
            "latitude": latitude,
            "longitude": longitude,
            "speed": speed,
            "timestamp": location.timestamp.isoformat(),
            "trip_id": trip_id,
            "agency_id": agency_id,
            "route_point": route_point_data
        }
        
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
            route_point=location.route_point
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upsert location record: {str(e)}"
        )

@router.get("/locations", response_model=List[schemas.LocationResponse])
def get_locations(
    driver_id: Optional[str] = None,
    agency_id: Optional[str] = None,
    trip_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get locations with flexible filtering by driver_id, agency_id, and/or trip_id.
    
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

@router.websocket("/ws/driver/{driver_id}")
async def websocket_driver_location(websocket: WebSocket, driver_id: str):
    """WebSocket for real-time driver location updates"""
    await websocket.accept()
    
    # Store connection
    active_connections[driver_id] = websocket
    print(f" Driver {driver_id} connected via WebSocket")
    
    try:
        while True:
            # Receive location data from driver
            data = await websocket.receive_json()
            
            # Validate required fields
            if not all(key in data for key in ['latitude', 'longitude', 'trip_id', 'agency_id', 'trip_type']):
                await websocket.send_json({
                    "type": "error",
                    "message": "Missing required fields: latitude, longitude, trip_id, agency_id, trip_type"
                })
                continue
            
            # Parse route_point if provided
            route_point_data = None
            if data.get('trip_type') == 'route' and data.get('route_point'):
                route_point_data = data['route_point']
            elif data.get('trip_type') == 'shuttle':
                route_point_data = None
            
            # Create location record in database
            try:
                db = next(get_db())
                location = models.DriverLocation(
                    driver_id=driver_id,
                    trip_id=data['trip_id'],
                    agency_id=data['agency_id'],
                    latitude=data['latitude'],
                    longitude=data['longitude'],
                    accuracy=data.get('accuracy'),
                    speed=data.get('speed'),
                    route_point=route_point_data
                )
                db.add(location)
                db.commit()
                db.refresh(location)
                
                # Update driver position cache
                driver_positions[driver_id] = {
                    "latitude": data['latitude'],
                    "longitude": data['longitude'],
                    "speed": data.get('speed'),
                    "timestamp": datetime.utcnow().isoformat(),
                    "trip_id": data['trip_id'],
                    "agency_id": data['agency_id'],
                    "route_point": route_point_data
                }
                
                # Broadcast to monitoring clients
                await broadcast_location_update(driver_id, driver_positions[driver_id])
                
                # Send confirmation to driver
                await websocket.send_json({
                    "type": "success",
                    "message": "Location updated",
                    "location_id": location.id,
                    "timestamp": driver_positions[driver_id]['timestamp']
                })
                
                db.close()
                
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Database error: {str(e)}"
                })
                if 'db' in locals():
                    db.close()
            
    except WebSocketDisconnect:
        # Clean up on disconnect
        if driver_id in active_connections:
            del active_connections[driver_id]
        if driver_id in driver_positions:
            del driver_positions[driver_id]
        print(f"Driver {driver_id} disconnected")
    except Exception as e:
        print(f"WebSocket error for driver {driver_id}: {e}")
        if driver_id in active_connections:
            del active_connections[driver_id]

@router.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket):
    """WebSocket for monitoring all driver locations (for admin/dashboard)"""
    await websocket.accept()
    print("📊 Monitor client connected")
    
    try:
        # Send initial driver positions
        await websocket.send_json({
            "type": "initial",
            "drivers": driver_positions,
            "count": len(driver_positions)
        })
        
        while True:
            # Keep connection alive and send updates
            await asyncio.sleep(1)  # Check every second
            
            # Send heartbeat
            await websocket.send_json({
                "type": "heartbeat",
                "timestamp": datetime.utcnow().isoformat(),
                "active_drivers": len(active_connections)
            })
            
    except WebSocketDisconnect:
        print("📊 Monitor client disconnected")
    except Exception as e:
        print(f"⚠️ Monitor WebSocket error: {e}")

async def broadcast_location_update(driver_id: str, position_data: dict):
    """Broadcast location update to all monitoring clients"""
    message = {
        "type": "location_update",
        "driver_id": driver_id,
        "data": position_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Send to all monitoring clients (you'd need to track monitor connections)
    # For now, this is a placeholder for broadcasting logic
    print(f"Broadcasting update for driver {driver_id}")

@router.get("/drivers/active")
def get_active_drivers():
    """Get list of currently active drivers (with WebSocket connections)"""
    return {
        "active_drivers": list(active_connections.keys()),
        "count": len(active_connections),
        "positions": driver_positions
    }

@router.get("/debug/route-points")
def debug_route_points(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check route_point structure in database"""
    locations = db.query(models.DriverLocation).filter(
        models.DriverLocation.route_point.isnot(None)
    ).limit(limit).all()
    
    result = []
    for loc in locations:
        route_point_keys = list(loc.route_point.keys()) if loc.route_point else []
        
        # Check for new structure fields
        new_structure_fields = ['passenger_id', 'passenger_name', 'phonenumber', 'status', 'timestamp']
        has_new_structure = all(field in route_point_keys for field in new_structure_fields)
        
        # Check for old structure fields  
        old_structure_fields = ['passenger_name', 'passenger_phone', 'starting_point', 'end_point', 'starting_lat', 'starting_lng', 'end_lat', 'end_lng']
        has_old_structure = any(field in route_point_keys for field in old_structure_fields)
        
        result.append({
            "id": loc.id,
            "driver_id": loc.driver_id,
            "trip_id": loc.trip_id,
            "route_point": loc.route_point,
            "route_point_type": str(type(loc.route_point)),
            "route_point_keys": route_point_keys,
            "has_new_structure": has_new_structure,
            "has_old_structure": has_old_structure,
            "passenger_id": loc.route_point.get("passenger_id") if loc.route_point else None,
            "passenger_name": loc.route_point.get("passenger_name") if loc.route_point else None,
            "phonenumber": loc.route_point.get("phonenumber") if loc.route_point else None,
            "status": loc.route_point.get("status") if loc.route_point else None,
            "timestamp": loc.route_point.get("timestamp") if loc.route_point else None,
            "old_passenger_phone": loc.route_point.get("passenger_phone") if loc.route_point else None,
            "starting_point": loc.route_point.get("starting_point") if loc.route_point else None,
            "end_point": loc.route_point.get("end_point") if loc.route_point else None,
            "starting_lat": loc.route_point.get("starting_lat") if loc.route_point else None,
            "starting_lng": loc.route_point.get("starting_lng") if loc.route_point else None,
            "end_lat": loc.route_point.get("end_lat") if loc.route_point else None,
            "end_lng": loc.route_point.get("end_lng") if loc.route_point else None
        })
    
    return {"route_points": result, "count": len(result)}

@router.delete("/location/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
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
