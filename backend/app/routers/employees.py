from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", response_model=list[schemas.EmployeeOut])
def list_employees(db: Session = Depends(get_db), _: models.User = Depends(get_current_active_user)):
    return db.query(models.Employee).order_by(models.Employee.id.desc()).all()


@router.post("", response_model=schemas.EmployeeOut)
def create_employee(
    body: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    e = models.Employee(
        full_name=body.full_name,
        role=body.role,
        email=str(body.email) if body.email else None,
        contact_number=body.contact_number,
        branch_id=body.branch_id,
        user_id=body.user_id,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.patch("/{emp_id}", response_model=schemas.EmployeeOut)
def update_employee(
    emp_id: int,
    body: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    e = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/{emp_id}")
def delete_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    e = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(e)
    db.commit()
    return {"ok": True}


@router.post("/attendance/check-in", response_model=schemas.AttendanceOut)
def check_in(
    body: schemas.AttendanceIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "WAITER", "CASHIER", "KITCHEN")),
):
    if not db.query(models.Employee).filter(models.Employee.id == body.employee_id).first():
        raise HTTPException(status_code=400, detail="Unknown employee")
    existing = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.employee_id == body.employee_id,
            models.Attendance.work_date == body.work_date,
        )
        .first()
    )
    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in")
    if existing:
        existing.check_in = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing
    a = models.Attendance(
        employee_id=body.employee_id,
        work_date=body.work_date,
        check_in=datetime.now(timezone.utc),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.post("/attendance/check-out", response_model=schemas.AttendanceOut)
def check_out(
    body: schemas.AttendanceIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "WAITER", "CASHIER", "KITCHEN")),
):
    a = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.employee_id == body.employee_id,
            models.Attendance.work_date == body.work_date,
        )
        .first()
    )
    if not a or not a.check_in:
        raise HTTPException(status_code=400, detail="Check in first")
    a.check_out = datetime.now(timezone.utc)
    db.commit()
    db.refresh(a)
    return a


@router.get("/attendance/today", response_model=list[schemas.AttendanceOut])
def attendance_today(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    today = date.today()
    return (
        db.query(models.Attendance)
        .filter(models.Attendance.work_date == today)
        .order_by(models.Attendance.id.desc())
        .all()
    )
