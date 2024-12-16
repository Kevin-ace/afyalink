from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from geoalchemy2 import func

from app.database import get_db
from app.models import Facility, Service, Insurance
from app.schemas import FacilityResponse

router = APIRouter()

@router.get("/", response_model=List[FacilityResponse])
async def get_facility_recommendations(
    latitude: float, 
    longitude: float, 
    db: Session = Depends(get_db),
    services: Optional[List[str]] = None,
    insurance_provider: Optional[str] = None,
    radius: float = 20  # Default 20 km search radius
):
    """
    Get personalized facility recommendations based on location, services, and insurance.
    """
    # Create point from coordinates
    point = func.ST_MakePoint(longitude, latitude)
    
    # Base query with geospatial filtering
    query = db.query(Facility).filter(
        func.ST_DWithin(Facility.location, point, radius * 1000)
    )
    
    # Optional service filtering
    if services:
        query = query.join(Facility.services).filter(Service.name.in_(services))
    
    # Optional insurance filtering
    if insurance_provider:
        query = query.join(Facility.insurances).filter(
            Insurance.provider_name == insurance_provider
        )
    
    # Order by distance from the point
    query = query.order_by(
        func.ST_Distance(Facility.location, point)
    )
    
    # Limit to top 10 recommendations
    recommendations = query.limit(10).all()
    
    if not recommendations:
        raise HTTPException(
            status_code=404, 
            detail="No facilities found matching your criteria"
        )
    
    return recommendations