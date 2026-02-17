# backend/api/v1/endpoints/videos.py
"""
Video management endpoints.

Features:
- List videos
- Get video details
- Update video metadata
- Delete videos
- Search videos
"""
import logging
from http import HTTPStatus
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from api.dependencies import (
    get_video_repository,
    get_current_user,
    get_optional_user,
    get_pagination,
    PaginationParams
)
from repositories.video_repository import VideoRepository
from schemas.video import (
    VideoResponse,
    VideoListResponse,
    VideoUpdateRequest,
    VideoStatus
)
from utils.cache import cache_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=VideoListResponse)
async def list_videos(
    pagination: PaginationParams = Depends(get_pagination),
    user: Optional[dict] = Depends(get_optional_user),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    List all videos with pagination.
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status**: Optional status filter
    """
    if user:
        # Authenticated user - get their videos
        videos = await video_repo.get_by_user(
            user["_id"],
            pagination.skip,
            pagination.page_size
        )
        total = await video_repo.count_by_user(user["_id"])
    else:
        # Public - get processed videos only
        videos = await video_repo.get_by_status(
            VideoStatus.PROCESSED,
            pagination.page_size
        )
        total = len(videos)
    
    return VideoListResponse(
        videos=videos,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        has_more=pagination.skip + len(videos) < total
    )


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: str = Path(..., description="Video ID"),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    Get video details by ID.
    """
    video = await video_repo.get_by_id(video_id)
    
    if not video:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Video not found"
        )
    
    if video.get("status") == VideoStatus.DELETED.value:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Video has been deleted"
        )
    
    return video


@router.patch("/{video_id}", response_model=VideoResponse)
async def update_video(
    update_data: VideoUpdateRequest,
    video_id: str = Path(..., description="Video ID"),
    current_user: dict = Depends(get_current_user),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    Update video metadata.
    
    Only the video owner can update metadata.
    """
    video = await video_repo.get_by_id(video_id)
    
    if not video:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Video not found"
        )
    
    # Check ownership
    if video.get("user_id") != str(current_user["_id"]):
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Not authorized to update this video"
        )
    
    # Update metadata
    update_dict = update_data.model_dump(exclude_unset=True)
    if update_dict:
        await video_repo.update(video_id, update_dict)
    
    # Get updated video
    updated_video = await video_repo.get_by_id(video_id)
    return updated_video


@router.delete("/{video_id}")
async def delete_video(
    video_id: str = Path(..., description="Video ID"),
    current_user: dict = Depends(get_current_user),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    Delete a video.
    
    Only the video owner can delete.
    """
    video = await video_repo.get_by_id(video_id)
    
    if not video:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="Video not found"
        )
    
    # Check ownership
    if video.get("user_id") != str(current_user["_id"]):
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Not authorized to delete this video"
        )
    
    # Soft delete
    await video_repo.delete(video_id)
    
    return {"message": "Video deleted successfully"}


@router.get("/search/{query}", response_model=VideoListResponse)
async def search_videos(
    query: str = Path(..., description="Search query"),
    pagination: PaginationParams = Depends(get_pagination),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    Search videos by title, description, or tags.
    """
    videos = await video_repo.search(query, pagination.skip, pagination.page_size)
    
    return VideoListResponse(
        videos=videos,
        total=len(videos),
        page=pagination.page,
        page_size=pagination.page_size,
        has_more=False
    )
