from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.get("", response_model=list[schemas.BranchOut])
def list_branches(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    return db.query(models.Branch).order_by(models.Branch.id).all()


@router.post("", response_model=schemas.BranchOut)
def create_branch(
    body: schemas.BranchCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    b = models.Branch(name=body.name, address=body.address)
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.patch("/{branch_id}", response_model=schemas.BranchOut)
def update_branch(
    branch_id: int,
    body: schemas.BranchCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN")),
):
    b = db.query(models.Branch).filter(models.Branch.id == branch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Branch not found")
    b.name = body.name
    b.address = body.address
    db.commit()
    db.refresh(b)
    return b
