from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Service, Facility
from app.schemas import ServiceCreate, ServiceResponse

router = APIRouter()

@router.get("/", response_model=List[ServiceResponse])
async def list_available_services(db: Session = Depends(get_db)):
    """
    Retrieve a list of all available health services across facilities.
    """
    services = db.query(Service).all()
    return services

@router.get("/facilities", response_model=List[str])
async def get_facilities_by_service(
    service_name: str, 
    db: Session = Depends(get_db)
):
    """
    Find facilities that offer a specific health service.
    """
    service = db.query(Service).filter(Service.name == service_name).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Return facility names for this service
    facility_names = [facility.name for facility in service.facilities]
    return facility_names

@router.post("/", response_model=ServiceResponse)
async def create_service(
    service: ServiceCreate, 
    db: Session = Depends(get_db)
):
    """
    Create a new health service
    """
    new_service = Service(
        name=service.name,
        description=service.description
    )
    
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    
    return new_service