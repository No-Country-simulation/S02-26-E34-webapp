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
from typing import Optional, List, Any

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


# ==================== User Preferences / Social ====================

class UserSettings(BaseModel):
    """User preferences for the platform."""
    language: str = "es"
    theme: str = "dark"
    email_notifications: bool = True
    default_resolution: str = "1080p"
    vertical_format: str = "9:16"
    auto_subtitles: bool = True
    auto_branding: bool = False


class SocialConnection(BaseModel):
    """Single social media connection."""
    connected: bool = False
    username: Optional[str] = None
    display_name: str


class SocialConnections(BaseModel):
    """User social media connections."""
    tiktok: SocialConnection = Field(default_factory=lambda: SocialConnection(display_name="TikTok"))
    instagram: SocialConnection = Field(default_factory=lambda: SocialConnection(display_name="Instagram"))
    youtube: SocialConnection = Field(default_factory=lambda: SocialConnection(display_name="YouTube"))
    facebook: SocialConnection = Field(default_factory=lambda: SocialConnection(display_name="Facebook"))


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
    plan: Optional[str] = None
    settings: Optional[UserSettings] = None
    social_connections: Optional[SocialConnections] = None


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
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    cookie_preferences: Optional[CookiePreferences] = None
    plan: str = "Free"
    settings: UserSettings = Field(default_factory=UserSettings)
    social_connections: SocialConnections = Field(default_factory=SocialConnections)
    
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
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    email: str
    name: str
    picture: Optional[str] = None
    role: UserRole
    verification_status: UserVerificationStatus
    created_at: datetime
    verified_at: Optional[datetime] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    plan: str = "Free"
    settings: UserSettings = Field(default_factory=UserSettings)
    social_connections: SocialConnections = Field(default_factory=SocialConnections)
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "_id": "abc123",
                "email": "user@example.com",
                "name": "John Doe",
                "role": "user",
                "verification_status": "verified",
                "created_at": "2024-01-01T00:00:00Z",
                "is_deleted": False
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
    session_id: Optional[str] = None
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
                "session_id": "4ce014cc-b7f3-4a04-b6f9-d4dc532f0ea4",
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
