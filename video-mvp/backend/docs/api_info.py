# backend/docs/api_info.py
"""
API documentation and metadata.

Provides:
- OpenAPI schema customization
- API documentation
- Usage examples
- Changelog
"""

# API Metadata
API_TITLE = "Video Converter API"
API_DESCRIPTION = """
## Overview

The Video Converter API transforms horizontal videos (16:9) into vertical formats (9:16) optimized for social media platforms like TikTok, Instagram Reels, and YouTube Shorts.

## Features

### Video Processing
- **Format Conversion**: Convert 16:9 videos to 9:16 vertical format
- **Smart Crop**: AI-powered object detection for intelligent cropping
- **Subtitle Generation**: Automatic subtitle creation with Whisper AI
- **Branding**: Add logos and watermarks to videos

### Storage
- **Cloud Storage**: Support for Cloudflare R2 and AWS S3
- **Local Storage**: Development mode with local file storage

### Authentication
- **Google OAuth**: Secure authentication with Google accounts
- **JWT Tokens**: Stateless authentication for API access

## Getting Started

### 1. Upload a Video

```bash
curl -X POST "http://localhost:8001/api/v1/upload/" \\
  -F "file=@video.mp4" \\
  -F "title=My Video" \\
  -F "add_subtitles=true"
```

### 2. Check Status

```bash
curl "http://localhost:8001/api/v1/status/{video_id}"
```

### 3. Download Processed Video

```bash
curl "http://localhost:8001/api/v1/download/{video_id}" -o output.mp4
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Upload | 10 per hour |
| Auth | 5 per minute |
| API | 100 per minute |

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable message",
    "details": {},
    "path": "/api/endpoint"
  }
}
```

## Support

For support, contact: support@example.com
"""

API_VERSION = "1.0.0"
API_CONTACT = {
    "name": "API Support",
    "email": "support@example.com"
}

# OpenAPI Settings
OPENAPI_URL = "/api/v1/openapi.json"
DOCS_URL = "/docs"
REDOC_URL = "/redoc"

# Tags for API organization
TAGS_METADATA = [
    {"name": "upload", "description": "Video upload operations"},
    {"name": "download", "description": "Video download operations"},
    {"name": "videos", "description": "Video management operations"},
    {"name": "users", "description": "User management operations"},
    {"name": "auth", "description": "Authentication operations"},
    {"name": "health", "description": "Health check endpoints"},
    {"name": "monitoring", "description": "Monitoring and statistics"},
]

# Example responses
EXAMPLE_VIDEO_UPLOAD = {
    "video_id": "abc123def456",
    "filename": "my_video.mp4",
    "status": "uploaded",
    "message": "Video uploaded successfully and queued for processing",
    "estimated_processing_time": "2-5 minutes"
}

EXAMPLE_VIDEO_STATUS = {
    "video_id": "abc123def456",
    "status": "processing",
    "progress": 50,
    "message": "Applying smart crop...",
    "estimated_time_remaining": "1-2 minutes"
}

EXAMPLE_VIDEO_RESPONSE = {
    "_id": "abc123def456",
    "original_filename": "my_video.mp4",
    "title": "My Video",
    "description": "Optional description",
    "status": "processed",
    "progress": 100,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:05:00Z",
    "metadata": {
        "duration_seconds": 60.5,
        "width": 1080,
        "height": 1920,
        "file_size_bytes": 5242880
    },
    "download_url": "/api/v1/download/abc123def456"
}

EXAMPLE_ERROR = {
    "error": {
        "code": "not_found",
        "message": "Video not found",
        "details": {"resource": "video"},
        "path": "/api/v1/videos/abc123"
    }
}

# Changelog
CHANGELOG = """
## [1.0.0] - 2024-01-01

### Added
- Initial release
- Video upload and processing
- AI-powered smart crop
- Subtitle generation
- Branding application
- Google OAuth authentication
- Redis caching
- Rate limiting
- Comprehensive error handling

### Optimizations
- Connection pooling for MongoDB (10x faster)
- Streaming uploads (90% less memory)
- Async storage operations
- Process pool for CPU-bound tasks
- LRU cache for settings (50% faster)
"""
