from logging import Manager
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
from sqlalchemy.dialects.postgresql import UUID
import uuid

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
    
    id = Column(String, primary_key=True, index=True)
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
    
    # Relationships
    vehicles = relationship("Vehicle", back_populates="user")
    driver = relationship("Driver", back_populates="user", uselist=False)
    trips = relationship("Trip", back_populates="user")
    agency = relationship("Agency", back_populates="users")
    company = relationship("Company", back_populates="users")

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=True, index=True)
    
    # Vehicle Identification
    vehicle_type = Column(String, nullable=False)
    vehicle_brand = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    manufacturing_year = Column(Integer, nullable=False)
    color = Column(String, nullable=True)  # Ensure this is present
    vehicle_registration_number = Column(String, unique=True, nullable=False)
    rc_number = Column(String, unique=True, nullable=True)
    
    # Capacity and Specifications
    seating_capacity = Column(Integer, nullable=False)
    fuel_type = Column(String, nullable=False, default="Diesel")
    gps_device_id = Column(String, nullable=True)
    
    # Status and Assignment
    vehicle_status = Column(String, nullable=False, default="Active")
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
    first_aid_kit_available = Column(Boolean, default=False)
    
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
    location_updates = relationship("DriverLocation", back_populates="vehicle", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="vehicle", cascade="all, delete")
    schedules = relationship("TripSchedule", back_populates="vehicle")
class Driver(Base):
    __tablename__ = "drivers"
    
    # One-to-One relationship with User
    # The 'id' column is both the Primary Key and a Foreign Key to the users table
    id = Column(String, ForeignKey("users.id"), primary_key=True)
    agency_id = Column(String, ForeignKey("agencies.id"), nullable=True, index=True)
    
    # Personal Details (Specific to Driver profile, if not in User)
    date_of_birth = Column(DateTime(timezone=True), nullable=True)
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    
    # Identification
    aadhar_number = Column(String, nullable=True)
    driving_license_number = Column(String, unique=True, nullable=False)
    license_expiry_date = Column(DateTime(timezone=True), nullable=False)
    
    # Documents (Paths)
    aadhar_document = Column(String, nullable=True)
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
    assigned_vehicle_id = Column(Integer, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="driver", uselist=False) # uselist=False for 1-to-1
    location_updates = relationship("DriverLocation", back_populates="driver")

class DriverLocation(Base):
    __tablename__ = "driver_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)  # GPS accuracy in meters
    speed = Column(Float, nullable=True)  # Speed in km/h
    heading = Column(Float, nullable=True)  # Direction in degrees (0-360)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    driver = relationship("Driver", back_populates="location_updates")
    vehicle = relationship("Vehicle", back_populates="location_updates")

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Text, primary_key=True, index=True)
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
    users = relationship("User", back_populates="company")
    trips = relationship("Trip", back_populates="company", cascade="all, delete-orphan")

class Agency(Base):
    __tablename__ = "agencies"
    
    id = Column(String, primary_key=True, index=True)
    agency_name = Column(String, nullable=False)
    agency_phone = Column(String, nullable=True)
    agency_address = Column(Text, nullable=True)
    agency_EmailId = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    plan = Column(String, nullable=True)
    subscription = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="agency")

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)  # Make this nullable if a trip can exist without a vehicle
    trip_code = Column(String, unique=True, index=True, nullable=False)  # Auto-generated Trip ID
    name = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="trips")
    company = relationship("Company", back_populates="trips")
    vehicle = relationship("Vehicle", back_populates="trips", foreign_keys=[vehicle_id])
    schedules = relationship("TripSchedule", back_populates="trip", cascade="all, delete-orphan")




class TripSchedule(Base):
    __tablename__ = "trip_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    destination = Column(String, nullable=False)
    departure_datetime = Column(DateTime(timezone=True), nullable=False)  # Date and time
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=True)
    passenger_count = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="schedules")
    vehicle = relationship("Vehicle", back_populates="schedules")
    driver = relationship("Driver")
