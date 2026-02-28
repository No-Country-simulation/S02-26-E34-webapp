# backend/api/v1/endpoints/auth.py
"""
Authentication endpoints.

Features:
- Google OAuth authentication
- JWT token management
- User verification
- Cookie preferences management
"""
import logging
from datetime import datetime
from http import HTTPStatus
from typing import Optional

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config.settings import settings
from models.user import (
    UserLoginResponse,
    UserVerificationStatus,
    UserDocument,
    CookiePreferences,
    CookiePreferencesResponse,
    UserCreate
)
from repositories.user_repository import UserRepository
from services.google_auth import GoogleAuthService
from api.dependencies import get_user_repository
from utils.security import get_password_hash, verify_password
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordRequestForm

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()


async def get_verified_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repository)
) -> UserDocument:
    """
    Get verified user from JWT token.
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Could not validate credentials"
            )

        user = await user_repo.get_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="User not found"
            )

        user_obj = UserDocument(**user)

        if user_obj.verification_status != UserVerificationStatus.VERIFIED:
            raise HTTPException(
                status_code=HTTPStatus.FORBIDDEN,
                detail="Account not verified"
            )

        return user_obj
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Could not validate credentials"
        )


@router.post("/register", response_model=UserLoginResponse)
async def register_user(
    user_data: UserCreate,
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Register a new user with email and password.
    """
    try:
        # Check if email is already registered
        if await user_repo.email_exists(user_data.email):
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail="Email is already registered"
            )

        if not user_data.password:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail="Password is required for manual registration"
            )

        # Hash the password
        hashed_password = get_password_hash(user_data.password)

        new_user_dict = {
            "email": user_data.email,
            "name": user_data.name,
            "last_name": user_data.last_name,
            "hashed_password": hashed_password,
            "verification_status": UserVerificationStatus.PENDING.value
        }

        user_id = await user_repo.create(new_user_dict)

        # Retrieve created user
        user_doc_dict = await user_repo.get_by_id(user_id)
        user = UserDocument(**user_doc_dict)

        raise HTTPException(
            status_code=HTTPStatus.FORBIDDEN,
            detail="Registration successful. Your account is pending verification by an administrator."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
        )


@router.post("/login", response_model=UserLoginResponse)
async def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Authenticate with email and password.
    """
    try:
        user_dict = await user_repo.get_by_email(form_data.username)
        if not user_dict:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        user = UserDocument(**user_dict)

        # Check if user has a password (might be google only)
        if not user.hashed_password:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="This account uses Google Login. Please sign in with Google."
            )

        # Verify password
        if not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # Check verification status
        if user.verification_status == UserVerificationStatus.PENDING:
            raise HTTPException(
                status_code=HTTPStatus.FORBIDDEN,
                detail="Account pending verification by an administrator."
            )
        elif user.verification_status == UserVerificationStatus.REJECTED:
            raise HTTPException(
                status_code=HTTPStatus.FORBIDDEN,
                detail="Your account has been rejected by an administrator."
            )

        # Create access token
        access_token = GoogleAuthService.create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )

        return UserLoginResponse(
            user_id=str(user.id),
            email=user.email,
            name=user.name,
            last_name=user.last_name,
            role=user.role,
            verification_status=user.verification_status,
            access_token=access_token
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )


@router.post("/google", response_model=UserLoginResponse)
async def google_login(request: Request):
    """
    Authenticate with Google OAuth.

    Expects JSON with Google ID token.

    Args:
        request: FastAPI request with Google token

    Returns:
        UserLoginResponse with access token

    Raises:
        HTTPException: If authentication fails
    """
    try:
        body = await request.json()
        google_token = body.get("token")

        if not google_token:
            raise HTTPException(
                status_code=HTTPStatus.BAD_REQUEST,
                detail="Google token is required"
            )

        # Verify Google token
        google_user_data = GoogleAuthService.verify_google_token(google_token)

        # Get or create user
        user, created = await GoogleAuthService.get_or_create_user(google_user_data)

        # Check verification status
        if user.verification_status == UserVerificationStatus.PENDING:
            if created:
                message = "Registration successful. Your account is pending verification by an administrator."
            else:
                message = "Account pending verification by an administrator."

            raise HTTPException(
                status_code=HTTPStatus.FORBIDDEN,
                detail=message
            )
        elif user.verification_status == UserVerificationStatus.REJECTED:
            raise HTTPException(
                status_code=HTTPStatus.FORBIDDEN,
                detail="Your account has been rejected by an administrator."
            )

        # Create access token
        access_token = GoogleAuthService.create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )

        return UserLoginResponse(
            user_id=str(user.id),
            email=user.email,
            name=user.name,
            last_name=user.last_name,
            role=user.role,
            verification_status=user.verification_status,
            access_token=access_token
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )


@router.get("/me", response_model=UserLoginResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Get current authenticated user information.

    Args:
        credentials: JWT credentials
        user_repo: User repository (injected)

    Returns:
        UserLoginResponse with refreshed token

    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Decode JWT token
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Could not validate credentials"
            )

        # Get user from database
        user = await user_repo.get_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=HTTPStatus.NOT_FOUND,
                detail="User not found"
            )

        user_obj = UserDocument(**user)

        # Check verification status
        if user_obj.verification_status != UserVerificationStatus.VERIFIED:
            raise HTTPException(
                status_code=HTTPStatus.FORBIDDEN,
                detail="Account not verified"
            )

        # Refresh access token
        access_token = GoogleAuthService.create_access_token(
            data={"sub": str(user_obj.id), "email": user_obj.email}
        )

        return UserLoginResponse(
            user_id=str(user_obj.id),
            email=user_obj.email,
            name=user_obj.name,
            last_name=user_obj.last_name,
            role=user_obj.role,
            verification_status=user_obj.verification_status,
            access_token=access_token
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    except Exception as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Error getting user info: {str(e)}"
        )


@router.get("/cookie-preferences", response_model=CookiePreferencesResponse)
async def get_cookie_preferences(
    user: UserDocument = Depends(get_verified_user)
):
    """
    Get current user's cookie preferences.

    Args:
        user: Verified user (injected)

    Returns:
        CookiePreferencesResponse
    """
    prefs = user.cookie_preferences or CookiePreferences()
    return CookiePreferencesResponse(
        necessary=True,
        preferences=prefs.preferences,
        analytics=prefs.analytics,
        marketing=prefs.marketing,
        updated_at=prefs.updated_at
    )


@router.put("/cookie-preferences", response_model=CookiePreferencesResponse)
async def update_cookie_preferences(
    request: Request,
    preferences: CookiePreferences,
    user: UserDocument = Depends(get_verified_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Update cookie preferences.

    Args:
        request: FastAPI request
        preferences: New cookie preferences
        user: Verified user (injected)
        user_repo: User repository (injected)

    Returns:
        CookiePreferencesResponse
    """
    prefs_dict = preferences.model_dump()
    prefs_dict["updated_at"] = datetime.utcnow()

    await user_repo.update_cookie_preferences(str(user.id), prefs_dict)

    return CookiePreferencesResponse(
        necessary=True,
        preferences=preferences.preferences,
        analytics=preferences.analytics,
        marketing=preferences.marketing,
        updated_at=prefs_dict["updated_at"]
    )
