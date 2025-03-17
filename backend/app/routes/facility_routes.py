from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from geoalchemy2 import func

from app.database import get_db
from app.models import Facility, Service, Insurance
from app.schemas import FacilityCreate, FacilityResponse, InsuranceResponse

router = APIRouter()

@router.get("/", response_model=List[FacilityResponse])
async def get_facilities(
    db: Session = Depends(get_db),
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[float] = 10,  # Default 10 km radius
    services: Optional[List[str]] = None,
    insurance_providers: Optional[List[str]] = None
):
    """
    Retrieve health facilities based on geolocation, optional services, and insurance providers.
    """
    query = db.query(Facility)
    
    # Geospatial filtering if coordinates provided
    if latitude and longitude:
        # Assuming PostGIS is used, create a point and filter by distance
        point = func.ST_MakePoint(longitude, latitude)
        query = query.filter(
            func.ST_DWithin(
                Facility.location, 
                point, 
                radius * 1000  # Convert km to meters
            )
        )
    
    # Filter by services
    if services:
        query = query.join(Facility.services).filter(Service.name.in_(services))
    
    # Filter by insurance providers
    if insurance_providers:
        query = query.join(Facility.insurances).filter(
            Insurance.provider_name.in_(insurance_providers)
        )
    
    facilities = query.all()
    return facilities

@router.get("/{facility_id}", response_model=FacilityResponse)
async def get_facility_details(
    facility_id: int, 
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific health facility.
    """
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    return facility

@router.post("/", response_model=FacilityResponse)
async def create_facility(
    facility: FacilityCreate, 
    db: Session = Depends(get_db)
):
    """
    Create a new health facility
    """
    # Create facility with location point
    new_facility = Facility(
        name=facility.name,
        description=facility.description,
        address=facility.address,
        phone_number=facility.phone_number,
        email=facility.email,
        location=func.ST_MakePoint(facility.longitude, facility.latitude)
    )
    
    # Add services and insurances if provided
    if facility.services:
        services = db.query(Service).filter(Service.id.in_(facility.services)).all()
        new_facility.services.extend(services)
    
    if facility.insurances:
        insurances = db.query(Insurance).filter(Insurance.id.in_(facility.insurances)).all()
        new_facility.insurances.extend(insurances)
    
    db.add(new_facility)
    db.commit()
    db.refresh(new_facility)
    
    return new_facility

@router.get("/{facility_id}/insurances", response_model=List[InsuranceResponse])
async def get_facility_insurances(
    facility_id: int = Path(..., description="The ID of the facility to retrieve insurances for"),
    db: Session = Depends(get_db)
):
    """
    Get all insurance providers accepted by a specific facility
    """
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    return facility.insurances