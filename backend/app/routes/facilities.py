from fastapi import APIRouter, Depends, Query, Path, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional
import logging

from app.database import get_db
from app.models import Facility, Insurance
from app.schemas import FacilityResponse, InsuranceResponse

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[FacilityResponse])
async def list_facilities(
    db: Session = Depends(get_db),
    name: Optional[str] = Query(None, description="Filter by facility name"),
    insurance_id: Optional[int] = Query(None, description="Filter by insurance provider"),
    include_details: bool = Query(False, description="Include detailed facility information"),
    include_insurances: bool = Query(False, description="Include insurance relationships")
):
    """
    List facilities with optional filtering
    """
    query = db.query(Facility)
    
    # Apply filters
    if name:
        query = query.filter(Facility.name.ilike(f"%{name}%"))
    
    if insurance_id:
        query = query.join(Facility.insurances).filter(Insurance.id == insurance_id)
    
    # Use eager loading for insurance relationships if requested
    if include_insurances:
        query = query.options(joinedload(Facility.insurances))
    
    # Execute query
    facilities = query.all()
    
    return facilities

@router.get("/nearby", response_model=List[FacilityResponse])
async def get_nearby_facilities(
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    radius: float = Query(20.0, description="Search radius in kilometers"),
    include_details: bool = Query(False, description="Include detailed facility information"),
    include_insurances: bool = Query(False, description="Include insurance relationships"),
    db: Session = Depends(get_db)
):
    """
    Find facilities within a specified radius of given coordinates
    """
    # Convert radius from km to degrees (approximate)
    # 1 degree of latitude ≈ 111 km
    degree_radius = radius / 111.0
    
    # Calculate bounding box for initial filtering (optimization)
    min_lat = latitude - degree_radius
    max_lat = latitude + degree_radius
    min_lng = longitude - degree_radius
    max_lng = longitude + degree_radius
    
    # Build query with spatial filter
    query = db.query(Facility).filter(
        and_(
            Facility.latitude >= min_lat,
            Facility.latitude <= max_lat,
            Facility.longitude >= min_lng,
            Facility.longitude <= max_lng
        )
    )
    
    # Use Haversine formula for accurate distance calculation
    # Using func.ST_Distance would be better if using PostGIS
    # This is a simplified approach
    
    # Apply eager loading for insurance relationships if requested
    if include_insurances:
        query = query.options(joinedload(Facility.insurances))
    
    # Execute query
    facilities = query.all()
    
    # Further filter by actual distance using Haversine formula
    nearby_facilities = [
        facility for facility in facilities
        if calculate_distance(latitude, longitude, facility.latitude, facility.longitude) <= radius
    ]
    
    return nearby_facilities

@router.get("/facility/{facility_id}", response_model=FacilityResponse)
async def get_facility_details(
    facility_id: int = Path(..., description="The ID of the facility to retrieve"),
    include_insurances: bool = Query(True, description="Include insurance relationships"),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific facility
    """
    query = db.query(Facility)
    
    # Apply eager loading for insurance relationships if requested
    if include_insurances:
        query = query.options(joinedload(Facility.insurances))
    
    facility = query.filter(Facility.id == facility_id).first()
    
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    return facility

# Helper function to calculate distance using Haversine formula
def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate the distance between two points using the Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371.0  # Earth radius in kilometers
    
    # Convert degrees to radians
    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)
    
    # Differences
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    # Haversine formula
    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    
    return distance

@router.get("/insurances", response_model=List[InsuranceResponse], operation_id="list_facilities_insurances")
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

@router.get("/facility/{facility_id}/insurances", response_model=List[InsuranceResponse], operation_id="get_facility_insurances_by_id")
def get_facility_insurances(facility_id: int, db: Session = Depends(get_db)):
    """Get all insurance providers accepted at a specific facility"""
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility.insurances

@router.get("/insurances/{insurance_id}/facilities", response_model=List[FacilityResponse])
def get_insurance_facilities(insurance_id: int, db: Session = Depends(get_db)):
    """Get all facilities that accept a specific insurance provider"""
    insurance = db.query(Insurance).filter(Insurance.id == insurance_id).first()
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance not found")
    return insurance.facilities