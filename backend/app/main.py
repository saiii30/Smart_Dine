from fastapi import FastAPI, Request, Depends, HTTPException, status, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
import json
import os
from .scheduler import start_scheduler, shutdown_scheduler
import logging
import requests
 
# Import database and models
from app.database import engine, Base, get_db
from app import models, schemas
 
# Import routers
from app.routers import (
    auth,
    vehicles,
    drivers,
    locations,
    mobile_location_api,
    company,
    agency,
    trip_schedules,
    notifications
)
 
# Create database tables
Base.metadata.create_all(bind=engine)
 
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
 
app = FastAPI(
    title="Travel Management System API",
    description="SAAS application for travel service providers",
    version="1.0.0"
)
 
 
 
# Add these event handlers
@app.on_event("startup")
async def startup_event():
    try:
        start_scheduler()
        logger.info("Trip status scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
        raise
 
@app.on_event("shutdown")
async def shutdown_event():
    shutdown_scheduler()
    logger.info("Application shutdown complete")
   
# Custom exception handler for validation errors with debugging
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Print raw body for debugging only in development mode
    if os.getenv("DEBUG", "false").lower() == "true":
        try:
            body = await request.body()
            if body:
                try:
                    json_body = json.loads(body)
                    print("=" * 50)
                    print("VALIDATION ERROR - RAW JSON RECEIVED:")
                    print(json.dumps(json_body, indent=2))
                    print("=" * 50)
                except:
                    print("=" * 50)
                    print(" VALIDATION ERROR - RAW BODY (not JSON):")
                    print(body.decode('utf-8', errors='ignore'))
                    print("=" * 50)
        except Exception as e:
            print(f"Error reading body: {e}")
   
    # Initialize error messages list
    error_messages = []
   
    # Format validation errors
    for error in exc.errors():
        field = error.get("loc", [""])[-1]  # Get the field name
        msg = error.get("msg", "")
       
        # Convert complex validation messages to simple ones
        if "password" in field.lower() and "least 8 characters" in msg:
            error_messages.append("Password must be at least 8 characters long")
        elif "email" in field.lower() and "valid" in msg.lower():
            error_messages.append("Invalid email format")
        elif "contact_number" in field.lower() and "valid" in msg.lower():
            error_messages.append("Invalid phone number format")
        else:
            # Use original message for other cases
            error_messages.append(msg)
   
    return JSONResponse(
        status_code=422,
        content={"detail": error_messages},
    )
# CORS middleware configuration - configurable via environment variables
def get_cors_origins():
    """Get CORS origins from environment variable or use defaults."""
    cors_origins_env = os.getenv("CORS_ORIGINS", "")
    if cors_origins_env:
        # Split comma-separated origins and strip whitespace
        return [origin.strip() for origin in cors_origins_env.split(",")]
    
    # Default origins for development
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
# Include routers with their respective prefixes and tags
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(drivers.router, prefix="/api/drivers", tags=["Drivers"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(mobile_location_api.router, prefix="/api/mobile", tags=["Mobile Location"])
app.include_router(trip_schedules.router, prefix="/api/trip-schedules", tags=["Trip Schedules"])
app.include_router(company.router, prefix="/api/companies", tags=["Companies"])
app.include_router(agency.router, prefix="/api/agency", tags=["Agency"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(locations.router, prefix="/api/locations", tags=["Locations"])
 
# -------------------- Health --------------------
@app.get("/")
async def root():
    return {"message": "Travel Management System API"}
 
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
 
# -------------------- Users --------------------
@app.get("/api/users/{parent_id}", response_model=List[schemas.User])
def get_users_by_parent(parent_id: str, db: Session = Depends(get_db)):
    users = db.query(models.User).filter(models.User.agency_id == parent_id).all()
    return users
 
@app.get("/api/users", response_model=list[schemas.User])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()
 
@app.put("/api/users/{user_id}/role", response_model=schemas.UserRoleUpdate)
def update_user_role(
    user_id: str,
    data: schemas.UserRoleUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
 
    user.role = data.role
    db.commit()
    db.refresh(user)
    return {"role": user.role}
 
@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted permanently"}


@app.get("/api/geocode")
def geocode(q: str = Query(...)):
    try:
        url = "https://nominatim.openstreetmap.org/search"

        params = {
            "q": q,
            "format": "json",
            "limit": 1
        }

        headers = {
            "User-Agent": "TMS-App/1.0"   # IMPORTANT (OSM requires this)
        }

        # Add timeout and proper error handling
        res = requests.get(url, params=params, headers=headers, timeout=10)
        res.raise_for_status()  # Raise exception for bad status codes

        return res.json()

    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Geocoding service timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Geocoding service unavailable")
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Geocoding service error: {e}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail="Geocoding service unavailable")
    except Exception as e:
        if os.getenv("DEBUG", "false").lower() == "true":
            print(f"Unexpected geocoding error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")