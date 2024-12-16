from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

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

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

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
class UserRegistration(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserCredentials(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'