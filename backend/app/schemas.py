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
        from_attributes = True  # Updated from orm_mode to from_attributes

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

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    id_number: str
    emergency_contact: str
    insurance_details: Optional[str] = None
    sha_details: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Facility Schemas
class FacilityBase(BaseModel):
    facility_number: int
    facility_name: str
    hmis: Optional[int] = None
    province: Optional[str] = None
    district: Optional[str] = None
    division: Optional[str] = None
    location: Optional[str] = None
    sub_location: Optional[str] = None
    spatial_re: Optional[str] = None
    facility_type: Optional[str] = None
    agency: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    global_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

class FacilityCreate(FacilityBase):
    pass

class FacilityResponse(FacilityBase):
    id: int

    class Config:
        from_attributes = True  # Updated from orm_mode to from_attributes

# Service Schemas
class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int

    class Config:
        from_attributes = True  # Updated from orm_mode to from_attributes

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
    if (len(password) >= 8 and
        re.search(r'[A-Z]', password) and
        re.search(r'[a-z]', password) and
        re.search(r'\d', password) and
        re.search(r'\W', password)):
        return True
    return False

class UserRegistration(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    id_number: str
    emergency_contact: str
    insurance_details: Optional[str] = None
    sha_details: Optional[str] = None
    password: str = Field(..., min_length=8)

    class Config:
        from_attributes = True

class UserCredentials(BaseModel):
    email: str
    password: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str