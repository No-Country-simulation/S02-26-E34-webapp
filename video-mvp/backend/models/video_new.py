# backend/models/video.py
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId
from pydantic import Field
from enum import Enum
from pydantic import validator
import re


# Custom ObjectId field for Pydantic
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

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler) -> dict:
        return handler(core_schema)


# Enum for video status
class VideoStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    DELETED = "deleted"


# Modelo de video actualizado con todos los campos del modelo propuesto
class VideoMetadata(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    # Metadatos básicos
    filename: str = Field(..., max_length=255)
    original_filename: str = Field(..., max_length=255)
    file_path: str
    file_size_bytes: int
    mime_type: str = "video/mp4"
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="uploaded", pattern="^(uploaded|processing|processed|failed|deleted)$")

    # Metadatos de video (FFmpeg)
    duration_seconds: float
    bitrate_kbps: int
    codec_name: str = "h264"
    codec_long_name: str
    profile: str
    width: int
    height: int
    display_aspect_ratio: str
    pixel_aspect_ratio: str
    frame_rate: float
    color_space: str
    color_primaries: str
    color_transfer: str
    color_range: str

    # Audio stream
    has_audio: bool = True
    audio_codec: Optional[str]
    audio_sample_rate: Optional[int]
    audio_channels: Optional[int]
    audio_bitrate_kbps: Optional[int]
    audio_language: Optional[str]

    # Procesamiento FFmpeg
    ffmpeg_version: str
    processing_options: Dict = Field(default_factory=dict)
    filters_applied: List[str] = Field(default_factory=list)
    encoding_preset: Optional[str]
    crf_value: Optional[int]

    # Calidad y análisis
    quality_score: Optional[float] = Field(None, ge=0, le=100)
    is_corrupted: bool = False
    validation_errors: List[str] = Field(default_factory=list)

    # Thumbnails y previews
    thumbnail_path: Optional[str]
    thumbnail_width: Optional[int]
    thumbnail_height: Optional[int]
    preview_gif_path: Optional[str]

    # Segmentación (para streaming)
    has_segments: bool = False
    segment_duration: Optional[int]
    segment_count: Optional[int]
    segments_path: Optional[str]

    # DRM y seguridad
    is_protected: bool = False
    encryption_type: Optional[str]
    access_control: Dict = Field(default_factory=dict)

    # Estadísticas y uso
    view_count: int = 0
    download_count: int = 0
    last_accessed: Optional[datetime]
    popularity_score: float = 0.0

    # Relaciones y categorización
    user_id: PyObjectId
    category: Optional[str]
    tags: List[str] = Field(default_factory=list)
    description: Optional[str]
    custom_metadata: Dict = Field(default_factory=dict)

    # Control de versiones
    version: int = 1
    parent_video_id: Optional[PyObjectId]
    is_master_copy: bool = True

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime]

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

    @validator('filename')
    def validate_filename(cls, v):
        if not re.match(r'^[\w\-. ]+\.(mp4|mov|avi|mkv|webm|flv|wmv|mpg|mpeg)$', v, re.IGNORECASE):
            raise ValueError('Invalid filename format')
        return v

    @validator('duration_seconds')
    def validate_duration(cls, v):
        if v <= 0:
            raise ValueError('Duration must be positive')
        return v

    @validator('width', 'height')
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimensions must be positive')
        return v


# Modelos de Pydantic para la API
class VideoMetadataBase(BaseModel):
    original_filename: str
    title: str
    original_file_path: str
    add_subtitles: bool = False
    add_branding: bool = False
    category: Optional[str] = None
    tags: List[str] = []
    description: Optional[str] = None


class VideoMetadataCreate(VideoMetadataBase):
    user_id: str  # ID del usuario que sube el video


class VideoMetadataUpdate(BaseModel):
    status: Optional[VideoStatus] = None
    processed_file_path: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    quality_score: Optional[float] = None


class VideoMetadataResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    duration_seconds: float
    width: int
    height: int
    status: str
    created_at: datetime
    thumbnail_path: Optional[str]
    view_count: int
    quality_score: Optional[float]
    user_id: str
    category: Optional[str]
    tags: List[str]

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class VideoStatusResponse(BaseModel):
    video_id: str
    status: str
    message: str
    download_url: Optional[str] = None