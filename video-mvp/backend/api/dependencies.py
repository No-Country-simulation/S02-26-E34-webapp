# backend/api/dependencies.py
"""
FastAPI dependencies for dependency injection.

Provides:
- Database session injection
- Repository injection
- Authentication dependencies
- Pagination helpers
"""
import logging
from datetime import datetime
from typing import Optional, AsyncGenerator

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from config.settings import settings
from models.database import get_db
from repositories.video_repository import VideoRepository
from repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()


# ==================== Database Dependencies ====================

async def get_database() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """
    Get database instance.
    
    Usage:
        db = Depends(get_database)
    """
    async for db in get_db():
        yield db


# ==================== Repository Dependencies ====================

async def get_video_repository(
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> VideoRepository:
    """
    Get video repository instance.
    
    Usage:
        repo: VideoRepository = Depends(get_video_repository)
    """
    return VideoRepository(db)


async def get_user_repository(
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> UserRepository:
    """
    Get user repository instance.
    
    Usage:
        repo: UserRepository = Depends(get_user_repository)
    """
    return UserRepository(db)


# ==================== Authentication Dependencies ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repository)
) -> dict:
    """
    Get current user document.
    
    Usage:
        user_id = Depends(get_current_user_id)
    
    Raises:
        HTTPException: If token is invalid
    """
    try:
        import jwt
        
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = await user_repo.get_by_id(user_id)
        if not user:
            logger.error(f"User not found for ID: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        token_session_id = payload.get("sid")
        if token_session_id:
            persisted_session_id = user.get("session_id")
            session_expires_at = user.get("session_expires_at")

            if (
                not persisted_session_id
                or persisted_session_id != token_session_id
                or not session_expires_at
                or session_expires_at <= datetime.utcnow()
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired or invalid",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        return user
        
    except jwt.ExpiredSignatureError:
        logger.error("Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_id(
    user: dict = Depends(get_current_user)
) -> str:
    """
    Get current user ID from authenticated user document.
    
    Usage:
        user = Depends(get_current_user)
    
    Raises:
        HTTPException: If user not found
    """
    return str(user.get("_id"))


async def get_verified_user(
    user: dict = Depends(get_current_user)
) -> dict:
    """
    Get current user only if they are verified.
    
    Usage:
        user = Depends(get_verified_user)
        
    Raises:
        HTTPException: If account is not verified
    """
    from models.user import UserVerificationStatus
    
    if user.get("verification_status") != UserVerificationStatus.VERIFIED:
        logger.warning(f"User {user.get('email')} attempted access but is not verified")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified"
        )
    
    return user


async def get_optional_user(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repository)
) -> Optional[dict]:
    """
    Get current user if authenticated, None otherwise.
    
    Usage:
        user = Depends(get_optional_user)
    """
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        
        import jwt
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        user = await user_repo.get_by_id(user_id)
        if not user:
            return None

        token_session_id = payload.get("sid")
        if token_session_id:
            persisted_session_id = user.get("session_id")
            session_expires_at = user.get("session_expires_at")

            if (
                not persisted_session_id
                or persisted_session_id != token_session_id
                or not session_expires_at
                or session_expires_at <= datetime.utcnow()
            ):
                return None

        return user
        
    except Exception:
        return None


# ==================== Pagination Dependencies ====================

class PaginationParams:
    """Pagination parameters."""
    
    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = max(1, page)
        self.page_size = min(100, max(1, page_size))
        self.skip = (self.page - 1) * self.page_size


async def get_pagination(
    page: int = 1,
    page_size: int = 20
) -> PaginationParams:
    """
    Get pagination parameters.
    
    Usage:
        pagination = Depends(get_pagination)
        videos = await repo.get_by_user(user_id, skip=pagination.skip, limit=pagination.page_size)
    """
    return PaginationParams(page=page, page_size=page_size)


# ==================== Query Dependencies ====================

class SearchQuery:
    """Search query parameters."""
    
    def __init__(self, q: str = ""):
        self.query = q.strip()
        self.is_empty = not self.query


async def get_search_query(q: str = "") -> SearchQuery:
    """
    Get search query parameters.
    
    Usage:
        search = Depends(get_search_query)
        if not search.is_empty:
            results = await repo.search(search.query)
    """
    return SearchQuery(q=q)
