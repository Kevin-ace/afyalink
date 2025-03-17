from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, ForwardRef
from datetime import datetime
import re

# Forward reference to break circular dependency
FacilityBase = ForwardRef('FacilityBase')

# Insurance Schemas
class InsuranceBase(BaseModel):
    id: int
    name: str
    details: str
    notes: Optional[str] = None
    allowed_facilities: Optional[str] = None
    
    class Config:
        from_attributes = True

class InsuranceCreate(InsuranceBase):
    pass

class InsuranceResponse(InsuranceBase):
    # Use string literal for forward reference
    facilities: Optional[List['FacilityBase']] = None

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
    id: int
    facility_name: str
    facility_type: str
    latitude: float
    longitude: float
    # Other fields as needed...
    
    class Config:
        from_attributes = True

class FacilityCreate(FacilityBase):
    pass

class FacilityResponse(FacilityBase):
    # Use string literal for forward reference
    insurances: Optional[List['InsuranceBase']] = None

# Now update the forward references
InsuranceResponse.update_forward_refs()
FacilityResponse.update_forward_refs()

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

class ProfileUpdate(BaseModel):
    phone_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    insurance_details: Optional[str] = None
    sha_details: Optional[str] = None

class ProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    id_number: str
    phone_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    insurance_details: Optional[str] = None
    sha_details: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True