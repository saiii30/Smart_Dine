from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from app.database import get_db
from app import models, schemas, auth
import json

router = APIRouter()

# Store active WebSocket connections
active_connections: Dict[int, WebSocket] = {}
driver_locations: Dict[int, schemas.DriverLocationStatus] = {}

@router.post("/", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location_update(
    location: schemas.LocationUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update driver location via REST API (for mobile apps)"""
    # Get the driver associated with current user (assuming one driver per user for simplicity)
    # In production, you'd pass driver_id or get it from the authenticated driver
    driver = db.query(models.Driver).filter(
        models.Driver.owner_id == current_user.id
    ).first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found for this user"
        )
    
    db_location = models.DriverLocation(
        driver_id=driver.id,
        vehicle_id=location.vehicle_id,
        latitude=location.latitude,
        longitude=location.longitude,
        accuracy=location.accuracy,
        speed=location.speed,
        heading=location.heading
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    
    # Update in-memory cache for real-time updates
    update_driver_location_cache(driver.id, driver.full_name, location, db)
    
    # Broadcast to WebSocket clients
    broadcast_location_update(driver.id, location)
    
    return db_location

@router.get("/drivers/{driver_id}/current", response_model=schemas.DriverLocationStatus)
def get_current_location(
    driver_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current location of a driver"""
    driver = db.query(models.Driver).filter(
        models.Driver.id == driver_id,
        models.Driver.owner_id == current_user.id
    ).first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    
    # Check cache first
    if driver_id in driver_locations:
        return driver_locations[driver_id]
    
    # Get latest from database
    latest_location = db.query(models.DriverLocation).filter(
        models.DriverLocation.driver_id == driver_id
    ).order_by(desc(models.DriverLocation.timestamp)).first()
    
    if not latest_location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No location data found"
        )
    
    vehicle = None
    if latest_location.vehicle_id:
        vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == latest_location.vehicle_id
        ).first()
    
    return schemas.DriverLocationStatus(
        driver_id=driver.id,
        driver_name=driver.full_name,
        vehicle_id=latest_location.vehicle_id,
        vehicle_number=vehicle.vehicle_number if vehicle else None,
        latitude=latest_location.latitude,
        longitude=latest_location.longitude,
        speed=latest_location.speed,
        heading=latest_location.heading,
        last_update=latest_location.timestamp,
        is_online=driver_id in active_connections
    )

@router.get("/drivers/{driver_id}/history", response_model=List[schemas.LocationResponse])
def get_location_history(
    driver_id: int,
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
                vehicle = None
                if latest.vehicle_id:
                    vehicle = db.query(models.Vehicle).filter(
                        models.Vehicle.id == latest.vehicle_id
                    ).first()
                
                locations.append(schemas.DriverLocationStatus(
                    driver_id=driver.id,
                    driver_name=driver.full_name,
                    vehicle_id=latest.vehicle_id,
                    vehicle_number=vehicle.vehicle_number if vehicle else None,
                    latitude=latest.latitude,
                    longitude=latest.longitude,
                    speed=latest.speed,
                    heading=latest.heading,
                    last_update=latest.timestamp,
                    is_online=driver.id in active_connections
                ))
    
    return locations

@router.websocket("/ws/{driver_id}")
async def websocket_location_tracking(websocket: WebSocket, driver_id: int):
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

def update_driver_location_cache(driver_id: int, driver_name: str, location: schemas.LocationUpdate, db: Session):
    """Update in-memory cache of driver locations"""
    vehicle = None
    if location.vehicle_id:
        vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.id == location.vehicle_id
        ).first()
    
    driver_locations[driver_id] = schemas.DriverLocationStatus(
        driver_id=driver_id,
        driver_name=driver_name,
        vehicle_id=location.vehicle_id,
        vehicle_number=vehicle.vehicle_number if vehicle else None,
        latitude=location.latitude,
        longitude=location.longitude,
        speed=location.speed,
        heading=location.heading,
        last_update=datetime.utcnow(),
        is_online=driver_id in active_connections
    )

def broadcast_location_update(driver_id: int, location: schemas.LocationUpdate):
    """Broadcast location update to all connected WebSocket clients"""
    if driver_id in driver_locations:
        location_data = driver_locations[driver_id].dict()
        # In production, use Redis pub/sub or message queue for better scalability
        # For now, we'll just update the cache

