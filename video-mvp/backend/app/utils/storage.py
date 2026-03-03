# backend/utils/storage.py
"""
Cloud storage service (S3/R2) with async support and retry logic.

Features:
- Async file operations
- Automatic retry with exponential backoff
- Presigned URL generation
- Connection pooling
- Simulated mode for development

Performance:
- Non-blocking async uploads/downloads
- Retry logic for transient failures
- Efficient connection reuse
"""
import asyncio
import logging
import os
import shutil
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """
    Cloud storage service with async support.
    
    Supports:
        - Cloudflare R2
        - AWS S3
        - Local simulated mode (development)
    
    Usage:
        await storage.upload_file("local/path.mp4", "remote/path.mp4")
        await storage.download_file("remote/path.mp4", "local/path.mp4")
        url = await storage.get_presigned_url("remote/path.mp4")
    """
    
    def __init__(self):
        self._client = None
        self._bucket_name = None
        self._enabled = False
        self._executor = ThreadPoolExecutor(max_workers=4)
        self._initialize()
    
    def _initialize(self) -> None:
        """Initialize S3/R2 client with optimized config."""
        # Check for R2 credentials
        if (settings.CLOUDFLARE_R2_ENDPOINT_URL and 
            settings.CLOUDFLARE_R2_ACCESS_KEY_ID and 
            settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY):
            
            self._client = boto3.client(
                's3',
                endpoint_url=settings.CLOUDFLARE_R2_ENDPOINT_URL,
                aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
                region_name='auto',
                config=Config(
                    retries={'max_attempts': 3, 'mode': 'standard'},
                    connect_timeout=5,
                    read_timeout=10,
                    max_pool_connections=50
                )
            )
            self._bucket_name = settings.CLOUDFLARE_R2_BUCKET_NAME
            self._enabled = True
            logger.info(f"✓ Storage initialized: Cloudflare R2 ({self._bucket_name})")
            
        # Check for S3 credentials
        elif (settings.AWS_ACCESS_KEY_ID and 
              settings.AWS_SECRET_ACCESS_KEY and 
              settings.AWS_S3_BUCKET_NAME):
            
            self._client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_DEFAULT_REGION,
                config=Config(
                    retries={'max_attempts': 3, 'mode': 'standard'},
                    connect_timeout=5,
                    read_timeout=10,
                    max_pool_connections=50
                )
            )
            self._bucket_name = settings.AWS_S3_BUCKET_NAME
            self._enabled = True
            logger.info(f"✓ Storage initialized: AWS S3 ({self._bucket_name})")
            
        else:
            self._enabled = False
            logger.info("ℹ Storage: Using simulated mode (local files)")
    
    @property
    def client(self):
        """Get S3/R2 client."""
        return self._client
    
    @property
    def bucket_name(self) -> Optional[str]:
        """Get bucket name."""
        return self._bucket_name
    
    @property
    def enabled(self) -> bool:
        """Check if cloud storage is enabled."""
        return self._enabled
    
    async def upload_file(
        self,
        file_path: str,
        object_name: Optional[str] = None
    ) -> bool:
        """
        Upload file to cloud storage (async).
        
        Args:
            file_path: Local file path
            object_name: Remote object name (optional)
        
        Returns:
            True if successful
        """
        if not self._enabled:
            return await self._upload_local(file_path, object_name)
        
        if object_name is None:
            object_name = os.path.basename(file_path)
        
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                self._client.upload_file,
                file_path,
                self._bucket_name,
                object_name
            )
            logger.info(f"Uploaded: {object_name}")
            return True
            
        except ClientError as e:
            logger.error(f"Upload failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Upload error: {e}")
            return False
    
    async def download_file(
        self,
        object_name: str,
        file_path: str
    ) -> bool:
        """
        Download file from cloud storage (async).
        
        Args:
            object_name: Remote object name
            file_path: Local file path
        
        Returns:
            True if successful
        """
        if not self._enabled:
            return await self._download_local(object_name, file_path)
        
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                self._client.download_file,
                self._bucket_name,
                object_name,
                file_path
            )
            logger.info(f"Downloaded: {object_name}")
            return True
            
        except ClientError as e:
            logger.error(f"Download failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Download error: {e}")
            return False
    
    async def delete_file(self, object_name: str) -> bool:
        """
        Delete file from cloud storage (async).
        
        Args:
            object_name: Remote object name
        
        Returns:
            True if successful
        """
        if not self._enabled:
            return await self._delete_local(object_name)
        
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                self._client.delete_object,
                self._bucket_name,
                object_name
            )
            logger.info(f"Deleted: {object_name}")
            return True
            
        except ClientError as e:
            logger.error(f"Delete failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Delete error: {e}")
            return False
    
    async def file_exists(self, object_name: str) -> bool:
        """
        Check if file exists in cloud storage (async).
        
        Args:
            object_name: Remote object name
        
        Returns:
            True if exists
        """
        if not self._enabled:
            return await self._exists_local(object_name)
        
        try:
            loop = asyncio.get_event_loop()
            exists = await loop.run_in_executor(
                self._executor,
                self._client.head_object,
                self._bucket_name,
                object_name
            )
            return exists is not None
            
        except ClientError:
            return False
        except Exception as e:
            logger.error(f"Exists check error: {e}")
            return False
    
    async def get_presigned_url(
        self,
        object_name: str,
        expiration: int = 3600
    ) -> Optional[str]:
        """
        Generate presigned URL for download.
        
        Args:
            object_name: Remote object name
            expiration: URL expiration in seconds (default: 1 hour)
        
        Returns:
            Presigned URL or None
        """
        if not self._enabled:
            return None
        
        try:
            loop = asyncio.get_event_loop()
            url = await loop.run_in_executor(
                self._executor,
                self._client.generate_presigned_url,
                'get_object',
                {
                    'Bucket': self._bucket_name,
                    'Key': object_name
                },
                expiration
            )
            logger.info(f"Generated presigned URL: {object_name}")
            return url
            
        except Exception as e:
            logger.error(f"Presigned URL generation failed: {e}")
            return None
    
    async def get_upload_presigned_url(
        self,
        object_name: str,
        expiration: int = 3600
    ) -> Optional[str]:
        """
        Generate presigned URL for upload.
        
        Args:
            object_name: Remote object name
            expiration: URL expiration in seconds
        
        Returns:
            Presigned URL or None
        """
        if not self._enabled:
            return None
        
        try:
            loop = asyncio.get_event_loop()
            url = await loop.run_in_executor(
                self._executor,
                self._client.generate_presigned_url,
                'put_object',
                {
                    'Bucket': self._bucket_name,
                    'Key': object_name
                },
                expiration
            )
            return url
            
        except Exception as e:
            logger.error(f"Upload presigned URL generation failed: {e}")
            return None
    
    # ==================== Local/Simulated Mode ====================
    
    async def _upload_local(
        self,
        file_path: str,
        object_name: Optional[str] = None
    ) -> bool:
        """Upload file locally (simulated mode)."""
        try:
            if object_name is None:
                object_name = os.path.basename(file_path)
            
            storage_path = settings.TMP_DIR
            dest_path = os.path.join(storage_path, object_name)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            
            # Async file copy
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                shutil.copy2,
                file_path,
                dest_path
            )
            
            logger.info(f"Local upload: {dest_path}")
            return True
            
        except Exception as e:
            logger.error(f"Local upload failed: {e}")
            return False
    
    async def _download_local(
        self,
        object_name: str,
        file_path: str
    ) -> bool:
        """Download file locally (simulated mode)."""
        try:
            storage_path = settings.TMP_DIR
            simulated_path = os.path.join(storage_path, object_name)
            
            if not os.path.exists(simulated_path):
                logger.warning(f"Local file not found: {simulated_path}")
                return False
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                shutil.copy2,
                simulated_path,
                file_path
            )
            
            logger.info(f"Local download: {simulated_path}")
            return True
            
        except Exception as e:
            logger.error(f"Local download failed: {e}")
            return False
    
    async def _delete_local(self, object_name: str) -> bool:
        """Delete file locally (simulated mode)."""
        try:
            storage_path = settings.TMP_DIR
            simulated_path = os.path.join(storage_path, object_name)
            
            if os.path.exists(simulated_path):
                os.remove(simulated_path)
                logger.info(f"Local delete: {simulated_path}")
                return True
            
            logger.warning(f"Local file not found: {simulated_path}")
            return False
            
        except Exception as e:
            logger.error(f"Local delete failed: {e}")
            return False
    
    async def _exists_local(self, object_name: str) -> bool:
        """Check if file exists locally (simulated mode)."""
        storage_path = settings.TMP_DIR
        simulated_path = os.path.join(storage_path, object_name)
        return os.path.exists(simulated_path)
    
    # ==================== Cleanup ====================
    
    def shutdown(self) -> None:
        """Shutdown storage service."""
        if self._executor:
            self._executor.shutdown(wait=False)


# Singleton instance
storage_service = StorageService()