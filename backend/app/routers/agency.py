from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_active_user
from datetime import datetime, timedelta
from pydantic import BaseModel
from enum import Enum
from uuid import UUID
from decimal import Decimal

router = APIRouter(
    tags=["Agency"]
)


@router.put("/plan", status_code=status.HTTP_200_OK)
def update_agency_plan(
    request: schemas.UpdatePlanRequest,
    db: Session = Depends(get_db),
):
    print("Received plan update request:", request)
    agency = db.query(models.Agency).filter(
        models.Agency.id == request.parent_id
    ).first()

    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    agency.status = "Active"
    agency.started_at = datetime.utcnow()

    if request.plan_id == "1m":
        print("1 month plan selected")
        agency.plan = "1Month"
        agency.subscription = "Starter"
        agency.ended_at = datetime.utcnow() + timedelta(days=30)
    elif request.plan_id == "3m":
        print("3 month plan selected")
        agency.plan = "3Month"
        agency.subscription = "Basic"
        agency.ended_at = datetime.utcnow() + timedelta(days=90)
    elif request.plan_id == "6m":
        print("6 month plan selected")
        agency.plan = "6Month"
        agency.subscription = "Standard"
        agency.ended_at = datetime.utcnow() + timedelta(days=180)
    else:
        raise HTTPException(status_code=400, detail="Invalid plan_id")

    db.commit()
    db.refresh(agency)

    return {"message": "Agency plan updated successfully"}