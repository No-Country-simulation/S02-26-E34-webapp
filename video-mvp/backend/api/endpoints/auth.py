from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from models.user import UserLoginResponse, UserVerificationStatus, UserDocument
from services.google_auth import GoogleAuthService
from models.database import get_database
from bson import ObjectId
import os
import jwt
from config.settings import settings


router = APIRouter()
security = HTTPBearer()


@router.post("/auth/google", response_model=UserLoginResponse)
async def google_login(request: Request):
    """
    Endpoint para autenticación con Google OAuth
    Espera un JSON con el token de ID de Google
    """
    try:
        body = await request.json()
        google_token = body.get("token")
        
        if not google_token:
            raise HTTPException(
                status_code=400,
                detail="Google token is required"
            )
        
        # Verificar el token de Google
        google_user_data = GoogleAuthService.verify_google_token(google_token)
        
        # Obtener o crear usuario
        user, created = await GoogleAuthService.get_or_create_user(google_user_data)
        
        # Verificar si el usuario está pendiente de verificación
        if user.verification_status == UserVerificationStatus.PENDING:
            if created:
                # Nuevo usuario registrado, pendiente de verificación
                message = "Registration successful. Your account is pending verification by an administrator."
            else:
                # Usuario ya existía pero sigue pendiente de verificación
                message = "Account pending verification by an administrator."
            
            # Devolver mensaje de que está pendiente de verificación
            raise HTTPException(
                status_code=403,
                detail=message
            )
        elif user.verification_status == UserVerificationStatus.REJECTED:
            raise HTTPException(
                status_code=403,
                detail="Your account has been rejected by an administrator."
            )
        
        # Crear token de acceso
        access_token = GoogleAuthService.create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        return UserLoginResponse(
            user_id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            verification_status=user.verification_status,
            access_token=access_token
        )
        
    except HTTPException:
        # Re-lanzar excepciones HTTP directamente
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication error: {str(e)}"
        )


@router.get("/auth/me", response_model=UserLoginResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Endpoint para obtener información del usuario actual
    """
    try:
        # Decodificar el token JWT
        payload = jwt.decode(
            credentials.credentials, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials"
            )
        
        # Obtener usuario de la base de datos
        db = get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        user_obj = UserDocument(**user)
        
        # Verificar estado de verificación
        if user_obj.verification_status != UserVerificationStatus.VERIFIED:
            raise HTTPException(
                status_code=403,
                detail="Account not verified"
            )
        
        # Crear token de acceso (refrescar)
        access_token = GoogleAuthService.create_access_token(
            data={"sub": str(user_obj.id), "email": user_obj.email}
        )
        
        return UserLoginResponse(
            user_id=str(user_obj.id),
            email=user_obj.email,
            name=user_obj.name,
            role=user_obj.role,
            verification_status=user_obj.verification_status,
            access_token=access_token
        )
        
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting user info: {str(e)}"
        )