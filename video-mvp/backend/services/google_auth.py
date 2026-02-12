from fastapi import HTTPException, status
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from google.auth.exceptions import GoogleAuthError
from typing import Optional
from models.user import UserDocument, UserCreate, UserRole, UserVerificationStatus
from models.database import get_database
from datetime import datetime, timedelta
import jwt
from config.settings import settings
from bson import ObjectId


class GoogleAuthService:
    @staticmethod
    def verify_google_token(token: str) -> dict:
        """
        Verifica el token de Google y devuelve los datos del usuario
        """
        try:
            # Verificar el token de ID de Google
            idinfo = id_token.verify_oauth2_token(
                token, 
                Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            
            # Verificar que el token sea válido
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
                
            return idinfo
            
        except GoogleAuthError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google authentication error: {str(e)}"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(e)}"
            )
    
    @staticmethod
    async def get_or_create_user(google_user_data: dict) -> tuple[UserDocument, bool]:
        """
        Obtiene un usuario existente o crea uno nuevo si no existe
        Devuelve (usuario, creado)
        """
        db = get_database()
        
        # Buscar usuario por Google ID
        existing_user = await db.users.find_one({"google_id": google_user_data['sub']})
        
        if existing_user:
            # Usuario ya existe, devolverlo
            return UserDocument(**existing_user), False
        
        # Crear nuevo usuario
        user_data = UserCreate(
            google_id=google_user_data['sub'],
            email=google_user_data['email'],
            name=google_user_data['name'],
            picture=google_user_data.get('picture')
        )
        
        new_user_doc = UserDocument(
            google_id=user_data.google_id,
            email=user_data.email,
            name=user_data.name,
            picture=user_data.picture,
            verification_status=UserVerificationStatus.PENDING  # Por defecto pendiente
        )
        
        # Insertar en la base de datos
        result = await db.users.insert_one(new_user_doc.dict(by_alias=True))
        new_user_doc.id = result.inserted_id
        
        return new_user_doc, True
    
    @staticmethod
    async def verify_user(admin_user_id: str, target_user_id: str) -> UserDocument:
        """
        Verifica un usuario pendiente (solo puede hacerlo un admin)
        """
        db = get_database()
        
        # Verificar que el admin exista y sea realmente admin
        admin_user = await db.users.find_one({
            "_id": ObjectId(admin_user_id),
            "role": UserRole.ADMIN,
            "verification_status": UserVerificationStatus.VERIFIED
        })
        
        if not admin_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only verified admins can verify other users"
            )
        
        # Actualizar el estado del usuario a VERIFIED
        update_result = await db.users.update_one(
            {"_id": ObjectId(target_user_id)},
            {
                "$set": {
                    "verification_status": UserVerificationStatus.VERIFIED,
                    "verified_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or already verified"
            )
        
        # Obtener y devolver el usuario actualizado
        updated_user = await db.users.find_one({"_id": ObjectId(target_user_id)})
        return UserDocument(**updated_user)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """
        Crea un token JWT de acceso
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire.timestamp()})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt