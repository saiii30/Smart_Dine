from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_active_user, require_roles
from app.database import get_db

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=dict[str, Any | None])
def get_settings(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    settings_db = db.query(models.AppSetting).all()
    return {s.key: s.value for s in settings_db}


@router.post("")
def update_settings(
    body: dict[str, Any],
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN")),
):
    for key, value in body.items():
        setting = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = models.AppSetting(key=key, value=value)
            db.add(setting)
    db.commit()
    return {"ok": True}