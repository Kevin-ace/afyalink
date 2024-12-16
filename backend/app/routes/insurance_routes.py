from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Insurance, Facility
from app.schemas import InsuranceResponse, FacilityResponse

router = APIRouter(prefix="/insurances", tags=["Insurances"])

@router.get("/", response_model=List[InsuranceResponse])
def list_insurances(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None, description="Filter insurances by type"),
    name: Optional[str] = Query(None, description="Filter insurances by name")
):
    """
    Retrieve insurance providers with optional filtering
    """
    query = db.query(Insurance)
    
    if type:
        query = query.filter(Insurance.type.ilike(f"%{type}%"))
    
    if name:
        query = query.filter(Insurance.name.ilike(f"%{name}%"))
    
    return query.all()

@router.get("/{insurance_id}", response_model=InsuranceResponse)
def get_insurance_details(
    insurance_id: int, 
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific insurance provider
    """
    insurance = db.query(Insurance).filter(Insurance.id == insurance_id).first()
    
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance provider not found")
    
    return insurance

@router.get("/{insurance_id}/facilities", response_model=List[FacilityResponse])
def get_facilities_by_insurance(
    insurance_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    """
    Get facilities covered by a specific insurance provider
    """
    insurance = db.query(Insurance).filter(Insurance.id == insurance_id).first()
    
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance provider not found")
    
    facilities = (
        db.query(Facility)
        .join(Facility.insurances)
        .filter(Insurance.id == insurance_id)
        .limit(limit)
        .offset(offset)
        .all()
    )
    
    return facilities