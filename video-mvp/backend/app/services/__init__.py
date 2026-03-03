# backend/services/__init__.py
"""
Service layer for business logic.

Services provide:
- Business logic encapsulation
- Transaction management
- Cross-repository operations
- External service integration
- Caching strategies
"""

from app.services.video_service import VideoService
from app.services.user_service import UserService

__all__ = ["VideoService", "UserService"]
