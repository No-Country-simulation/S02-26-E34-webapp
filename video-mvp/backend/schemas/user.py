# backend/schemas/user.py
"""
Pydantic schemas for user operations.

Optimized for:
- FastAPI request/response validation
- MongoDB ObjectId handling
- Type safety
- JSON serialization
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId


# ==================== Custom ObjectId ====================

class PyObjectId(ObjectId):
    """Custom Pydantic type for MongoDB ObjectId."""
    
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ]),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x),
                when_used='json',
            ),
        )
    
    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    
    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler) -> dict:
        return {"type": "string"}


# ==================== Enums ====================

class UserRole(str, Enum):
    """User role enumeration."""
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"


class UserVerificationStatus(str, Enum):
    """User verification status."""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


# ==================== Cookie Preferences ====================

class CookiePreferences(BaseModel):
    """User cookie preferences."""
    
    necessary: bool = True
    preferences: bool = False
    analytics: bool = False
    marketing: bool = False
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "necessary": True,
                "preferences": False,
                "analytics": True,
                "marketing": False
            }
        }
    )


class CookiePreferencesResponse(BaseModel):
    """Response schema for cookie preferences."""
    
    necessary: bool
    preferences: bool
    analytics: bool
    marketing: bool
    updated_at: Optional[datetime] = None


# ==================== User Schemas ====================

class UserBase(BaseModel):
    """Base user schema."""
    
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    name: str = Field(..., min_length=1, max_length=100)
    picture: Optional[str] = Field(None, pattern=r'^https?://.*')


class UserCreate(UserBase):
    """Schema for creating a user."""
    
    google_id: str = Field(..., min_length=1)


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    
    role: Optional[UserRole] = None
    verification_status: Optional[UserVerificationStatus] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    picture: Optional[str] = None


class UserDocument(BaseModel):
    """User document schema (MongoDB)."""
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    google_id: str = Field(..., unique=True)
    email: str = Field(..., unique=True)
    name: str
    picture: Optional[str] = None
    role: UserRole = UserRole.USER
    verification_status: UserVerificationStatus = UserVerificationStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    cookie_preferences: Optional[CookiePreferences] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "_id": "abc123",
                "email": "user@example.com",
                "name": "John Doe",
                "role": "user",
                "verification_status": "verified"
            }
        }
    )


class UserResponse(BaseModel):
    """User response schema."""
    
    id: str = Field(..., alias="_id")
    email: str
    name: str
    picture: Optional[str] = None
    role: UserRole
    verification_status: UserVerificationStatus
    created_at: datetime
    verified_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "_id": "abc123",
                "email": "user@example.com",
                "name": "John Doe",
                "role": "user",
                "verification_status": "verified",
                "created_at": "2024-01-01T00:00:00Z"
            }
        }
    )


class UserLoginResponse(BaseModel):
    """User login response schema."""
    
    user_id: str
    email: str
    name: str
    role: UserRole
    verification_status: UserVerificationStatus
    access_token: str
    token_type: str = "bearer"
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "abc123",
                "email": "user@example.com",
                "name": "John Doe",
                "role": "user",
                "verification_status": "verified",
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }
    )


class UserListResponse(BaseModel):
    """Paginated user list response."""
    
    users: List[UserResponse]
    total: int
    page: int = 1
    page_size: int = 20
    has_more: bool = False
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "users": [],
                "total": 100,
                "page": 1,
                "page_size": 20,
                "has_more": True
            }
        }
    )
