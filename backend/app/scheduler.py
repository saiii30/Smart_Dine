# backend/app/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from app.utils.trip_scheduler import update_trip_schedule_status
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
        # Run daily at 12:30 PM
        scheduler.add_job(
            update_trip_schedule_status,
            'cron',
            hour=12,
            minute=30,
            id='update_trip_status',
            name='Update trip status based on end date - Daily 12:30 PM',
            replace_existing=True
        )
        
        logger.info("Starting trip status scheduler...")
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
        logger.info("Trip status scheduler has been shut down")