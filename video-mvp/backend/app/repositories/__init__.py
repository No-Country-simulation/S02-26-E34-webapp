# backend/repositories/__init__.py
"""
Repository pattern implementation for data access.

Repositories provide:
- Clean separation of data access logic
- Reusable database operations
- Easy testing with mock repositories
- Consistent error handling
"""

from app.repositories.video_repository import VideoRepository
from app.repositories.user_repository import UserRepository

__all__ = ["VideoRepository", "UserRepository"]
