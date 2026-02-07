# backend/models/video.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from .database import Base
from pydantic import BaseModel
from typing import Optional
import uuid

# Modelo de SQLAlchemy para la base de datos
class VideoDB(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, index=True)
    original_filename = Column(String, index=True)
    title = Column(String, index=True)
    original_file_path = Column(String)
    processed_file_path = Column(String, nullable=True)
    add_subtitles = Column(Boolean, default=False)
    add_branding = Column(Boolean, default=False)
    status = Column(String, default="uploaded")  # uploaded, processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

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
    status: Optional[str] = None
    processed_file_path: Optional[str] = None

class VideoMetadata(VideoMetadataBase):
    id: str
    processed_file_path: Optional[str] = None
    status: str = "uploaded"
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class VideoStatusResponse(BaseModel):
    video_id: str
    status: str
    message: str
    download_url: Optional[str] = None