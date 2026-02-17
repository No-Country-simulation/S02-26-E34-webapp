# backend/docs/__init__.py
"""
Documentation module.

Provides:
- API metadata
- OpenAPI customization
- Usage examples
- Changelog
"""

from docs.api_info import (
    API_TITLE,
    API_DESCRIPTION,
    API_VERSION,
    API_CONTACT,
    OPENAPI_URL,
    DOCS_URL,
    REDOC_URL,
    TAGS_METADATA,
    EXAMPLE_VIDEO_UPLOAD,
    EXAMPLE_VIDEO_STATUS,
    EXAMPLE_VIDEO_RESPONSE,
    EXAMPLE_ERROR,
    CHANGELOG
)

__all__ = [
    "API_TITLE",
    "API_DESCRIPTION",
    "API_VERSION",
    "API_CONTACT",
    "OPENAPI_URL",
    "DOCS_URL",
    "REDOC_URL",
    "TAGS_METADATA",
    "EXAMPLE_VIDEO_UPLOAD",
    "EXAMPLE_VIDEO_STATUS",
    "EXAMPLE_VIDEO_RESPONSE",
    "EXAMPLE_ERROR",
    "CHANGELOG"
]
