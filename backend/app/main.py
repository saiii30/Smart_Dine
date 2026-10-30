"""Smart Dine — FastAPI application entrypoint."""
from __future__ import annotations

import logging
import os
from pathlib import Path
import json

from dotenv import load_dotenv, find_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import engine, Base, SessionLocal
from app import models  # noqa: F401 — register ORM mappers

from app.routers import (
    dine_auth,
    branches,
    floor_tables,
    menu,
    orders,
    kitchen,
    billing,
    reports,
    inventory,
    suppliers,
    employees,
    feedback,
    public_customer,
    ws_orders,
    insights,
    settings,
)

load_dotenv(find_dotenv())

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Dine API",
    description="Restaurant management backend — orders, kitchen, billing, inventory.",
    version="2.0.0",
)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    msgs = [f"{err.get('loc')}: {err.get('msg')}" for err in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": msgs})


CORS_ORIGINS = [
    "https://smart-dine-1zev.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

backend_dir = Path(__file__).resolve().parents[1]
uploads_dir = backend_dir / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
for sub in ("menu", "vehicles"):
    (uploads_dir / sub).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(dine_auth.router, prefix="/api/auth")
app.include_router(branches.router, prefix="/api")
app.include_router(floor_tables.router, prefix="/api")
app.include_router(menu.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(kitchen.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(public_customer.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(ws_orders.router)
app.include_router(settings.router, prefix="/api")


def reset_menu_availability():
    """Resets all out-of-stock items back to Available at Midnight."""
    db = SessionLocal()
    try:
        # 1. Reset global is_available flag
        db.query(models.MenuItem).filter(models.MenuItem.is_available.is_(False)).update({"is_available": True})
        
        # 2. Reset slot-specific OOS tracking from metadata
        items = db.query(models.MenuItem).filter(models.MenuItem.description.like('%|META|%')).all()
        for item in items:
            try:
                parts = item.description.split('|META|')
                base_desc = parts[0].strip()
                meta = json.loads(parts[1])
                if 'oos' in meta and len(meta['oos']) > 0:
                    meta['oos'] = []
                    new_desc = f"{base_desc} |META|{json.dumps(meta)}" if base_desc else f"|META|{json.dumps(meta)}"
                    item.description = new_desc
            except Exception:
                pass

        db.commit()
        logger.info("11:20 PM Reset Complete: All Out-of-Stock items are back in stock!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error resetting menu availability: {e}")
    finally:
        db.close()

@app.on_event("startup")
def start_scheduler():
    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")
     # Schedule the reset task to run exactly at midnight (00:00) every day
    scheduler.add_job(reset_menu_availability, 'cron', hour=0, minute=0)
    scheduler.start()


@app.get("/")
async def root():
    return {"name": "Smart Dine API", "docs": "/docs"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
