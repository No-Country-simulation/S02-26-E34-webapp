"""Core domain package for subject tracking.
Expose main types for external use.
"""
from .dtos import DetectionBox, CropResult, VideoMetadata, SelectionRect, AnalysisRequest, AnalysisResponse
from .detector import Detector
from .mediapipe_detector import MediaPipeDetector
from .calculator import compute_9_16_window
from .stabilizer import Stabilizer
from .pipeline import CoreEngine
from .hybrid_tracker import HybridTrackerEngine

__all__ = [
    "DetectionBox",
    "CropResult",
    "VideoMetadata",
    "SelectionRect",
    "AnalysisRequest",
    "AnalysisResponse",
    "Detector",
    "MediaPipeDetector",
    "compute_9_16_window",
    "Stabilizer",
    "CoreEngine",
    "HybridTrackerEngine",
]
# backend/core/__init__.py
"""
Core module.

Contains:
- Exception handling
- Configuration
- Security utilities
- Middleware
"""

from app.core.exceptions import (
    AppException,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    VideoProcessingException,
    StorageException,
    register_exceptions
)

__all__ = [
    "AppException",
    "NotFoundException",
    "BadRequestException",
    "UnauthorizedException",
    "ForbiddenException",
    "ConflictException",
    "VideoProcessingException",
    "StorageException",
    "register_exceptions"
]
