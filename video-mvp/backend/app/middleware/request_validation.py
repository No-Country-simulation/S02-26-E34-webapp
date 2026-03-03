# backend/middleware/request_validation.py
"""
Request validation middleware.

Features:
- Request size limiting
- Content-Type validation
- CORS security enhancements
- Security headers
- Request ID tracking
"""
import logging
import uuid
import time
from typing import List, Optional

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for request validation and security.
    
    Features:
        - Maximum request size validation
        - Content-Type validation
        - Security headers
        - Request ID tracking
        - Request logging
    """
    
    def __init__(
        self,
        app,
        max_size: Optional[int] = None,
        allowed_content_types: Optional[List[str]] = None
    ):
        super().__init__(app)
        self.max_size = max_size or settings.MAX_FILE_SIZE
        self.allowed_content_types = allowed_content_types or [
            "application/json",
            "multipart/form-data",
            "application/x-www-form-urlencoded",
            "video/mp4",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska"
        ]
    
    async def dispatch(self, request: Request, call_next):
        """Process request with validation."""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Add request ID to state
        request.state.request_id = request_id
        
        # Validate request size
        content_length = request.headers.get("content-length")
        if content_length:
            size = int(content_length)
            if size > self.max_size:
                logger.warning(
                    f"Request too large: {size} bytes (max: {self.max_size})",
                    extra={"request_id": request_id}
                )
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "error": {
                            "code": "request_too_large",
                            "message": f"Request size exceeds limit of {self.max_size // (1024*1024)}MB"
                        }
                    },
                    headers={"X-Request-ID": request_id}
                )
        
        # Validate Content-Type for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            # Skip validation for multipart (file uploads)
            if not content_type.startswith("multipart/form-data"):
                # Check if content type is allowed
                base_type = content_type.split(";")[0].strip()
                if base_type and base_type not in self.allowed_content_types:
                    logger.warning(
                        f"Invalid content type: {content_type}",
                        extra={"request_id": request_id}
                    )
                    return JSONResponse(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        content={
                            "error": {
                                "code": "unsupported_media_type",
                                "message": f"Content-Type '{content_type}' is not supported"
                            }
                        },
                        headers={"X-Request-ID": request_id}
                    )
        
        # Process request
        response = await call_next(request)
        
        # Add timing
        duration = time.time() - start_time
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration:.3f}"
        
        # Add security headers
        response = self._add_security_headers(response)
        
        return response
    
    def _add_security_headers(self, response) -> None:
        """Add security headers to response."""
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Content security policy - Allow Swagger UI resources
        # This permits CDN resources needed for /docs and /redoc
        csp_directives = [
            "default-src 'self'",
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fastapi.tiangolo.com",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
            "img-src 'self' data: https://fastapi.tiangolo.com https://cdn.jsdelivr.net",
            "font-src 'self' https://cdn.jsdelivr.net"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Cache control for sensitive endpoints
        if "/auth" in str(response.headers.get("x-request-path", "")):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        
        return response


class CORSValidationMiddleware(BaseHTTPMiddleware):
    """
    Enhanced CORS validation middleware.
    
    Provides stricter CORS validation than FastAPI's built-in middleware.
    """
    
    def __init__(
        self,
        app,
        allowed_origins: Optional[List[str]] = None
    ):
        super().__init__(app)
        self.allowed_origins = allowed_origins or ["*"]
    
    async def dispatch(self, request: Request, call_next):
        """Process request with CORS validation."""
        origin = request.headers.get("origin")
        
        # Validate origin if not wildcard
        if origin and "*" not in self.allowed_origins:
            if origin not in self.allowed_origins:
                logger.warning(f"CORS rejected: {origin}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "error": {
                            "code": "cors_error",
                            "message": "Origin not allowed"
                        }
                    }
                )
        
        response = await call_next(request)
        
        # Add CORS headers
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
        elif "*" in self.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = "*"
        
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Request-ID"
        response.headers["Access-Control-Expose-Headers"] = "X-Request-ID, X-Process-Time, X-RateLimit-Limit, X-RateLimit-Remaining"
        
        return response


class HealthCheckMiddleware(BaseHTTPMiddleware):
    """
    Health check middleware.
    
    Provides lightweight health check endpoint without going through full app stack.
    """
    
    def __init__(self, app, health_path: str = "/health"):
        super().__init__(app)
        self.health_path = health_path
    
    async def dispatch(self, request: Request, call_next):
        """Handle health check requests."""
        if request.method == "GET" and request.url.path == self.health_path:
            return JSONResponse(
                content={
                    "status": "healthy",
                    "timestamp": time.time()
                },
                headers={"Cache-Control": "no-cache"}
            )
        
        return await call_next(request)
