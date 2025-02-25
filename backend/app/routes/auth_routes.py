from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Annotated, Optional
from datetime import timedelta, datetime
import logging

from app.database import get_db
from app.models import User
from app.schemas import UserRegistration, UserCredentials, TokenResponse, UserResponse
from app.auth import (
    create_access_token, 
    verify_password, 
    get_password_hash
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

@router.post("/login", response_model=TokenResponse)
async def user_login(
    request: Request,
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(),
    db: Session = Depends(get_db)
):
    # Determine login credentials source
    username = None
    password = None

    # Check if request is JSON
    try:
        content_type = request.headers.get('content-type', '')
        if 'application/json' in content_type.lower():
            json_body = await request.json()
            username = json_body.get('email')
            password = json_body.get('password')
        elif form_data:
            # Fallback to form data
            username = form_data.username
            password = form_data.password
    except Exception as e:
        logger.error(f"Error parsing login request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid login request"
        )

    # Validate credentials
    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )
    
    try:
        user = db.query(User).filter(User.email == username).first()
        
        if not user:
            logger.warning(f"Login attempt with non-existent email: {username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        if not verify_password(password, user.password_hash):
            logger.warning(f"Failed login attempt for email: {username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Generate access token
        access_token = create_access_token(
            data={"sub": str(user.id)}
        )
        
        logger.info(f"User logged in successfully: {user.email}")
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user": UserResponse.from_orm(user)
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )