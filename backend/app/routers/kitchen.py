from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db
from app.routers.orders import _serialize_order

router = APIRouter(prefix="/kitchen", tags=["Kitchen"])


@router.get("/orders", response_model=list[schemas.OrderOut])
def kitchen_queue(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "KITCHEN")),
):
    orders = (
        db.query(models.Order)
        .filter(
            models.Order.status.in_(
                [
                    models.OrderStatus.PENDING.value,
                    models.OrderStatus.PREPARING.value,
                    models.OrderStatus.READY.value,
                    "served",
                ]
            ),
            models.Order.items.any()
        )
        .order_by(models.Order.id.asc())
        .limit(100)
        .all()
    )
    return [_serialize_order(o) for o in orders]
