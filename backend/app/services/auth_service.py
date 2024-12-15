from app.models import User
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
import re

def validate_email(email):
    """
    Validate email format
    
    Args:
        email (str): Email to validate
    
    Raises:
        ValueError: If email is invalid
    """
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        raise ValueError("Invalid email format")

def validate_password(password):
    """
    Validate password strength
    
    Args:
        password (str): Password to validate
    
    Raises:
        ValueError: If password doesn't meet requirements
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter")
    
    if not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter")
    
    if not re.search(r'\d', password):
        raise ValueError("Password must contain at least one number")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError("Password must contain at least one special character")

def register_user(data):
    """
    Register a new user
    
    Args:
        data (dict): User registration data
    
    Returns:
        tuple: (response_data, status_code)
    
    Raises:
        ValueError: For validation errors
    """
    # Validate input
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    # Validate username
    if not username:
        raise ValueError("Username is required")
    
    # Validate email
    validate_email(email)
    
    # Validate password
    validate_password(password)
    
    # Check for existing user
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        raise ValueError("Username or email already exists")
    
    # Hash password
    hashed_password = generate_password_hash(password)
    
    # Create new user
    try:
        new_user = User(
            username=username, 
            email=email, 
            password=hashed_password
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return {
            'message': 'User registered successfully', 
            'username': new_user.username,
            'email': new_user.email
        }, 201
    
    except Exception as e:
        db.session.rollback()
        raise ValueError(f"Registration failed: {str(e)}")

def login_user(data):
    """
    Authenticate user login
    
    Args:
        data (dict): User login credentials
    
    Returns:
        tuple: (response_data, status_code)
    
    Raises:
        ValueError: For authentication errors
    """
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    # Validate email format
    validate_email(email)
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        raise ValueError("User not found")
    
    # Check password
    if not check_password_hash(user.password, password):
        raise ValueError("Invalid credentials")
    
    # Generate access token
    access_token = create_access_token(identity=user.id)
    
    return {
        'access_token': access_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }, 200
