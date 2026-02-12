from models.database import get_database
from bson import ObjectId
from typing import Dict, Any, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class QualityControlService:
    @staticmethod
    async def update_video_quality_score(video_id: str, quality_score: float) -> bool:
        """
        Actualiza la puntuación de calidad de un video
        """
        try:
            db = get_database()
            
            # Validar que la puntuación esté en el rango correcto
            if not 0 <= quality_score <= 100:
                logger.warning(f"Puntuación de calidad fuera de rango (0-100): {quality_score}")
                return False
            
            # Actualizar la puntuación de calidad
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {
                    "$set": {
                        "quality_score": quality_score,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error actualizando puntuación de calidad: {e}")
            return False
    
    @staticmethod
    async def add_validation_error(video_id: str, error_message: str) -> bool:
        """
        Añade un error de validación a un video
        """
        try:
            db = get_database()
            
            # Añadir el error a la lista de errores de validación
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {
                    "$push": {
                        "validation_errors": {
                            "timestamp": datetime.utcnow(),
                            "error": error_message
                        }
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error añadiendo error de validación: {e}")
            return False
    
    @staticmethod
    async def mark_video_as_corrupted(video_id: str, error_message: str = "") -> bool:
        """
        Marca un video como corrupto
        """
        try:
            db = get_database()
            
            # Marcar el video como corrupto
            updates = {
                "is_corrupted": True,
                "updated_at": datetime.utcnow()
            }
            
            if error_message:
                updates["$push"] = {
                    "validation_errors": {
                        "timestamp": datetime.utcnow(),
                        "error": error_message
                    }
                }
            
            result = await db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {"$set": updates}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error marcando video como corrupto: {e}")
            return False
    
    @staticmethod
    async def validate_video_completeness(video_id: str) -> Dict[str, Any]:
        """
        Valida que un video tenga todos los metadatos necesarios
        """
        try:
            db = get_database()
            
            video = await db.videos.find_one({"_id": ObjectId(video_id)})
            
            if not video:
                return {
                    "valid": False,
                    "errors": ["Video no encontrado"]
                }
            
            # Validar campos obligatorios
            required_fields = [
                "filename", "original_filename", "file_path", "file_size_bytes",
                "duration_seconds", "width", "height", "codec_name"
            ]
            
            errors = []
            for field in required_fields:
                if field not in video or video[field] is None:
                    errors.append(f"Campo requerido faltante: {field}")
            
            # Validar rangos de valores
            if video.get("duration_seconds", 0) <= 0:
                errors.append("Duración inválida")
            
            if video.get("width", 0) <= 0 or video.get("height", 0) <= 0:
                errors.append("Dimensiones inválidas")
            
            # Validar tamaño de archivo
            if video.get("file_size_bytes", 0) <= 0:
                errors.append("Tamaño de archivo inválido")
            
            # Validar que el archivo exista físicamente (opcional)
            import os
            file_path = video.get("file_path")
            if file_path and not os.path.exists(file_path):
                errors.append("Archivo físico no encontrado")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": []  # Se pueden añadir advertencias aquí
            }
            
        except Exception as e:
            logger.error(f"Error validando completitud del video: {e}")
            return {
                "valid": False,
                "errors": [f"Error de validación: {str(e)}"]
            }
    
    @staticmethod
    async def calculate_comprehensive_quality_score(video_id: str) -> float:
        """
        Calcula una puntuación de calidad integral basada en múltiples factores
        """
        try:
            db = get_database()
            
            video = await db.videos.find_one({"_id": ObjectId(video_id)})
            
            if not video:
                return 0.0
            
            # Factores de calidad ponderados
            factors = {
                "resolution": 0.0,      # Basado en resolución
                "bitrate": 0.0,         # Basado en bitrate
                "duration": 0.0,        # Basado en duración
                "audio_quality": 0.0,   # Basado en presencia y calidad de audio
                "corruption": 0.0       # Penalización por corrupción
            }
            
            # Calcular puntuación por resolución (HD+, Full HD, 4K)
            width = video.get("width", 0)
            height = video.get("height", 0)
            
            resolution = width * height
            if resolution >= 3840 * 2160:  # 4K
                factors["resolution"] = 100
            elif resolution >= 1920 * 1080:  # Full HD
                factors["resolution"] = 90
            elif resolution >= 1280 * 720:  # HD
                factors["resolution"] = 75
            elif resolution > 0:  # SD
                factors["resolution"] = 50
            else:
                factors["resolution"] = 25  # Sin resolución válida
            
            # Calcular puntuación por bitrate
            bitrate = video.get("bitrate_kbps", 0)
            if bitrate >= 5000:  # Muy alto
                factors["bitrate"] = 100
            elif bitrate >= 2500:  # Alto
                factors["bitrate"] = 90
            elif bitrate >= 1000:  # Medio
                factors["bitrate"] = 75
            elif bitrate >= 500:  # Bajo
                factors["bitrate"] = 50
            else:  # Muy bajo
                factors["bitrate"] = 25
            
            # Calcular puntuación por duración (penalizar videos muy cortos o muy largos)
            duration = video.get("duration_seconds", 0)
            if 10 <= duration <= 3600:  # Entre 10 segundos y 1 hora
                factors["duration"] = 100
            elif 5 <= duration < 10 or 3600 < duration <= 7200:  # Entre 5-10 seg o 1-2 horas
                factors["duration"] = 75
            elif duration > 0:  # Cualquier otra duración
                factors["duration"] = 50
            else:  # Sin duración
                factors["duration"] = 25
            
            # Calcular puntuación por calidad de audio
            has_audio = video.get("has_audio", False)
            audio_bitrate = video.get("audio_bitrate_kbps", 0)
            
            if has_audio and audio_bitrate >= 128:
                factors["audio_quality"] = 100
            elif has_audio and audio_bitrate >= 64:
                factors["audio_quality"] = 75
            elif has_audio:
                factors["audio_quality"] = 50
            else:
                factors["audio_quality"] = 25
            
            # Penalización por corrupción
            is_corrupted = video.get("is_corrupted", False)
            factors["corruption"] = 0 if is_corrupted else 100
            
            # Calcular puntuación final con pesos
            weights = {
                "resolution": 0.3,
                "bitrate": 0.25,
                "duration": 0.15,
                "audio_quality": 0.2,
                "corruption": 0.1
            }
            
            final_score = sum(factors[key] * weights[key] for key in factors.keys())
            
            # Actualizar la puntuación en la base de datos
            await QualityControlService.update_video_quality_score(video_id, final_score)
            
            return final_score
            
        except Exception as e:
            logger.error(f"Error calculando puntuación de calidad integral: {e}")
            return 0.0
    
    @staticmethod
    async def get_quality_report(video_id: str) -> Dict[str, Any]:
        """
        Obtiene un reporte detallado de la calidad del video
        """
        try:
            db = get_database()
            
            video = await db.videos.find_one({"_id": ObjectId(video_id)})
            
            if not video:
                return {"error": "Video no encontrado"}
            
            # Calcular la puntuación de calidad integral
            comprehensive_score = await QualityControlService.calculate_comprehensive_quality_score(video_id)
            
            # Validar completitud
            completeness_validation = await QualityControlService.validate_video_completeness(video_id)
            
            return {
                "video_id": str(video["_id"]),
                "filename": video["filename"],
                "comprehensive_quality_score": comprehensive_score,
                "current_quality_score": video.get("quality_score", 0.0),
                "completeness_validation": completeness_validation,
                "is_corrupted": video.get("is_corrupted", False),
                "validation_errors": video.get("validation_errors", []),
                "technical_metrics": {
                    "duration_seconds": video.get("duration_seconds", 0),
                    "file_size_bytes": video.get("file_size_bytes", 0),
                    "width": video.get("width", 0),
                    "height": video.get("height", 0),
                    "bitrate_kbps": video.get("bitrate_kbps", 0),
                    "has_audio": video.get("has_audio", False),
                    "audio_bitrate_kbps": video.get("audio_bitrate_kbps", 0)
                }
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo reporte de calidad: {e}")
            return {"error": f"Error obteniendo reporte de calidad: {str(e)}"}