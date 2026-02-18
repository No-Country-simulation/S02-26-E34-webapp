# backend/services/video_processor.py (actualizado con IA)
import celery
import ffmpeg
import os
import logging
from typing import Dict, Any
from config.settings import settings
import cv2
import numpy as np
import asyncio
from datetime import datetime
from bson import ObjectId

# Handle optional imports for AI features
try:
    import whisper
    whisper_available = True
except ImportError:
    whisper = None
    whisper_available = False

from utils.storage import storage_service
from models.database import get_database
from models.video import VideoStatus
from .object_detection import object_detection_service
from .subtitle_generator import subtitle_generator_service
from .branding_service import branding_service
from .metadata_extractor import extract_video_metadata, validate_video_file
from .thumbnail_generator import generate_thumbnail, generate_preview_gif
from .quality_control_service import QualityControlService
from .statistics_service import StatisticsService
from .categorization_service import CategorizationService

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializar Celery
celery_app = celery.Celery('video_processor')
celery_app.conf.broker_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

async def process_video_task(video_id: str):
    """
    Tarea para procesar un video
    """
    logger.info(f"Iniciando procesamiento del video: {video_id}")

    try:
        # Obtener base de datos
        db = get_database()

        # Obtener registro del video (intentar como ObjectId y como string para compatibilidad)
        video_record = await db.videos.find_one({"_id": ObjectId(video_id)})
        if not video_record:
            video_record = await db.videos.find_one({"_id": video_id})
            
        if not video_record:
            raise ValueError(f"Video con ID {video_id} no encontrado en la base de datos")

        # Actualizar estado a 'processing'
        await db.videos.update_one(
            {"_id": video_record["_id"]},
            {"$set": {
                "status": VideoStatus.PROCESSING.value, 
                "progress": 5,
                "status_message": "Iniciando procesamiento..."
            }}
        )

        # Convertir video de 16:9 a 9:16
        input_file = video_record.get("original_file_path") or video_record.get("file_path")
        if not input_file:
             raise ValueError(f"No se encontró la ruta del archivo original para el video {video_id}")
             
        await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 10, "status_message": "Convirtiendo a formato vertical (9:16)..."}})
        output_path = convert_to_vertical(input_file, video_id)
        
        # Aplicar recorte inteligente basado en IA si se detectan objetos relevantes
        await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 30, "status_message": "Analizando contenido con IA para recorte inteligente..."}})
        output_path = apply_smart_crop(output_path, video_id)

        # Aplicar subtítulos si es necesario
        if video_record.get("add_subtitles"):
            await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 50, "status_message": "Generando subtítulos con Whisper AI..."}})
            output_path = add_subtitles(output_path, video_id)
        
        # Aplicar branding si es necesario
        if video_record.get("add_branding"):
            await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 70, "status_message": "Aplicando branding y marcas de agua..."}})
            output_path = add_branding(output_path, video_id)
        
        await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 85, "status_message": "Finalizando y optimizando archivo..."}})

        # Extraer metadatos completos del video procesado
        processed_metadata = extract_video_metadata(output_path)
        
        # Validar archivo procesado
        validation_result = validate_video_file(output_path)
        
        # Actualizar registro con metadatos completos
        update_data = {
            "file_path": output_path,
            "duration_seconds": processed_metadata["duration_seconds"],
            "file_size_bytes": processed_metadata["file_size_bytes"],
            "bitrate_kbps": processed_metadata["bitrate_kbps"],
            "codec_name": processed_metadata["codec_name"],
            "codec_long_name": processed_metadata["codec_long_name"],
            "profile": processed_metadata["profile"],
            "width": processed_metadata["width"],
            "height": processed_metadata["height"],
            "display_aspect_ratio": processed_metadata["display_aspect_ratio"],
            "pixel_aspect_ratio": processed_metadata["pixel_aspect_ratio"],
            "frame_rate": processed_metadata["frame_rate"],
            "color_space": processed_metadata["color_space"],
            "color_primaries": processed_metadata["color_primaries"],
            "color_transfer": processed_metadata["color_transfer"],
            "color_range": processed_metadata["color_range"],
            "has_audio": processed_metadata["has_audio"],
            "audio_codec": processed_metadata["audio_codec"],
            "audio_sample_rate": processed_metadata["audio_sample_rate"],
            "audio_channels": processed_metadata["audio_channels"],
            "audio_bitrate_kbps": processed_metadata["audio_bitrate_kbps"],
            "audio_language": processed_metadata["audio_language"],
            "ffmpeg_version": "N/A",  # Podría obtenerse de la instalación de FFmpeg
            "is_corrupted": validation_result["is_corrupted"],
            "validation_errors": validation_result["validation_errors"],
            "quality_score": validation_result["quality_score"],
            "updated_at": datetime.utcnow()
        }
        
        # Actualizar el registro del video con los metadatos extraídos
        await db.videos.update_one(
            {"_id": video_record["_id"]},
            {"$set": update_data}
        )

        # Generar thumbnail
        thumbnail_dir = os.path.join(settings.TMP_DIR, "thumbnails")
        os.makedirs(thumbnail_dir, exist_ok=True)
        thumbnail_path = os.path.join(thumbnail_dir, f"{video_id}_thumb.jpg")
        
        if generate_thumbnail(output_path, thumbnail_path):
            await db.videos.update_one(
                {"_id": video_record["_id"]},
                {"$set": {
                    "thumbnail_path": thumbnail_path,
                    "thumbnail_width": 320,
                    "thumbnail_height": 180
                }}
            )

        # Generar GIF de vista previa
        preview_gif_path = os.path.join(thumbnail_dir, f"{video_id}_preview.gif")
        
        if generate_preview_gif(output_path, preview_gif_path):
            await db.videos.update_one(
                {"_id": video_record["_id"]},
                {"$set": {"preview_gif_path": preview_gif_path}}
            )

        # Categorizar automáticamente el video
        await CategorizationService.auto_categorize_video(
            video_id, 
            video_record.get("title", ""), 
            video_record.get("description", "")
        )

        # Subir archivo procesado al almacenamiento
        final_object_name = f"processed_videos/{video_id}_converted.mp4"
        if storage_service.upload_file(output_path, final_object_name):
            # Actualizar registro con ruta del archivo procesado
            if storage_service.enabled:
                processed_file_path = f"s3://{storage_service.bucket_name}/{final_object_name}"
            else:
                # En modo simulado, usamos la ruta local donde se "subió"
                storage_path = settings.TMP_DIR
                processed_file_path = os.path.join(storage_path, final_object_name)

            # Actualizar estado a completado
            await db.videos.update_one(
                {"_id": video_record["_id"]},
                {"$set": {
                    "status": VideoStatus.PROCESSED.value, 
                    "processed_file_path": processed_file_path,
                    "progress": 100,
                    "status_message": "¡Procesamiento completado con éxito!"
                }}
            )

            # Eliminar archivos temporales
            cleanup_temp_files([input_file, output_path])

            return {
                "video_id": video_id,
                "status": "processed",
                "output_path": processed_file_path
            }
        else:
            logger.error(f"FALLO: No se pudo subir el archivo procesado para {video_id}")
            # Actualizar estado a fallido
            await db.videos.update_one(
                {"_id": video_record["_id"]},
                {"$set": {"status": VideoStatus.FAILED.value}}
            )
            raise Exception("Error al subir el archivo procesado")

    except Exception as e:
        logger.error(f"Error procesando video {video_id}: {str(e)}")

        try:
            db = get_database()
            # Intentar encontrar por ObjectId o string
            video = await db.videos.find_one({"_id": ObjectId(video_id)})
            if not video:
                video = await db.videos.find_one({"_id": video_id})
            
            if video:
                await db.videos.update_one(
                    {"_id": video["_id"]},
                    {"$set": {"status": VideoStatus.FAILED.value}}
                )
        except Exception as db_error:
            logger.error(f"Error actualizando estado en DB: {db_error}")

        return {
            "video_id": video_id,
            "status": "failed",
            "error": str(e)
        }

def convert_to_vertical(input_path: str, video_id: str) -> str:
    """
    Convierte un video horizontal (16:9) a vertical (9:16) usando FFmpeg
    """
    storage_path = settings.TMP_DIR
    os.makedirs(storage_path, exist_ok=True)
    output_path = os.path.join(storage_path, f"vertical_{video_id}.mp4")

    # Obtener dimensiones originales del video
    probe = ffmpeg.probe(input_path)
    video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
    width = int(video_stream['width'])
    height = int(video_stream['height'])

    # Calcular dimensiones para formato vertical (9:16)
    target_width = 1080
    target_height = 1920

    # Determinar cómo escalar el video para que QUEPA dentro del objetivo (Fit)
    # Esto evita que el video escalado sea más grande que el marco de fondo (pad)
    scale_factor = min(target_width / width, target_height / height)
    scaled_width = (int(width * scale_factor) // 2) * 2
    scaled_height = (int(height * scale_factor) // 2) * 2


    # Aplicar transformación
    stream = ffmpeg.input(input_path)
    stream = ffmpeg.filter(stream, 'scale', scaled_width, scaled_height)
    stream = ffmpeg.filter(stream, 'pad', target_width, target_height,
                          '(ow-iw)/2', '(oh-ih)/2', 'black')
    stream = ffmpeg.output(stream, output_path, vcodec='libx264', pix_fmt='yuv420p')

    # Ejecutar comando
    try:
        ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
    except ffmpeg.Error as e:
        stderr = e.stderr.decode() if e.stderr else "Sin detalles"
        logger.error(f"Error crítico en FFmpeg: {stderr}")
        raise Exception(f"Fallo en FFmpeg: {stderr}")

    return output_path

def apply_smart_crop(video_path: str, video_id: str) -> str:
    """
    Aplica recorte inteligente basado en detección de rostros/objetos
    """

    # Calcular el recorte óptimo basado en detecciones de objetos
    x1, y1, x2, y2 = object_detection_service.calculate_optimal_crop(video_path)

    storage_path = settings.TMP_DIR
    output_path = os.path.join(storage_path, f"smart_crop_{video_id}.mp4")

    # Aplicar el recorte usando FFmpeg
    try:
        stream = ffmpeg.input(video_path)
        stream = ffmpeg.crop(stream, x1, y1, x2-x1, y2-y1)
        # Asegurar que el recorte tenga dimensiones pares
        stream = ffmpeg.filter(stream, 'scale', '(iw/2)*2', '(ih/2)*2')
        stream = ffmpeg.output(stream, output_path, vcodec='libx264', pix_fmt='yuv420p')

        ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
    except ffmpeg.Error as e:
        stderr = e.stderr.decode() if e.stderr else "Sin detalles"
        logger.error(f"Error en FFmpeg durante smart crop: {stderr}")
        raise

    return output_path

def add_subtitles(video_path: str, video_id: str) -> str:
    """
    Añade subtítulos al video usando Whisper para transcripción
    """
    logger.info(f"Añadiendo subtítulos al video: {video_id}")

    # Generar subtítulos usando Whisper
    subtitles = subtitle_generator_service.generate_subtitles(video_path)

    # Crear archivo de subtítulos SRT
    storage_path = settings.TMP_DIR
    srt_path = os.path.join(storage_path, f"subtitles_{video_id}.srt")
    subtitle_generator_service.save_srt_file(subtitles, srt_path)

    # Aplicar subtítulos al video usando FFmpeg
    storage_path = settings.TMP_DIR
    output_path = os.path.join(storage_path, f"subtitled_{video_id}.mp4")

    try:
        stream = ffmpeg.input(video_path)
        stream = ffmpeg.filter(stream, 'subtitles', srt_path)
        stream = ffmpeg.output(stream, output_path, vcodec='libx264', pix_fmt='yuv420p')

        ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
    except ffmpeg.Error as e:
        stderr = e.stderr.decode() if e.stderr else "Sin detalles"
        logger.error(f"Error en FFmpeg durante subtítulos: {stderr}")
        raise

    # Eliminar archivo SRT temporal
    os.remove(srt_path)

    return output_path

def add_branding(video_path: str, video_id: str) -> str:
    """
    Añade branding (logo/texto) al video
    """
    logger.info(f"Añadiendo branding al video: {video_id}")

    # Rutas de recursos de branding (estas deberían venir de la base de datos o configuración)
    logo_path = os.getenv("DEFAULT_LOGO_PATH", "")  # Ruta al logo por defecto
    brand_text = os.getenv("DEFAULT_BRAND_TEXT", "Mi Marca")  # Texto de marca por defecto

    # Aplicar branding completo
    output_path = branding_service.apply_branding(
        video_path=video_path,
        logo_path=logo_path if logo_path and os.path.exists(logo_path) else None,
        text=brand_text
    )

    return output_path

def cleanup_temp_files(file_paths: list):
    """
    Elimina archivos temporales
    """
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Archivo temporal eliminado: {file_path}")
        except Exception as e:
            logger.error(f"Error eliminando archivo temporal {file_path}: {e}")