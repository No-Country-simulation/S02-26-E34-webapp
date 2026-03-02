# backend/repositories/user_repository.py
"""
User repository for MongoDB data access.

Implements repository pattern for:
- Clean separation of concerns
- Reusable database operations
- Easy testing with mocks
- Consistent error handling
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from bson.errors import InvalidId

from schemas.user import UserRole, UserVerificationStatus

logger = logging.getLogger(__name__)


class UserRepository:
    """
    Repository for user operations.
    
    Usage:
        repo = UserRepository(db)
        user = await repo.get_by_id(user_id)
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize user repository.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db.users
    
    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID (string or ObjectId)
        
        Returns:
            User document or None if not found
        """
        try:
            try:
                obj_id = ObjectId(user_id)
                return await self.collection.find_one({"_id": obj_id})
            except (InvalidId, TypeError):
                return await self.collection.find_one({"_id": user_id})
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None
    
    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email.
        
        Args:
            email: User email
        
        Returns:
            User document or None if not found
        """
        try:
            return await self.collection.find_one({"email": email})
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    async def get_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by Google ID.
        
        Args:
            google_id: Google OAuth ID
        
        Returns:
            User document or None if not found
        """
        try:
            return await self.collection.find_one({"google_id": google_id})
        except Exception as e:
            logger.error(f"Error getting user by Google ID {google_id}: {e}")
            return None
    
    async def exists(self, user_id: str) -> bool:
        """
        Check if user exists.
        
        Args:
            user_id: User ID
        
        Returns:
            True if exists, False otherwise
        """
        doc = await self.get_by_id(user_id)
        return doc is not None
    
    async def email_exists(self, email: str) -> bool:
        """
        Check if email is already registered.
        
        Args:
            email: Email to check
        
        Returns:
            True if exists, False otherwise
        """
        doc = await self.get_by_email(email)
        return doc is not None
    
    async def create(self, user_data: Dict[str, Any]) -> str:
        """
        Create new user record.
        
        Args:
            user_data: User data dictionary
        
        Returns:
            Created user ID
        
        Raises:
            Exception: If creation fails
        """
        try:
            # Add timestamps and defaults
            user_data["created_at"] = datetime.utcnow()
            user_data["updated_at"] = datetime.utcnow()
            user_data.setdefault("role", UserRole.USER.value)
            user_data.setdefault(
                "verification_status",
                UserVerificationStatus.PENDING.value
            )
            
            result = await self.collection.insert_one(user_data)
            logger.info(f"Created user: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    async def update(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update user record.
        
        Args:
            user_id: User ID
            update_data: Fields to update
        
        Returns:
            True if updated, False if not found
        """
        try:
            update_data["updated_at"] = datetime.utcnow()
            
            try:
                query_id = ObjectId(user_id)
            except (InvalidId, TypeError):
                query_id = user_id
                
            result = await self.collection.update_one(
                {"_id": query_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            return False
    
    async def verify_user(self, user_id: str) -> bool:
        """
        Verify user account.
        
        Args:
            user_id: User ID
        
        Returns:
            True if verified, False if not found
        """
        return await self.update(
            user_id,
            {
                "verification_status": UserVerificationStatus.VERIFIED.value,
                "verified_at": datetime.utcnow()
            }
        )
    
    async def reject_user(self, user_id: str) -> bool:
        """
        Reject user account.
        
        Args:
            user_id: User ID
        
        Returns:
            True if rejected, False if not found
        """
        return await self.update(
            user_id,
            {
                "verification_status": UserVerificationStatus.REJECTED.value,
                "rejected_at": datetime.utcnow()
            }
        )
    
    async def update_role(self, user_id: str, role: UserRole) -> bool:
        """
        Update user role.
        
        Args:
            user_id: User ID
            role: New role
        
        Returns:
            True if updated, False if not found
        """
        return await self.update(user_id, {"role": role.value})
    
    async def delete(self, user_id: str) -> bool:
        """
        Delete user record.
        
        Args:
            user_id: User ID
        
        Returns:
            True if deleted, False if not found
        """
        try:
            try:
                query_id = ObjectId(user_id)
            except (InvalidId, TypeError):
                query_id = user_id
                
            result = await self.collection.update_one(
                {"_id": query_id},
                {"$set": {
                    "is_deleted": True,
                    "deleted_at": datetime.utcnow()
                }}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {e}")
            return False
    
    async def update_cookie_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any]
    ) -> bool:
        """
        Update user cookie preferences.
        
        Args:
            user_id: User ID
            preferences: Cookie preferences
        
        Returns:
            True if updated, False if not found
        """
        try:
            preferences["updated_at"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": user_id},
                {"$set": {"cookie_preferences": preferences}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error updating cookie preferences: {e}")
            return False

    async def update_session(
        self,
        user_id: str,
        session_id: str,
        session_expires_at: datetime
    ) -> bool:
        """
        Persist and renew user session information.

        Args:
            user_id: User ID
            session_id: Session identifier
            session_expires_at: Session expiration datetime (UTC)

        Returns:
            True if updated, False otherwise
        """
        return await self.update(
            user_id,
            {
                "session_id": session_id,
                "session_expires_at": session_expires_at,
                "last_login_at": datetime.utcnow()
            }
        )

    async def is_session_valid(self, user_id: str, session_id: str) -> bool:
        """
        Check if a persisted session is valid for a user.

        Args:
            user_id: User ID
            session_id: Session identifier

        Returns:
            True if session exists, matches and is not expired
        """
        user = await self.get_by_id(user_id)
        if not user:
            return False

        persisted_session_id = user.get("session_id")
        session_expires_at = user.get("session_expires_at")

        if not persisted_session_id or persisted_session_id != session_id:
            return False

        if not session_expires_at:
            return False

        return session_expires_at > datetime.utcnow()
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        role: Optional[UserRole] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all users with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records
            role: Optional role filter
        
        Returns:
            List of user documents
        """
        try:
            query = {"is_deleted": {"$ne": True}}
            
            if role:
                query["role"] = role.value
            
            cursor = self.collection.find(query)
            cursor.skip(skip).limit(limit)
            cursor.sort("created_at", -1)
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Error getting users: {e}")
            return []
    
    async def count(self) -> int:
        """
        Count total users.
        
        Returns:
            Number of users
        """
        try:
            return await self.collection.count_documents({})
        except Exception as e:
            logger.error(f"Error counting users: {e}")
            return 0
    
    async def get_by_verification_status(
        self,
        status: UserVerificationStatus,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get users by verification status.
        
        Args:
            status: Verification status
            limit: Maximum number of records
        
        Returns:
            List of user documents
        """
        try:
            cursor = self.collection.find({"verification_status": status.value})
            cursor.limit(limit)
            cursor.sort("created_at", 1)
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Error getting users by status {status}: {e}")
            return []
    
    async def get_pending_verifications(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get users pending verification.
        
        Args:
            limit: Maximum number of records
        
        Returns:
            List of user documents
        """
        return await self.get_by_verification_status(
            UserVerificationStatus.PENDING,
            limit
        )
    
    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search users by name or email.
        
        Args:
            query: Search query
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of user documents
        """
        try:
            search_query = {
                "is_deleted": {"$ne": True},
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"email": {"$regex": query, "$options": "i"}}
                ]
            }
            
            cursor = self.collection.find(search_query)
            cursor.skip(skip).limit(limit)
            cursor.sort("created_at", -1)
            
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Error searching users: {e}")
            return []
    
    async def get_statistics(self) -> Dict[str, Any]:
        """
        Get user statistics.
        
        Returns:
            Dictionary with statistics
        """
        try:
            pipeline = [
                {"$group": {"_id": "$role", "count": {"$sum": 1}}},
                {
                    "$group": {
                        "_id": None,
                        "total": {"$sum": "$count"},
                        "by_role": {
                            "$push": {"role": "$_id", "count": "$count"}
                        }
                    }
                }
            ]
            
            result = await self.collection.aggregate(pipeline).to_list(length=10)
            
            if not result:
                return {"total": 0, "by_role": {}}
            
            stats = result[0]
            by_role = {
                item["role"]: item["count"] for item in stats.get("by_role", [])
            }
            
            return {
                "total": stats.get("total", 0),
                "by_role": by_role
            }
        except Exception as e:
            logger.error(f"Error getting user statistics: {e}")
            return {"total": 0, "by_role": {}}
