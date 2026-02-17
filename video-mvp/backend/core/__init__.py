# backend/core/__init__.py
"""
Core module.

Contains:
- Exception handling
- Configuration
- Security utilities
- Middleware
"""

from core.exceptions import (
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
