from logging import Manager
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy import Time,  DateTime, Date
from datetime import datetime
import pytz
from sqlalchemy import JSON
from typing import Optional

# ADDED USER AND COMPANY CHANGES ID LINE OF CODE 29 AND 188 11,12

def generate_uuid():
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    IT_COMPANY = "IT_COMPANY"
    DRIVER = "DRIVER"
    SUPERVISOR = "SUPERVISOR"

class VehicleType(str, enum.Enum):
    SEDAN = "sedan"
    SUV = "suv"
    VAN = "van"
    BUS = "bus"
    MINI_BUS = "mini_bus"
    


class User(Base):
    __tablename__ = "users"
    # //changing line 29 below with default=generate_uuid
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    agency_id = Column(String, ForeignKey('agencies.id'), nullable=True, index=True)
    company_id = Column(String, ForeignKey('companies.id'), nullable=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    contact_number = Column(String, nullable=True, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    notification_acknowledgements = relationship("NotificationAcknowledgement", back_populates="user", cascade="all, delete-orphan")

    # Relationships
    vehicles = relationship("Vehicle", back_populates="user", cascade="all, delete-orphan")
    driver = relationship("Driver", back_populates="user", uselist=False, cascade="all, delete-orphan")
    trip_schedules = relationship("TripSchedule", back_populates="user", cascade="all, delete-orphan")
    agency = relationship("Agency", back_populates="users")
    company = relationship("Company", back_populates="users")

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=True, index=True)
    
    # Vehicle Identification
    vehicle_type = Column(String, nullable=False)
    vehicle_brand = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    manufacturing_year = Column(Integer, nullable=False)
    color = Column(String, nullable=True)  # Ensure this is present
    vehicle_registration_number = Column(String, unique=True, nullable=False)
    rc_number = Column(String, unique=True, nullable=False)
    
    # Capacity and Specifications
    seating_capacity = Column(Integer, nullable=False)
    fuel_type = Column(String, nullable=True, default="Diesel")
    gps_device_id = Column(String, nullable=True)
    
    # Status and Assignment
    vehicle_status = Column(String, nullable=True, default="Active")
    is_active = Column(Boolean, default=True)
    assigned_driver_id = Column(String, nullable=True)
    
    # Insurance Information
    insurance_number = Column(String, nullable=True)
    insurance_date = Column(DateTime(timezone=True), nullable=True)
    insurance_expiry = Column(DateTime(timezone=True), nullable=True)
    insurance_copy = Column(String, nullable=True)
    
    # Registration Information
    registration_certificate = Column(String, nullable=True)
    registration_date = Column(DateTime(timezone=True), nullable=True)
    registration_expiry = Column(DateTime(timezone=True), nullable=True)

    # Pollution
    pollution_certificate = Column(String, nullable=True)
    
    # Safety Equipment
    fire_extinguisher_available = Column(Boolean, default=False)
    fire_extinguisher_expiry = Column(DateTime(timezone=True), nullable=True)
    first_aid_kit_available = Column(Boolean, default=False)
    first_aid_kit_expiry = Column(DateTime(timezone=True), nullable=True)
    toolkit_available = Column(Boolean, default=False)
    spare_wheel_available = Column(Boolean, default=False)
    emergency_sticker_available = Column(Boolean, default=False)
    
    # Compliance & Documentation
    permit_number = Column(String, nullable=True)
    permit_expiry = Column(DateTime(timezone=True), nullable=True)
    fitness_certificate_date = Column(DateTime(timezone=True), nullable=True)
    fitness_certificate_expiry = Column(DateTime(timezone=True), nullable=True)
    speed_governor_installed = Column(Boolean, default=False)
    reflective_triangle_available = Column(Boolean, default=False)
    torch_available = Column(Boolean, default=False)
    umbrella_available = Column(Boolean, default=False)
    
    # Contact Information
    emergency_support_number = Column(String, nullable=True)
    
    # Documentation Paths
    policy_certificate = Column(String, nullable=True)
    
    # Additional Fields
    notes = Column(Text, nullable=True)
    service_expiry = Column(DateTime(timezone=True), nullable=True)
    puc_expiry = Column(DateTime(timezone=True), nullable=True)
    insurance_renewal_date = Column(DateTime(timezone=True), nullable=True)
    category = Column(String, nullable=True)
    owner_name = Column(String, nullable=True)
    ownership_type = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Relationships
    user = relationship("User", back_populates="vehicles")
    trip_schedules = relationship("TripSchedule", back_populates="vehicle", cascade="all, delete-orphan")
   
class DriverLocation(Base):
    __tablename__ = "driver_locations"
   
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=False)
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=False)
    trip_id = Column(String, ForeignKey("trip_schedules.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)  # GPS accuracy in meters
    speed = Column(Float, nullable=True)  # Speed in km/h
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    route_point = Column(JSON, nullable=True)  # Store route point data as JSON for route type trips
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)  # New field - use this
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
   
    # Relationships
    driver = relationship("Driver", back_populates="location_updates")
    trip_schedules = relationship("TripSchedule", back_populates="location_updates")
    company = relationship("Company", back_populates="driver_locations")
 

class Driver(Base):
    __tablename__ = "drivers"
    
    # One-to-One relationship with User
    # The 'id' column is both the Primary Key and a Foreign Key to the users table
    id = Column(String, ForeignKey("users.id"), primary_key=True)
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=True, index=True)
    
    # Employee Information
    employee_id = Column(String, unique=True, nullable=True)
    
    # Personal Details (Specific to Driver profile, if not in User)
    date_of_birth = Column(DateTime(timezone=True), nullable=True)
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    
    # Identification
    aadhar_number = Column(String, unique=True, nullable=True)
    pan_card_number = Column(String, unique=True, nullable=True)
    driving_license_number = Column(String, unique=True, nullable=False)
    license_expiry_date = Column(DateTime(timezone=True), nullable=False)
    
    # Documents (Paths)
    aadhar_document = Column(String, nullable=True)
    pan_card = Column(String, nullable=True)
    driving_license_document = Column(String, nullable=True)
    personal_resume = Column(String, nullable=True)
    driver_photo = Column(String, nullable=True)
    police_verification_certificate = Column(String, nullable=True)
    medical_fitness_certificate = Column(String, nullable=True)
    
    # Verification & Status
    verification_status = Column(String, default='Pending')
    status = Column(String, default='Active') # Active, Inactive, Suspended
    
    # Address
    current_address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    
    # Emergency Contact
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_number = Column(String, nullable=True)
    
    # Professional Info
    previous_employer_experience = Column(Text, nullable=True)
    languages_spoken = Column(String, nullable=True)
    shift_preference = Column(String, nullable=True)
    assigned_vehicle_id = Column(String, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="driver", uselist=False) # uselist=False for 1-to-1
    location_updates = relationship("DriverLocation", back_populates="driver")
    trip_schedules = relationship("TripSchedule", back_populates="driver")
 

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=False)
    company_name = Column(Text, nullable=False)
    company_phone = Column(Text, nullable=True)
    company_email = Column(Text, nullable=True)
    company_address = Column(Text, nullable=True)
    company_branch = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    service_start_at = Column(DateTime(timezone=True), nullable=True)
    service_ended_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Text, default='Inactive')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    trip_schedules = relationship("TripSchedule", back_populates="company", cascade="all, delete-orphan")
    agency = relationship("Agency", back_populates="companies")
    driver_locations = relationship("DriverLocation", back_populates="company")

class Agency(Base):
    __tablename__ = "agencies"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    agency_name = Column(String, nullable=False)
    agency_phone = Column(String, nullable=True)
    agency_address = Column(Text, nullable=True)
    agency_emailid = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    plan = Column(String, nullable=True)
    subscription = Column(String, nullable=True)
    status = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="agency", cascade="all, delete-orphan")
    companies = relationship("Company", back_populates="agency", cascade="all, delete-orphan")
    trip_schedules = relationship("TripSchedule", back_populates="agency", cascade="all, delete-orphan")
    notification_acknowledgements = relationship("NotificationAcknowledgement", back_populates="agency", cascade="all, delete-orphan")

class TripSchedule(Base):
    __tablename__ = "trip_schedules"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=True)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=True)
    company_name = Column(String, nullable=False)
    company_branch = Column(Text, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(Time, nullable=True)
    starting_point = Column(String, nullable=True)
    end_point = Column(String, nullable=True)
    way = Column(String, nullable=True)
    trip_type = Column(String, nullable=True)
    passenger_count = Column(Integer, nullable=False, default=1)
    distance_km = Column(Float, nullable=True)
    duration_min = Column(Integer, nullable=True)
    starting_lat = Column(Float, nullable=True)
    starting_lng = Column(Float, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_lng = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    status_updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    driver_response = Column(String, nullable=True)
    driver_reason = Column(Text, nullable=True)
    driver_response_at = Column(DateTime(timezone=True), nullable=True)
    route_point = Column(Text, nullable=True)
    status = Column(String, nullable=True, default='scheduled')
    one_way_start_time = Column(Time, nullable=True)
    two_way_start_time = Column(Time, nullable=True)
    one_way_is_active = Column(Boolean, nullable=True)
    two_way_is_active = Column(Boolean, nullable=True)
    driver_response_two_way = Column(String, nullable=True)
    driver_reason_two_way = Column(Text, nullable=True)

    # Relationships with proper cascade and back_populates
    user = relationship("User", back_populates="trip_schedules")
    company = relationship("Company", back_populates="trip_schedules")
    vehicle = relationship("Vehicle", back_populates="trip_schedules")
    driver = relationship("Driver", back_populates="trip_schedules")
    agency = relationship("Agency", back_populates="trip_schedules")
    location_updates = relationship("DriverLocation", back_populates="trip_schedules")
    
    def update_status_based_on_date(self):
        """Update the trip status based on current date and time"""
        now = datetime.now(pytz.utc)
        if self.end_date and now > self.end_date:
            self.is_active = False
            self.status_updated_at = now
            self.status = 'completed'
            # Reset both one-way and two-way active flags when trip ends
            self.one_way_is_active = False
            self.two_way_is_active = False
        return self.is_active

    

class NotificationAcknowledgement(Base):
    __tablename__ = "notification_acknowledgements"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    notification_id = Column(String, nullable=False, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    agency_id = Column(String, ForeignKey('agencies.id'), nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notification_acknowledgements")
    agency = relationship("Agency", back_populates="notification_acknowledgements")
    
    class Config:
        from_attributes = True