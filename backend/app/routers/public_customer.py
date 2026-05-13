from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.orders import _serialize_order, emit_order

router = APIRouter(prefix="/public", tags=["Public"])


@router.get("/tables/{qr_token}", response_model=schemas.DiningTableOut)
def public_table(qr_token: str, db: Session = Depends(get_db)):
    t = db.query(models.DiningTable).filter(models.DiningTable.qr_token == qr_token).first()
    if not t:
        raise HTTPException(status_code=404, detail="Invalid QR")
    return schemas.DiningTableOut.model_validate(t, from_attributes=True)


@router.get("/menu", response_model=list[schemas.MenuItemOut])
def public_menu(db: Session = Depends(get_db)):
    items = (
        db.query(models.MenuItem)
        .filter(models.MenuItem.is_available.is_(True))
        .order_by(models.MenuItem.name)
        .all()
    )
    out: list[schemas.MenuItemOut] = []
    for m in items:
        row = schemas.MenuItemOut.model_validate(m, from_attributes=True)
        row.category_name = m.category.name if m.category else None
        out.append(row)
    return out


@router.post("/tables/{qr_token}/orders", response_model=schemas.OrderOut)
async def public_place_order(
    qr_token: str,
    body: schemas.OrderCreate,
    db: Session = Depends(get_db),
):
    t = db.query(models.DiningTable).filter(models.DiningTable.qr_token == qr_token).first()
    if not t:
        raise HTTPException(status_code=404, detail="Invalid QR")
    body.table_id = t.id
    body.branch_id = body.branch_id or t.branch_id
    subtotal = 0.0
    lines: list[models.OrderItem] = []
    for it in body.items:
        mi = db.query(models.MenuItem).filter(models.MenuItem.id == it.menu_item_id).first()
        if not mi or not mi.is_available:
            raise HTTPException(status_code=400, detail="Item unavailable")
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
    tax_rate = 0.05
    tax_amt = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax_amt, 2)
    order = models.Order(
        table_id=t.id,
        waiter_id=None,
        branch_id=t.branch_id,
        status=models.OrderStatus.PENDING.value,
        special_instructions=body.special_instructions,
        customer_name=body.customer_name,
        subtotal=subtotal,
        tax_rate=tax_rate,
        discount_amount=0.0,
        total_amount=total,
    )
    db.add(order)
    db.flush()
    for li in lines:
        li.order_id = order.id
        db.add(li)
    t.status = models.TableStatus.OCCUPIED.value
    db.commit()
    db.refresh(order)
    await emit_order(order.id, "order_created")
    return _serialize_order(order)
