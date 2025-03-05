from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from datetime import timedelta, datetime
import logging
from pydantic import BaseModel
from fastapi.responses import JSONResponse

from app.database import get_db
from app.models import User
from app.schemas import UserRegistration, UserCredentials, TokenResponse, UserResponse, Token
from app.auth import (
    create_access_token, 
    verify_password, 
    get_password_hash,
    authenticate_user
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 30

class LoginRequest(BaseModel):
    username: str
    password: str
    grant_type: Optional[str] = "password"

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    first_name: str
    last_name: str
    id_number: str
    emergency_contact: str
    insurance_details: Optional[str] = None
    sha_details: Optional[str] = None

class UserCredentials(BaseModel):
    email: str
    password: str

    class Config:
        from_attributes = True

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserRegistration, db: Session = Depends(get_db)):
    # Check for existing user with conflicting unique fields
    existing_user = (
        db.query(User)
        .filter(
            (User.email == user.email) | 
            (User.username == user.username) | 
            (User.id_number == user.id_number)
        )
        .first()
    )

    # Raise specific conflict errors
    if existing_user:
        conflict_fields = {
            'email': existing_user.email == user.email,
            'username': existing_user.username == user.username,
            'id_number': existing_user.id_number == user.id_number
        }
        
        for field, is_conflict in conflict_fields.items():
            if is_conflict:
                logger.warning(f"Registration failed: Duplicate {field}")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, 
                    detail={
                        "error": f"DUPLICATE_{field.upper()}",
                        "message": f"{field.capitalize()} is already in use",
                        "field": field
                    }
                )

    # Create new user
    try:
        new_user = User(
            **user.dict(exclude={'password'}),
            password_hash=get_password_hash(user.password),
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"User registered successfully: {new_user.username}")
        
        return UserResponse(**new_user.__dict__)
    
    except SQLAlchemyError as db_error:
        db.rollback()
        logger.error(f"Database commit error: {str(db_error)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "DATABASE_ERROR",
                "message": "Failed to save user to database"
            }
        )

@router.options("/login")
async def auth_options():
    return {"allowed": "POST"}

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        # Authenticate user with the database session
        user = authenticate_user(form_data.username, form_data.password, db)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=access_token_expires
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}"
            }
        }
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.options("/register")
async def register_options():
    return {"allowed": "POST"}

@router.post("/register")
async def register(user_data: RegisterRequest):
    # Registration logic here
    return {"message": "User registered successfully"}