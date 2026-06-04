from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db
from app.ws_manager import order_events

router = APIRouter(prefix="/orders", tags=["Orders"])


def _serialize_order(o: models.Order) -> schemas.OrderOut:
    items_out: list[schemas.OrderItemOut] = []
    for li in o.items:
        row = schemas.OrderItemOut.model_validate(li, from_attributes=True)
        row.menu_item_name = li.menu_item.name if li.menu_item else None
        items_out.append(row)
    order_data = {
        'id': o.id,
        'table_id': o.table_id,
        'waiter_id': o.waiter_id,
        'branch_id': o.branch_id,
        'status': o.status,
        'special_instructions': o.special_instructions,
        'customer_name': o.customer_name,
        'seat_count': o.seat_count or 1,
        'subtotal': o.subtotal,
        'tax_rate': o.tax_rate,
        'discount_amount': o.discount_amount,
        'total_amount': o.total_amount,
        'created_at': o.created_at,
        'updated_at': o.updated_at,
        'items': items_out,
    }
    base = schemas.OrderOut.model_validate(order_data)
    base.table_name = o.table.table_number if o.table else None
    return base


async def emit_order(order_id: int, event: str = "order_updated") -> None:
    await order_events.broadcast({"event": event, "order_id": order_id})


@router.get("", response_model=list[schemas.OrderOut])
async def list_orders(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_active_user),
):
    q = db.query(models.Order)
    if user.role == "WAITER":
        q = q.outerjoin(models.DiningTable, models.Order.table_id == models.DiningTable.id).filter(
            or_(
                models.Order.waiter_id == user.id,
                models.DiningTable.waiter_id == user.id
            )
        )
    if status:
        q = q.filter(models.Order.status == status)
    orders = q.order_by(models.Order.id.desc()).limit(200).all()
    return [_serialize_order(o) for o in orders]

@router.patch("/{order_id}/items/{item_id}/quantity", response_model=schemas.OrderOut)
async def patch_item_quantity(
    order_id: int,
    item_id: int,
    quantity: int = Query(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "WAITER", "CASHIER")),
):
    li = (
        db.query(models.OrderItem)
        .filter(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id,
        )
        .first()
    )

    if not li:
        raise HTTPException(status_code=404, detail="Line item not found in this order")

    if li.status != models.OrderItemStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Only pending items can have their quantity modified")

    o = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    # Calculate change in subtotal based on quantity difference
    quantity_diff = quantity - li.quantity
    subtotal_diff = quantity_diff * li.unit_price
    o.subtotal += subtotal_diff

    if quantity <= 0:
        li.status = models.OrderItemStatus.CANCELLED.value
        li.quantity = 0
    else:
        li.quantity = quantity

    # Recalculate total amount
    tax_amt = round(o.subtotal * o.tax_rate, 2)
    o.total_amount = round(o.subtotal + tax_amt - o.discount_amount, 2)

    db.commit()
    db.refresh(o)

    await emit_order(order_id, "order_updated")

    return _serialize_order(o)
    
@router.get("/{order_id}", response_model=schemas.OrderOut)
async def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    o = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize_order(o)


@router.post("", response_model=schemas.OrderOut)
async def create_order(
    body: schemas.OrderCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(
        require_roles("ADMIN", "MANAGER", "WAITER", "CASHIER")
    ),
):
    subtotal = 0.0
    lines: list[models.OrderItem] = []

    # CREATE ORDER ITEMS
    for it in body.items:

        mi = (
            db.query(models.MenuItem)
            .filter(models.MenuItem.id == it.menu_item_id)
            .first()
        )

        if not mi or not mi.is_available:
            raise HTTPException(
                status_code=400,
                detail=f"Menu item {it.menu_item_id} unavailable"
            )

        subtotal += mi.price * it.quantity

        lines.append(
            models.OrderItem(
                menu_item_id=mi.id,
                quantity=it.quantity,
                unit_price=mi.price,
                status=models.OrderItemStatus.PENDING.value,
                special_instructions=it.special_instructions,
            )
        )

    # BILL CALCULATION
    tax_rate = 0.05
    tax_amt = round(subtotal * tax_rate, 2)
    discount = 0.0
    total = round(subtotal + tax_amt - discount, 2)

    # TABLE VALIDATION (ONLY CHECK CAPACITY)
    tbl = None
    if body.table_id:

        tbl = (
            db.query(models.DiningTable)
            .filter(models.DiningTable.id == body.table_id)
            .first()
        )

        if not tbl:
            raise HTTPException(status_code=404, detail="Table not found")

        active_orders = db.query(models.Order).filter(
            models.Order.table_id == body.table_id,
            models.Order.status.notin_([models.OrderStatus.COMPLETED.value, models.OrderStatus.CANCELLED.value])
        ).all()
        occupied_seats = sum((o.seat_count or 1) for o in active_orders)

        if occupied_seats + body.seat_count > tbl.capacity:
            raise HTTPException(
                status_code=400,
                detail="Not enough seats available in this table"
            )

    assigned_waiter = None
    if user.role == "WAITER":
        assigned_waiter = user.id
    elif tbl and tbl.waiter_id:
        assigned_waiter = tbl.waiter_id
    elif user.role in ("MANAGER", "ADMIN"):
        assigned_waiter = user.id

    # CREATE ORDER
    order = models.Order(
        table_id=body.table_id,
        waiter_id=assigned_waiter,
        branch_id=body.branch_id or user.branch_id,
        status=models.OrderStatus.PENDING.value,
        special_instructions=body.special_instructions,
        customer_name=body.customer_name,
        seat_count=body.seat_count,
        subtotal=subtotal,
        tax_rate=tax_rate,
        discount_amount=discount,
        total_amount=total,
    )

    db.add(order)
    db.flush()

    # SAVE ITEMS
    for li in lines:
        li.order_id = order.id
        db.add(li)

    db.commit()
    db.refresh(order)

    await emit_order(order.id, "order_created")

    return _serialize_order(order)

class SeatCustomerCreate(BaseModel):
    table_id: int
    seat_count: int = 1
    customer_name: str | None = None
    branch_id: int | None = None

@router.post("/seat", response_model=schemas.OrderOut)
async def seat_customer(
    body: SeatCustomerCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("ADMIN", "MANAGER", "WAITER", "CASHIER")),
):
    tbl = db.query(models.DiningTable).filter(models.DiningTable.id == body.table_id).first()
    if not tbl:
        raise HTTPException(status_code=404, detail="Table not found")

    active_orders = db.query(models.Order).filter(
        models.Order.table_id == body.table_id,
        models.Order.status.notin_([models.OrderStatus.COMPLETED.value, models.OrderStatus.CANCELLED.value])
    ).all()
    occupied_seats = sum((o.seat_count or 1) for o in active_orders)

    if occupied_seats + body.seat_count > tbl.capacity:
        raise HTTPException(status_code=400, detail="Not enough seats available in this table")

    assigned_waiter = None
    if user.role == "WAITER":
        assigned_waiter = user.id
    elif tbl.waiter_id:
        assigned_waiter = tbl.waiter_id
    elif user.role in ("MANAGER", "ADMIN"):
        assigned_waiter = user.id

    order = models.Order(
        table_id=body.table_id,
        waiter_id=assigned_waiter,
        branch_id=body.branch_id or user.branch_id,
        status=models.OrderStatus.PENDING.value,
        customer_name=body.customer_name,
        seat_count=body.seat_count,
        subtotal=0.0,
        tax_rate=0.05,
        discount_amount=0.0,
        total_amount=0.0,
    )

    db.add(order)
    db.commit()
    db.refresh(order)
    await emit_order(order.id, "order_created")
    return _serialize_order(order)

@router.patch("/{order_id}/status", response_model=schemas.OrderOut)
async def patch_order_status(
    order_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_active_user),
):
    o = db.query(models.Order).filter(models.Order.id == order_id).first()

    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed = {s.value for s in models.OrderStatus}

    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")

    if user.role == "KITCHEN" and status not in ("preparing", "ready", "pending", "cancelled"):
        raise HTTPException(status_code=403, detail="Kitchen cannot set this status")

    # CANCEL ITEMS
    if status == models.OrderStatus.CANCELLED.value:
        for item in o.items:
            if item.status not in (
                models.OrderItemStatus.SERVED.value,
                models.OrderItemStatus.CANCELLED.value,
            ):
                item.status = models.OrderItemStatus.CANCELLED.value

    o.status = status

    db.commit()
    db.refresh(o)

    await emit_order(order_id, "order_status")

    return _serialize_order(o)

@router.patch("/{order_id}/items/{item_id}/status", response_model=schemas.OrderOut)
async def patch_item_status(
    order_id: int,
    item_id: int,
    body: schemas.OrderItemStatusUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "KITCHEN", "WAITER")),
):
    li = (
        db.query(models.OrderItem)
        .filter(
            models.OrderItem.id == item_id,
            models.OrderItem.order_id == order_id,
        )
        .first()
    )

    if not li:
        raise HTTPException(status_code=404, detail="Line not found")

    li.status = body.status

    o = db.query(models.Order).filter(models.Order.id == order_id).first()

    if o:
        items = db.query(models.OrderItem).filter(
            models.OrderItem.order_id == order_id
        ).all()

        if all(i.status in ("served", "cancelled") for i in items):
            o.status = "served"
        elif any(i.status == "preparing" for i in items):
            o.status = "preparing"
        elif any(i.status == "ready" for i in items):
            o.status = "ready"
        else:
            o.status = "pending"

    db.commit()
    db.refresh(o)

    await emit_order(order_id, "item_status")

    return _serialize_order(o)

@router.post("/{order_id}/items", response_model=schemas.OrderOut)
async def add_items_to_order(
    order_id: int,
    items: List[schemas.OrderItemIn],
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("ADMIN", "MANAGER", "WAITER", "CASHIER")),
):
    o = db.query(models.Order).filter(models.Order.id == order_id).first()

    if not o:
        raise HTTPException(status_code=404, detail="Order not found")

    if o.status == models.OrderStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Cannot add items")

    subtotal_add = 0.0
    new_lines = []

    for it in items:
        mi = db.query(models.MenuItem).filter(
            models.MenuItem.id == it.menu_item_id
        ).first()

        if not mi:
            raise HTTPException(status_code=400, detail="Menu item not found")

        subtotal_add += mi.price * it.quantity

        new_lines.append(
            models.OrderItem(
                order_id=order_id,
                menu_item_id=mi.id,
                quantity=it.quantity,
                unit_price=mi.price,
                status=models.OrderItemStatus.PENDING.value,
                special_instructions=it.special_instructions,
            )
        )

    o.subtotal += subtotal_add
    tax_amt = round(o.subtotal * o.tax_rate, 2)
    o.total_amount = round(o.subtotal + tax_amt - o.discount_amount, 2)

    for li in new_lines:
        db.add(li)

    db.commit()
    db.refresh(o)

    await emit_order(order_id, "order_updated")

    return _serialize_order(o)