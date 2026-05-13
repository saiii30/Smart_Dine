"""Background jobs placeholder (Smart Dine). Trip scheduler removed."""
import logging

logger = logging.getLogger(__name__)


def start_scheduler() -> None:
    logger.info("Smart Dine: no background scheduler configured.")


def shutdown_scheduler() -> None:
    pass
