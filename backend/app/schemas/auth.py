from pydantic import BaseModel, EmailStr
from typing import Literal, Optional
from datetime import datetime, date
from app.models.user import Role, GenderType


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str


class SignupRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    address: Optional[str] = None
    gender: Optional[GenderType] = None
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    userType: Literal["applicant", "company"]


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserDetail(BaseModel):
    id: int
    name: str
    email: str
    address: Optional[str] = None
    gender: Optional[GenderType] = None
    phone: Optional[str] = None
    role: Role
    created_at: datetime
    updated_at: datetime
    birth_date: Optional[date] = None
    
    class Config:
        from_attributes = True 