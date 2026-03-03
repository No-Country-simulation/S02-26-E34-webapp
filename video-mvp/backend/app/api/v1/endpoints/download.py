# backend/api/v1/endpoints/download.py
"""
Video download and status endpoints.

Features:
- Async database operations
- Repository pattern
- Pydantic schemas for validation
- Proper error handling

Frontend compatibility:
- GET /api/v1/status/{video_id} - Check processing status
- GET /api/v1/download/{video_id} - Download processed video
"""
import logging
import os
from http import HTTPStatus
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Path
from fastapi.responses import FileResponse

from app.core.config import settings
from app.schemas.video import VideoStatusResponse, VideoStatus
from app.repositories.video_repository import VideoRepository
from app.api.dependencies import get_video_repository

logger = logging.getLogger(__name__)

router = APIRouter()


# IMPORTANT: Status endpoint MUST come before download endpoint
# to avoid routing conflicts
@router.get("/status/{video_id}", response_model=VideoStatusResponse)
async def get_processing_status(
    video_id: str = Path(..., description="Video ID to check status"),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    Get video processing status.
    
    Frontend endpoint: GET /api/v1/status/{video_id}
    
    Args:
        video_id: Video ID
        video_repo: Video repository (injected)

    Returns:
        VideoStatusResponse with current status
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


@router.get("/{video_id}")
async def download_video(
    video_id: str = Path(..., description="Video ID to download"),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    Download a processed video.
    
    Frontend endpoint: GET /api/v1/download/{video_id}
    
    Args:
        video_id: Video ID
        video_repo: Video repository (injected)

    Returns:
        FileResponse with the video file

    Raises:
        HTTPException: If video not found or not processed
    """
    video = await video_repo.get_by_id(video_id)

    if not video:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Video not found"
        )

    if video.get("status") != VideoStatus.PROCESSED.value:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=f"Video not processed yet. Current status: {video.get('status')}"
        )

    file_path = video.get("processed_file_path") or video.get("file_path")

    if not file_path:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Processed file path not found"
        )

    # Check if file exists (for local files)
    if not file_path.startswith("s3://") and not os.path.exists(file_path):
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Video file not found on server"
        )

    # Increment view count
    await video_repo.increment_view_count(video_id)

    logger.info(f"Downloading video: {video_id}")

    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=f"converted_{video.get('original_filename', video_id)}.mp4"
    )


def _get_status_message(status: str) -> str:
    """
    Get descriptive message for video status.
    
    Args:
        status: Video status value
        
    Returns:
        Descriptive message
    """
    messages = {
        VideoStatus.UPLOADED.value: "Video uploaded, waiting for processing",
        VideoStatus.PROCESSING.value: "Video is being processed",
        VideoStatus.PROCESSED.value: "Video processed successfully",
        VideoStatus.FAILED.value: "Video processing failed",
        VideoStatus.DELETED.value: "Video has been deleted"
    }
    return messages.get(status, "Unknown status")
