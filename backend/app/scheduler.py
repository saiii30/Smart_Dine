# backend/app/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from app.utils.trip_scheduler import update_trip_schedule_status
from cleanup_notifications import clear_all_acknowledgements
import logging
import atexit

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = None

def start_scheduler():
    global scheduler
    if scheduler and scheduler.running:
        logger.info("Scheduler is already running")
        return

    scheduler = BackgroundScheduler()
    
    try:
        # Run every 5 minutes
        scheduler.add_job(
            update_trip_schedule_status,
            'interval',
            minutes=5,
            id='update_trip_status',
            name='Update trip status based on end date',
            replace_existing=True
        )
        
        # Daily notification cleanup at 12:30 AM - Clear ALL acknowledgements
        scheduler.add_job(
            clear_all_acknowledgements,
            'cron',
            hour=0,
            minute=30,
            id='clear_all_acknowledgements',
            name='Clear all notification acknowledgements every night at 12:30 AM',
            replace_existing=True
        )
        
        logger.info("Starting scheduler with trip status updates and daily notification cleanup...")
        scheduler.start()
        
        # Properly shut down the scheduler when the app exits
        atexit.register(lambda: scheduler.shutdown())
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")
        raise

def shutdown_scheduler():
    """Shut down the scheduler if it's running"""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        scheduler = None
        logger.info("Scheduler has been shut down")