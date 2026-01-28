from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from passlib.context import CryptContext
import secrets
import string
from ..auth import get_current_user



router = APIRouter(
    prefix="/api/companies",
    tags=["Companies"]
)

# ------------------ Password Helpers ------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def generate_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


# ------------------ Dropdown ------------------
@router.get("/dropdown", response_model=List[schemas.CompanyDropdown])
def get_company_dropdown(db: Session = Depends(get_db)):
    companies = db.query(models.Company).all()
    return [
        {
            "id": company.id,
            "company_name": company.company_name,
            "company_address": company.company_address,
        }
        for company in companies
    ]


# ------------------ Create Company ------------------
@router.post("/", response_model=schemas.CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(get_db)):

    if company.service_ended_at and company.service_start_at and company.service_ended_at <= company.service_start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service end date must be after service start date"
        )

    db_company = models.Company(
        **company.dict(exclude={"service_start_at", "service_ended_at"}),
        service_start_at=company.service_start_at,
        service_ended_at=company.service_ended_at,
    )

    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


# ------------------ Read All ------------------
@router.get("/", response_model=List[schemas.CompanyResponse])
def read_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Company).offset(skip).limit(limit).all()


# ------------------ Read By ID ------------------
@router.get("/{company_id}", response_model=schemas.CompanyResponse)
def read_company(company_id: str, db: Session = Depends(get_db)):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ------------------ Update ------------------
@router.put("/{company_id}", response_model=schemas.CompanyResponse)
def update_company(company_id: str, company_update: schemas.CompanyUpdate, db: Session = Depends(get_db)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = company_update.dict(exclude_unset=True)

    if 'service_start_at' in update_data and 'service_ended_at' in update_data:
        if update_data['service_ended_at'] <= update_data['service_start_at']:
            raise HTTPException(status_code=400, detail="Service end date must be after service start date")
    elif 'service_start_at' in update_data:
        if db_company.service_ended_at and db_company.service_ended_at <= update_data['service_start_at']:
            raise HTTPException(status_code=400, detail="Service end date must be after service start date")
    elif 'service_ended_at' in update_data:
        if update_data['service_ended_at'] <= db_company.service_start_at:
            raise HTTPException(status_code=400, detail="Service end date must be after service start date")

    for field, value in update_data.items():
        setattr(db_company, field, value)

    db.commit()
    db.refresh(db_company)
    return db_company



# ------------------ Delete ------------------
@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: str, db: Session = Depends(get_db)):
    db_company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")

    db.delete(db_company)
    db.commit()
    return None



# ------------------ Create Company With Admin ------------------
@router.post("/with-admin", response_model=schemas.CompanyWithAdminResponse, status_code=status.HTTP_201_CREATED)
def create_company_with_admin(
    payload: schemas.CompanyWithAdminCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        if not current_user.agency_id:
            raise HTTPException(status_code=400, detail="User is not linked to any agency")

        db_company = models.Company(
            agency_id=current_user.agency_id,   # ✅ FIX
            company_name=payload.company_name,
            company_email=payload.company_email,
            company_phone=payload.company_phone,
            company_address=payload.company_address,
            company_branch=payload.company_branch,
            description=payload.description,
            service_start_at=payload.service_start_at,
            service_ended_at=payload.service_ended_at,
            status="Active",
        )
        db.add(db_company)
        db.flush()

        raw_password = generate_password()
        hashed_password = hash_password(raw_password)

        db_user = models.User(
            agency_id=current_user.agency_id,   # ✅ FIX
            company_id=db_company.id,
            name=payload.contact_name,
            email=payload.contact_email,
            contact_number=payload.contact_phone,
            password_hash=hashed_password,
            role=models.UserRole.IT_COMPANY,
            is_active=True,
        )
        db.add(db_user)

        db.commit()
        db.refresh(db_company)
        return db_company

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ------------------ Get Company Users ------------------
@router.get("/{company_id}/users", response_model=List[schemas.UserResponse])
def get_company_users(company_id: str, db: Session = Depends(get_db)):
    users = db.query(models.User).filter(models.User.company_id == company_id).all()
    return users
# ------------------ Update Company With Admin users------------------
@router.put("/{company_id}/with-admin", response_model=schemas.CompanyWithAdminResponse)
def update_company_with_admin(
    company_id: str,
    payload: schemas.CompanyWithAdminUpdate,
    db: Session = Depends(get_db),
):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Update company fields
    company_fields = payload.dict(exclude_unset=True, exclude={"contact_name", "contact_email", "contact_phone"})
    for field, value in company_fields.items():
        setattr(company, field, value)

    # Get company admin user (IT company user)
    user = db.query(models.User).filter(
        models.User.company_id == company_id,
        models.User.role == models.UserRole.IT_COMPANY
    ).first()

    if user:
        if payload.contact_name:
            user.name = payload.contact_name
        if payload.contact_email:
            user.email = payload.contact_email
        if payload.contact_phone:
            user.contact_number = payload.contact_phone

    db.commit()
    db.refresh(company)
    return company
