from __future__ import annotations

from datetime import date, datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=256)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="WAITER")
    branch_id: Optional[int] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    branch_id: Optional[int] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Branch ---
class BranchCreate(BaseModel):
    name: str
    address: Optional[str] = None


class BranchOut(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


# --- Tables ---
class DiningTableCreate(BaseModel):
    table_number: str
    capacity: int = 4
    zone: Optional[str] = None
    status: str = "available"
    branch_id: Optional[int] = None
    shape: str = "rectangle"
    width: float = 100.0
    height: float = 100.0
    pos_x: float = 40.0
    pos_y: float = 40.0
    is_merged: bool = False
    waiter_id: Optional[str] = None
    merge_history: Optional[dict[str, Any]] = None


class DiningTableUpdate(BaseModel):
    table_number: Optional[str] = None
    capacity: Optional[int] = None
    zone: Optional[str] = None
    status: Optional[str] = None
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None
    shape: Optional[str] = None
    width: Optional[float] = None
    height: Optional[float] = None
    is_merged: Optional[bool] = None
    branch_id: Optional[int] = None
    waiter_id: Optional[str] = None
    merge_history: Optional[dict[str, Any]] = None


class DiningTableOut(BaseModel):
    id: int
    table_number: str
    capacity: int
    status: str
    zone: Optional[str] = None
    qr_token: str
    pos_x: float
    pos_y: float
    shape: str = "rectangle"
    width: float = 100.0
    height: float = 100.0
    is_merged: bool = False
    branch_id: Optional[int] = None
    waiter_id: Optional[str] = None
    merge_history: Optional[dict[str, Any]] = None
    waiter_name: Optional[str] = None
    qr_url: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Menu ---
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = Field(ge=0)
    category_id: int
    is_available: bool = True
    is_veg: bool = True


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_veg: Optional[bool] = None


class MenuItemOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    category_id: int
    image_url: Optional[str] = None
    is_available: bool
    is_veg: bool
    category_name: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Orders ---
class OrderItemIn(BaseModel):
    menu_item_id: int
    quantity: int = Field(ge=1, le=99)
    special_instructions: Optional[str] = None


class OrderCreate(BaseModel):
    table_id: Optional[int] = None
    branch_id: Optional[int] = None
    customer_name: Optional[str] = None
    special_instructions: Optional[str] = None
    seat_count: int = Field(default=1, ge=1)
    items: List[OrderItemIn] = Field(..., min_length=1)


class OrderItemOut(BaseModel):
    id: int
    menu_item_id: int
    quantity: int
    unit_price: float
    status: str
    special_instructions: Optional[str] = None
    menu_item_name: Optional[str] = None

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    table_id: Optional[int] = None
    table_name: Optional[str] = None
    waiter_id: Optional[str] = None
    branch_id: Optional[int] = None
    status: str
    seat_count: int = 1
    special_instructions: Optional[str] = None
    customer_name: Optional[str] = None
    subtotal: float
    tax_rate: float
    discount_amount: float
    total_amount: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[OrderItemOut] = []

    model_config = {"from_attributes": True}


class OrderItemStatusUpdate(BaseModel):
    status: str


# --- Billing ---
class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    tax_amount: float = 0
    discount_amount: float = 0
    payment_method: str
    split_label: Optional[str] = None


class BillPayload(BaseModel):
    tax_rate: Optional[float] = Field(default=None, ge=0, le=1)
    discount_amount: float = Field(default=0, ge=0)
    payments: List[PaymentCreate]


class PaymentOut(BaseModel):
    id: int
    order_id: int
    amount: float
    tax_amount: float
    discount_amount: float
    payment_method: str
    split_label: Optional[str] = None
    paid_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Inventory ---
class InventoryCreate(BaseModel):
    name: str
    quantity: float = Field(ge=0)
    unit: str = "kg"
    reorder_level: float = Field(default=5, ge=0)
    branch_id: Optional[int] = None


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = Field(default=None, ge=0)
    unit: Optional[str] = None
    reorder_level: Optional[float] = Field(default=None, ge=0)
    branch_id: Optional[int] = None


class InventoryOut(BaseModel):
    id: int
    name: str
    quantity: float
    unit: str
    reorder_level: float
    branch_id: Optional[int] = None
    is_low_stock: bool = False

    model_config = {"from_attributes": True}


# --- Suppliers & purchases ---
class SupplierCreate(BaseModel):
    name: str
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class SupplierOut(BaseModel):
    id: int
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None

    model_config = {"from_attributes": True}


class PurchaseCreate(BaseModel):
    supplier_id: int
    branch_id: Optional[int] = None
    total_amount: float = Field(ge=0)
    notes: Optional[str] = None
    lines: Optional[List[dict[str, Any]]] = None


class PurchaseOut(BaseModel):
    id: int
    supplier_id: int
    branch_id: Optional[int] = None
    total_amount: float
    notes: Optional[str] = None
    lines: Optional[List[dict[str, Any]]] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Employees ---
class EmployeeCreate(BaseModel):
    full_name: str
    role: str
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None
    password: Optional[str] = None
    branch_id: Optional[int] = None
    user_id: Optional[str] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[EmailStr] = None
    contact_number: Optional[str] = None
    password: Optional[str] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None


class EmployeeOut(BaseModel):
    id: int
    full_name: str
    role: str
    email: Optional[str] = None
    contact_number: Optional[str] = None
    branch_id: Optional[int] = None
    user_id: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class AttendanceIn(BaseModel):
    employee_id: int
    work_date: date


class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    work_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Feedback ---
class FeedbackCreate(BaseModel):
    order_id: int
    rating: int = Field(ge=1, le=5)
    comments: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("rating must be 1-5")
        return v


class FeedbackOut(BaseModel):
    id: int
    order_id: Optional[int] = None
    rating: int
    comments: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Dashboard / reports ---
class DashboardStats(BaseModel):
    total_orders: int
    revenue: float
    active_tables: int
    pending_orders: int
    top_items: List[dict[str, Any]]


class SalesPredictionOut(BaseModel):
    next_week_estimate: float
    confidence: float
    note: str


class RecommendationOut(BaseModel):
    items: List[dict[str, Any]]
