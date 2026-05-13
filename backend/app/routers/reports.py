from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    revenue = (
        db.query(func.coalesce(func.sum(models.Payment.amount), 0.0))
        .join(models.Order)
        .scalar()
    )
    revenue = float(revenue or 0)
    active_tables = (
        db.query(func.count(models.DiningTable.id))
        .filter(models.DiningTable.status == models.TableStatus.OCCUPIED.value)
        .scalar()
        or 0
    )
    pending_orders = (
        db.query(func.count(models.Order.id))
        .filter(
            models.Order.status.in_(
                [
                    models.OrderStatus.PENDING.value,
                    models.OrderStatus.PREPARING.value,
                    models.OrderStatus.READY.value,
                ]
            )
        )
        .scalar()
        or 0
    )
    rows = (
        db.query(models.MenuItem.name, func.sum(models.OrderItem.quantity))
        .join(models.OrderItem, models.OrderItem.menu_item_id == models.MenuItem.id)
        .join(models.Order)
        .filter(models.Order.created_at >= since)
        .group_by(models.MenuItem.name)
        .order_by(func.sum(models.OrderItem.quantity).desc())
        .limit(5)
        .all()
    )
    top_items = [{"name": r[0], "qty": int(r[1] or 0)} for r in rows]
    return schemas.DashboardStats(
        total_orders=int(total_orders),
        revenue=revenue,
        active_tables=int(active_tables),
        pending_orders=int(pending_orders),
        top_items=top_items,
    )


@router.get("/export/orders.csv")
def export_orders_csv(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    from fastapi.responses import PlainTextResponse

    orders = db.query(models.Order).order_by(models.Order.id.desc()).limit(5000).all()
    lines = ["id,status,subtotal,total,created_at"]
    for o in orders:
        lines.append(
            f"{o.id},{o.status},{o.subtotal:.2f},{o.total_amount:.2f},{o.created_at}"
        )
    return PlainTextResponse("\n".join(lines), media_type="text/csv")
