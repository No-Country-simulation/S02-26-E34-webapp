# backend/core/exceptions.py
"""
Custom exceptions and error handlers.

Provides:
- Custom exception classes
- Consistent error response format
- Global exception handlers
- Error logging
"""
import logging
from typing import Any, Dict, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)


# ==================== Custom Exceptions ====================

class AppException(Exception):
    """Base application exception."""
    
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "internal_error"
        self.details = details or {}
        super().__init__(self.message)


class NotFoundException(AppException):
    """Resource not found exception."""
    
    def __init__(
        self,
        message: str = "Resource not found",
        resource: Optional[str] = None
    ):
        details = {"resource": resource} if resource else {}
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="not_found",
            details=details
        )


class BadRequestException(AppException):
    """Bad request exception."""
    
    def __init__(
        self,
        message: str = "Bad request",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="bad_request",
            details=details
        )


class UnauthorizedException(AppException):
    """Unauthorized exception."""
    
    def __init__(
        self,
        message: str = "Unauthorized",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="unauthorized",
            details=details
        )


class ForbiddenException(AppException):
    """Forbidden exception."""
    
    def __init__(
        self,
        message: str = "Forbidden",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="forbidden",
            details=details
        )


class ConflictException(AppException):
    """Conflict exception (e.g., duplicate resource)."""
    
    def __init__(
        self,
        message: str = "Resource conflict",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="conflict",
            details=details
        )


class VideoProcessingException(AppException):
    """Video processing exception."""
    
    def __init__(
        self,
        message: str = "Video processing failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="processing_error",
            details=details
        )


class StorageException(AppException):
    """Storage service exception."""
    
    def __init__(
        self,
        message: str = "Storage operation failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="storage_error",
            details=details
        )


# ==================== Exception Handlers ====================

def register_exceptions(app: FastAPI) -> None:
    """
    Register global exception handlers.
    
    Args:
        app: FastAPI application
    """
    
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """Handle custom application exceptions."""
        logger.error(
            f"Application error: {exc.error_code} - {exc.message}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "details": exc.details
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": exc.details,
                    "path": request.url.path
                }
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError
    ):
        """Handle request validation errors."""
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(x) for x in error.get("loc", [])),
                "message": error.get("msg"),
                "type": error.get("type")
            })
        
        logger.warning(
            f"Validation error: {errors}",
            extra={"path": request.url.path, "method": request.method}
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed",
                    "details": {
                        "errors": errors
                    },
                    "path": request.url.path
                }
            }
        )
    
    @app.exception_handler(ValidationError)
    async def pydantic_validation_exception_handler(
        request: Request,
        exc: ValidationError
    ):
        """Handle Pydantic validation errors."""
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(x) for x in error.get("loc", [])),
                "message": error.get("msg"),
                "type": error.get("type")
            })
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Response validation failed",
                    "details": {
                        "errors": errors
                    },
                    "path": request.url.path
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Handle unhandled exceptions."""
        logger.error(
            f"Unhandled exception: {type(exc).__name__} - {str(exc)}",
            extra={
                "path": request.url.path,
                "method": request.method
            },
            exc_info=True
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "An unexpected error occurred",
                    "details": {},
                    "path": request.url.path
                }
            }
        )
    
    logger.info("✓ Exception handlers registered")


# ==================== Error Response Models ====================

class ErrorResponse:
    """Standard error response format."""
    
    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        path: Optional[str] = None
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        self.path = path
    
    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
                "path": self.path
            }
        }


class ValidationErrorResponse(ErrorResponse):
    """Validation error response."""
    
    def __init__(
        self,
        errors: list,
        path: Optional[str] = None
    ):
        super().__init__(
            code="validation_error",
            message="Validation failed",
            details={"errors": errors},
            path=path
        )
