from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import math
import logging

from app.database import get_db
from app.models import Facility, Service, Insurance
from app.schemas import FacilityResponse

logger = logging.getLogger(__name__)

router = APIRouter()

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    return c * r

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
    Uses Haversine formula for distance calculation.
    """
    try:
        # Base query to filter facilities within the radius
        query = db.query(Facility)
        
        # Optional service filtering
        if services:
            query = query.join(Facility.services).filter(Service.name.in_(services))
        
        # Optional insurance filtering
        if insurance_provider:
            query = query.join(Facility.insurances).filter(
                Insurance.provider_name == insurance_provider
            )
        
        # Collect all facilities and filter by distance
        all_facilities = query.all()
        
        # Filter and calculate distances
        nearby_facilities = [
            facility for facility in all_facilities
            if haversine_distance(latitude, longitude, facility.latitude, facility.longitude) <= radius
        ]
        
        # Sort facilities by distance
        nearby_facilities.sort(
            key=lambda f: haversine_distance(latitude, longitude, f.latitude, f.longitude)
        )
        
        # Limit to top 10 recommendations
        recommendations = nearby_facilities[:10]
        
        if not recommendations:
            raise HTTPException(
                status_code=404, 
                detail="No facilities found within the specified radius"
            )
        
        return recommendations
    
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while processing recommendations"
        )