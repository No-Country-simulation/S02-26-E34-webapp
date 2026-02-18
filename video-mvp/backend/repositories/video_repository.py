# backend/repositories/video_repository.py
"""
Video repository for MongoDB data access.

Implements repository pattern for:
- Clean separation of concerns
- Reusable database operations
- Easy testing with mocks
- Consistent error handling
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from bson.errors import InvalidId

from schemas.video import VideoStatus

logger = logging.getLogger(__name__)


class VideoRepository:
    """
    Repository for video operations.
    
    Usage:
        repo = VideoRepository(db)
        video = await repo.get_by_id(video_id)
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize video repository.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db.videos
    
    async def get_by_id(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Get video by ID.
        
        Args:
            video_id: Video ID (string or ObjectId)
        
        Returns:
            Video document or None if not found
        """
        try:
            # Try as ObjectId first, then as string
            try:
                obj_id = ObjectId(video_id)
                return await self.collection.find_one({"_id": obj_id})
            except (InvalidId, TypeError):
                return await self.collection.find_one({"_id": video_id})
        except Exception as e:
            logger.error(f"Error getting video {video_id}: {e}")
            return None
    
    async def exists(self, video_id: str) -> bool:
        """
        Check if video exists.
        
        Args:
            video_id: Video ID
        
        Returns:
            True if exists, False otherwise
        """
        doc = await self.get_by_id(video_id)
        return doc is not None
    
    async def create(self, video_data: Dict[str, Any]) -> str:
        """
        Create new video record.
        
        Args:
            video_data: Video data dictionary
        
        Returns:
            Created video ID
        
        Raises:
            Exception: If creation fails
        """
        try:
            # Add timestamps
            video_data["created_at"] = datetime.utcnow()
            video_data["updated_at"] = datetime.utcnow()
            video_data.setdefault("status", VideoStatus.UPLOADED.value)
            video_data.setdefault("progress", 0)
            
            result = await self.collection.insert_one(video_data)
            logger.info(f"Created video: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating video: {e}")
            raise
    
    async def update(self, video_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update video record.
        
        Args:
            video_id: Video ID
            update_data: Fields to update
        
        Returns:
            True if updated, False if not found
        """
        try:
            update_data["updated_at"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": video_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating video {video_id}: {e}")
            return False
    
    async def update_status(
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
            True if updated, False if not found
        """
        try:
            update_data = {
                "status": status.value,
                "updated_at": datetime.utcnow()
            }
            
            if progress is not None:
                update_data["progress"] = progress
            if message is not None:
                update_data["status_message"] = message
            
            result = await self.collection.update_one(
                {"_id": video_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating status for {video_id}: {e}")
            return False
    
    async def delete(self, video_id: str) -> bool:
        """
        Delete video record (soft delete).
        
        Args:
            video_id: Video ID
        
        Returns:
            True if deleted, False if not found
        """
        try:
            # Soft delete - mark as deleted
            result = await self.collection.update_one(
                {"_id": video_id},
                {
                    "$set": {
                        "status": VideoStatus.DELETED.value,
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error deleting video {video_id}: {e}")
            return False
    
    async def hard_delete(self, video_id: str) -> bool:
        """
        Permanently delete video record.
        
        Args:
            video_id: Video ID
        
        Returns:
            True if deleted, False if not found
        """
        try:
            result = await self.collection.delete_one({"_id": video_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error hard deleting video {video_id}: {e}")
            return False
    
    async def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        status: Optional[VideoStatus] = None
    ) -> List[Dict[str, Any]]:
        """
        Get videos by user with pagination.
        
        Args:
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum number of records
            status: Optional status filter
        
        Returns:
            List of video documents
        """
        try:
            query = {"user_id": user_id}
            
            if status:
                query["status"] = status.value
            
            # Exclude deleted videos
            query["status"] = {"$ne": VideoStatus.DELETED.value}
            
            cursor = self.collection.find(query)
            cursor.skip(skip).limit(limit)
            cursor.sort("created_at", -1)  # Newest first
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Error getting videos for user {user_id}: {e}")
            return []
    
    async def count_by_user(self, user_id: str) -> int:
        """
        Count videos by user.
        
        Args:
            user_id: User ID
        
        Returns:
            Number of videos
        """
        try:
            return await self.collection.count_documents({
                "user_id": user_id,
                "status": {"$ne": VideoStatus.DELETED.value}
            })
        except Exception as e:
            logger.error(f"Error counting videos for user {user_id}: {e}")
            return 0
    
    async def get_by_status(
        self,
        status: VideoStatus,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get videos by status.
        
        Useful for:
        - Finding failed videos to retry
        - Finding uploaded videos waiting for processing
        
        Args:
            status: Video status
            limit: Maximum number of records
        
        Returns:
            List of video documents
        """
        try:
            cursor = self.collection.find({"status": status.value})
            cursor.limit(limit)
            cursor.sort("created_at", 1)  # Oldest first
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Error getting videos by status {status}: {e}")
            return []
    
    async def get_processing_videos(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get videos currently being processed.
        
        Args:
            limit: Maximum number of records
        
        Returns:
            List of video documents
        """
        return await self.get_by_status(VideoStatus.PROCESSING, limit)
    
    async def get_pending_videos(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get videos waiting for processing.
        
        Args:
            limit: Maximum number of records
        
        Returns:
            List of video documents
        """
        return await self.get_by_status(VideoStatus.UPLOADED, limit)
    
    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search videos by title, description, or tags.
        
        Args:
            query: Search query
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of video documents
        """
        try:
            # Case-insensitive regex search
            search_query = {
                "$or": [
                    {"title": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                    {"tags": {"$regex": query, "$options": "i"}}
                ],
                "status": {"$ne": VideoStatus.DELETED.value}
            }
            
            cursor = self.collection.find(search_query)
            cursor.skip(skip).limit(limit)
            cursor.sort("created_at", -1)
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Error searching videos: {e}")
            return []
    
    async def increment_view_count(self, video_id: str) -> bool:
        """
        Increment video view count.
        
        Args:
            video_id: Video ID
        
        Returns:
            True if updated, False if not found
        """
        try:
            result = await self.collection.update_one(
                {"_id": video_id},
                {
                    "$inc": {"view_count": 1},
                    "$set": {"last_accessed": datetime.utcnow()}
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error incrementing view count for {video_id}: {e}")
            return False
    
    async def get_statistics(self) -> Dict[str, Any]:
        """
        Get video statistics.
        
        Returns:
            Dictionary with statistics
        """
        try:
            pipeline = [
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            result = await self.collection.aggregate(pipeline).to_list(length=10)
            
            stats = {
                "total": await self.collection.count_documents({}),
                "by_status": {item["_id"]: item["count"] for item in result}
            }
            
            return stats
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {"total": 0, "by_status": {}}
