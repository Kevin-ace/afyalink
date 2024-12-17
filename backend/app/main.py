from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    auth_routes, 
    service_routes, 
    insurance_routes, 
    recommendation_routes,
    facilities_router
)
from app.database import engine
from app.models import Base
import logging
import logging.handlers
import os

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

# CORS Configuration
origins = [
    "http://localhost:5500",  # Live Server default port
    "http://127.0.0.1:5500",
    "http://localhost:8000",  # Backend server
    "http://127.0.0.1:8000"
]

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