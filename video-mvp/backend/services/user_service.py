# backend/services/user_service.py
"""
User service for business logic operations.

Features:
- User authentication/authorization
- User management
- Cache management
- Cross-repository operations
- Business rule enforcement
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from repositories.user_repository import UserRepository
from schemas.user import UserRole, UserVerificationStatus
from utils.cache import cache_service

logger = logging.getLogger(__name__)


class UserService:
    """
    Service for user business logic.
    
    Usage:
        service = UserService(db)
        user = await service.get_user(user_id)
        await service.verify_user(user_id)
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize user service.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.repository = UserRepository(db)
    
    async def get_user(self, user_id: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get user with caching.
        
        Args:
            user_id: User ID
            use_cache: Whether to use cache (default: True)
        
        Returns:
            User data or None
        """
        # Try cache first
        if use_cache and cache_service.is_connected:
            cached = await cache_service.get_user(user_id)
            if cached:
                logger.debug(f"Cache hit for user: {user_id}")
                return cached
        
        # Get from database
        user = await self.repository.get_by_id(user_id)
        
        if user and cache_service.is_connected:
            # Cache for 10 minutes
            await cache_service.cache_user(user_id, user, ttl=600)
        
        return user
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email.
        
        Args:
            email: User email
        
        Returns:
            User data or None
        """
        return await self.repository.get_by_email(email)
    
    async def get_user_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by Google ID.
        
        Args:
            google_id: Google OAuth ID
        
        Returns:
            User data or None
        """
        return await self.repository.get_by_google_id(google_id)
    
    async def create_user(self, user_data: Dict[str, Any]) -> str:
        """
        Create new user.
        
        Args:
            user_data: User data
        
        Returns:
            Created user ID
        
        Raises:
            ValueError: If email or Google ID already exists
        """
        # Check for existing user
        if "email" in user_data:
            existing = await self.repository.get_by_email(user_data["email"])
            if existing:
                raise ValueError("Email already registered")
        
        if "google_id" in user_data:
            existing = await self.repository.get_by_google_id(user_data["google_id"])
            if existing:
                raise ValueError("Google ID already registered")
        
        user_id = await self.repository.create(user_data)
        
        logger.info(f"User created: {user_id} ({user_data.get('email')})")
        return user_id
    
    async def get_or_create_user(self, google_user_data: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
        """
        Get existing user or create new one from Google OAuth data.
        
        Args:
            google_user_data: Google OAuth user data
        
        Returns:
            Tuple of (user_data, created_flag)
        """
        # Try to find by Google ID
        user = await self.repository.get_by_google_id(google_user_data["google_id"])
        
        if user:
            return user, False
        
        # Try to find by email
        user = await self.repository.get_by_email(google_user_data["email"])
        
        if user:
            # Update with Google ID
            await self.repository.update(user["_id"], {
                "google_id": google_user_data["google_id"],
                "picture": google_user_data.get("picture")
            })
            
            # Invalidate cache
            if cache_service.is_connected:
                await cache_service.invalidate_user(user["_id"])
            
            return await self.get_user(user["_id"]), False
        
        # Create new user
        user_data = {
            "google_id": google_user_data["google_id"],
            "email": google_user_data["email"],
            "name": google_user_data.get("name", "User"),
            "picture": google_user_data.get("picture")
        }
        
        user_id = await self.create_user(user_data)
        return await self.get_user(user_id), True
    
    async def verify_user(self, user_id: str) -> bool:
        """
        Verify user account.
        
        Args:
            user_id: User ID
        
        Returns:
            True if verified
        """
        success = await self.repository.verify_user(user_id)
        
        if success and cache_service.is_connected:
            await cache_service.invalidate_user(user_id)
        
        logger.info(f"User verified: {user_id}")
        return success
    
    async def reject_user(self, user_id: str) -> bool:
        """
        Reject user account.
        
        Args:
            user_id: User ID
        
        Returns:
            True if rejected
        """
        success = await self.repository.reject_user(user_id)
        
        if success and cache_service.is_connected:
            await cache_service.invalidate_user(user_id)
        
        logger.info(f"User rejected: {user_id}")
        return success
    
    async def update_user_role(self, user_id: str, role: UserRole) -> bool:
        """
        Update user role.
        
        Args:
            user_id: User ID
            role: New role
        
        Returns:
            True if updated
        """
        success = await self.repository.update_role(user_id, role)
        
        if success and cache_service.is_connected:
            await cache_service.invalidate_user(user_id)
        
        logger.info(f"User role updated: {user_id} -> {role.value}")
        return success
    
    async def update_cookie_preferences(
        self,
        user_id: str,
        preferences: Dict[str, bool]
    ) -> bool:
        """
        Update user cookie preferences.
        
        Args:
            user_id: User ID
            preferences: Cookie preferences
        
        Returns:
            True if updated
        """
        success = await self.repository.update_cookie_preferences(user_id, preferences)
        
        if success and cache_service.is_connected:
            await cache_service.invalidate_user(user_id)
        
        return success
    
    async def update_user(
        self,
        user_id: str,
        update_data: Dict[str, Any]
    ) -> bool:
        """
        Update user information.
        
        Args:
            user_id: User ID
            update_data: Data to update
        
        Returns:
            True if updated
        """
        # Remove protected fields
        update_data.pop("google_id", None)
        update_data.pop("email", None)
        update_data.pop("role", None)
        update_data.pop("verification_status", None)
        
        success = await self.repository.update(user_id, update_data)
        
        if success and cache_service.is_connected:
            await cache_service.invalidate_user(user_id)
        
        return success
    
    async def delete_user(self, user_id: str) -> bool:
        """
        Delete user.
        
        Args:
            user_id: User ID
        
        Returns:
            True if deleted
        """
        success = await self.repository.delete(user_id)
        
        if success and cache_service.is_connected:
            await cache_service.invalidate_user(user_id)
        
        return success
    
    async def get_pending_verifications(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get users pending verification.
        
        Args:
            limit: Maximum number of users
        
        Returns:
            List of pending users
        """
        return await self.repository.get_pending_verifications(limit)
    
    async def get_all_users(
        self,
        page: int = 1,
        page_size: int = 20,
        role: Optional[UserRole] = None
    ) -> Dict[str, Any]:
        """
        Get all users with pagination.
        
        Args:
            page: Page number
            page_size: Page size
            role: Optional role filter
        
        Returns:
            Paginated user list
        """
        skip = (page - 1) * page_size
        users = await self.repository.get_all(skip, page_size, role)
        total = await self.repository.count()
        
        return {
            "users": users,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": skip + len(users) < total
        }
    
    async def search_users(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Search users by name or email.
        
        Args:
            query: Search query
            page: Page number
            page_size: Page size
        
        Returns:
            Search results
        """
        skip = (page - 1) * page_size
        users = await self.repository.search(query, skip, page_size)
        
        return {
            "users": users,
            "total": len(users),
            "page": page,
            "page_size": page_size,
            "query": query
        }
    
    async def get_statistics(self) -> Dict[str, Any]:
        """
        Get user statistics.
        
        Returns:
            Statistics dictionary
        """
        return await self.repository.get_statistics()
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user (for future password-based auth).
        
        Args:
            email: User email
            password: User password
        
        Returns:
            User data or None
        
        Note:
            Currently only supports Google OAuth authentication.
        """
        logger.warning("Password authentication not implemented. Use Google OAuth.")
        return None
