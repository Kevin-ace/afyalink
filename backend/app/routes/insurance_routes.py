from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import os
import pandas as pd

from app.database import get_db
from app.models import Insurance, Facility
from app.schemas import InsuranceResponse, FacilityResponse

router = APIRouter(prefix="/insurances", tags=["Insurances"])

@router.get("/", response_model=List[InsuranceResponse])
def list_insurances(
    db: Session = Depends(get_db),
    name: Optional[str] = Query(None, description="Filter insurances by name"),
    include_facilities: bool = Query(False, description="Include facilities accepting this insurance")
):
    """
    Retrieve all insurance providers with optional filtering
    """
    query = db.query(Insurance)
    
    if name:
        query = query.filter(Insurance.name.ilike(f"%{name}%"))
    
    if include_facilities:
        query = query.options(joinedload(Insurance.facilities))
    
    insurances = query.all()
    
    # If no insurances found, we don't need the CSV fallback anymore as we're using the DB directly
    if not insurances:
        raise HTTPException(status_code=404, detail="No insurance providers found")
    
    return insurances

@router.get("/{insurance_id}", response_model=InsuranceResponse)
def get_insurance(
    insurance_id: int = Path(..., description="The ID of the insurance to retrieve"),
    include_facilities: bool = Query(False, description="Include facilities accepting this insurance"),
    db: Session = Depends(get_db)
):
    """
    Get details for a specific insurance provider
    """
    query = db.query(Insurance)
    
    if include_facilities:
        query = query.options(joinedload(Insurance.facilities))
    
    insurance = query.filter(Insurance.id == insurance_id).first()
    
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance provider not found")
    
    return insurance

@router.get("/{insurance_id}/facilities", response_model=List[FacilityResponse])
def get_insurance_facilities(
    insurance_id: int = Path(..., description="The ID of the insurance to retrieve facilities for"),
    db: Session = Depends(get_db)
):
    """
    Get all facilities that accept a specific insurance
    """
    insurance = db.query(Insurance).filter(Insurance.id == insurance_id).first()
    
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance provider not found")
    
    return insurance.facilities