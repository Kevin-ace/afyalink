import sys
import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.routes import auth_routes, facilities_router, service_routes, insurance_routes, recommendation_routes, facilities
from app.routes.insurance_routes import router as insurance_router
from app.database import engine
from app.models import Base

# Setup logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Afyalink",
    description="Geolocation Health Facility Management System",
    version="0.1.0"
)

# Create all database tables
Base.metadata.create_all(bind=engine)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:63342",  # Your frontend origin
        "http://127.0.0.1:63342",
        "http://localhost:3000",
        "http://localhost:8000",    # Backend itself
        "*"  # Allow all origins for testing
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"],
    max_age=600  # Cache preflight response for 10 minutes
)

# Include route routers
app.include_router(auth_routes, prefix="/auth", tags=["Authentication"])
app.include_router(facilities_router, prefix="/facilities", tags=["Facilities"])
app.include_router(service_routes, prefix="/services", tags=["Services"])
app.include_router(insurance_routes, prefix="/insurances", tags=["Insurances"])
app.include_router(recommendation_routes, prefix="/recommendations", tags=["Recommendations"])
app.include_router(facilities.router, prefix="/facilities")
app.include_router(insurance_router, prefix="/facilities", tags=["Insurances"])

@app.get("/")
async def root():
    return {"message": "Welcome to Afyalink"}

@app.get("/health-facilities-csv")
async def get_health_facilities_csv():
    """
    Endpoint to serve the Health_facilities.csv file
    """
    csv_path = os.path.join(os.path.dirname(__file__), 'Health_facilities.csv')
    
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    return FileResponse(
        path=csv_path, 
        media_type='text/csv', 
        filename='Health_facilities.csv'
    )

@app.get("/insuarance-csv")
async def get_insurance_csv():
    """
    Endpoint to serve the insuarance.csv file
    """
    csv_path = os.path.join(os.path.dirname(__file__), 'insuarance.csv')
    
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    return FileResponse(
        path=csv_path, 
        media_type='text/csv', 
        filename='insuarance.csv'
    )