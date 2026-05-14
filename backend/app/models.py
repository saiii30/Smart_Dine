"""Smart Dine ORM models (PostgreSQL / SQLite)."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class DineUserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    WAITER = "WAITER"
    KITCHEN = "KITCHEN"
    CASHIER = "CASHIER"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderItemStatus(str, enum.Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    CANCELLED = "cancelled"


class TableStatus(str, enum.Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    OCCUPIED = "occupied"


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="branch")
    floor_tables = relationship("DiningTable", back_populates="branch")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(256), unique=True, nullable=False, index=True)
    full_name = Column(String(256), nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(String(32), nullable=False, default=DineUserRole.WAITER.value)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    branch = relationship("Branch", back_populates="users")
    orders_as_waiter = relationship("Order", back_populates="waiter")


class DiningTable(Base):
    """Floor table (DB table name: dining_tables)."""

    __tablename__ = "dining_tables"

    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(String(32), nullable=False, index=True)
    capacity = Column(Integer, nullable=False, default=4)
    status = Column(String(32), nullable=False, default=TableStatus.AVAILABLE.value)
    zone = Column(String(128), nullable=True)
    qr_token = Column(String(64), unique=True, nullable=False, index=True)
    pos_x = Column(Float, nullable=False, default=40.0)
    pos_y = Column(Float, nullable=False, default=40.0)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    occupied_seats = Column(Integer, nullable=False, default=0)

    branch = relationship("Branch", back_populates="floor_tables")
    orders = relationship("Order", back_populates="table")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    image_url = Column(String(512), nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)
    is_veg = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="items")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("dining_tables.id"), nullable=True)
    waiter_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    status = Column(String(32), nullable=False, default=OrderStatus.PENDING.value)
    special_instructions = Column(Text, nullable=True)
    customer_name = Column(String(256), nullable=True)
    seat_count = Column(Integer, nullable=False, default=1)
    subtotal = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, nullable=False, default=0.05)
    discount_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    table = relationship("DiningTable", back_populates="orders")
    waiter = relationship("User", back_populates="orders_as_waiter")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    status = Column(String(32), nullable=False, default=OrderItemStatus.PENDING.value)
    special_instructions = Column(Text, nullable=True)

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    tax_amount = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    payment_method = Column(String(64), nullable=False)
    split_label = Column(String(64), nullable=True)
    meta = Column(JSON, nullable=True)
    paid_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="payments")


class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    quantity = Column(Float, nullable=False, default=0.0)
    unit = Column(String(32), nullable=False, default="kg")
    reorder_level = Column(Float, nullable=False, default=5.0)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    contact_email = Column(String(256), nullable=True)
    contact_phone = Column(String(64), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchases = relationship("Purchase", back_populates="supplier")


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    total_amount = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)
    lines = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    supplier = relationship("Supplier", back_populates="purchases")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(256), nullable=False)
    role = Column(String(64), nullable=False)
    email = Column(String(256), nullable=True)
    contact_number = Column(String(64), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    attendance = relationship("Attendance", back_populates="employee")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    work_date = Column(Date, nullable=False)
    check_in = Column(DateTime(timezone=True), nullable=True)
    check_out = Column(DateTime(timezone=True), nullable=True)

    employee = relationship("Employee", back_populates="attendance")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    rating = Column(Integer, nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="feedback")
