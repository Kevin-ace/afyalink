from fastapi import APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware

router = APIRouter()

@router.options("/logs")
async def logs_options():
    return {"allowed": "POST"}

@router.post("/logs")
async def log_message(log_data: dict):
    # Your logging logic here
    return {"status": "success"} 