from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=list[schemas.InventoryOut])
def list_inv(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    rows = db.query(models.InventoryItem).order_by(models.InventoryItem.name).all()
    out: list[schemas.InventoryOut] = []
    for r in rows:
        o = schemas.InventoryOut.model_validate(r, from_attributes=True)
        o.is_low_stock = r.quantity <= r.reorder_level
        out.append(o)
    return out


@router.post("", response_model=schemas.InventoryOut)
def create_inv(
    body: schemas.InventoryCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    r = models.InventoryItem(**body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    o = schemas.InventoryOut.model_validate(r, from_attributes=True)
    o.is_low_stock = r.quantity <= r.reorder_level
    return o


@router.patch("/{item_id}", response_model=schemas.InventoryOut)
def update_inv(
    item_id: int,
    body: schemas.InventoryUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    r = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    o = schemas.InventoryOut.model_validate(r, from_attributes=True)
    o.is_low_stock = r.quantity <= r.reorder_level
    return o


@router.delete("/{item_id}")
def delete_inv(
    item_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    r = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(r)
    db.commit()
    return {"ok": True}
