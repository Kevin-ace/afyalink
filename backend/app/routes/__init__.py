from fastapi import APIRouter

from .auth_routes import router as auth_routes
from .service_routes import router as service_routes
from .insurance_routes import router as insurance_routes
from .recommendation_routes import router as recommendation_routes
from .facilities import router as facilities_router

# You can add additional route initialization or configuration here if needed

router = APIRouter()

# Include all routers
router.include_router(auth_routes, prefix="/auth")
router.include_router(service_routes, prefix="/services")
router.include_router(insurance_routes, prefix="/insurances")
router.include_router(recommendation_routes, prefix="/recommendations")
router.include_router(facilities_router, prefix="/facilities")
