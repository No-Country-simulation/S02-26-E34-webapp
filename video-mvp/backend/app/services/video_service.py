# backend/services/video_service.py
"""
Video service for business logic operations.

Features:
- Video processing orchestration
- Cache management
- Cross-repository operations
- Business rule enforcement
- Event publishing
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.video_repository import VideoRepository
from app.schemas.video import VideoStatus
from app.utils.cache import cache_service

logger = logging.getLogger(__name__)


class VideoService:
    """
    Service for video business logic.
    
    Usage:
        service = VideoService(db)
        video = await service.get_video(video_id)
        await service.process_video(video_id)
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize video service.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.repository = VideoRepository(db)
    
    async def get_video(self, video_id: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get video with caching.
        
        Args:
            video_id: Video ID
            use_cache: Whether to use cache (default: True)
        
        Returns:
            Video data or None
        """
        # Try cache first
        if use_cache and cache_service.is_connected:
            cached = await cache_service.get_video(video_id)
            if cached:
                logger.debug(f"Cache hit for video: {video_id}")
                return cached
        
        # Get from database
        video = await self.repository.get_by_id(video_id)
        
        if video and cache_service.is_connected:
            # Cache for 5 minutes
            await cache_service.cache_video(video_id, video, ttl=300)
        
        return video
    
    async def get_video_status(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Get video processing status.
        
        Args:
            video_id: Video ID
        
        Returns:
            Status information or None
        """
        video = await self.get_video(video_id)
        
        if not video:
            return None
        
        return {
            "video_id": video_id,
            "status": video.get("status"),
            "progress": video.get("progress", 0),
            "status_message": video.get("status_message"),
            "created_at": video.get("created_at"),
            "updated_at": video.get("updated_at")
        }
    
    async def update_video_status(
        self,
        video_id: str,
        status: VideoStatus,
        progress: Optional[int] = None,
        message: Optional[str] = None
    ) -> bool:
        """
        Update video processing status.
        
        Args:
            video_id: Video ID
            status: New status
            progress: Progress percentage (0-100)
            message: Status message
        
        Returns:
            True if updated
        """
        success = await self.repository.update_status(video_id, status, progress, message)
        
        if success and cache_service.is_connected:
            # Invalidate video cache
            await cache_service.invalidate_video(video_id)
            
            # Cache status for 1 minute
            if progress is not None and message:
                await cache_service.cache_video_status(
                    video_id,
                    status.value,
                    progress,
                    message,
                    ttl=60
                )
        
        return success
    
    async def create_video(self, video_data: Dict[str, Any]) -> str:
        """
        Create new video record.
        
        Args:
            video_data: Video data
        
        Returns:
            Created video ID
        """
        # Validate business rules
        self._validate_video_data(video_data)
        
        video_id = await self.repository.create(video_data)
        
        logger.info(f"Video created: {video_id}")
        return video_id
    
    async def update_video_metadata(
        self,
        video_id: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Update video metadata.
        
        Args:
            video_id: Video ID
            metadata: Metadata to update
        
        Returns:
            True if updated
        """
        # Remove timestamps from metadata (managed automatically)
        metadata.pop("created_at", None)
        metadata.pop("updated_at", None)
        
        success = await self.repository.update(video_id, metadata)
        
        if success and cache_service.is_connected:
            await cache_service.invalidate_video(video_id)
        
        return success
    
    async def delete_video(self, video_id: str, soft_delete: bool = True) -> bool:
        """
        Delete video.
        
        Args:
            video_id: Video ID
            soft_delete: Use soft delete (default: True)
        
        Returns:
            True if deleted
        """
        if soft_delete:
            success = await self.repository.delete(video_id)
        else:
            success = await self.repository.hard_delete(video_id)
        
        if success and cache_service.is_connected:
            await cache_service.invalidate_video(video_id)
        
        return success
    
    async def get_user_videos(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        status: Optional[VideoStatus] = None
    ) -> Dict[str, Any]:
        """
        Get videos by user with pagination.
        
        Args:
            user_id: User ID
            page: Page number
            page_size: Page size
            status: Optional status filter
        
        Returns:
            Paginated video list
        """
        skip = (page - 1) * page_size
        
        videos = await self.repository.get_by_user(user_id, skip, page_size, status)
        total = await self.repository.count_by_user(user_id)
        
        return {
            "videos": videos,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": skip + len(videos) < total
        }
    
    async def search_videos(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Search videos.
        
        Args:
            query: Search query
            page: Page number
            page_size: Page size
        
        Returns:
            Search results
        """
        skip = (page - 1) * page_size
        videos = await self.repository.search(query, skip, page_size)
        
        return {
            "videos": videos,
            "total": len(videos),
            "page": page,
            "page_size": page_size,
            "query": query
        }
    
    async def increment_view_count(self, video_id: str) -> bool:
        """
        Increment video view count.
        
        Args:
            video_id: Video ID
        
        Returns:
            True if incremented
        """
        success = await self.repository.increment_view_count(video_id)
        
        if success and cache_service.is_connected:
            # Invalidate cache to reflect new count
            await cache_service.invalidate_video(video_id)
        
        return success
    
    async def get_statistics(self) -> Dict[str, Any]:
        """
        Get video statistics.
        
        Returns:
            Statistics dictionary
        """
        return await self.repository.get_statistics()
    
    async def get_pending_videos(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get videos pending processing.
        
        Args:
            limit: Maximum number of videos
        
        Returns:
            List of pending videos
        """
        return await self.repository.get_pending_videos(limit)
    
    async def get_processing_videos(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get videos currently processing.
        
        Args:
            limit: Maximum number of videos
        
        Returns:
            List of processing videos
        """
        return await self.repository.get_processing_videos(limit)
    
    def _validate_video_data(self, video_data: Dict[str, Any]) -> None:
        """
        Validate video data against business rules.
        
        Args:
            video_data: Video data to validate
        
        Raises:
            ValueError: If validation fails
        """
        # Check required fields
        required_fields = ["original_filename", "title", "original_file_path"]
        for field in required_fields:
            if field not in video_data:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate title length
        title = video_data.get("title", "")
        if len(title) > 255:
            raise ValueError("Title must be less than 255 characters")
        
        # Validate file size
        file_size = video_data.get("file_size_bytes", 0)
        if file_size <= 0:
            raise ValueError("Invalid file size")
        
        # Validate duration
        duration = video_data.get("duration_seconds", 0)
        if duration <= 0:
            raise ValueError("Invalid duration")
        
        logger.debug(f"Video data validated: {video_data.get('title')}")

    # ==================== Quality Control Methods ====================

    async def update_video_quality_score(self, video_id: str, quality_score: float) -> bool:
        """
        Update video quality score.

        Args:
            video_id: Video ID
            quality_score: Score between 0-100

        Returns:
            True if updated
        """
        if not 0 <= quality_score <= 100:
            logger.warning(f"Quality score out of range (0-100): {quality_score}")
            return False

        return await self.repository.update(
            video_id,
            {"quality_score": quality_score}
        )

    async def add_validation_error(self, video_id: str, error_message: str) -> bool:
        """
        Add validation error to video.

        Args:
            video_id: Video ID
            error_message: Error message

        Returns:
            True if added
        """
        return await self.repository.update(
            video_id,
            {
                "$push": {
                    "validation_errors": {
                        "timestamp": datetime.utcnow(),
                        "error": error_message
                    }
                }
            }
        )

    async def mark_video_as_corrupted(self, video_id: str, error_message: str = "") -> bool:
        """
        Mark video as corrupted.

        Args:
            video_id: Video ID
            error_message: Optional error message

        Returns:
            True if marked
        """
        updates = {"is_corrupted": True}
        if error_message:
            updates["validation_errors"] = {
                "timestamp": datetime.utcnow(),
                "error": error_message
            }
        return await self.repository.update(video_id, updates)

    async def validate_video_completeness(self, video_id: str) -> Dict[str, Any]:
        """
        Validate video has all required metadata.

        Args:
            video_id: Video ID

        Returns:
            Validation result with errors list
        """
        video = await self.repository.get_by_id(video_id)

        if not video:
            return {"valid": False, "errors": ["Video not found"]}

        # Validate required fields
        required_fields = [
            "filename", "original_filename", "file_path", "file_size_bytes",
            "duration_seconds", "width", "height", "codec_name"
        ]

        errors = []
        for field in required_fields:
            if field not in video or video[field] is None:
                errors.append(f"Missing required field: {field}")

        # Validate value ranges
        if video.get("duration_seconds", 0) <= 0:
            errors.append("Invalid duration")

        if video.get("width", 0) <= 0 or video.get("height", 0) <= 0:
            errors.append("Invalid dimensions")

        if video.get("file_size_bytes", 0) <= 0:
            errors.append("Invalid file size")

        return {"valid": len(errors) == 0, "errors": errors, "warnings": []}

    async def calculate_comprehensive_quality_score(self, video_id: str) -> float:
        """
        Calculate comprehensive quality score based on multiple factors.

        Args:
            video_id: Video ID

        Returns:
            Quality score (0-100)
        """
        video = await self.repository.get_by_id(video_id)

        if not video:
            return 0.0

        # Quality factors
        factors = {"resolution": 0.0, "bitrate": 0.0, "duration": 0.0, "audio_quality": 0.0, "corruption": 0.0}

        # Resolution score
        resolution = video.get("width", 0) * video.get("height", 0)
        if resolution >= 3840 * 2160:  # 4K
            factors["resolution"] = 100
        elif resolution >= 1920 * 1080:  # Full HD
            factors["resolution"] = 90
        elif resolution >= 1280 * 720:  # HD
            factors["resolution"] = 75
        elif resolution > 0:
            factors["resolution"] = 50
        else:
            factors["resolution"] = 25

        # Bitrate score
        bitrate = video.get("bitrate_kbps", 0)
        if bitrate >= 5000:
            factors["bitrate"] = 100
        elif bitrate >= 2500:
            factors["bitrate"] = 90
        elif bitrate >= 1000:
            factors["bitrate"] = 75
        elif bitrate >= 500:
            factors["bitrate"] = 50
        else:
            factors["bitrate"] = 25

        # Duration score
        duration = video.get("duration_seconds", 0)
        if 10 <= duration <= 3600:
            factors["duration"] = 100
        elif 5 <= duration < 10 or 3600 < duration <= 7200:
            factors["duration"] = 75
        elif duration > 0:
            factors["duration"] = 50
        else:
            factors["duration"] = 25

        # Audio quality score
        has_audio = video.get("has_audio", False)
        audio_bitrate = video.get("audio_bitrate_kbps", 0)
        if has_audio and audio_bitrate >= 128:
            factors["audio_quality"] = 100
        elif has_audio and audio_bitrate >= 64:
            factors["audio_quality"] = 75
        elif has_audio:
            factors["audio_quality"] = 50
        else:
            factors["audio_quality"] = 25

        # Corruption penalty
        factors["corruption"] = 0 if video.get("is_corrupted", False) else 100

        # Calculate weighted final score
        weights = {"resolution": 0.3, "bitrate": 0.25, "duration": 0.15, "audio_quality": 0.2, "corruption": 0.1}
        final_score = sum(factors[key] * weights[key] for key in factors.keys())

        # Update score in database
        await self.update_video_quality_score(video_id, final_score)

        return final_score

    async def get_quality_report(self, video_id: str) -> Dict[str, Any]:
        """
        Get detailed quality report for video.

        Args:
            video_id: Video ID

        Returns:
            Quality report dictionary
        """
        video = await self.repository.get_by_id(video_id)

        if not video:
            return {"error": "Video not found"}

        comprehensive_score = await self.calculate_comprehensive_quality_score(video_id)
        completeness_validation = await self.validate_video_completeness(video_id)

        return {
            "video_id": str(video["_id"]),
            "filename": video["filename"],
            "comprehensive_quality_score": comprehensive_score,
            "current_quality_score": video.get("quality_score", 0.0),
            "completeness_validation": completeness_validation,
            "is_corrupted": video.get("is_corrupted", False),
            "validation_errors": video.get("validation_errors", []),
            "technical_metrics": {
                "duration_seconds": video.get("duration_seconds", 0),
                "file_size_bytes": video.get("file_size_bytes", 0),
                "width": video.get("width", 0),
                "height": video.get("height", 0),
                "bitrate_kbps": video.get("bitrate_kbps", 0),
                "has_audio": video.get("has_audio", False),
                "audio_bitrate_kbps": video.get("audio_bitrate_kbps", 0)
            }
        }
