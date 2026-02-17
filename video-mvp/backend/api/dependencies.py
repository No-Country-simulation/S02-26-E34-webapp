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
    yield get_db()


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

async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Get current user ID from JWT token.
    
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
        
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    user_repo: UserRepository = Depends(get_user_repository)
) -> dict:
    """
    Get current user document.
    
    Usage:
        user = Depends(get_current_user)
    
    Raises:
        HTTPException: If user not found
    """
    user = await user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
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
        
        return await user_repo.get_by_id(user_id)
        
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
