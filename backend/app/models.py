from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TRAVEL_PROVIDER = "travel_provider"
    IT_COMPANY = "it_company"

class VehicleType(str, enum.Enum):
    SEDAN = "sedan"
    SUV = "suv"
    VAN = "van"
    BUS = "bus"
    MINI_BUS = "mini_bus"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.TRAVEL_PROVIDER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    vehicles = relationship("Vehicle", back_populates="owner")
    drivers = relationship("Driver", back_populates="owner")
    companies = relationship("Company", back_populates="owner")
    trips = relationship("Trip", back_populates="owner")

class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_number = Column(String, unique=True, index=True, nullable=False)
    vehicle_type = Column(SQLEnum(VehicleType), nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    color = Column(String, nullable=True)
    seating_capacity = Column(Integer, nullable=False)
    registration_number = Column(String, unique=True, nullable=False)
    insurance_number = Column(String, nullable=True)
    insurance_expiry = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="vehicles")
    location_updates = relationship("DriverLocation", back_populates="vehicle")

class Driver(Base):
    __tablename__ = "drivers"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    license_number = Column(String, unique=True, nullable=False)
    license_expiry = Column(DateTime(timezone=True), nullable=False)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="drivers")
    location_updates = relationship("DriverLocation", back_populates="driver")

class DriverLocation(Base):
    __tablename__ = "driver_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
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
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    service_start_date = Column(DateTime(timezone=True), nullable=False)
    service_end_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="companies")
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

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    trip_code = Column(String, unique=True, index=True, nullable=False)  # Auto-generated Trip ID
    name = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="trips")
    company = relationship("Company", back_populates="trips")
    schedules = relationship("TripSchedule", back_populates="trip", cascade="all, delete-orphan")

class TripSchedule(Base):
    __tablename__ = "trip_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    destination = Column(String, nullable=False)
    departure_datetime = Column(DateTime(timezone=True), nullable=False)  # Date and time
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    passenger_count = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    trip = relationship("Trip", back_populates="schedules")
    vehicle = relationship("Vehicle")
    driver = relationship("Driver")
