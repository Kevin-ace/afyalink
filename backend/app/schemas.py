from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
from datetime import datetime
import re

# Insurance Schemas
class InsuranceBase(BaseModel):
    name: str
    type: str
    coverage_description: Optional[str] = None

class InsuranceCreate(InsuranceBase):
    pass

class InsuranceResponse(InsuranceBase):
    id: int

    class Config:
        orm_mode = True

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    id_number: str
    emergency_contact: str
    insurance_details: Optional[str] = None
    sha_details: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        orm_mode = True

# Facility Schemas
class FacilityBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: float
    longitude: float
    phone_number: Optional[str] = None
    email: Optional[str] = None

class FacilityCreate(FacilityBase):
    pass

class FacilityResponse(FacilityBase):
    id: int
    insurances: List[InsuranceResponse] = []

    class Config:
        orm_mode = True

# Service Schemas
class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int

    class Config:
        orm_mode = True

# Authentication Schemas
def validate_password(password: str) -> bool:
    """
    Validate password complexity:
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit
    - Contains at least one special character
    """
    if len(password) < 8:
        return False
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False
    
    # Check for at least one special character
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        return False
    
    return True

class UserRegistration(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    id_number: str = Field(..., min_length=5, max_length=20)
    emergency_contact: str
    insurance_details: Optional[str] = Field(
        default=None, 
        description="Optional insurance details",
        max_length=500  
    )
    sha_details: Optional[str] = Field(
        default=None, 
        description="Optional SHA details",
        max_length=500  
    )
    password: str = Field(
        ..., 
        min_length=8, 
        description="Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters"
    )

    @validator('password')
    def validate_password_complexity(cls, password):
        if not validate_password(password):
            raise ValueError(
                "Password must be at least 8 characters long and contain "
                "uppercase, lowercase letters, numbers, and special characters"
            )
        return password

    @validator('emergency_contact')
    def validate_phone_number(cls, phone):
        phone_regex = r'^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$'
        if not re.match(phone_regex, phone):
            raise ValueError("Invalid phone number format")
        return phone

    @validator('insurance_details', 'sha_details', pre=True, always=True)
    def validate_optional_fields(cls, value):
        if value is not None:
            value = value.strip()
            return value if value else None
        return value

    class Config:
        allow_population_by_alias = True

class UserCredentials(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'