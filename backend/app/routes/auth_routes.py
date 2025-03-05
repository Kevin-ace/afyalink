from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from datetime import timedelta, datetime
import logging
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import shutil
import os
import aiofiles

from app.database import get_db
from app.models import User
from app.schemas import UserRegistration, UserCredentials, TokenResponse, UserResponse, Token, ProfileUpdate, ProfileResponse
from app.auth import (
    create_access_token, 
    verify_password, 
    get_password_hash,
    authenticate_user,
    get_current_active_user
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configure file upload settings
UPLOAD_DIR = "uploads/avatars"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

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

@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user's profile"""
    return current_user

@router.put("/profile/update", response_model=ProfileResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    try:
        # Update only provided fields
        for field, value in profile_data.dict(exclude_unset=True).items():
            setattr(current_user, field, value)
        
        current_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(current_user)
        
        return current_user
    
    except Exception as e:
        db.rollback()
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Create unique filename
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"avatar_{current_user.id}_{datetime.utcnow().timestamp()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Update user's avatar URL
        avatar_url = f"/uploads/avatars/{filename}"
        current_user.avatar_url = avatar_url
        current_user.updated_at = datetime.utcnow()
        
        db.commit()
        
        return JSONResponse(
            content={"avatar_url": avatar_url},
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Avatar upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )