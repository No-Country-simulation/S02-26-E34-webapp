# backend/api/v1/__init__.py
"""
API Version 1.

This module contains all v1 API endpoints organized by resource.

Endpoints:
    - /upload - Video upload operations
    - /download - Video download operations  
    - /download/status/{id} - Video status (also available at /status/{id})
    - /videos - Video management operations
    - /users - User management operations
    - /auth - Authentication operations
"""

from fastapi import APIRouter, Path, Depends
from http import HTTPStatus

from api.v1.endpoints import upload, download, videos, users, auth
from schemas.video import VideoStatusResponse, VideoStatus
from repositories.video_repository import VideoRepository
from api.dependencies import get_video_repository
from api.v1.endpoints.download import _get_status_message

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(
    upload.router,
    prefix="/upload",
    tags=["upload"]
)

api_router.include_router(
    download.router,
    prefix="/download",
    tags=["download"]
)

api_router.include_router(
    videos.router,
    prefix="/videos",
    tags=["videos"]
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"]
)

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["auth"]
)

# Frontend compatibility: /status/{video_id} endpoint
# This is the same as /download/status/{video_id} but matches frontend expectations
@api_router.get("/status/{video_id}", response_model=VideoStatusResponse, tags=["status"])
async def status_endpoint(
    video_id: str = Path(..., description="Video ID to check status"),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    Get video processing status.
    
    Frontend compatibility endpoint: GET /api/v1/status/{video_id}
    Also available at: GET /api/v1/download/status/{video_id}
    """
    video = await video_repo.get_by_id(video_id)
    
    if not video:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Video not found"
        )
    
    status_value = video.get("status", VideoStatus.UPLOADED.value)
    progress = video.get("progress", 0)
    message = video.get("status_message", _get_status_message(status_value))
    
    response = VideoStatusResponse(
        video_id=video_id,
        status=status_value,
        progress=progress,
        message=message
    )
    
    # Add download URL if processed
    if status_value == VideoStatus.PROCESSED.value:
        response.download_url = f"/api/v1/download/{video_id}"
    
    # Estimate remaining time if processing
    if status_value == VideoStatus.PROCESSING.value and progress > 0:
        remaining_percent = 100 - progress
        estimated_seconds = int((remaining_percent / progress) * 10)
        if estimated_seconds < 60:
            response.estimated_time_remaining = f"{estimated_seconds} seconds"
        else:
            response.estimated_time_remaining = f"{estimated_seconds // 60} minutes"
    
    return response

__all__ = ["api_router"]
