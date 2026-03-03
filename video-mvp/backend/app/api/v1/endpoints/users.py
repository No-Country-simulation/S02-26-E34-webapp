# backend/api/v1/endpoints/users.py
"""
User management endpoints.

Features:
- Get current user info
- Update user profile
- Get user statistics
- Admin endpoints for user management
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from http import HTTPStatus

from app.api.dependencies import (
    get_current_user,
    get_user_repository,
    get_video_repository,
    get_pagination,
    PaginationParams
)
from app.repositories.user_repository import UserRepository
from app.repositories.video_repository import VideoRepository
from app.schemas.user import (
    UserResponse,
    UserListResponse,
    UserUpdate,
    UserRole,
    CookiePreferencesResponse,
    CookiePreferences
)
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Update current user profile.
    
    Can update:
    - name
    - picture
    """
    update_dict = update_data.model_dump(exclude_unset=True)
    
    if update_dict:
        await user_repo.update(current_user["_id"], update_dict)
    
    # Get updated user
    updated_user = await user_repo.get_by_id(current_user["_id"])
    return updated_user


@router.get("/me/cookie-preferences", response_model=CookiePreferencesResponse)
async def get_cookie_preferences(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current user's cookie preferences.
    """
    prefs = current_user.get("cookie_preferences", {})
    
    return CookiePreferencesResponse(
        necessary=True,
        preferences=prefs.get("preferences", False),
        analytics=prefs.get("analytics", False),
        marketing=prefs.get("marketing", False),
        updated_at=prefs.get("updated_at")
    )


@router.put("/me/cookie-preferences", response_model=CookiePreferencesResponse)
async def update_cookie_preferences(
    preferences: CookiePreferences,
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Update cookie preferences.
    """
    prefs_dict = preferences.model_dump()
    prefs_dict["updated_at"] = datetime.utcnow()
    
    await user_repo.update_cookie_preferences(current_user["_id"], prefs_dict)
    
    return CookiePreferencesResponse(
        necessary=True,
        preferences=preferences.preferences,
        analytics=preferences.analytics,
        marketing=preferences.marketing,
        updated_at=prefs_dict["updated_at"]
    )


@router.get("/me/stats")
async def get_user_stats(
    current_user: dict = Depends(get_current_user),
    video_repo: VideoRepository = Depends(get_video_repository)
):
    """
    Get current user's video statistics.
    """
    stats = await video_repo.get_user_statistics(current_user["_id"])
    return stats


# ==================== Admin Endpoints ====================

@router.get("", response_model=UserListResponse)
async def list_users(
    pagination: PaginationParams = Depends(get_pagination),
    role: Optional[UserRole] = Query(None),
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    List all users (Admin only).
    
    Requires admin role.
    """
    # Check admin role
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Admin access required"
        )
    
    users = await user_repo.get_all(
        pagination.skip,
        pagination.page_size,
        role
    )
    total = await user_repo.count()
    
    return UserListResponse(
        users=users,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        has_more=pagination.skip + len(users) < total
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str = Path(..., description="User ID"),
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Get user by ID (Admin only).
    
    Requires admin role.
    """
    # Check admin role or same user
    if (current_user.get("role") != UserRole.ADMIN.value and 
        str(current_user["_id"]) != user_id):
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Admin access required"
        )
    
    user = await user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    update_data: UserUpdate,
    user_id: str = Path(..., description="User ID"),
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Update user (Admin only).
    
    Can update:
    - role
    - verification_status
    """
    # Check admin role
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Admin access required"
        )
    
    user = await user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="User not found"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    
    if update_dict:
        await user_repo.update(user_id, update_dict)
    
    # Get updated user
    updated_user = await user_repo.get_by_id(user_id)
    return updated_user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str = Path(..., description="User ID"),
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Delete user (Admin only).
    
    Requires admin role.
    """
    # Check admin role
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Admin access required"
        )
    
    # Prevent self-deletion
    if str(current_user["_id"]) == user_id:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = await user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="User not found"
        )
    
    await user_repo.delete(user_id)
    
    return {"message": "User deleted successfully"}


@router.put("/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: str = Path(..., description="User ID to approve"),
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Approve pending user (Admin only).
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Admin access required"
        )
        
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="User not found")
        
    await user_repo.verify_user(user_id)
    return await user_repo.get_by_id(user_id)


@router.put("/{user_id}/reject", response_model=UserResponse)
async def reject_user(
    user_id: str = Path(..., description="User ID to reject"),
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Reject pending user (Admin only).
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Admin access required"
        )
        
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="User not found")
        
    await user_repo.reject_user(user_id)
    return await user_repo.get_by_id(user_id)


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    role: UserRole,
    user_id: str = Path(..., description="User ID to modify role"),
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Elevate or modify user role (Admin only).
    """
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Admin access required"
        )
        
    if str(current_user["_id"]) == user_id:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST,
            detail="Cannot change your own role"
        )
        
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="User not found")
        
    await user_repo.update_role(user_id, role)
    return await user_repo.get_by_id(user_id)


@router.get("/pending-verifications", response_model=UserListResponse)
async def get_pending_verifications(
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Get users pending verification (Admin only).
    """
    # Check admin role
    if current_user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Admin access required"
        )
    
    users = await user_repo.get_pending_verifications(limit=50)
    
    return UserListResponse(
        users=users,
        total=len(users),
        page=1,
        page_size=50,
        has_more=False
    )
