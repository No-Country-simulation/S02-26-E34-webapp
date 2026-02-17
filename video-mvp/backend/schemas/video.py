# backend/schemas/video.py
"""
Pydantic schemas for video operations.

Optimized for:
- FastAPI request/response validation
- MongoDB ObjectId handling
- Type safety
- JSON serialization
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field, field_validator, ConfigDict
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

class VideoStatus(str, Enum):
    """Video processing status."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    DELETED = "deleted"


class VideoQuality(str, Enum):
    """Video quality levels."""
    LOW = "low"  # 480p
    MEDIUM = "medium"  # 720p
    HIGH = "high"  # 1080p
    ULTRA = "ultra"  # 4K


# ==================== Video Metadata Schemas ====================

class VideoMetadataBase(BaseModel):
    """Base schema for video metadata."""
    
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, max_length=50)
    tags: List[str] = Field(default_factory=list)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "My Video",
                "description": "A great video",
                "category": "entertainment",
                "tags": ["fun", "awesome"]
            }
        }
    )


class VideoUploadRequest(BaseModel):
    """Request schema for video upload."""
    
    title: Optional[str] = Field(None, max_length=255)
    add_subtitles: bool = False
    add_branding: bool = False
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "My Video",
                "add_subtitles": True,
                "add_branding": False,
                "category": "entertainment",
                "tags": ["fun"],
                "description": "Optional description"
            }
        }
    )


class VideoUploadResponse(BaseModel):
    """Response schema for video upload."""
    
    video_id: str
    filename: str
    status: VideoStatus
    message: str
    estimated_processing_time: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "video_id": "abc123",
                "filename": "video.mp4",
                "status": "uploaded",
                "message": "Video uploaded successfully",
                "estimated_processing_time": "2-5 minutes"
            }
        }
    )


class VideoProcessingInfo(BaseModel):
    """Video processing information."""
    
    progress: int = Field(0, ge=0, le=100)
    status_message: Optional[str] = None
    ffmpeg_version: Optional[str] = None
    filters_applied: List[str] = Field(default_factory=list)
    encoding_preset: Optional[str] = None
    crf_value: Optional[int] = None


class VideoTechnicalMetadata(BaseModel):
    """Technical metadata for video."""
    
    # File info
    file_size_bytes: int
    mime_type: str = "video/mp4"
    duration_seconds: float
    
    # Video stream
    width: int
    height: int
    display_aspect_ratio: Optional[str] = None
    frame_rate: Optional[float] = None
    codec_name: Optional[str] = None
    profile: Optional[str] = None
    bitrate_kbps: Optional[int] = None
    color_space: Optional[str] = None
    
    # Audio stream
    has_audio: bool = True
    audio_codec: Optional[str] = None
    audio_sample_rate: Optional[int] = None
    audio_channels: Optional[int] = None
    audio_bitrate_kbps: Optional[int] = None
    
    # Quality
    quality_score: Optional[float] = Field(None, ge=0, le=100)
    is_corrupted: bool = False


class VideoAssets(BaseModel):
    """Video asset paths."""
    
    thumbnail_path: Optional[str] = None
    thumbnail_width: Optional[int] = None
    thumbnail_height: Optional[int] = None
    preview_gif_path: Optional[str] = None
    processed_file_path: Optional[str] = None


class VideoResponse(BaseModel):
    """Complete video response schema."""
    
    id: str = Field(..., alias="_id")
    original_filename: str
    title: str
    description: Optional[str] = None
    status: VideoStatus
    progress: int = Field(0, ge=0, le=100)
    status_message: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Optional fields
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    user_id: Optional[str] = None
    
    # Technical metadata (optional)
    metadata: Optional[VideoTechnicalMetadata] = None
    
    # Processing info (optional)
    processing: Optional[VideoProcessingInfo] = None
    
    # Assets (optional)
    assets: Optional[VideoAssets] = None
    
    # URLs (populated when available)
    download_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "_id": "abc123",
                "original_filename": "video.mp4",
                "title": "My Video",
                "status": "processed",
                "progress": 100,
                "created_at": "2024-01-01T00:00:00Z",
                "download_url": "/api/v1/download/abc123"
            }
        }
    )


class VideoStatusResponse(BaseModel):
    """Video status response schema."""
    
    video_id: str
    status: VideoStatus
    progress: int = Field(0, ge=0, le=100)
    message: str
    download_url: Optional[str] = None
    estimated_time_remaining: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "video_id": "abc123",
                "status": "processing",
                "progress": 50,
                "message": "Applying smart crop...",
                "estimated_time_remaining": "1-2 minutes"
            }
        }
    )


class VideoListResponse(BaseModel):
    """Paginated video list response."""
    
    videos: List[VideoResponse]
    total: int
    page: int = 1
    page_size: int = 20
    has_more: bool = False
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "videos": [],
                "total": 100,
                "page": 1,
                "page_size": 20,
                "has_more": True
            }
        }
    )


class VideoUpdateRequest(BaseModel):
    """Request schema for updating video metadata."""
    
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, max_length=50)
    tags: Optional[List[str]] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Updated Title",
                "description": "Updated description",
                "category": "new-category",
                "tags": ["new", "tags"]
            }
        }
    )


# ==================== Validation Helpers ====================

class VideoValidationResult(BaseModel):
    """Video validation result."""
    
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    quality_score: float = Field(0, ge=0, le=100)
