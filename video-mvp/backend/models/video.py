# backend/models/video.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId
from pydantic import Field
from enum import Enum

# Custom ObjectId field for Pydantic
from pydantic.json_schema import JsonSchemaValue
from typing import Any

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
    def __get_pydantic_json_schema__(cls, core_schema: JsonSchemaValue, handler) -> JsonSchemaValue:
        return handler(core_schema)

# Enum for video status
class VideoStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# MongoDB Document Model
class VideoDocument(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    original_filename: str
    title: str
    original_file_path: str
    processed_file_path: Optional[str] = None
    add_subtitles: bool = False
    add_branding: bool = False
    status: VideoStatus = VideoStatus.UPLOADED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Modelos de Pydantic para la API
class VideoMetadataBase(BaseModel):
    original_filename: str
    title: str
    original_file_path: str
    add_subtitles: bool = False
    add_branding: bool = False

class VideoMetadataCreate(VideoMetadataBase):
    pass

class VideoMetadataUpdate(BaseModel):
    status: Optional[VideoStatus] = None
    processed_file_path: Optional[str] = None

class VideoMetadata(VideoMetadataBase):
    id: str
    processed_file_path: Optional[str] = None
    status: VideoStatus = VideoStatus.UPLOADED
    created_at: Optional[datetime] = None

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class VideoStatusResponse(BaseModel):
    video_id: str
    status: str
    message: str
    download_url: Optional[str] = None