from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user
from app.database import get_db

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.get("", response_model=list[schemas.FeedbackOut])
def list_feedback(db: Session = Depends(get_db), _: models.User = Depends(get_current_active_user)):
    return db.query(models.Feedback).order_by(models.Feedback.id.desc()).limit(200).all()


@router.post("", response_model=schemas.FeedbackOut)
def submit_feedback(body: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    o = db.query(models.Order).filter(models.Order.id == body.order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    f = models.Feedback(order_id=body.order_id, rating=body.rating, comments=body.comments)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f
