# from fastapi import FastAPI, Request
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.exceptions import RequestValidationError
# from fastapi.responses import JSONResponse
# from app.database import engine, Base
# from app.routers import auth, vehicles, drivers, locations, trips, company, agency
# import json
# from app import models, schemas
# from sqlalchemy.orm import Session
# from fastapi import Depends, HTTPException
# from app.schemas import UserUpdate
# from app.database import engine, Base, get_db
# from app.auth import get_current_user
# from fastapi import APIRouter, status
# from datetime import datetime, timedelta
# from typing import List

# # Create database tables
# Base.metadata.create_all(bind=engine)

# app = FastAPI(
#     title="Travel Management System API",
#     description="SAAS application for travel service providers",
#     version="1.0.0"
# )

# # Custom exception handler for validation errors with debugging
# @app.exception_handler(RequestValidationError)
# async def validation_exception_handler(request: Request, exc: RequestValidationError):
#     # Print raw body for debugging
#     try:
#         body = await request.body()
#         if body:
#             try:
#                 json_body = json.loads(body)
#                 print("=" * 50)
#                 print("VALIDATION ERROR - RAW JSON RECEIVED:")
#                 print(json.dumps(json_body, indent=2))
#                 print("=" * 50)
#             except:
#                 print("=" * 50)
#                 print(" VALIDATION ERROR - RAW BODY (not JSON):")
#                 print(body.decode('utf-8', errors='ignore'))
#                 print("=" * 50)
#     except Exception as e:
#         print(f"Error reading body: {e}")
    
#     # Format validation errors
#     errors = []
#     for error in exc.errors():
#         error_dict = {
#             "loc": list(error.get("loc", [])),
#             "msg": str(error.get("msg", "")),
#             "type": str(error.get("type", ""))
#         }
#         if "ctx" in error and error["ctx"]:
#             error_dict["ctx"] = {str(k): str(v) for k, v in error["ctx"].items()}
#         errors.append(error_dict)
#         print(f"Validation error: {error_dict}")
    
#     return JSONResponse(
#         status_code=422,
#         content={"detail": errors},
#     )
# # CORS middleware configuration - simplified for development
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],  # Allow frontend origin
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
#     expose_headers=["*"],
# )
# # Include routers
# app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
# app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
# app.include_router(drivers.router, prefix="/api/drivers", tags=["Drivers"])
# app.include_router(locations.router, prefix="/api/locations", tags=["Location Tracking"])
# app.include_router(trips.router, prefix="/api/trips", tags=["Trips"])
# app.include_router(company.router, prefix="/api/companies", tags=["Companies"])
# app.include_router(agency.router, prefix="/api/agency", tags=["Agency"])

# @app.get("/")
# async def root():
#     return {"message": "Travel Management System API"}

# @app.get("/api/health")
# async def health_check():
#     return {"status": "healthy"}

# @app.get("/users/{parent_id}", response_model=List[schemas.User])
# def get_users_by_parent(parent_id: str, db: Session = Depends(get_db)):
#     users = db.query(models.User).filter(models.User.parent_id == parent_id).all()
#     return users



# @app.get("/users", response_model=list[schemas.User])
# def get_users(db: Session = Depends(get_db)):
#     return db.query(models.User).all()



# @app.put("/users/{user_id}/role", response_model=schemas.UserRoleUpdate)
# def update_user_role(
#     user_id: str,
#     data: schemas.UserRoleUpdate,
#     db: Session = Depends(get_db)
# ):
#     user = db.query(models.User).filter(models.User.id == user_id).first()

#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     user.role = data.role
#     db.commit()
#     db.refresh(user)

#     return {"role": user.role}



# @app.delete("/users/{user_id}")
# def delete_user(user_id: str, db: Session = Depends(get_db)):
#     user = db.query(models.User).filter(models.User.id == user_id).first()

#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     db.delete(user)
#     db.commit()

#     return {"message": "User deleted permanently"}



from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
import json

from app.database import engine, Base, get_db
from app.routers import auth, vehicles, drivers, locations, trips, company, agency
from app import models, schemas

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Travel Management System API",
    description="SAAS application for travel service providers",
    version="1.0.0"
)

# -------------------- CORS (FIXED) --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Exception Handler --------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
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
                print("VALIDATION ERROR - RAW BODY:")
                print(body.decode("utf-8", errors="ignore"))
                print("=" * 50)
    except Exception as e:
        print(f"Error reading body: {e}")

    errors = []
    for error in exc.errors():
        error_dict = {
            "loc": list(error.get("loc", [])),
            "msg": str(error.get("msg", "")),
            "type": str(error.get("type", "")),
        }
        if "ctx" in error and error["ctx"]:
            error_dict["ctx"] = {str(k): str(v) for k, v in error["ctx"].items()}
        errors.append(error_dict)
        print(f"Validation error: {error_dict}")

    return JSONResponse(status_code=422, content={"detail": errors})

# -------------------- Routers --------------------
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(drivers.router, prefix="/api/drivers", tags=["Drivers"])
app.include_router(locations.router, prefix="/api/locations", tags=["Location Tracking"])
app.include_router(trips.router, prefix="/api/trips", tags=["Trips"])
# app.include_router(company.router, prefix="/api/companies", tags=["Companies"])
app.include_router(company.router)
app.include_router(agency.router, prefix="/api/agency", tags=["Agency"])

# -------------------- Health --------------------
@app.get("/")
async def root():
    return {"message": "Travel Management System API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

# -------------------- Users --------------------
@app.get("/users/{parent_id}", response_model=List[schemas.User])
def get_users_by_parent(parent_id: str, db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.parent_id == parent_id).all()

@app.get("/users", response_model=List[schemas.User])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.put("/users/{user_id}/role", response_model=schemas.UserRoleUpdate)
def update_user_role(user_id: str, data: schemas.UserRoleUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = data.role
    db.commit()
    db.refresh(user)
    return {"role": user.role}

@app.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted permanently"}
