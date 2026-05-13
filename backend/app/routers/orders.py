from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

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
    base = schemas.OrderOut.model_validate(o, from_attributes=True)
    base.items = items_out
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
        q = q.filter(models.Order.waiter_id == user.id)
    if status:
        q = q.filter(models.Order.status == status)
    orders = q.order_by(models.Order.id.desc()).limit(200).all()
    return [_serialize_order(o) for o in orders]


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
    user: models.User = Depends(require_roles("ADMIN", "MANAGER", "WAITER", "CASHIER")),
):
    subtotal = 0.0
    lines: list[models.OrderItem] = []
    for it in body.items:
        mi = db.query(models.MenuItem).filter(models.MenuItem.id == it.menu_item_id).first()
        if not mi or not mi.is_available:
            raise HTTPException(status_code=400, detail=f"Menu item {it.menu_item_id} unavailable")
        line_total = mi.price * it.quantity
        subtotal += line_total
        lines.append(
            models.OrderItem(
                menu_item_id=mi.id,
                quantity=it.quantity,
                unit_price=mi.price,
                status=models.OrderItemStatus.PENDING.value,
                special_instructions=it.special_instructions,
            )
        )
    tax_rate = 0.05
    tax_amt = round(subtotal * tax_rate, 2)
    discount = 0.0
    total = round(subtotal + tax_amt - discount, 2)
    order = models.Order(
        table_id=body.table_id,
        waiter_id=user.id if user.role in ("WAITER", "MANAGER", "ADMIN") else None,
        branch_id=body.branch_id or user.branch_id,
        status=models.OrderStatus.PENDING.value,
        special_instructions=body.special_instructions,
        customer_name=body.customer_name,
        subtotal=subtotal,
        tax_rate=tax_rate,
        discount_amount=discount,
        total_amount=total,
    )
    db.add(order)
    db.flush()
    for li in lines:
        li.order_id = order.id
        db.add(li)
    if body.table_id:
        tbl = db.query(models.DiningTable).filter(models.DiningTable.id == body.table_id).first()
        if tbl:
            tbl.status = models.TableStatus.OCCUPIED.value
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
    if user.role == "KITCHEN" and status not in ("preparing", "ready", "pending"):
        raise HTTPException(status_code=403, detail="Kitchen cannot set this status")
    o.status = status
    if status == models.OrderStatus.COMPLETED.value and o.table_id:
        tbl = db.query(models.DiningTable).filter(models.DiningTable.id == o.table_id).first()
        if tbl:
            tbl.status = models.TableStatus.AVAILABLE.value
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
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "KITCHEN")),
):
    li = (
        db.query(models.OrderItem)
        .filter(models.OrderItem.id == item_id, models.OrderItem.order_id == order_id)
        .first()
    )
    if not li:
        raise HTTPException(status_code=404, detail="Line not found")
    li.status = body.status
    o = db.query(models.Order).filter(models.Order.id == order_id).first()
    if o:
        items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).all()
        if all(i.status == models.OrderItemStatus.READY.value for i in items):
            o.status = models.OrderStatus.READY.value
        elif any(i.status == models.OrderItemStatus.PREPARING.value for i in items):
            o.status = models.OrderStatus.PREPARING.value
    db.commit()
    db.refresh(o)  # type: ignore
    await emit_order(order_id, "item_status")
    return _serialize_order(o)
