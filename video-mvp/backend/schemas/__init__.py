# backend/schemas/__init__.py
"""
Pydantic schemas for request/response validation.

Video Schemas:
    - VideoUploadRequest/Response
    - VideoResponse
    - VideoStatusResponse
    - VideoListResponse
    - VideoUpdateRequest
    - VideoTechnicalMetadata
    - VideoProcessingInfo
    - VideoAssets

User Schemas:
    - UserResponse
    - UserLoginResponse
    - UserCreate
    - UserUpdate
    - CookiePreferences
    - CookiePreferencesResponse
"""

from schemas.video import (
    PyObjectId as VideoPyObjectId,
    VideoStatus,
    VideoQuality,
    VideoMetadataBase,
    VideoUploadRequest,
    VideoUploadResponse,
    VideoProcessingInfo,
    VideoTechnicalMetadata,
    VideoAssets,
    VideoResponse,
    VideoStatusResponse,
    VideoListResponse,
    VideoUpdateRequest,
    VideoValidationResult
)

from schemas.user import (
    PyObjectId as UserPyObjectId,
    UserRole,
    UserVerificationStatus,
    CookiePreferences,
    CookiePreferencesResponse,
    UserBase,
    UserCreate,
    UserUpdate,
    UserDocument,
    UserResponse,
    UserLoginResponse,
    UserListResponse
)

__all__ = [
    # Video schemas
    "VideoPyObjectId",
    "VideoStatus",
    "VideoQuality",
    "VideoMetadataBase",
    "VideoUploadRequest",
    "VideoUploadResponse",
    "VideoProcessingInfo",
    "VideoTechnicalMetadata",
    "VideoAssets",
    "VideoResponse",
    "VideoStatusResponse",
    "VideoListResponse",
    "VideoUpdateRequest",
    "VideoValidationResult",
    # User schemas
    "UserPyObjectId",
    "UserRole",
    "UserVerificationStatus",
    "CookiePreferences",
    "CookiePreferencesResponse",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserDocument",
    "UserResponse",
    "UserLoginResponse",
    "UserListResponse"
]
