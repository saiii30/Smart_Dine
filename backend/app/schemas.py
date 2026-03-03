from pydantic import BaseModel, EmailStr, Field
from fastapi import UploadFile
from datetime import datetime
from typing import Optional, List, Any, Dict, Union
from app.models import UserRole  # Removed VehicleType as it's now a string
from datetime import time, date, datetime, timezone

# ADDED NEW LINES OF CODE 405 TO 443 FOR ITDASHBOARDCOMPANY
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
    id: Optional[str] = None
    name: str
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None
    role: Optional[UserRole] = None
    
    class Config:
        orm_mode = True

class UserCreate(UserBase):
    password: str
    agency_id: str
    role: UserRole = UserRole.SUPERVISOR
    contact_number: str

    @field_validator('password')
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (maximum 72 bytes). Please use a shorter password.')
        return v

    @field_validator('contact_number')
    def validate_contact_number(cls, v: str) -> str:
        if not v:
            return v
        # Remove non-digits
        v_clean = "".join(filter(str.isdigit, v))
        if len(v_clean) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return v_clean

class UserResponse(BaseModel):
    id: str
    name: str
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None
    role: Optional[str] = None
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] =None
    updated_at: Optional[datetime] = None
    agency_name: Optional[str] = None  # Will be populated from the Agency relationship

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        # Create a dictionary of the model's attributes
        data = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

        # If there's a relationship with Agency, get the agency_name
        if hasattr(obj, 'agency') and obj.agency:
            data['agency_name'] = obj.agency.agency_name

        # Create the response object
        return cls(**data)

# Auth Schemas
class LoginSchema(BaseModel):
    username: str  # Can be email or phone number
    password: str
    agency_id: str  # Agency selected from dropdown

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Vehicle Schemas
class VehicleBase(BaseModel):
    # Vehicle Identification
    vehicle_type: str
    vehicle_brand: str
    vehicle_model: str
    manufacturing_year: int
    color: Optional[str] = None
    vehicle_registration_number: str
    rc_number: Optional[str] = None
    
    # Capacity and Specifications
    seating_capacity: int
    fuel_type: str = "Diesel"
    gps_device_id: Optional[str] = None
    
    # Status and Assignment
    vehicle_status: str = "Active"
    assigned_driver_id: Optional[str] = None
    
    # Insurance Information
    insurance_number: Optional[str] = None
    insurance_date: Optional[datetime] = None
    insurance_expiry: Optional[datetime] = None
    
    # Registration Information
    registration_date: Optional[datetime] = None
    registration_expiry: Optional[datetime] = None
    
    # Safety Equipment
    fire_extinguisher_available: bool = False
    first_aid_kit_available: bool = False
    
    # Contact Information
    emergency_support_number: Optional[str] = None
    
    # Additional Fields
    notes: Optional[str] = None
    service_expiry: Optional[datetime] = None
    puc_expiry: Optional[datetime] = None
    insurance_renewal_date: Optional[datetime] = None
    category: Optional[str] = None
    owner_name: Optional[str] = None
    ownership_type: Optional[str] = None

class VehicleCreate(BaseModel):
    user_id: str
    vehicle_type: str
    vehicle_brand: str
    vehicle_model: str
    manufacturing_year: int
    color: str | None = None
    vehicle_registration_number: str
    rc_number: str | None = None
    seating_capacity: int
    fuel_type: str = "Diesel"
    gps_device_id: str | None = None
    vehicle_status: str = "Active"
    assigned_driver_id: str | None = None

    insurance_number: str | None = None
    insurance_date: datetime | None = None
    insurance_expiry: datetime | None = None

    registration_date: datetime | None = None
    registration_expiry: datetime | None = None

    fire_extinguisher_available: bool = False
    first_aid_kit_available: bool = False

    emergency_support_number: str | None = None
    notes: str | None = None
    service_expiry: datetime | None = None
    puc_expiry: datetime | None = None
    insurance_renewal_date: datetime | None = None

    category: str | None = None
    owner_name: str | None = None
    ownership_type: str | None = None
    is_active: bool = True
    # File uploads will be handled separately in the router
    insurance_copy: Optional[UploadFile] = None
    policy_certificate: Optional[UploadFile] = None
    registration_certificate: Optional[UploadFile] = None
    pollution_certificate: Optional[UploadFile] = None

class VehicleUpdate(BaseModel):
    # All fields are optional for updates
    vehicle_type: Optional[str] = None
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    manufacturing_year: Optional[int] = None
    color: Optional[str] = None
    vehicle_registration_number: Optional[str] = None
    rc_number: Optional[str] = None
    seating_capacity: Optional[int] = None
    fuel_type: Optional[str] = None
    gps_device_id: Optional[str] = None
    vehicle_status: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    insurance_number: Optional[str] = None
    insurance_date: Optional[datetime] = None
    insurance_expiry: Optional[datetime] = None
    insurance_copy: Optional[UploadFile] = None
    
    registration_date: Optional[datetime] = None
    registration_expiry: Optional[datetime] = None
    registration_certificate: Optional[UploadFile] = None
    
    fire_extinguisher_available: Optional[bool] = None
    first_aid_kit_available: Optional[bool] = None
    emergency_support_number: Optional[str] = None
    policy_certificate: Optional[UploadFile] = None
    pollution_certificate: Optional[UploadFile] = None
    
    notes: Optional[str] = None
    category: Optional[str] = None
    service_expiry: Optional[datetime] = None
    puc_expiry: Optional[datetime] = None
    ownership_type: Optional[str] = None

class VehicleResponse(BaseModel):
    id: int
    vehicle_registration_number: str
    vehicle_type: Optional[str] = None
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    manufacturing_year: Optional[int] = None
    color: Optional[str] = None
    seating_capacity: Optional[int] = None
    fuel_type: Optional[str] = None
    vehicle_status: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# Driver Schemas
class DriverBase(BaseModel):
    full_name: str
    phone_number: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    
    aadhar_number: Optional[str] = None
    driving_license_number: str
    license_expiry_date: datetime
    
    verification_status: Optional[str] = 'Pending'
    status: Optional[str] = 'Active'
    
    current_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    
    previous_employer_experience: Optional[str] = None
    languages_spoken: Optional[str] = None
    shift_preference: Optional[str] = None
    assigned_vehicle_id: Optional[Union[int, str]] = None # Frontend might send string or int
    
    notes: Optional[str] = None
    email: Optional[EmailStr] = None

class DriverCreate(DriverBase):
    is_active: bool = True
    # File uploads are handled via FormData, so they might not be in the initial JSON body if sending separate fields? 
    # Actually frontend sends FormData. The router will likely handle parsing. 
    # If using FastAPI, typically we use Form() for fields mixed with File(). 
    # But here we are defining Pydantic models. If the router uses `driver: DriverCreate`, it expects JSON.
    # If using FormData, we might need to parse manually or use Form(...) parameters in the route.
    # For now, I will define the fields here as if they were passed (e.g. JSON strings for text fields)
    pass

class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator('phone_number')
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        # Remove non-digits
        v_clean = "".join(filter(str.isdigit, v))
        if len(v_clean) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return v_clean        

    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    aadhar_number: Optional[str] = None
    driving_license_number: Optional[str] = None
    license_expiry_date: Optional[datetime] = None
    
    verification_status: Optional[str] = None
    status: Optional[str] = None
    
    current_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    
    previous_employer_experience: Optional[str] = None
    languages_spoken: Optional[str] = None
    shift_preference: Optional[str] = None
    assigned_vehicle_id: Optional[Union[int, str]] = None
    
    notes: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class DriverResponse(BaseModel):

    id: str

    user: Optional[UserBase] = None

    agency_id: Optional[str] = None
    date_of_birth: Optional[datetime] = None

    gender: Optional[str] = None

    blood_group: Optional[str] = None

    aadhar_number: Optional[str] = None

 

    driving_license_number: Optional[str] = None

    license_expiry_date: Optional[datetime] = None

    verification_status: Optional[str] = None

    status: Optional[str] = None

    current_address: Optional[str] = None

    city: Optional[str] = None

    state: Optional[str] = None

    pincode: Optional[str] = None

    emergency_contact_name: Optional[str] = None

    emergency_contact_number: Optional[str] = None

    previous_employer_experience: Optional[str] = None

    languages_spoken: Optional[str] = None

    shift_preference: Optional[str] = None

    assigned_vehicle_id: Optional[Union[int, str]] = None

    notes: Optional[str] = None

    is_active: bool = True

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    class Config:

        orm_mode = True


# Location Tracking Schemas
class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    trip_id: Optional[str] = None

    agency_id: Optional[str] = None  # Add agency_id field

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
    trip_id: Optional[str] = None

    agency_id: Optional[str] = None  # Add agency_id field
    
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
    trip_id: Optional[str] = None

    agency_id: Optional[str] = None  # Add agency_id field  

    class Config:

        from_attributes = True

# Company Schemas
class CompanyBase(BaseModel):
    company_name: str
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    company_email: Optional[str] = None
    company_branch: Optional[str] = None
    description: Optional[str] = None
    service_start_at: Optional[datetime] = None
    service_ended_at: Optional[datetime] = None
   # status: str = 'Inactive'
    status: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    company_email: Optional[str] = None
    company_branch: Optional[str] = None
    description: Optional[str] = None
    subscription: Optional[str] = None
    service_start_at: Optional[datetime] = None
    service_ended_at: Optional[datetime] = None
    status: Optional[str] = None

class CompanyResponse(BaseModel):
    id: str
    company_name: str
    company_branch: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    company_address: Optional[str] = None
    status: str = 'Active'
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class CompanyDropdown(BaseModel):
    id: str
    company_name: str
    company_branch: Optional[str] = None
    agency_id: str

    class Config:
        from_attributes = True

# added new schemas here

# ==============================
# Company + Admin User Creation
# ==============================

class CompanyWithAdminCreate(BaseModel):
    # -------- Business Info (Company Table) --------
    company_name: str
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    company_branch: Optional[str] = None
    description: Optional[str] = None
    service_start_at: Optional[datetime] = None
    service_ended_at: Optional[datetime] = None
    
 
    # -------- Contact Person (Users Table) --------
    contact_name: str
    contact_email: EmailStr
    contact_phone: str

class CompanyWithAdminResponse(BaseModel):
    id: str
    company_name: str
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    company_branch: Optional[str] = None
    description: Optional[str] = None
    
    service_start_at: Optional[datetime] = None
    service_ended_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ======================
# Update Company + Admin
# ======================
class CompanyWithAdminUpdate(BaseModel):
    # Company fields
    company_name: Optional[str] = None
    company_email: Optional[EmailStr] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    company_branch: Optional[str] = None
    description: Optional[str] = None
   
    service_start_at: Optional[datetime] = None
    service_ended_at: Optional[datetime] = None
    status: Optional[str] = None

    # Contact person fields (users table)
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None

# end of new schemas

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
    agency_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
      
class RoutePoint(BaseModel):
    
    passenger_name: str = Field(..., min_length=2, max_length=100)
    passenger_phone: str = Field(..., min_length=10, max_length=15)
    starting_point: str = Field(..., min_length=5, max_length=500)
    end_point: str = Field(..., min_length=5, max_length=500)
    starting_lat: float = Field(..., ge=-90, le=90)
    starting_lng: float = Field(..., ge=-180, le=180)
    end_lat: float = Field(..., ge=-90, le=90)
    end_lng: float = Field(..., ge=-180, le=180)

    @field_validator('passenger_phone')
    def validate_phone_number(cls, v):
        # Remove all non-digit characters
        digits = ''.join(filter(str.isdigit, v))
        if len(digits) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return digits

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                
                "passenger_name": "John Doe",
                "phone_number": "+1234567890",
                "starting_point": "123 Main St, City A",
                "end_point": "456 Elm St, City B",
                "starting_lat": 40.7128,
                "starting_lng": -74.0060,
                "end_lat": 40.7580,
                "end_lng": -73.9855
            }
        }

class TripScheduleBase(BaseModel):
    # Agency and Company Information
    agency_id: Optional[str] = None
    user_id: Optional[str] = None
    company_id: str
    company_name: str
    company_branch: Optional[str] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    starting_point: Optional[str] = None
    end_point: Optional[str] = None
    way: Optional[str] = None
    trip_type: Optional[str] = None
    passenger_count: int = 1
    is_active: bool = True
    notes: Optional[str] = None
    distance_km: Optional[float] = None
    duration_min: Optional[int] = None
    starting_lat: Optional[float] = None
    starting_lng: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    driver_response: Optional[bool] = None
    driver_reason: Optional[str] = None
    driver_response_at: Optional[datetime] = None
    route_points: Optional[List[RoutePoint]] = Field(
        None,
        description="List of route points with passenger details. Required when trip_type is 'route'"
    )

class TripScheduleCreate(TripScheduleBase):
    # Required fields for creation
    company_id: str
    company_name: str
    start_date: date
    end_date: date
    start_time: time
    end_time: time
    passenger_count: int = 1
    trip_type: str

    # Validate trip type
    @field_validator('trip_type')
    def validate_trip_type(cls, v):
        if v not in ['shuttle', 'route']:
            raise ValueError("trip_type must be either 'shuttle' or 'route'")
        return v
        
    @field_validator('route_points')
    def validate_route_points(cls, v, info):
        trip_type = info.data.get('trip_type')
        if trip_type == 'route' and (not v or len(v) == 0):
            raise ValueError("At least one route point is required for 'route' trip type")
        if trip_type == 'shuttle' and v and len(v) > 0:
            raise ValueError("Route points should not be provided for 'shuttle' trip type")
        return v

    class Config:
        from_attributes = True

class TripScheduleUpdate(BaseModel):
    # All fields are optional for updates
    agency_id: Optional[str] = None
    user_id: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    company_branch: Optional[str] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    starting_point: Optional[str] = None
    end_point: Optional[str] = None
    way: Optional[str] = None
    trip_type: Optional[str] = None
    passenger_count: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    distance_km: Optional[float] = None
    duration_min: Optional[int] = None
    starting_lat: Optional[float] = None
    starting_lng: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    driver_response: Optional[bool] = None
    driver_reason: Optional[str] = None
    driver_response_at: Optional[datetime] = None
    route_points: Optional[List[RoutePoint]] = Field(
        None,
        description="List of route points with passenger details. Required when trip_type is 'route'"
    )

    class Config:

        json_encoders = {

            # Add any custom JSON encoders if needed

        }

class TripScheduleResponse(BaseModel):
    id: str
    agency_id: Optional[str] = None
    user_id: str
    company_id: str
    vehicle_id: Optional[int] = None
    driver_id: Optional[str] = None
    company_name: str
    company_branch: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    starting_point: Optional[str] = None
    end_point: Optional[str] = None
    way: Optional[str] = None
    trip_type: Optional[str] = None
    vehicle_registration_number: Optional[str] = None
    route_points: Optional[List[RoutePoint]] = Field(
        None,
        description="List of route points with passenger details. Required when trip_type is 'route'"
    )
    driver_name: Optional[str] = None
    passenger_count: int = 1
    distance_km: Optional[float] = None
    duration_min: Optional[int] = None
    starting_lat: Optional[float] = None
    starting_lng: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    is_active: bool = True
    status: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Relationships
    user: Optional[UserBase] = None
    company: Optional[CompanyResponse] = None
    vehicle: Optional[VehicleResponse] = None
    driver: Optional[DriverResponse] = None
    
    @field_validator('start_time', mode='before')
    @classmethod
    def parse_start_time(cls, v):
        if isinstance(v, datetime):
            return v.time()
        return v
        
    @field_validator('end_time', mode='before')
    @classmethod
    def parse_end_time(cls, v):
        if isinstance(v, datetime):
            return v.time()
        return v

    @field_validator("route_points", mode="before")
    @classmethod
    def parse_route_points(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return None
        return v
    
    class Config:
        orm_mode = True

class TripCreate(TripScheduleBase):
    schedules: Optional[List[TripScheduleCreate]] = []
    
    class Config:
        from_attributes = True

class TripUpdate(BaseModel):
    company_id: Optional[str] = None
    vehicle_id: Optional[int] = None
    company_name: Optional[str] = None
    company_branch: Optional[str] = None
    is_active: Optional[bool] = None
    
    class Config:
        from_attributes = True

class TripResponse(BaseModel):
    id: int
    user_id: str
    agency_id: Optional[str] = None
    company_id: str
    vehicle_id: Optional[int] = None
    company_name: str
    company_branch: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    schedules: List[TripScheduleResponse] = []
    
    class Config:
        from_attributes = True

class User(BaseModel):
    id: str
    email: Optional[EmailStr] = None
    name : Optional[str] = None 
    role : Optional[str] = None
    company_name: Optional[str] = None
   

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    company_name: Optional[str] = None

class UserRoleUpdate(BaseModel):
    role: UserRole

class AgencyPlanUpdate(BaseModel):
    plan_id: str
    parent_id: str

class AgencyOut(BaseModel):
    id: str
    agency_name: str
    subscription_plan: str
    status: str

class UpdatePlanRequest(BaseModel):
    plan_id: str
    parent_id: str
    
    class Config:
        from_attributes = True
  #status updated
class TripStatusUpdate(BaseModel):
    """Response model for trip status update"""
    status: str = Field(..., example="success")
    updated: int = Field(..., example=3)

class TripStatusResponse(BaseModel):
    """Response model for trip status check"""
    trip_id: str
    is_active: bool
    end_date: Optional[datetime] = None
    current_date: datetime = Field(default_factory=datetime.now)
    status_updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

        # Notification Schemas
class NotificationBase(BaseModel):
    type: str  # 'driver' or 'vehicle'
    title: str
    description: str
    expiry_date: datetime
    days_remaining: int
    severity: str  # 'critical', 'warning', 'info'
    entity_id: str
    entity_name: str
    document_type: str

class NotificationResponse(NotificationBase):
    id: str
    
    class Config:
        from_attributes = True

class NotificationSummary(BaseModel):
    total_count: int
    critical_count: int
    warning_count: int
    info_count: int
    notifications: List[NotificationResponse]