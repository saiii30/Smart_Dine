from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db

router = APIRouter(prefix="/tables", tags=["Tables"])

FRONTEND = os.getenv("FRONTEND_PUBLIC_URL", "http://localhost:5173").rstrip("/")


def _table_out(t: models.DiningTable) -> schemas.DiningTableOut:
    data = schemas.DiningTableOut.model_validate(t, from_attributes=True)
    data.qr_url = f"{FRONTEND}/customer/{t.qr_token}"
    return data


@router.get("", response_model=list[schemas.DiningTableOut])
def list_tables(db: Session = Depends(get_db), _: models.User = Depends(get_current_active_user)):
    rows = db.query(models.DiningTable).order_by(models.DiningTable.id).all()
    return [_table_out(t) for t in rows]


@router.post("", response_model=schemas.DiningTableOut)
def create_table(
    body: schemas.DiningTableCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    t = models.DiningTable(
        table_number=body.table_number,
        capacity=body.capacity,
        zone=body.zone,
        status=body.status,
        branch_id=body.branch_id,
        qr_token=str(uuid.uuid4()),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _table_out(t)


@router.patch("/{table_id}", response_model=schemas.DiningTableOut)
def update_table(
    table_id: int,
    body: schemas.DiningTableUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "WAITER")),
):
    t = db.query(models.DiningTable).filter(models.DiningTable.id == table_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Table not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return _table_out(t)


@router.delete("/{table_id}")
def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    t = db.query(models.DiningTable).filter(models.DiningTable.id == table_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Table not found")
    db.delete(t)
    db.commit()
    return {"ok": True}


@router.post("/{table_id}/regenerate-qr", response_model=schemas.DiningTableOut)
def regen_qr(
    table_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    t = db.query(models.DiningTable).filter(models.DiningTable.id == table_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Table not found")
    t.qr_token = str(uuid.uuid4())
    db.commit()
    db.refresh(t)
    return _table_out(t)
