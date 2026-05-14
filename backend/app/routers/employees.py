from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles, get_password_hash
from app.database import get_db

router = APIRouter(prefix="/employees", tags=["Employees"])


# =========================
# LIST EMPLOYEES
# =========================
@router.get("", response_model=list[schemas.EmployeeOut])
def list_employees(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    return db.query(models.Employee).order_by(models.Employee.id.desc()).all()


# =========================
# CREATE EMPLOYEE + USER
# =========================
@router.post("", response_model=schemas.EmployeeOut)
def create_employee(
    body: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    # create user first
    user = models.User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(body.password),
        role=body.role,
        is_active=True,
    )

    db.add(user)
    db.flush()  # get user.id

    # create employee
    emp = models.Employee(
        full_name=body.full_name,
        role=body.role,
        email=body.email,
        user_id=user.id,
    )

    db.add(emp)
    db.commit()
    db.refresh(emp)

    return emp


# =========================
# UPDATE EMPLOYEE + USER
# =========================
@router.patch("/{emp_id}", response_model=schemas.EmployeeOut)
def update_employee(
    emp_id: int,
    body: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()

    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    user = db.query(models.User).filter(models.User.id == emp.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = body.model_dump(exclude_unset=True)

    # update employee + user sync
    if "full_name" in data:
        emp.full_name = data["full_name"]
        user.full_name = data["full_name"]

    if "email" in data:
        emp.email = data["email"]
        user.email = data["email"]

    if "role" in data:
        emp.role = data["role"]
        user.role = data["role"]

    # password update
    if "password" in data and data["password"]:
        user.hashed_password = get_password_hash(data["password"])

    db.commit()
    db.refresh(emp)

    return emp


# =========================
# DELETE EMPLOYEE + USER
# =========================
@router.delete("/{emp_id}")
def delete_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER")),
):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()

    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    user = db.query(models.User).filter(models.User.id == emp.user_id).first()

    db.delete(emp)

    if user:
        db.delete(user)

    db.commit()

    return {"ok": True, "message": "Employee and user deleted"}


# =========================
# ATTENDANCE CHECK IN
# =========================
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

    att = models.Attendance(
        employee_id=body.employee_id,
        work_date=body.work_date,
        check_in=datetime.now(timezone.utc),
    )

    db.add(att)
    db.commit()
    db.refresh(att)

    return att


# =========================
# ATTENDANCE CHECK OUT
# =========================
@router.post("/attendance/check-out", response_model=schemas.AttendanceOut)
def check_out(
    body: schemas.AttendanceIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "WAITER", "CASHIER", "KITCHEN")),
):
    att = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.employee_id == body.employee_id,
            models.Attendance.work_date == body.work_date,
        )
        .first()
    )

    if not att or not att.check_in:
        raise HTTPException(status_code=400, detail="Check in first")

    att.check_out = datetime.now(timezone.utc)
    db.commit()
    db.refresh(att)

    return att


# =========================
# TODAY ATTENDANCE
# =========================
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