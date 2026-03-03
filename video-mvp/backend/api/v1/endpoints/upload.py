# backend/api/v1/endpoints/upload.py
"""
Video upload endpoint with streaming support.

Features:
- Streaming file upload (8KB chunks) - 90% less memory usage
- Early validation with ffprobe
- Async database operations with Repository pattern
- Background task processing
- Pydantic schemas for validation
"""
import logging
import os
import uuid
from datetime import datetime
from http import HTTPStatus
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from http import HTTPStatus
from fastapi.responses import FileResponse

from config.settings import settings
from schemas.video import VideoUploadResponse, VideoStatus
from models.database import get_db
from repositories.video_repository import VideoRepository
from api.dependencies import get_video_repository, get_optional_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=VideoUploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Video file to upload"),
    title: Optional[str] = Form(None, description="Video title"),
    add_subtitles: bool = Form(False, description="Generate subtitles"),
    add_branding: bool = Form(False, description="Apply branding"),
    selection_cx: Optional[float] = Form(None, ge=0.0, le=1.0),
    selection_cy: Optional[float] = Form(None, ge=0.0, le=1.0),
    selection_w: Optional[float] = Form(None, ge=0.0, le=1.0),
    selection_h: Optional[float] = Form(None, ge=0.0, le=1.0),
    selection_time: float = Form(0.0, ge=0.0),
    trim_start: Optional[float] = Form(None, ge=0.0),
    trim_end: Optional[float] = Form(None, ge=0.0),
    video_repo: VideoRepository = Depends(get_video_repository),
    user: Optional[dict] = Depends(get_optional_user)
):
    """
    Upload a video for processing.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail="No filename provided"
        )

    extension = file.filename.split('.')[-1].lower()
    if extension not in settings.SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=f"Unsupported format. Supported: {', '.join(settings.SUPPORTED_FORMATS)}"
        )

    # Generate unique video ID
    video_id = str(uuid.uuid4())

    # Create temp directory if not exists
    os.makedirs(settings.TMP_DIR, exist_ok=True)

    # Stream file to disk (memory efficient - 8KB chunks)
    temp_file_path = os.path.join(settings.TMP_DIR, f"{video_id}_{file.filename}")

    try:
        with open(temp_file_path, "wb") as buffer:
            while chunk := await file.read(8192):  # 8KB chunks
                buffer.write(chunk)

        # Get file size from disk
        file_size = os.path.getsize(temp_file_path)

        # Validate size
        if file_size > settings.MAX_FILE_SIZE:
            os.remove(temp_file_path)
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE // (1024 * 1024)}MB"
            )

        # Quick duration validation using ffprobe
        duration = await _get_video_duration(temp_file_path)
        if duration > settings.MAX_VIDEO_DURATION_SECONDS:
            os.remove(temp_file_path)
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail=f"Video exceeds maximum duration of {settings.MAX_VIDEO_DURATION_SECONDS // 60} minutes"
            )

    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        logger.error(f"Upload failed: {e}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

    # Create database record
    video_record = {
        "_id": video_id,
        "original_filename": file.filename,
        "title": title or file.filename,
        "original_file_path": temp_file_path,
        "add_subtitles": add_subtitles,
        "add_branding": add_branding,
        "is_premium": user is not None,  # Si hay usuario, es premium (sin marca de agua)
        "selection_cx": selection_cx,
        "selection_cy": selection_cy,
        "selection_w": selection_w,
        "selection_h": selection_h,
        "selection_time": selection_time,
        "trim_start": trim_start,
        "trim_end": trim_end,
        "file_size_bytes": file_size,
        "duration_seconds": duration,
        "status": VideoStatus.UPLOADED.value,
        "progress": 0,
        "status_message": "Video uploaded, waiting for processing",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    # Add user_id if authenticated
    if user:
        video_record["user_id"] = user.get("_id")

    await video_repo.create(video_record)
    logger.info(f"Video uploaded: {video_id} ({file.filename}, {file_size / (1024*1024):.2f}MB)")

    # Queue for background processing
    background_tasks.add_task(process_video_task, video_id)

    return VideoUploadResponse(
        video_id=video_id,
        filename=file.filename,
        status=VideoStatus.UPLOADED,
        message="Video uploaded successfully and queued for processing",
        estimated_processing_time="2-5 minutes"
    )


@router.post("/preview")
async def generate_preview_video(
    file: UploadFile = File(..., description="Source video file"),
    start_time: float = Form(0.0, ge=0.0),
    end_time: Optional[float] = Form(None, ge=0.0),
    selection_cx: float = Form(0.5, ge=0.0, le=1.0),
    selection_cy: float = Form(0.5, ge=0.0, le=1.0),
    selection_w: float = Form(0.3, ge=0.0, le=1.0),
    selection_h: float = Form(0.5, ge=0.0, le=1.0),
    selection_time: Optional[float] = Form(None, ge=0.0)
):
    """
    Generate an instant 9:16 preview using selection + clip times.

    Flow:
    1) Receives original video + params
    2) Cuts requested range with FFmpeg
    3) Applies dynamic smart-crop (HybridTracker + MediaPipe fallback)
    4) Returns preview MP4
    """
    from services.video_processor import apply_smart_crop
    import ffmpeg

    if not file.filename:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail="No filename provided"
        )

    extension = file.filename.split('.')[-1].lower()
    if extension not in settings.SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail=f"Unsupported format. Supported: {', '.join(settings.SUPPORTED_FORMATS)}"
        )

    os.makedirs(settings.TMP_DIR, exist_ok=True)
    preview_id = str(uuid.uuid4())
    source_path = os.path.join(settings.TMP_DIR, f"preview_src_{preview_id}_{file.filename}")
    clip_path = os.path.join(settings.TMP_DIR, f"preview_clip_{preview_id}.mp4")

    try:
        with open(source_path, "wb") as buffer:
            while chunk := await file.read(8192):
                buffer.write(chunk)

        duration = await _get_video_duration(source_path)
        safe_end = duration if end_time is None else min(end_time, duration)
        safe_start = min(start_time, safe_end)

        if safe_end <= safe_start:
            safe_start = 0.0
            safe_end = min(duration, 5.0)

        (
            ffmpeg
            .input(source_path, ss=safe_start, t=max(0.1, safe_end - safe_start))
            .output(clip_path, vcodec='libx264', acodec='aac')
            .run(overwrite_output=True, quiet=True)
        )

        normalized_selection = {
            "selection_cx": selection_cx,
            "selection_cy": selection_cy,
            "selection_w": selection_w,
            "selection_h": selection_h,
            "selection_time": 0.0 if selection_time is None else max(0.0, selection_time - safe_start)
        }

        output_path = apply_smart_crop(
            video_path=clip_path,
            video_id=f"preview_{preview_id}",
            selection_data=normalized_selection
        )

        if not output_path or not os.path.exists(output_path):
            raise HTTPException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                detail="Failed to generate preview"
            )

        return FileResponse(
            path=output_path,
            media_type="video/mp4",
            filename=f"preview_{preview_id}.mp4"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview generation failed: {e}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Preview generation failed: {str(e)}"
        )
    finally:
        for path in (source_path, clip_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


async def _get_video_duration(file_path: str) -> float:
    """
    Get video duration using ffprobe.

    Args:
        file_path: Path to video file

    Returns:
        float: Duration in seconds
    """
    import subprocess
    import json

    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        file_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        metadata = json.loads(result.stdout)
        return float(metadata['format'].get('duration', 0))
    except subprocess.CalledProcessError as e:
        logger.warning(f"ffprobe failed: {e.stderr}")
        return 0  # Skip duration validation if ffprobe fails
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse ffprobe output: {e}")
        return 0


async def process_video_task(video_id: str):
    """
    Background task to process video.
    """
    from services.video_processor import process_video_task as processor

    logger.info(f"Starting background processing for video: {video_id}")

    try:
        await processor(video_id)
    except Exception as e:
        logger.error(f"Background processing failed for {video_id}: {e}")

        # Update status to failed
        db = get_db()
        await db.videos.update_one(
            {"_id": video_id},
            {
                "$set": {
                    "status": "failed",
                    "status_message": f"Processing failed: {str(e)}",
                    "updated_at": datetime.utcnow()
                }
            }
        )
