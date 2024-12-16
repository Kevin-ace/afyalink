from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional

from app.database import get_db
from app.models import Facility, Insurance
from app.schemas import FacilityResponse, InsuranceResponse

router = APIRouter(prefix="/facilities", tags=["Facilities"])

@router.get("/", response_model=List[FacilityResponse])
def list_facilities(
    db: Session = Depends(get_db),
    name: Optional[str] = Query(None, description="Filter facilities by name"),
    insurance: Optional[str] = Query(None, description="Filter facilities by insurance provider"),
    min_latitude: Optional[float] = Query(None, description="Minimum latitude"),
    max_latitude: Optional[float] = Query(None, description="Maximum latitude"),
    min_longitude: Optional[float] = Query(None, description="Minimum longitude"),
    max_longitude: Optional[float] = Query(None, description="Maximum longitude"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    """
    Retrieve facilities with advanced filtering and pagination
    
    Supports filtering by:
    - Name (partial match)
    - Insurance provider
    - Geographic bounds
    """
    query = db.query(Facility)
    
    # Name filtering (case-insensitive)
    if name:
        query = query.filter(Facility.name.ilike(f"%{name}%"))
    
    # Insurance filtering
    if insurance:
        query = query.join(Facility.insurances).filter(
            Insurance.name.ilike(f"%{insurance}%")
        )
    
    # Geographic bounds filtering
    if min_latitude is not None:
        query = query.filter(Facility.latitude >= min_latitude)
    if max_latitude is not None:
        query = query.filter(Facility.latitude <= max_latitude)
    if min_longitude is not None:
        query = query.filter(Facility.longitude >= min_longitude)
    if max_longitude is not None:
        query = query.filter(Facility.longitude <= max_longitude)
    
    # Pagination
    total_count = query.count()
    facilities = query.limit(limit).offset(offset).all()
    
    return facilities

@router.get("/nearby", response_model=List[FacilityResponse])
def find_nearby_facilities(
    latitude: float = Query(..., description="Latitude of reference point"),
    longitude: float = Query(..., description="Longitude of reference point"),
    radius: float = Query(10, ge=1, le=100, description="Radius in kilometers"),
    db: Session = Depends(get_db)
):
    """
    Find facilities within a specified radius using PostGIS
    
    Uses spherical distance calculation for accurate geospatial search
    """
    # Convert radius to meters
    radius_meters = radius * 1000
    
    # Use PostGIS ST_DWithin for efficient geospatial search
    nearby_facilities = (
        db.query(Facility)
        .filter(
            func.ST_DWithin(
                Facility.location, 
                func.ST_MakePoint(longitude, latitude), 
                radius_meters
            )
        )
        .all()
    )
    
    return nearby_facilities

@router.get("/insurances", response_model=List[InsuranceResponse])
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

@router.get("/facility/{facility_id}", response_model=FacilityResponse)
def get_facility_details(
    facility_id: int, 
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific facility
    """
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    return facility

@router.get("/insurance/{insurance_id}", response_model=InsuranceResponse)
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