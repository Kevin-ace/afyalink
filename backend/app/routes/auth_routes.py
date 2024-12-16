from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated

from app.database import get_db
from app.models import User
from app.schemas import UserRegistration, UserCredentials, TokenResponse
from app.auth import (
    create_access_token, 
    verify_password, 
    get_password_hash
)

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register_user(
    user_data: UserRegistration, 
    db: Session = Depends(get_db)
):
    """
    User registration endpoint
    """
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | 
        (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Username or email already registered"
        )
    
    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate access token
    access_token = create_access_token(
        data={"sub": str(new_user.id)}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=TokenResponse)
async def user_login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    User login endpoint
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Generate access token
    access_token = create_access_token(
        data={"sub": str(user.id)}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}