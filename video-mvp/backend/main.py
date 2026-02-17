# backend/main.py
"""
Video Converter API - Main Application Entry Point

Optimized with:
- Connection pooling for MongoDB
- Redis caching layer
- Async storage service (S3/R2)
- Process pool for CPU-bound tasks
- Rate limiting middleware
- Request validation middleware
- Structured logging
- Performance monitoring
- Comprehensive error handling
- API versioning (v1)
"""
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import API v1 router
from api.v1 import api_router

# Import database and services
from models.database import database, connect_to_mongo, close_mongo_connection
from config.settings import settings

# Import services for lifecycle management
from utils.cache import cache_service
from utils.storage import storage_service
from utils.executor import get_video_processor_executor, shutdown_video_processor_executor

# Import middleware
from middleware.rate_limiter import RateLimitMiddleware
from middleware.request_validation import RequestValidationMiddleware

# Import exception handling
from core.exceptions import register_exceptions

# Import API documentation
from docs import (
    API_TITLE,
    API_DESCRIPTION,
    API_VERSION,
    API_CONTACT,
    TAGS_METADATA
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

# Silence noisy loggers
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("boto3").setLevel(logging.WARNING)
logging.getLogger("botocore").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events - startup and shutdown."""
    # ==================== Startup ====================
    logger.info("=" * 60)
    logger.info(f"Starting {settings.PROJECT_NAME}")
    logger.info("=" * 60)
    
    try:
        # Connect to MongoDB
        await connect_to_mongo()
        
        # Connect to Redis cache
        await cache_service.connect()
        
        # Initialize process pool for video processing
        executor = get_video_processor_executor(max_workers=4)
        
        logger.info("✓ Application startup complete")
        logger.info("=" * 60)
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    
    yield
    
    # ==================== Shutdown ====================
    logger.info("Shutting down application...")
    
    try:
        # Shutdown process pool
        shutdown_video_processor_executor()
        
        # Disconnect from Redis
        await cache_service.disconnect()
        
        # Disconnect from MongoDB
        await close_mongo_connection()
        
        # Shutdown storage service
        storage_service.shutdown()
        
        logger.info("✓ Application shutdown complete")
        logger.info("=" * 60)
    except Exception as e:
        logger.error(f"Shutdown error: {e}")


app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    contact=API_CONTACT,
    openapi_url="/openapi.json",  # Fixed: Swagger expects this at root
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=TAGS_METADATA
)


# ==================== Middleware ====================

# CORS Middleware (keep for basic CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# Request Validation Middleware
app.add_middleware(
    RequestValidationMiddleware,
    max_size=settings.MAX_FILE_SIZE
)

# Register exception handlers
register_exceptions(app)


# ==================== Routers ====================

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


# ==================== Routes ====================

@app.get("/", tags=["root"])
def read_root():
    """Root endpoint - API information."""
    return {
        "message": f"{settings.PROJECT_NAME} is running!",
        "version": "1.0.0",
        "database": "MongoDB (with connection pooling)",
        "ai_features": {
            "object_detection": "enabled",
            "subtitle_generation": "enabled",
            "branding_application": "enabled"
        },
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        - Application status
        - Database connectivity status
        - AI model configuration
    """
    from config.settings import settings

    db_status = "disconnected"
    db_details = {
        "status": db_status,
        "connection_string": "***",
        "database_name": settings.MONGODB_DATABASE,
        "pool_size": "50 (max)"
    }

    try:
        if database.is_connected:
            await database.client.admin.command("ping")
            db_status = "connected"
            db_details["status"] = db_status
        else:
            db_details["status"] = "not_initialized"
            db_details["message"] = "Database client not initialized"
    except Exception as e:
        db_details["status"] = f"error: {str(e)}"

    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": db_details,
        "ai_config": {
            "yolo_model": settings.YOLO_MODEL_PATH,
            "whisper_model": settings.WHISPER_MODEL_SIZE
        }
    }


@app.get(f"{settings.API_V1_STR}/health", tags=["health"])
async def health_check_api_v1():
    """Health check endpoint (versioned path)."""
    return await health_check()


@app.get("/cache/stats", tags=["monitoring"])
async def get_cache_stats():
    """
    Get Redis cache statistics.
    
    Returns:
        - Connection status
        - Key count
        - Hit/miss statistics
        - Memory usage
    """
    stats = await cache_service.get_stats()
    return stats


@app.get("/storage/status", tags=["monitoring"])
async def get_storage_status():
    """
    Get storage service status.
    
    Returns:
        - Storage type (R2/S3/Local)
        - Bucket name
        - Enabled status
    """
    return {
        "enabled": storage_service.enabled,
        "type": "Cloudflare R2" if settings.CLOUDFLARE_R2_ENDPOINT_URL and storage_service.enabled else
                 "AWS S3" if settings.AWS_S3_BUCKET_NAME and storage_service.enabled else
                 "Local (simulated)",
        "bucket": storage_service.bucket_name,
        "temp_dir": settings.TMP_DIR
    }


# ==================== Main ====================

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {settings.HOST}:{settings.PORT}")
    
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level="info"
    )