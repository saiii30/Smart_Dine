from pydantic import BaseModel, EmailStr

# compatibility: prefer pydantic v2 `field_validator`, fall back to v1 `validator`
try:
    from pydantic import field_validator
except Exception:
    from pydantic import validator as field_validator
from datetime import datetime
from typing import Optional, List
from app.models import VehicleType, UserRole

# User Schemas (aligned with SQL schema)
class UserBase(BaseModel):
    parent_id: Optional[str] = None
    name: str
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None

class UserCreate(UserBase):
    password: str

    @field_validator('password')
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (maximum 72 bytes). Please use a shorter password.')
        return v

class UserResponse(BaseModel):
    id: str
    parent_id: Optional[str] = None
    name: str
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None
    role: Optional[str] = None
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Vehicle Schemas
class VehicleBase(BaseModel):
    vehicle_number: str
    vehicle_type: VehicleType
    make: str
    model: str
    year: int
    color: Optional[str] = None
    seating_capacity: int
    registration_number: str
    insurance_number: Optional[str] = None
    insurance_expiry: Optional[datetime] = None
    notes: Optional[str] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[VehicleType] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    seating_capacity: Optional[int] = None
    registration_number: Optional[str] = None
    insurance_number: Optional[str] = None
    insurance_expiry: Optional[datetime] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class VehicleResponse(VehicleBase):
    id: int
    owner_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Driver Schemas
class DriverBase(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: str
    license_number: str
    license_expiry: datetime
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    notes: Optional[str] = None

class DriverCreate(DriverBase):
    pass

class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[datetime] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class DriverResponse(DriverBase):
    id: int
    owner_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Location Tracking Schemas
class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    vehicle_id: Optional[int] = None

class LocationResponse(BaseModel):
    id: int
    driver_id: int
    vehicle_id: Optional[int] = None
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True

class DriverLocationStatus(BaseModel):
    driver_id: int
    driver_name: str
    vehicle_id: Optional[int] = None
    vehicle_number: Optional[str] = None
    latitude: float
    longitude: float
    speed: Optional[float] = None
    heading: Optional[float] = None
    last_update: datetime
    is_online: bool

# Company Schemas
class CompanyBase(BaseModel):
    name: str
    address: Optional[str] = None
    service_start_date: datetime
    service_end_date: datetime
    notes: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    service_start_date: Optional[datetime] = None
    service_end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: int
    owner_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Lightweight schema for agency dropdown (id + agency_name only)
class AgencyDropdown(BaseModel):
    id: str
    agency_name: str

# Agency Schemas
class AgencyBase(BaseModel):
    agency_name: str
    agency_phone: Optional[str] = None
    agency_address: Optional[str] = None
    agency_EmailId: Optional[EmailStr] = None
    description: Optional[str] = None
    plan: Optional[str] = None
    subscription: Optional[str] = None
    status: Optional[str] = None

class AgencyCreate(AgencyBase):
    pass

class AgencyUpdate(BaseModel):
    agency_name: Optional[str] = None
    agency_phone: Optional[str] = None
    agency_address: Optional[str] = None
    agency_EmailId: Optional[EmailStr] = None
    description: Optional[str] = None
    plan: Optional[str] = None
    subscription: Optional[str] = None
    status: Optional[str] = None

class AgencyResponse(AgencyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Trip Schedule Schemas
class TripScheduleBase(BaseModel):
    destination: str
    departure_datetime: datetime
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    passenger_count: int = 0
    notes: Optional[str] = None

class TripScheduleCreate(TripScheduleBase):
    pass

class TripScheduleUpdate(BaseModel):
    destination: Optional[str] = None
    departure_datetime: Optional[datetime] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    passenger_count: Optional[int] = None
    notes: Optional[str] = None

class TripScheduleResponse(TripScheduleBase):
    id: int
    trip_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# Trip Schemas
class TripBase(BaseModel):
    company_name: str
    name: str
    address: Optional[str] = None

class TripCreate(TripBase):
    schedules: Optional[List[TripScheduleCreate]] = []

class TripUpdate(BaseModel):
    company_name: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class TripResponse(BaseModel):
    id: int
    owner_id: int
    company_id: int
    company_name: str
    trip_code: str
    name: str
    address: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    schedules: List[TripScheduleResponse] = []
    
    class Config:
        from_attributes = True