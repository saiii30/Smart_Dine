from __future__ import annotations

import os
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import models, schemas
from app import schedule_models
from app.auth import get_current_active_user, require_roles
from app.database import get_db

router = APIRouter(tags=["Menu"])

BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_MENU = BACKEND_DIR / "uploads" / "menu"
UPLOAD_MENU.mkdir(parents=True, exist_ok=True)


@router.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db), _: models.User = Depends(get_current_active_user)):
    return db.query(models.Category).order_by(models.Category.name).all()


@router.post("/categories", response_model=schemas.CategoryOut)
def create_category(
    body: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    c = models.Category(name=body.name, description=body.description)
    db.add(c)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Category name must be unique")
    db.refresh(c)
    return c


@router.get("/menu-items", response_model=list[schemas.MenuItemOut])
def list_menu(
    q: str | None = None,
    category_id: int | None = None,
    veg_only: bool | None = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    query = db.query(models.MenuItem)
    if category_id:
        query = query.filter(models.MenuItem.category_id == category_id)
    if veg_only:
        query = query.filter(models.MenuItem.is_veg.is_(True))
    if q:
        like = f"%{q}%"
        query = query.filter(models.MenuItem.name.ilike(like))
    items = query.order_by(models.MenuItem.name).all()
    out: list[schemas.MenuItemOut] = []
    for m in items:
        row = schemas.MenuItemOut.model_validate(m, from_attributes=True)
        row.category_name = m.category.name if m.category else None
        out.append(row)
    return out


@router.post("/menu-items", response_model=schemas.MenuItemOut)
def create_menu_item(
    body: schemas.MenuItemCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    if not db.query(models.Category).filter(models.Category.id == body.category_id).first():
        raise HTTPException(status_code=400, detail="Invalid category")
    m = models.MenuItem(**body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    row = schemas.MenuItemOut.model_validate(m, from_attributes=True)
    row.category_name = m.category.name if m.category else None
    return row


@router.patch("/menu-items/{item_id}", response_model=schemas.MenuItemOut)
def update_menu_item(
    item_id: int,
    body: schemas.MenuItemUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "KITCHEN")),
):
    m = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    row = schemas.MenuItemOut.model_validate(m, from_attributes=True)
    row.category_name = m.category.name if m.category else None
    return row


@router.delete("/menu-items/{item_id}")
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    m = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.post("/menu-items/{item_id}/image")
async def upload_menu_image(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    m = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    ext = Path(file.filename or "img").suffix or ".jpg"
    name = f"{uuid4().hex}{ext}"
    dest = UPLOAD_MENU / name
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    m.image_url = f"/uploads/menu/{name}"
    db.commit()
    db.refresh(m)
    return {"image_url": m.image_url}


class ScheduleItemIn(BaseModel):
    id: int
    name: str
    category_name: str | None = None
    price: float
    is_veg: bool
    is_available: bool | None = True

class ScheduleSlotIn(BaseModel):
    id: str
    name: str
    time: str
    activeDays: list[str]
    items: list[ScheduleItemIn]

class ScheduleSaveIn(BaseModel):
    slots: list[ScheduleSlotIn]

@router.get("/schedule")
def get_schedule(db: Session = Depends(get_db)):
    slots = db.query(schedule_models.MenuSlot).all()
    result = []
    for s in slots:
        items = db.query(schedule_models.MenuSlotItem).filter(schedule_models.MenuSlotItem.slot_id == s.id).all()
        menu_items = []
        for i in items:
            mi = db.query(models.MenuItem).filter(models.MenuItem.id == i.menu_item_id).first()
            if mi:
                menu_items.append({
                    "id": mi.id,
                    "name": mi.name,
                    "category_name": mi.category.name if mi.category else None,
                    "price": mi.price,
                    "is_veg": mi.is_veg,
                    "is_available": getattr(mi, "is_available", True)
                })
        result.append({
            "id": s.id,
            "name": s.name,
            "time": s.time_window,
            "activeDays": s.active_days.split(",") if s.active_days else [],
            "items": menu_items
        })
    return result

@router.post("/schedule")
def save_schedule(
    body: ScheduleSaveIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    db.query(schedule_models.MenuSlotItem).delete()
    db.query(schedule_models.MenuSlot).delete()
    for s in body.slots:
        slot = schedule_models.MenuSlot(
            id=s.id,
            name=s.name,
            time_window=s.time,
            active_days=",".join(s.activeDays)
        )
        db.add(slot)
        for i in s.items:
            db.add(schedule_models.MenuSlotItem(slot_id=s.id, menu_item_id=i.id))
    db.commit()
    return {"ok": True}
