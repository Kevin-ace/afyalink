from fastapi import FastAPI
from app.routes import (
    auth_routes, 
    service_routes, 
    insurance_routes, 
    recommendation_routes,
    facilities_router
)
from app.database import engine
from app.models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Afyalink",
    description="Geolocation Health Facility Management System",
    version="0.1.0"
)

# Include route routers
app.include_router(auth_routes, prefix="/auth", tags=["Authentication"])
app.include_router(facilities_router, prefix="/facilities", tags=["Facilities"])
app.include_router(service_routes, prefix="/services", tags=["Services"])
app.include_router(insurance_routes, prefix="/insurances", tags=["Insurances"])
app.include_router(recommendation_routes, prefix="/recommendations", tags=["Recommendations"])

@app.get("/")
async def root():
    return {"message": "Welcome to Afyalink"}