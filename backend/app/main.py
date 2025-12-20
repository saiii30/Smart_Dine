from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.routers import auth, vehicles, drivers, locations, trips
import json

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Travel Management System API",
    description="SAAS application for travel service providers",
    version="1.0.0"
)

# Custom exception handler for validation errors with debugging
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Print raw body for debugging
    try:
        body = await request.body()
        if body:
            try:
                json_body = json.loads(body)
                print("=" * 50)
                print("❌ VALIDATION ERROR - RAW JSON RECEIVED:")
                print(json.dumps(json_body, indent=2))
                print("=" * 50)
            except:
                print("=" * 50)
                print("❌ VALIDATION ERROR - RAW BODY (not JSON):")
                print(body.decode('utf-8', errors='ignore'))
                print("=" * 50)
    except Exception as e:
        print(f"Error reading body: {e}")
    
    # Format validation errors
    errors = []
    for error in exc.errors():
        error_dict = {
            "loc": list(error.get("loc", [])),
            "msg": str(error.get("msg", "")),
            "type": str(error.get("type", ""))
        }
        if "ctx" in error and error["ctx"]:
            error_dict["ctx"] = {str(k): str(v) for k, v in error["ctx"].items()}
        errors.append(error_dict)
        print(f"Validation error: {error_dict}")
    
    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(drivers.router, prefix="/api/drivers", tags=["Drivers"])
app.include_router(locations.router, prefix="/api/locations", tags=["Location Tracking"])
app.include_router(trips.router, prefix="/api/trips", tags=["Trips"])

@app.get("/")
async def root():
    return {"message": "Travel Management System API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

