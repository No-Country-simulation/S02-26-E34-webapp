from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId
from pydantic import Field
from enum import Enum


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.str_schema(),
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class UserVerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class CookiePreferences(BaseModel):
    necessary: bool = True
    preferences: bool = False
    analytics: bool = False
    marketing: bool = False
    updated_at: Optional[datetime] = None


# Modelo para el documento de usuario en MongoDB
class UserDocument(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    google_id: str = Field(..., unique=True)  # ID único de Google OAuth
    email: str = Field(..., unique=True)
    name: str
    picture: Optional[str] = None  # URL de la imagen de perfil de Google
    role: UserRole = UserRole.USER
    verification_status: UserVerificationStatus = UserVerificationStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    cookie_preferences: Optional[CookiePreferences] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Modelos para la API
class UserCreate(BaseModel):
    google_id: str
    email: str
    name: str
    picture: Optional[str] = None


class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    verification_status: Optional[UserVerificationStatus] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str]
    role: UserRole
    verification_status: UserVerificationStatus
    created_at: datetime
    verified_at: Optional[datetime]

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UserLoginResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: UserRole
    verification_status: UserVerificationStatus
    access_token: str
    token_type: str = "bearer"


class CookiePreferencesResponse(BaseModel):
    necessary: bool
    preferences: bool
    analytics: bool
    marketing: bool
    updated_at: Optional[datetime] = None