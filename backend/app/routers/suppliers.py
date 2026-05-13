from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db

router = APIRouter(tags=["Suppliers & Purchases"])


@router.get("/suppliers", response_model=list[schemas.SupplierOut])
def list_suppliers(db: Session = Depends(get_db), _: models.User = Depends(get_current_active_user)):
    return db.query(models.Supplier).order_by(models.Supplier.name).all()


@router.post("/suppliers", response_model=schemas.SupplierOut)
def create_supplier(
    body: schemas.SupplierCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    s = models.Supplier(
        name=body.name,
        contact_email=str(body.contact_email) if body.contact_email else None,
        contact_phone=body.contact_phone,
        address=body.address,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/purchases", response_model=list[schemas.PurchaseOut])
def list_purchases(db: Session = Depends(get_db), _: models.User = Depends(get_current_active_user)):
    return db.query(models.Purchase).order_by(models.Purchase.id.desc()).limit(200).all()


@router.post("/purchases", response_model=schemas.PurchaseOut)
def create_purchase(
    body: schemas.PurchaseCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    if not db.query(models.Supplier).filter(models.Supplier.id == body.supplier_id).first():
        raise HTTPException(status_code=400, detail="Invalid supplier")
    p = models.Purchase(
        supplier_id=body.supplier_id,
        branch_id=body.branch_id,
        total_amount=body.total_amount,
        notes=body.notes,
        lines=body.lines,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
