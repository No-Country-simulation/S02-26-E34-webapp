from models.database import get_database
from bson import ObjectId
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class CategoryService:
    @staticmethod
    async def get_all_categories() -> List[Dict[str, Any]]:
        """
        Obtiene todas las categorías disponibles
        """
        try:
            db = get_database()
            
            categories = await db.categories.find({}).to_list(length=None)
            
            return [
                {
                    "id": str(cat["_id"]),
                    "name": cat["name"],
                    "description": cat.get("description", ""),
                    "created_at": cat.get("created_at")
                }
                for cat in categories
            ]
            
        except Exception as e:
            logger.error(f"Error obteniendo categorías: {e}")
            return []
    
    @staticmethod
    async def create_category(name: str, description: str = "") -> Optional[Dict[str, Any]]:
        """
        Crea una nueva categoría
        """
        try:
            db = get_database()
            
            # Verificar si la categoría ya existe
            existing_cat = await db.categories.find_one({"name": name.lower()})
            if existing_cat:
                logger.warning(f"La categoría ya existe: {name}")
                return None
            
            # Crear nueva categoría
            category_doc = {
                "name": name.lower(),  # Normalizar a minúsculas
                "description": description,
                "created_at": datetime.utcnow()
            }
            
            result = await db.categories.insert_one(category_doc)
            
            return {
                "id": str(result.inserted_id),
                "name": name,
                "description": description,
                "created_at": category_doc["created_at"]
            }
            
        except Exception as e:
            logger.error(f"Error creando categoría: {e}")
            return None
    
    @staticmethod
    async def assign_category_to_video(video_id: str, category_name: str) -> bool:
        """
        Asigna una categoría a un video
        """
        try:
            db = get_database()
            
            # Verificar que la categoría exista
            category = await db.categories.find_one({"name": category_name.lower()})
            if not category:
                logger.warning(f"Categoría no encontrada: {category_name}")
                return False
            
            # Actualizar el video con la categoría
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {"$set": {"category": category_name.lower()}}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error asignando categoría al video: {e}")
            return False


class TagService:
    @staticmethod
    async def add_tags_to_video(video_id: str, tags: List[str]) -> bool:
        """
        Añade etiquetas a un video
        """
        try:
            db = get_database()
            
            # Normalizar etiquetas (minúsculas, sin espacios extras)
            normalized_tags = [tag.strip().lower() for tag in tags if tag.strip()]
            
            # Actualizar el video con las nuevas etiquetas
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {
                    "$addToSet": {"tags": {"$each": normalized_tags}}  # Solo añadir si no existen
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error añadiendo etiquetas al video: {e}")
            return False
    
    @staticmethod
    async def remove_tags_from_video(video_id: str, tags: List[str]) -> bool:
        """
        Remueve etiquetas de un video
        """
        try:
            db = get_database()
            
            # Normalizar etiquetas
            normalized_tags = [tag.strip().lower() for tag in tags if tag.strip()]
            
            # Remover las etiquetas del video
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {
                    "$pull": {"tags": {"$in": normalized_tags}}  # Remover si coinciden
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error removiendo etiquetas del video: {e}")
            return False
    
    @staticmethod
    async def search_videos_by_tags(tags: List[str], limit: int = 20) -> List[Dict[str, Any]]:
        """
        Busca videos por etiquetas
        """
        try:
            db = get_database()
            
            # Normalizar etiquetas
            normalized_tags = [tag.strip().lower() for tag in tags if tag.strip()]
            
            # Buscar videos que contengan cualquiera de las etiquetas
            videos = await db.videos.find(
                {"tags": {"$in": normalized_tags}}
            ).limit(limit).to_list(length=None)
            
            return [
                {
                    "id": str(video["_id"]),
                    "filename": video["filename"],
                    "original_filename": video["original_filename"],
                    "duration_seconds": video["duration_seconds"],
                    "width": video["width"],
                    "height": video["height"],
                    "tags": video["tags"],
                    "category": video.get("category"),
                    "created_at": video["created_at"]
                }
                for video in videos
            ]
            
        except Exception as e:
            logger.error(f"Error buscando videos por etiquetas: {e}")
            return []
    
    @staticmethod
    async def get_popular_tags(limit: int = 20) -> List[Dict[str, int]]:
        """
        Obtiene las etiquetas más populares
        """
        try:
            db = get_database()
            
            # Pipeline para contar ocurrencias de cada etiqueta
            pipeline = [
                {"$unwind": "$tags"},
                {
                    "$group": {
                        "_id": "$tags",
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"count": -1}},
                {"$limit": limit}
            ]
            
            tag_counts = await db.videos.aggregate(pipeline).to_list(length=None)
            
            return [
                {"tag": item["_id"], "count": item["count"]}
                for item in tag_counts
            ]
            
        except Exception as e:
            logger.error(f"Error obteniendo etiquetas populares: {e}")
            return []


class CategorizationService:
    @staticmethod
    async def auto_categorize_video(video_id: str, video_title: str, video_description: str = "") -> List[str]:
        """
        Intenta categorizar automáticamente un video basado en su título y descripción
        """
        try:
            # Palabras clave para diferentes categorías
            category_keywords = {
                "technology": ["tech", "software", "programming", "coding", "computer", "digital", "ai", "machine learning", "robotics"],
                "education": ["learn", "tutorial", "course", "education", "study", "school", "university", "teaching"],
                "entertainment": ["fun", "comedy", "movie", "film", "music", "game", "gaming", "entertainment"],
                "sports": ["sport", "football", "basketball", "soccer", "tennis", "athletic", "exercise", "fitness"],
                "travel": ["travel", "trip", "vacation", "adventure", "explore", "destination", "tourism"],
                "food": ["food", "recipe", "cooking", "restaurant", "meal", "eat", "delicious", "kitchen"],
                "business": ["business", "marketing", "finance", "entrepreneur", "startup", "company", "work", "career"]
            }
            
            # Convertir texto a minúsculas para búsqueda
            text_to_analyze = f"{video_title} {video_description}".lower()
            
            matched_categories = []
            for category, keywords in category_keywords.items():
                for keyword in keywords:
                    if keyword in text_to_analyze:
                        if category not in matched_categories:
                            matched_categories.append(category)
                        break  # No necesitamos buscar más palabras clave para esta categoría
            
            # Si no se encontraron categorías, usar 'general'
            if not matched_categories:
                matched_categories = ["general"]
            
            # Asociar la primera categoría encontrada al video
            if matched_categories:
                await CategoryService.assign_category_to_video(video_id, matched_categories[0])
            
            return matched_categories
            
        except Exception as e:
            logger.error(f"Error en categorización automática: {e}")
            # En caso de error, asignar categoría 'general'
            await CategoryService.assign_category_to_video(video_id, "general")
            return ["general"]