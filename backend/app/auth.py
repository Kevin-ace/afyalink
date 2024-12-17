from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

# Configuration
SECRET_KEY = "your-secret-key-here"  # Replace with a secure, environment-sourced secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

import logging
logger = logging.getLogger(__name__)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its hashed version
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hash a plain password
    """
    return pwd_context.hash(password)

def create_access_token(
    data: dict, 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token with robust error handling and logging
    
    Args:
        data (dict): Payload data to encode in the token
        expires_delta (Optional[timedelta]): Token expiration time
    
    Returns:
        str: Encoded JWT token
    
    Raises:
        HTTPException: If token creation fails
    """
    try:
        # Create a copy of the payload to avoid modifying the original
        to_encode = data.copy()
        
        # Set default expiration if not provided
        if expires_delta is None:
            expires_delta = timedelta(minutes=15)
        
        # Calculate token expiration
        expire = datetime.utcnow() + expires_delta
        to_encode.update({"exp": expire})
        
        # Encode the token
        encoded_jwt = jwt.encode(
            to_encode, 
            SECRET_KEY, 
            algorithm=ALGORITHM
        )
        
        # Log token creation (without sensitive details)
        logger.info(f"Access token created for user: {data.get('sub', 'Unknown')}")
        
        return encoded_jwt
    
    except Exception as e:
        # Comprehensive error logging
        logger.error(f"Token creation error: {str(e)}")
        logger.error(f"Payload details: {list(data.keys())}")
        
        # Raise an HTTP exception with a generic message
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication token generation failed"
        )

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    """
    Get the current authenticated user from a JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if user is None:
        raise credentials_exception
    
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
):
    """
    Get the current active user
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    
    return current_user