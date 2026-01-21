from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user

router = APIRouter(
    tags=["Companies"]
)

@router.get("/dropdown", response_model=List[schemas.CompanyDropdown])
def get_company_dropdown(agency_id: str, db: Session = Depends(get_db)):
    """
    Get a list of companies for dropdown, filtered by agency_id.
    Returns id, company_name, company_address, and agency_id.
    """
    if not agency_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="agency_id is required"
        )
    
    companies = db.query(models.Company)\
        .filter(models.Company.agency_id == agency_id)\
        .all()
    
    return [{
        "id": company.id, 
        "company_name": company.company_name, 
        "company_address": company.company_address,
        "agency_id": company.agency_id  # Include agency_id in the response
    } for company in companies]

@router.post("/", response_model=schemas.CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company: schemas.CompanyCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if company.service_ended_at and company.service_started_at and company.service_ended_at <= company.service_started_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service end date must be after service start date"
        )
    
    # Create company with agency_id from the current user
    db_company = models.Company(
        **company.dict(exclude={'service_started_at', 'service_ended_at'}),  # Exclude to handle dates separately
        agency_id=current_user.agency_id,  # Set agency_id from current user
        service_started_at=company.service_started_at,  # Handle dates separately
        service_ended_at=company.service_ended_at
    )
    
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/", response_model=List[schemas.CompanyResponse])
def read_companies(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    companies = db.query(models.Company).filter(
        models.Company.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    return companies

@router.get("/{company_id}", response_model=schemas.CompanyResponse)
def read_company(
    company_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    if db_company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return db_company

@router.put("/{company_id}", response_model=schemas.CompanyResponse)
def update_company(
    company_id: str,
    company_update: schemas.CompanyUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    if db_company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    update_data = company_update.dict(exclude_unset=True)
    
    # Validate dates if they are being updated
    if 'service_started_at' in update_data and 'service_ended_at' in update_data:
        if update_data['service_ended_at'] <= update_data['service_started_at']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service end date must be after service start date"
            )
    elif 'service_started_at' in update_data:
        if db_company.service_ended_at and db_company.service_ended_at <= update_data['service_started_at']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service end date must be after service start date"
            )
    elif 'service_ended_at' in update_data:
        if update_data['service_ended_at'] <= db_company.service_started_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Service end date must be after service start date"
            )
    
    for field, value in update_data.items():
        setattr(db_company, field, value)
    
    db.commit()
    db.refresh(db_company)
    return db_company

@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    if db_company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    db.delete(db_company)
    db.commit()
    return None