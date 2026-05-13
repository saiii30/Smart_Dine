from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user
from app.database import get_db

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/recommendations", response_model=schemas.RecommendationOut)
def ai_recommendations(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    """Lightweight heuristic 'AI' — popular items + one veg pairing."""
    since = datetime.now(timezone.utc) - timedelta(days=14)
    hot = (
        db.query(models.MenuItem.id, models.MenuItem.name, func.sum(models.OrderItem.quantity).label("q"))
        .join(models.OrderItem, models.OrderItem.menu_item_id == models.MenuItem.id)
        .join(models.Order)
        .filter(models.Order.created_at >= since, models.MenuItem.is_available.is_(True))
        .group_by(models.MenuItem.id, models.MenuItem.name)
        .order_by(func.sum(models.OrderItem.quantity).desc())
        .limit(4)
        .all()
    )
    items = [{"id": h[0], "name": h[1], "score": float(h[2] or 0) + random.uniform(0, 0.5)} for h in hot]
    veg = (
        db.query(models.MenuItem)
        .filter(models.MenuItem.is_veg.is_(True), models.MenuItem.is_available.is_(True))
        .order_by(models.MenuItem.id)
        .first()
    )
    if veg:
        items.append({"id": veg.id, "name": veg.name, "score": 0.25, "reason": "veg pairing"})
    return schemas.RecommendationOut(items=items[:6])


@router.get("/sales-prediction", response_model=schemas.SalesPredictionOut)
def sales_prediction(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    """Naive next-week estimate from trailing 7-day revenue."""
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    rev = (
        db.query(func.coalesce(func.sum(models.Payment.amount), 0.0))
        .join(models.Order)
        .filter(models.Payment.paid_at >= week_ago)
        .scalar()
    )
    rev = float(rev or 0)
    est = round(rev * 1.05, 2)
    return schemas.SalesPredictionOut(
        next_week_estimate=est,
        confidence=0.62,
        note="Heuristic projection from last 7 days of settled payments; replace with ML in production.",
    )
