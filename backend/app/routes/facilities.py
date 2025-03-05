from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
import logging

from app.database import get_db
from app.models import Facility, Insurance
from app.schemas import FacilityResponse, InsuranceResponse

logger = logging.getLogger(__name__)

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
        query = query.filter(Facility.facility_name.ilike(f"%{name}%"))
    
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

@router.get("/nearby")
async def get_nearby_facilities(
    latitude: float,
    longitude: float,
    radius: float = 20,
    db: Session = Depends(get_db)
):
    """Get facilities near a specific location"""
    try:
        # Basic distance calculation using latitude and longitude
        facilities = (
            db.query(Facility)
            .filter(
                Facility.latitude.isnot(None),
                Facility.longitude.isnot(None)
            )
            .all()
        )

        # Filter facilities within radius
        nearby_facilities = []
        for facility in facilities:
            # Calculate distance using Haversine formula
            distance = calculate_distance(
                float(latitude),
                float(longitude),
                float(facility.latitude),
                float(facility.longitude)
            )
            if distance <= radius:
                facility_dict = {
                    "id": facility.id,
                    "facility_name": facility.facility_name,
                    "facility_type": facility.facility_type,
                    "latitude": float(facility.latitude),
                    "longitude": float(facility.longitude),
                    "location": facility.location,
                    "district": facility.district,
                    "distance": round(distance, 2)
                }
                nearby_facilities.append(facility_dict)

        return nearby_facilities

    except Exception as e:
        logger.error(f"Error fetching nearby facilities: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching nearby facilities: {str(e)}"
        )

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in kilometers

    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    distance = R * c
    return distance

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

# Example Flask endpoint
@router.route('/facilities/facilities')
def get_facilities():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    # Implement logic to filter facilities based on lat and lng
    facilities = filter_facilities_by_location(lat, lng)
    return jsonify(facilities)