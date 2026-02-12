from models.database import get_database
from bson import ObjectId
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class VersionControlService:
    @staticmethod
    async def create_video_version(original_video_id: str, new_file_path: str, version_notes: str = "") -> Optional[Dict[str, Any]]:
        """
        Crea una nueva versión de un video existente
        """
        try:
            db = get_database()
            
            # Obtener el video original
            original_video = await db.videos.find_one({"_id": ObjectId(original_video_id)})
            if not original_video:
                logger.warning(f"Video original no encontrado: {original_video_id}")
                return None
            
            # Crear un nuevo documento para la versión
            version_doc = original_video.copy()
            
            # Actualizar campos específicos de la versión
            version_doc.pop("_id", None)  # Remover el ID para crear un nuevo documento
            version_doc["parent_video_id"] = ObjectId(original_video_id)  # Referencia al video original
            version_doc["version"] = original_video.get("version", 1) + 1  # Incrementar número de versión
            version_doc["file_path"] = new_file_path  # Nueva ruta de archivo
            version_doc["is_master_copy"] = False  # Esta no es la copia maestra
            version_doc["created_at"] = datetime.utcnow()  # Nueva fecha de creación
            version_doc["updated_at"] = datetime.utcnow()
            
            if version_notes:
                version_doc["version_notes"] = version_notes
            
            # Insertar la nueva versión
            result = await db.videos.insert_one(version_doc)
            
            # Actualizar el video original para indicar que tiene versiones
            await db.videos.update_one(
                {"_id": ObjectId(original_video_id)},
                {"$set": {"has_versions": True, "updated_at": datetime.utcnow()}}
            )
            
            # Devolver la nueva versión creada
            version_doc["_id"] = result.inserted_id
            return {
                "id": str(result.inserted_id),
                "parent_video_id": str(original_video_id),
                "version_number": version_doc["version"],
                "file_path": new_file_path,
                "created_at": version_doc["created_at"],
                "notes": version_notes
            }
            
        except Exception as e:
            logger.error(f"Error creando versión de video: {e}")
            return None
    
    @staticmethod
    async def get_video_versions(video_id: str) -> List[Dict[str, Any]]:
        """
        Obtiene todas las versiones de un video (incluyendo el original)
        """
        try:
            db = get_database()
            
            # Buscar el video original y todas sus versiones
            # Primero, determinar si el ID proporcionado es el original o una versión
            video = await db.videos.find_one({"_id": ObjectId(video_id)})
            if not video:
                logger.warning(f"Video no encontrado: {video_id}")
                return []
            
            # Determinar el ID del video original
            original_id = video.get("parent_video_id")
            if original_id is None:
                # Este es el video original
                original_id = ObjectId(video_id)
            else:
                # Este es una versión, encontrar el original
                original_video = await db.videos.find_one({"_id": ObjectId(original_id)})
                if original_video and original_video.get("parent_video_id") is None:
                    # Este es el original
                    original_id = original_video["_id"]
                else:
                    # Seguir buscando el original
                    current_id = original_id
                    while True:
                        current_video = await db.videos.find_one({"_id": current_id})
                        if not current_video or current_video.get("parent_video_id") is None:
                            original_id = current_id
                            break
                        current_id = current_video["parent_video_id"]
            
            # Buscar todas las versiones (el original y todas las derivadas)
            versions_cursor = db.videos.find({
                "$or": [
                    {"_id": original_id},  # El video original
                    {"parent_video_id": original_id}  # Las versiones
                ]
            }).sort("version", 1)  # Ordenar por número de versión
            
            versions = await versions_cursor.to_list(length=None)
            
            return [
                {
                    "id": str(ver["_id"]),
                    "version_number": ver["version"],
                    "is_master_copy": ver.get("is_master_copy", False),
                    "filename": ver["filename"],
                    "file_path": ver["file_path"],
                    "created_at": ver["created_at"],
                    "updated_at": ver["updated_at"],
                    "version_notes": ver.get("version_notes", "")
                }
                for ver in versions
            ]
            
        except Exception as e:
            logger.error(f"Error obteniendo versiones de video: {e}")
            return []
    
    @staticmethod
    async def promote_version_to_master(video_id: str) -> bool:
        """
        Promueve una versión específica a copia maestra
        """
        try:
            db = get_database()
            
            # Obtener la versión a promover
            version = await db.videos.find_one({"_id": ObjectId(video_id)})
            if not version or version.get("parent_video_id") is None:
                logger.warning(f"Versión no encontrada o es el video original: {video_id}")
                return False
            
            # Obtener el video original
            original_id = version["parent_video_id"]
            original_video = await db.videos.find_one({"_id": original_id})
            if not original_video:
                logger.error(f"Video original no encontrado: {original_id}")
                return False
            
            # Actualizar la versión seleccionada para que sea la copia maestra
            await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {"$set": {"is_master_copy": True}}
            )
            
            # Actualizar el video original para que ya no sea la copia maestra
            await db.videos.update_one(
                {"_id": original_id},
                {"$set": {"is_master_copy": False}}
            )
            
            # Actualizar todas las demás versiones para que no sean la copia maestra
            await db.videos.update_many(
                {
                    "parent_video_id": original_id,
                    "_id": {"$ne": ObjectId(video_id)}
                },
                {"$set": {"is_master_copy": False}}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error promoviendo versión a maestra: {e}")
            return False
    
    @staticmethod
    async def get_master_version(video_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene la versión maestra de un video
        """
        try:
            db = get_database()
            
            # Buscar el video original y todas sus versiones
            video = await db.videos.find_one({"_id": ObjectId(video_id)})
            if not video:
                logger.warning(f"Video no encontrado: {video_id}")
                return None
            
            # Determinar el ID del video original
            original_id = video.get("parent_video_id")
            if original_id is None:
                original_id = ObjectId(video_id)
            else:
                # Encontrar el video original
                current_id = original_id
                while True:
                    current_video = await db.videos.find_one({"_id": current_id})
                    if not current_video or current_video.get("parent_video_id") is None:
                        original_id = current_id
                        break
                    current_id = current_video["parent_video_id"]
            
            # Buscar la versión maestra
            master_version = await db.videos.find_one({
                "$or": [
                    {"_id": original_id, "is_master_copy": True},
                    {"parent_video_id": original_id, "is_master_copy": True}
                ]
            })
            
            if master_version:
                return {
                    "id": str(master_version["_id"]),
                    "version_number": master_version["version"],
                    "is_master_copy": master_version.get("is_master_copy", False),
                    "filename": master_version["filename"],
                    "file_path": master_version["file_path"],
                    "created_at": master_version["created_at"],
                    "updated_at": master_version["updated_at"]
                }
            else:
                # Si no hay versión maestra explícita, devolver la última versión
                latest_version = await db.videos.find_one({
                    "$or": [
                        {"_id": original_id},
                        {"parent_video_id": original_id}
                    ]
                }, sort=[("version", -1)])
                
                if latest_version:
                    return {
                        "id": str(latest_version["_id"]),
                        "version_number": latest_version["version"],
                        "is_master_copy": latest_version.get("is_master_copy", False),
                        "filename": latest_version["filename"],
                        "file_path": latest_version["file_path"],
                        "created_at": latest_version["created_at"],
                        "updated_at": latest_version["updated_at"]
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Error obteniendo versión maestra: {e}")
            return None
    
    @staticmethod
    async def delete_video_version(video_id: str, preserve_original: bool = True) -> bool:
        """
        Elimina una versión específica de un video
        """
        try:
            db = get_database()
            
            # Obtener el video a eliminar
            video = await db.videos.find_one({"_id": ObjectId(video_id)})
            if not video:
                logger.warning(f"Video no encontrado: {video_id}")
                return False
            
            # Verificar que no sea el video original si preserve_original es True
            if preserve_original and video.get("parent_video_id") is None:
                logger.warning(f"No se puede eliminar el video original: {video_id}")
                return False
            
            # Eliminar el video
            result = await db.videos.delete_one({"_id": ObjectId(video_id)})
            
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error eliminando versión de video: {e}")
            return False