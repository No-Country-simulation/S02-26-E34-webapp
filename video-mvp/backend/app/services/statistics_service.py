from app.models.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class StatisticsService:
    @staticmethod
    async def increment_view_count(video_id: str) -> bool:
        """
        Incrementa el contador de vistas de un video
        """
        try:
            db = get_database()
            
            # Actualizar el contador de vistas
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {
                    "$inc": {"view_count": 1},
                    "$set": {"last_accessed": datetime.utcnow()}
                }
            )
            
            if result.modified_count > 0:
                # Recalcular la puntuación de popularidad
                await StatisticsService._recalculate_popularity_score(video_id)
                return True
            else:
                logger.warning(f"No se encontró el video para incrementar vistas: {video_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error incrementando contador de vistas: {e}")
            return False
    
    @staticmethod
    async def increment_download_count(video_id: str) -> bool:
        """
        Incrementa el contador de descargas de un video
        """
        try:
            db = get_database()
            
            # Actualizar el contador de descargas
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {
                    "$inc": {"download_count": 1},
                    "$set": {"last_accessed": datetime.utcnow()}
                }
            )
            
            if result.modified_count > 0:
                # Recalcular la puntuación de popularidad
                await StatisticsService._recalculate_popularity_score(video_id)
                return True
            else:
                logger.warning(f"No se encontró el video para incrementar descargas: {video_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error incrementando contador de descargas: {e}")
            return False
    
    @staticmethod
    async def _recalculate_popularity_score(video_id: str) -> bool:
        """
        Recalcula la puntuación de popularidad basada en vistas y descargas
        """
        try:
            db = get_database()
            
            # Obtener los contadores actuales
            video = await db.videos.find_one({"_id": ObjectId(video_id)}, {"view_count": 1, "download_count": 1, "quality_score": 1})
            
            if not video:
                logger.warning(f"No se encontró el video para recalcular popularidad: {video_id}")
                return False
            
            # Calcular puntuación de popularidad (fórmula simple)
            # Considera vistas, descargas y calidad original
            view_weight = 0.4
            download_weight = 0.4
            quality_weight = 0.2
            
            # Normalizar los valores (dividir por 100 para mantener la escala razonable)
            normalized_views = min(video.get("view_count", 0) / 100.0, 10.0)  # Máximo 10 puntos por vistas
            normalized_downloads = min(video.get("download_count", 0) / 50.0, 10.0)  # Máximo 10 puntos por descargas
            normalized_quality = (video.get("quality_score", 50) / 10.0) if video.get("quality_score") else 5.0  # Convertir de 0-100 a 0-10
            
            popularity_score = (
                normalized_views * view_weight +
                normalized_downloads * download_weight +
                normalized_quality * quality_weight
            )
            
            # Actualizar la puntuación de popularidad
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {"$set": {"popularity_score": popularity_score}}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error recalculando puntuación de popularidad: {e}")
            return False
    
    @staticmethod
    async def get_video_statistics(video_id: str) -> Dict[str, Any]:
        """
        Obtiene las estadísticas de un video específico
        """
        try:
            db = get_database()
            
            video = await db.videos.find_one(
                {"_id": ObjectId(video_id)}, 
                {
                    "view_count": 1, 
                    "download_count": 1, 
                    "popularity_score": 1, 
                    "last_accessed": 1,
                    "created_at": 1
                }
            )
            
            if not video:
                return {}
            
            return {
                "video_id": str(video["_id"]),
                "view_count": video.get("view_count", 0),
                "download_count": video.get("download_count", 0),
                "popularity_score": video.get("popularity_score", 0.0),
                "last_accessed": video.get("last_accessed"),
                "created_at": video.get("created_at")
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas del video: {e}")
            return {}
    
    @staticmethod
    async def get_user_statistics(user_id: str) -> Dict[str, Any]:
        """
        Obtiene estadísticas generales de un usuario
        """
        try:
            db = get_database()
            
            # Obtener videos del usuario
            videos_cursor = db.videos.find({"user_id": ObjectId(user_id)})
            videos = await videos_cursor.to_list(length=None)
            
            total_videos = len(videos)
            total_views = sum(video.get("view_count", 0) for video in videos)
            total_downloads = sum(video.get("download_count", 0) for video in videos)
            avg_quality = sum(video.get("quality_score", 0) for video in videos) / total_videos if total_videos > 0 else 0
            avg_popularity = sum(video.get("popularity_score", 0) for video in videos) / total_videos if total_videos > 0 else 0
            
            return {
                "user_id": user_id,
                "total_videos": total_videos,
                "total_views": total_views,
                "total_downloads": total_downloads,
                "average_quality": avg_quality,
                "average_popularity": avg_popularity
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas del usuario: {e}")
            return {}
    
    @staticmethod
    async def get_platform_statistics() -> Dict[str, Any]:
        """
        Obtiene estadísticas generales de la plataforma
        """
        try:
            db = get_database()
            
            # Contar videos totales
            total_videos = await db.videos.count_documents({})
            
            # Sumar vistas y descargas totales
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total_views": {"$sum": "$view_count"},
                        "total_downloads": {"$sum": "$download_count"},
                        "avg_quality": {"$avg": "$quality_score"},
                        "avg_popularity": {"$avg": "$popularity_score"}
                    }
                }
            ]
            
            stats_result = await db.videos.aggregate(pipeline).to_list(length=1)
            platform_stats = stats_result[0] if stats_result else {}
            
            return {
                "total_videos": total_videos,
                "total_views": platform_stats.get("total_views", 0),
                "total_downloads": platform_stats.get("total_downloads", 0),
                "average_video_quality": platform_stats.get("avg_quality", 0),
                "average_video_popularity": platform_stats.get("avg_popularity", 0)
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de la plataforma: {e}")
            return {}