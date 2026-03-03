import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app import models, schemas
 
logger = logging.getLogger(__name__)
 
class LocationTrackerService:
    def __init__(self):
        self.active_drivers: Dict[str, dict] = {}
        self.is_running = False
        self.task = None
        self.enable_cleanup = True  # Can be set to False to disable cleanup
       
    async def start_tracking(self):
        """Start the background location tracking service"""
        if self.is_running:
            logger.warning("Location tracking is already running")
            return
           
        self.is_running = True
        self.task = asyncio.create_task(self._tracking_loop())
        logger.info("Location tracking service started")
       
    async def stop_tracking(self):
        """Stop the background location tracking service"""
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Location tracking service stopped")
       
    async def _tracking_loop(self):
        """Main tracking loop that runs every 10 minutes"""
        while self.is_running:
            try:
                await self._update_driver_locations()
                await asyncio.sleep(600)  # 10 minutes = 600 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in tracking loop: {e}")
                await asyncio.sleep(120)  # Wait 2 minutes before retrying
               
    async def _update_driver_locations(self):
        """Update locations for all active drivers"""
        db = next(get_db())
        try:
            # Get all active drivers
            active_drivers = db.query(models.Driver).filter(
                models.Driver.status == 'Active'
            ).all()
           
            logger.debug(f"Updating locations for {len(active_drivers)} active drivers")
           
            for driver in active_drivers:
                await self._update_single_driver_location(driver, db)
           
            # Commit all driver location updates
            db.commit()
               
            # Clean up old location records in the same transaction
            if self.enable_cleanup:
                await self._cleanup_old_locations(db)
               
        except Exception as e:
            logger.error(f"Error updating driver locations: {e}")
            db.rollback()
        finally:
            db.close()
           
    async def _update_single_driver_location(self, driver: models.Driver, db: Session):
        """Update location for a single driver - only if real GPS data available"""
        try:
            # Check if driver has recent location updates from mobile app
            recent_location = db.query(models.DriverLocation).filter(
                models.DriverLocation.driver_id == driver.id,
                models.DriverLocation.accuracy <= 50  # Only consider GPS with good accuracy (<= 50m)
            ).order_by(desc(models.DriverLocation.timestamp)).first()
           
            # Only update if we have recent real GPS data (within last 15 minutes)
            current_time = datetime.utcnow()
            if recent_location and (current_time - recent_location.timestamp) <= timedelta(minutes=15):
                # This driver has recent real GPS data, no need to simulate
                logger.debug(f"Driver {driver.id} has recent real GPS data, skipping simulation")
               
                # Update active drivers cache with real data
                self.active_drivers[driver.id] = {
                    'last_update': recent_location.timestamp,
                    'location': {
                        'latitude': recent_location.latitude,
                        'longitude': recent_location.longitude,
                        'speed': recent_location.speed,
                        'accuracy': recent_location.accuracy,
                        'source': 'real_gps'
                    }
                }
                return
           
            # No recent real GPS data found - driver might be offline or not sharing location
            logger.debug(f"No recent real GPS data for driver {driver.id}, driver may be offline")
           
            # Remove from active drivers if no recent updates
            if driver.id in self.active_drivers:
                del self.active_drivers[driver.id]
               
        except Exception as e:
            logger.error(f"Error updating location for driver {driver.id}: {e}")
           
    async def update_driver_location_from_app(self, driver_id: str, latitude: float, longitude: float,
                                            speed: float = None, accuracy: float = None, trip_id: str = None):
        """Update driver location from mobile app using UPSERT logic (update if exists by trip_id, insert if not)"""
        max_retries = 3
        base_delay = 0.1  # 100ms base delay
       
        for attempt in range(max_retries):
            try:
                db = next(get_db())
               
                try:
                    # Verify driver exists
                    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
                    if not driver:
                        logger.error(f"Driver {driver_id} not found")
                        return False
                   
                    # Validate GPS accuracy - reject poor GPS signals
                    if accuracy is not None and accuracy > 100:  # Poor GPS signal
                        logger.warning(f"Rejecting poor GPS data for driver {driver_id}: accuracy {accuracy}m")
                        return False
                   
                    current_time = datetime.utcnow()
                   
                    # UPSERT Logic: Check if record exists for this trip_id
                    if trip_id:
                        # Try to find existing record by trip_id
                        existing_location = db.query(models.DriverLocation).filter(
                            models.DriverLocation.trip_id == trip_id
                        ).first()
                       
                        if existing_location:
                            # UPDATE existing record
                            existing_location.latitude = latitude
                            existing_location.longitude = longitude
                            existing_location.speed = speed or 0.0
                            existing_location.accuracy = accuracy or 10.0
                            existing_location.timestamp = current_time
                           
                            logger.info(f"Updated location for trip_id {trip_id}: ({latitude}, {longitude})")
                        else:
                            # INSERT new record with trip_id
                            location_entry = models.DriverLocation(
                                driver_id=driver_id,
                                agency_id=driver.agency_id,
                                trip_id=trip_id,
                                latitude=latitude,
                                longitude=longitude,
                                speed=speed or 0.0,
                                accuracy=accuracy or 10.0,
                                timestamp=current_time
                            )
                           
                            db.add(location_entry)
                            logger.info(f"Inserted new location for trip_id {trip_id}: ({latitude}, {longitude})")
                    else:
                        # No trip_id provided - create new record (legacy behavior)
                        location_entry = models.DriverLocation(
                            driver_id=driver_id,
                            agency_id=driver.agency_id,
                            latitude=latitude,
                            longitude=longitude,
                            speed=speed or 0.0,
                            accuracy=accuracy or 10.0,
                            timestamp=current_time
                        )
                       
                        db.add(location_entry)
                        logger.info(f"Inserted new location without trip_id: ({latitude}, {longitude})")
                   
                    # Commit the transaction
                    db.commit()
                   
                    # Update active drivers cache with real GPS data
                    self.active_drivers[driver_id] = {
                        'last_update': current_time,
                        'location': {
                            'latitude': latitude,
                            'longitude': longitude,
                            'speed': speed,
                            'accuracy': accuracy,
                            'source': 'real_gps'
                        }
                    }
                   
                    logger.info(f"Successfully processed GPS location for driver {driver_id}: ({latitude}, {longitude}) accuracy: {accuracy}m")
                    return True  # Success, exit retry loop
                   
                finally:
                    db.close()
                   
            except Exception as e:
                if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                    # Exponential backoff: 100ms, 200ms, 400ms
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Database locked during location update, retrying in {delay:.1f}s... (attempt {attempt + 1}/{max_retries})")
                    try:
                        db.rollback()
                    except:
                        pass
                    await asyncio.sleep(delay)
                    continue
                else:
                    try:
                        db.rollback()
                    except:
                        pass
                    logger.error(f"Error updating driver location from app after {max_retries} attempts: {e}")
                    return False
           
    async def _cleanup_old_locations(self, db: Session = None):
        """Clean up location records older than 7 days"""
        max_retries = 3
        base_delay = 0.1  # 100ms base delay
       
        # Use provided session or create a new one
        should_close_session = False
        if db is None:
            db = next(get_db())
            should_close_session = True
       
        try:
            for attempt in range(max_retries):
                try:
                    cutoff_date = datetime.utcnow() - timedelta(days=7)
                   
                    # Delete old location records
                    deleted_count = db.query(models.DriverLocation).filter(
                        models.DriverLocation.timestamp < cutoff_date
                    ).delete()
                   
                    if deleted_count > 0:
                        logger.info(f"Cleaned up {deleted_count} old location records")
                    return  # Success, exit retry loop
                   
                except Exception as e:
                    if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                        # Exponential backoff: 100ms, 200ms, 400ms
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"Database locked during cleanup, retrying in {delay:.1f}s... (attempt {attempt + 1}/{max_retries})")
                        if not should_close_session:
                            db.rollback()
                        await asyncio.sleep(delay)
                        continue
                    else:
                        if not should_close_session:
                            db.rollback()
                        logger.error(f"Error cleaning up old locations after {max_retries} attempts: {e}")
                        break  # Exit retry loop on final attempt
        finally:
            if should_close_session:
                db.close()
           
    def get_active_drivers(self) -> Dict[str, dict]:
        """Get list of active drivers with their last known locations"""
        return self.active_drivers.copy()
 
# Global instance
location_tracker = LocationTrackerService()
 