from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from app.database import get_db
from app import models, schemas, auth
import json
import asyncio


router = APIRouter()
 
# Store active WebSocket connections
active_connections: Dict[int, WebSocket] = {}
driver_locations: Dict[int, schemas.DriverLocationStatus] = {}
 
@router.post("/", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location_update(
    location: schemas.LocationUpdate,
    driver_id: str,  # Add driver_id parameter
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update driver location via REST API (for mobile apps)"""
    # Get the driver by ID
    driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id
    ).first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    
    # Verify user owns this driver (unless admin)
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN, models.UserRole.IT_COMPANY]:
        if driver.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this driver's location"
            )
    
    db_location = models.DriverLocation(
        driver_id=driver.id,
        agency_id=current_user.agency_id,  # Use current user's agency_id
        trip_id=location.trip_id,  # Use trip_id from location data
        latitude=location.latitude,
        longitude=location.longitude,
        accuracy=location.accuracy,
        speed=location.speed,
        route_point=location.route_point,
        timestamp=datetime.utcnow()  # Add timestamp field
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    
    # Update in-memory cache for real-time updates
    update_driver_location_cache(driver.id, driver.full_name, location, db)
    
    # Broadcast to WebSocket clients
    broadcast_location_update(driver.id, location)
    
    return db_location
 
@router.get("/drivers/{driver_id}/current", response_model=Optional[schemas.DriverLocationStatus])
def get_current_location(
    driver_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current location of a driver"""
    # Allow Admin/IT Company/Super Admin to view any driver
    # Regular users can only view their own drivers
    query = db.query(models.Driver).filter(models.Driver.id == driver_id)
    
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPER_ADMIN, models.UserRole.IT_COMPANY]:
        query = query.filter(models.Driver.owner_id == current_user.id)
        
    driver = query.first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    
    # Check cache first - DISABLED to allow manual DB updates to reflect
    # if driver_id in driver_locations:
    #     return driver_locations[driver_id]
    pass
    
    # Get latest from database
    latest_location = db.query(models.DriverLocation).filter(
        models.DriverLocation.driver_id == driver_id
    ).order_by(desc(models.DriverLocation.timestamp)).first()
    
    if not latest_location:
        return None
    
    return schemas.DriverLocationStatus(
        driver_id=driver.id,
        driver_name='Driver', # Alternatively driver.user.name if loaded
        latitude=latest_location.latitude,
        agency_id=latest_location.agency_id,
        trip_id=latest_location.trip_id,
        route_point=latest_location.route_point,
        longitude=latest_location.longitude,
        speed=latest_location.speed,
        last_update=latest_location.timestamp,
        is_online=driver_id in active_connections
    )
 
@router.get("/drivers/{driver_id}/history", response_model=List[schemas.LocationResponse])
def get_location_history(
    driver_id: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get location history for a driver"""
    driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id,
        models.Driver.owner_id == current_user.id
    ).first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    
    query = db.query(models.DriverLocation).filter(
        models.DriverLocation.driver_id == driver_id
    )
    
    if start_time:
        query = query.filter(models.DriverLocation.timestamp >= start_time)
    if end_time:
        query = query.filter(models.DriverLocation.timestamp <= end_time)
    
    locations = query.order_by(desc(models.DriverLocation.timestamp)).limit(limit).all()
    return locations
 
@router.get("/all", response_model=List[schemas.DriverLocationStatus])
def get_all_driver_locations(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current locations of all drivers for the current user"""
    drivers = db.query(models.Driver).filter(
        models.Driver.owner_id == current_user.id,
        models.Driver.is_active == True
    ).all()
    
    locations = []
    for driver in drivers:
        if driver.id in driver_locations:
            locations.append(driver_locations[driver.id])
        else:
            # Get latest from database
            latest = db.query(models.DriverLocation).filter(
                models.DriverLocation.driver_id == driver.id
            ).order_by(desc(models.DriverLocation.timestamp)).first()
            
            if latest:
                locations.append(schemas.DriverLocationStatus(
                    driver_id=driver.id,
                    driver_name=driver.full_name,
                    latitude=latest.latitude,
                    longitude=latest.longitude,
                    speed=latest.speed,
                    last_update=latest.timestamp,
                    is_online=driver.id in active_connections
                ))
    
    return locations
 
@router.websocket("/ws/{driver_id}")
async def websocket_location_tracking(websocket: WebSocket, driver_id: str):
    """WebSocket endpoint for real-time location updates"""
    await websocket.accept()
    active_connections[driver_id] = websocket
    
    try:
        # Send current location if available
        if driver_id in driver_locations:
            await websocket.send_json(driver_locations[driver_id].dict())
        
        # Listen for location updates from driver's device
        while True:
            data = await websocket.receive_json()
            
            # Validate and save location update
            location_update = schemas.LocationUpdate(**data)
            
            # Here you would save to database (using a background task for better performance)
            # For now, we'll update the cache
            # In production, use a background task queue (Celery, RQ) for database writes
            
            # Broadcast to all connected clients watching this driver
            broadcast_location_update(driver_id, location_update)
            
    except WebSocketDisconnect:
        del active_connections[driver_id]
        if driver_id in driver_locations:
            driver_locations[driver_id].is_online = False
 
@router.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket, token: str):
    """WebSocket endpoint for monitoring all drivers (for travel providers)"""
    # Verify token (simplified - in production use proper auth)
    await websocket.accept()
    
    try:
        # Send all current locations
        all_locations = list(driver_locations.values())
        await websocket.send_json({"type": "initial", "locations": [loc.dict() for loc in all_locations]})
        
        # Keep connection alive and send updates
        while True:
            # In production, use a proper pub/sub system (Redis, RabbitMQ)
            await websocket.receive_text()  # Keep connection alive
            
    except WebSocketDisconnect:
        pass
 
def update_driver_location_cache(driver_id: str, driver_name: str, location: schemas.LocationUpdate, db: Session):
    """Update in-memory cache of driver locations"""
    driver_locations[driver_id] = schemas.DriverLocationStatus(
        driver_id=driver_id,
        driver_name=driver_name,
        latitude=location.latitude,
        longitude=location.longitude,
        speed=location.speed,
        last_update=datetime.utcnow(),
        is_online=driver_id in active_connections
    )
 
def broadcast_location_update(driver_id: str, location: schemas.LocationUpdate):
    """Broadcast location update to all connected WebSocket clients"""
    if driver_id in driver_locations:
        location_data = driver_locations[driver_id].dict()
        # In production, use Redis pub/sub or message queue for better scalability
        # For now, we'll just update the cache
 

@router.websocket("/live")
async def websocket_tracking(websocket: WebSocket):
    await websocket.accept()
    print("✅ WS Connected")

    try:
        while True:
            db = next(get_db())

            # 🔥 GET ACTIVE DRIVER LOCATIONS ONLY
            active_locations = db.query(models.DriverLocation).filter(
                models.DriverLocation.is_active == True
            ).all()

            # 🔥 CREATE MAP (trip_id → location)
            location_map = {
                str(loc.trip_id): loc for loc in active_locations
            }

            # 🔥 GET TRIPS
            trips = db.query(models.TripSchedule).all()

            response = []

            for trip in trips:
                trip_id = str(trip.id)

                # 🔥 SAME AS YOUR find()
                driverActive = location_map.get(trip_id)

                user = db.query(models.User).filter(
                        models.User.id == trip.driver_id
                 ).first()

                if not driverActive:
                    continue   # ⛔ skip if no active driver

                # 🔥 YOUR scheduleObj (FULL)
                scheduleObj = {
                    "id": trip.id,
                    "trip_id": trip.id,
                    "company_name": trip.company_name,
                    "vehicle_registration_number": trip.vehicle.vehicle_registration_number if trip.vehicle else "Unassigned",
                    "driver_name": user.name if user else "Unassigned",
                    "starting_point": trip.starting_point,
                    "end_point": trip.end_point,
                    "start_date": str(trip.start_date) if trip.start_date else None,
                    "passenger_count": trip.passenger_count,
                    "trip_type": trip.trip_type,
                    "route_point": trip.route_point,
                    

                    "status": "Active" if trip.is_active else "Inactive",

                    "driver_id": trip.driver_id,

                    "driver_phone":
                        (trip.driver.user.contact_number if trip.driver and trip.driver.user else None)
                        or trip.driver_phone,

                }

                response.append(scheduleObj)
                print(f"Prepared data for trip {trip_id}: {scheduleObj}")

            await websocket.send_text(json.dumps(response))

            db.close()
            await asyncio.sleep(3)

    except Exception as e:
        print("❌ WS Error:", e)
        await websocket.close()