"""
Daily notification cleanup script.
Runs at 12:30 AM to clean the acknowledge table and ensure expired notifications reappear.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models
from datetime import datetime, timedelta
import logging
from sqlalchemy import and_

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_driver_notifications(db: Session, agency_id: str = None) -> list:
    """Get current driver notifications (similar to notifications.py)"""
    from app.routers.notifications import get_driver_notifications
    return get_driver_notifications(db, agency_id)

def get_vehicle_notifications(db: Session, agency_id: str = None) -> list:
    """Get current vehicle notifications (similar to notifications.py)"""
    from app.routers.notifications import get_vehicle_notifications
    return get_vehicle_notifications(db, agency_id)

def clear_all_acknowledgements():
    """
    Clear ALL notification acknowledgements from the table.
    This will make all notifications reappear every morning.
    """
    db = SessionLocal()
    try:
        logger.info("Starting complete acknowledgement table cleanup...")
        
        # Count before deletion
        count_before = db.query(models.NotificationAcknowledgement).count()
        logger.info(f"Found {count_before} acknowledgements to clear")
        
        # Delete ALL acknowledgements
        deleted_count = db.query(models.NotificationAcknowledgement).delete(synchronize_session=False)
        
        db.commit()
        logger.info(f"Cleared {deleted_count} acknowledgements from the table")
        
        return {
            "status": "success",
            "deleted_count": deleted_count,
            "message": f"All {deleted_count} acknowledgements cleared successfully"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error clearing acknowledgements: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()

def cleanup_notification_acknowledgements():
    """
    Clean up notification acknowledgements table:
    1. Remove acknowledgements for expired notifications that are no longer relevant
    2. Remove acknowledgements for notifications that should reappear
    """
    db = SessionLocal()
    try:
        logger.info("Starting daily notification cleanup...")
        
        # Get all agencies
        agencies = db.query(models.Agency).all()
        
        total_cleaned = 0
        
        for agency in agencies:
            agency_id = agency.id
            logger.info(f"Processing agency: {agency.agency_name} ({agency_id})")
            
            # Get current active notifications for this agency
            current_notifications = []
            driver_notifications = get_driver_notifications(db, agency_id)
            vehicle_notifications = get_vehicle_notifications(db, agency_id)
            current_notifications.extend(driver_notifications)
            current_notifications.extend(vehicle_notifications)
            
            # Get current notification IDs
            current_notification_ids = {notif['id'] for notif in current_notifications}
            
            # Get all acknowledged notification IDs for this agency
            acknowledged_query = db.query(models.NotificationAcknowledgement.notification_id).filter(
                models.NotificationAcknowledgement.agency_id == agency_id
            )
            acknowledged_notification_ids = {row[0] for row in acknowledged_query.all()}
            
            # Find acknowledgements to remove (notifications that are no longer active)
            acknowledgements_to_remove = acknowledged_notification_ids - current_notification_ids
            
            if acknowledgements_to_remove:
                logger.info(f"Found {len(acknowledgements_to_remove)} expired acknowledgements to remove for agency {agency.agency_name}")
                
                # Remove expired acknowledgements
                deleted_count = db.query(models.NotificationAcknowledgement).filter(
                    and_(
                        models.NotificationAcknowledgement.agency_id == agency_id,
                        models.NotificationAcknowledgement.notification_id.in_(acknowledgements_to_remove)
                    )
                ).delete(synchronize_session=False)
                
                total_cleaned += deleted_count
                logger.info(f"Removed {deleted_count} expired acknowledgements for agency {agency.agency_name}")
            else:
                logger.info(f"No expired acknowledgements found for agency {agency.agency_name}")
        
        # Commit all changes
        db.commit()
        logger.info(f"Daily notification cleanup completed. Total acknowledgements removed: {total_cleaned}")
        
        return {
            "status": "success",
            "total_cleaned": total_cleaned,
            "agencies_processed": len(agencies)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error during notification cleanup: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        db.close()

def cleanup_old_acknowledgements(days_old: int = 90):
    """
    Clean up very old acknowledgements (older than specified days)
    This is a separate cleanup function for very old records
    """
    db = SessionLocal()
    try:
        logger.info(f"Cleaning up acknowledgements older than {days_old} days...")
        
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        # Delete old acknowledgements
        deleted_count = db.query(models.NotificationAcknowledgement).filter(
            models.NotificationAcknowledgement.acknowledged_at < cutoff_date
        ).delete(synchronize_session=False)
        
        db.commit()
        logger.info(f"Removed {deleted_count} old acknowledgements (older than {days_old} days)")
        
        return deleted_count
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error cleaning up old acknowledgements: {str(e)}")
        return 0
    finally:
        db.close()

def main():
    """Main function to run the cleanup"""
    logger.info("=== Daily Notification Cleanup Script Started ===")
    
    # Clear ALL acknowledgements every night
    result = clear_all_acknowledgements()
    
    logger.info("=== Daily Notification Cleanup Script Completed ===")
    
    if result["status"] == "success":
        logger.info(f"SUCCESS: {result['message']}")
    else:
        logger.error(f"FAILED: {result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    main()
