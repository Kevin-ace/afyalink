import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.routes import auth_routes, facilities_router, service_routes, insurance_routes, recommendation_routes
from app.database import engine
from app.models import Base
import logging
import logging.handlers
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

def setup_logging():
    # Ensure logs directory exists
    log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            # Console Handler
            logging.StreamHandler(),
            
            # Rotating File Handler
            logging.handlers.RotatingFileHandler(
                os.path.join(log_dir, 'app.log'),
                maxBytes=10*1024*1024,  # 10 MB
                backupCount=5,
                encoding='utf-8'
            )
        ]
    )

    # Set logging levels for specific libraries to reduce noise
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('alembic').setLevel(logging.WARNING)
    logging.getLogger('uvicorn').setLevel(logging.WARNING)

# Call logging setup
setup_logging()

app = FastAPI(
    title="Afyalink",
    description="Geolocation Health Facility Management System",
    version="0.1.0"
)

# Get allowed origins from environment
allowed_origins = os.getenv('ALLOWED_ORIGINS', '["http://localhost:5000"]')
origins = eval(allowed_origins)

# More robust CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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