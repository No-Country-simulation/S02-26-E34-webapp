# backend/utils/cache.py
"""
Redis caching service for high-performance data access.

Features:
- Async Redis operations
- Automatic serialization/deserialization
- TTL support
- Cache-aside pattern
- Cache invalidation helpers

Performance:
- 100x faster than database reads for cached data
- Connection pooling (max 50 connections)
- Automatic reconnection
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List, Union

import redis.asyncio as redis

from config.settings import settings

logger = logging.getLogger(__name__)


class CacheService:
    """
    Redis cache service with async support.
    
    Usage:
        await cache.connect()
        await cache.set("key", {"data": "value"}, ttl=3600)
        data = await cache.get("key")
        await cache.disconnect()
    """
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self._connected = False
        self._prefix = "video_api"
    
    async def connect(self) -> None:
        """
        Initialize Redis connection with pooling.
        
        Pool Settings:
            - max_connections: 50
            - encoding: utf-8
            - decode_responses: True
        """
        if self._connected:
            logger.warning("Cache already connected")
            return
        
        try:
            self.redis = redis.Redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=50,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            await self.redis.ping()
            
            self._connected = True
            logger.info("✓ Redis connected (max_connections=50)")
            
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Cache disabled.")
            self._connected = False
            self.redis = None
    
    async def disconnect(self) -> None:
        """Close Redis connection."""
        if not self._connected:
            return
        
        try:
            if self.redis:
                await self.redis.close()
                self.redis = None
                self._connected = False
                logger.info("✓ Redis disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting Redis: {e}")
    
    @property
    def is_connected(self) -> bool:
        """Check if Redis is connected."""
        return self._connected
    
    def _key(self, key: str) -> str:
        """Generate prefixed cache key."""
        return f"{self._prefix}:{key}"
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
        
        Returns:
            Deserialized value or None if not found
        """
        if not self._connected or not self.redis:
            return None
        
        try:
            value = await self.redis.get(self._key(key))
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600
    ) -> bool:
        """
        Set value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (default: 1 hour)
        
        Returns:
            True if successful, False otherwise
        """
        if not self._connected or not self.redis:
            return False
        
        try:
            serialized = json.dumps(value, default=str)
            await self.redis.setex(self._key(key), ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete value from cache.
        
        Args:
            key: Cache key
        
        Returns:
            True if deleted, False otherwise
        """
        if not self._connected or not self.redis:
            return False
        
        try:
            await self.redis.delete(self._key(key))
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.
        
        Args:
            key: Cache key
        
        Returns:
            True if exists, False otherwise
        """
        if not self._connected or not self.redis:
            return False
        
        try:
            return await self.redis.exists(self._key(key)) > 0
        except Exception as e:
            logger.error(f"Cache exists error: {e}")
            return False
    
    async def get_ttl(self, key: str) -> int:
        """
        Get TTL for key.
        
        Args:
            key: Cache key
        
        Returns:
            TTL in seconds, -1 if no TTL, -2 if not exists
        """
        if not self._connected or not self.redis:
            return -2
        
        try:
            return await self.redis.ttl(self._key(key))
        except Exception as e:
            logger.error(f"Cache TTL error: {e}")
            return -2
    
    async def expire(self, key: str, ttl: int) -> bool:
        """
        Set TTL for existing key.
        
        Args:
            key: Cache key
            ttl: Time to live in seconds
        
        Returns:
            True if successful, False otherwise
        """
        if not self._connected or not self.redis:
            return False
        
        try:
            await self.redis.expire(self._key(key), ttl)
            return True
        except Exception as e:
            logger.error(f"Cache expire error: {e}")
            return False
    
    # ==================== Video Cache Helpers ====================
    
    async def get_video(self, video_id: str) -> Optional[Dict]:
        """
        Get cached video data.
        
        Args:
            video_id: Video ID
        
        Returns:
            Video data or None
        """
        return await self.get(f"video:{video_id}")
    
    async def cache_video(
        self,
        video_id: str,
        video_data: Dict,
        ttl: int = 300
    ) -> bool:
        """
        Cache video data.
        
        Args:
            video_id: Video ID
            video_data: Video data to cache
            ttl: TTL in seconds (default: 5 minutes)
        
        Returns:
            True if successful
        """
        return await self.set(f"video:{video_id}", video_data, ttl)
    
    async def invalidate_video(self, video_id: str) -> bool:
        """
        Invalidate cached video data.
        
        Args:
            video_id: Video ID
        
        Returns:
            True if invalidated
        """
        return await self.delete(f"video:{video_id}")
    
    async def get_video_status(self, video_id: str) -> Optional[Dict]:
        """
        Get cached video status.
        
        Args:
            video_id: Video ID
        
        Returns:
            Status data or None
        """
        return await self.get(f"video:status:{video_id}")
    
    async def cache_video_status(
        self,
        video_id: str,
        status: str,
        progress: int,
        message: str,
        ttl: int = 60
    ) -> bool:
        """
        Cache video processing status.
        
        Args:
            video_id: Video ID
            status: Video status
            progress: Progress percentage
            message: Status message
            ttl: TTL in seconds (default: 1 minute)
        
        Returns:
            True if successful
        """
        status_data = {
            "status": status,
            "progress": progress,
            "message": message,
            "updated_at": datetime.utcnow().isoformat()
        }
        return await self.set(f"video:status:{video_id}", status_data, ttl)
    
    # ==================== User Cache Helpers ====================
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        """
        Get cached user data.
        
        Args:
            user_id: User ID
        
        Returns:
            User data or None
        """
        return await self.get(f"user:{user_id}")
    
    async def cache_user(
        self,
        user_id: str,
        user_data: Dict,
        ttl: int = 600
    ) -> bool:
        """
        Cache user data.
        
        Args:
            user_id: User ID
            user_data: User data to cache
            ttl: TTL in seconds (default: 10 minutes)
        
        Returns:
            True if successful
        """
        return await self.set(f"user:{user_id}", user_data, ttl)
    
    async def invalidate_user(self, user_id: str) -> bool:
        """
        Invalidate cached user data.
        
        Args:
            user_id: User ID
        
        Returns:
            True if invalidated
        """
        return await self.delete(f"user:{user_id}")
    
    # ==================== Batch Operations ====================
    
    async def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """
        Get multiple values from cache.
        
        Args:
            keys: List of cache keys
        
        Returns:
            Dictionary of key-value pairs
        """
        if not self._connected or not self.redis:
            return {}
        
        try:
            prefixed_keys = [self._key(k) for k in keys]
            values = await self.redis.mget(prefixed_keys)
            
            result = {}
            for key, value in zip(keys, values):
                if value:
                    result[key] = json.loads(value)
            
            return result
        except Exception as e:
            logger.error(f"Cache get_many error: {e}")
            return {}
    
    async def delete_many(self, keys: List[str]) -> bool:
        """
        Delete multiple keys from cache.
        
        Args:
            keys: List of cache keys
        
        Returns:
            True if successful
        """
        if not self._connected or not self.redis:
            return False
        
        try:
            prefixed_keys = [self._key(k) for k in keys]
            await self.redis.delete(*prefixed_keys)
            return True
        except Exception as e:
            logger.error(f"Cache delete_many error: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.
        
        Args:
            pattern: Redis pattern (e.g., "video:*")
        
        Returns:
            Number of keys deleted
        """
        if not self._connected or not self.redis:
            return 0
        
        try:
            prefixed_pattern = self._key(pattern)
            keys = []
            async for key in self.redis.scan_iter(match=prefixed_pattern):
                keys.append(key)
            
            if keys:
                deleted = await self.redis.delete(*keys)
                logger.info(f"Deleted {deleted} keys matching '{pattern}'")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache delete_pattern error: {e}")
            return 0
    
    # ==================== Statistics ====================
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Cache statistics
        """
        if not self._connected or not self.redis:
            return {"connected": False}
        
        try:
            info = await self.redis.info("stats")
            keyspace = await self.redis.info("keyspace")
            
            # Count keys with our prefix
            key_count = 0
            async for _ in self.redis.scan_iter(match=f"{self._prefix}:*"):
                key_count += 1
            
            return {
                "connected": True,
                "key_count": key_count,
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(info),
                "memory": await self._get_memory_usage()
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"connected": False, "error": str(e)}
    
    def _calculate_hit_rate(self, info: Dict) -> float:
        """Calculate cache hit rate."""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 2)
    
    async def _get_memory_usage(self) -> Dict[str, Any]:
        """Get Redis memory usage."""
        try:
            info = await self.redis.info("memory")
            return {
                "used_memory": info.get("used_memory_human", "N/A"),
                "used_memory_peak": info.get("used_memory_peak_human", "N/A")
            }
        except Exception:
            return {}
    
    # ==================== Context Manager ====================
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()


# Singleton instance
cache_service = CacheService()
