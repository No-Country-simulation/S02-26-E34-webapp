# backend/api/endpoints/upload.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from typing import Optional
import os
from models.database import get_database
from models.video import VideoMetadata, VideoStatus, VideoMetadataCreate
from services.video_processor import process_video_task
from config.settings import settings
from bson import ObjectId
from datetime import datetime
from services.metadata_extractor import extract_video_metadata, validate_video_file
router = APIRouter()

@router.post("/upload/")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = None,
    add_subtitles: bool = False,
    add_branding: bool = False,
    category: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[str] = None  # Pasar como string separado por comas
):
    """
    Endpoint para subir un video y añadirlo a la cola de procesamiento
    """
    # Validar tipo de archivo
    if not file.content_type or not file.content_type.startswith("video/"):
        # Permitir algunos tipos comunes si el navegador no envía el content-type correcto
        extension = file.filename.split('.')[-1].lower()
        if extension not in ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'mpg', 'mpeg']:
            raise HTTPException(status_code=400, detail="El archivo debe ser un video compatible")

    # Validar tamaño (máximo configurable)
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > settings.MAX_FILE_SIZE:  # Usar el límite configurado
        raise HTTPException(status_code=400, detail=f"El video excede el tamaño máximo de {settings.MAX_FILE_SIZE / (1024*1024):.1f}MB")

    # Generar ID único para el video usando ObjectId
    from bson import ObjectId
    video_id = str(ObjectId())

    # Crear directorio temporal si no existe
    storage_path = settings.TMP_DIR
    os.makedirs(storage_path, exist_ok=True)

    # Guardar archivo temporalmente
    temp_file_path = os.path.join(storage_path, f"{video_id}_{file.filename}")
    with open(temp_file_path, "wb") as buffer:
        buffer.write(file_content)

    # Validar duración del video
    try:
        extracted_metadata = extract_video_metadata(temp_file_path)
        duration_seconds = extracted_metadata['duration_seconds']
        
        if duration_seconds > settings.MAX_VIDEO_DURATION_SECONDS:
            # Eliminar archivo temporal si excede la duración
            os.remove(temp_file_path)
            raise HTTPException(
                status_code=400, 
                detail=f"El video excede la duración máxima de {settings.MAX_VIDEO_DURATION_SECONDS//60}:{settings.MAX_VIDEO_DURATION_SECONDS%60:02d} minutos"
            )
    except Exception as e:
        # Si falla la extracción de metadatos, continuar con valores por defecto
        # pero registrar el error
        print(f"Advertencia: No se pudo validar la duración del video: {str(e)}")

    # Extraer metadatos básicos del video subido
    try:
        extracted_metadata = extract_video_metadata(temp_file_path)
        validation_result = validate_video_file(temp_file_path)
    except Exception as e:
        # Si falla la extracción de metadatos, continuar con valores por defecto
        extracted_metadata = {
            'duration_seconds': 0,
            'file_size_bytes': file_size,
            'bitrate_kbps': 0,
            'codec_name': 'unknown',
            'codec_long_name': 'unknown',
            'profile': 'unknown',
            'width': 0,
            'height': 0,
            'display_aspect_ratio': 'unknown',
            'pixel_aspect_ratio': 'unknown',
            'frame_rate': 0,
            'color_space': 'unknown',
            'color_primaries': 'unknown',
            'color_transfer': 'unknown',
            'color_range': 'unknown',
            'has_audio': False,
            'audio_codec': None,
            'audio_sample_rate': None,
            'audio_channels': None,
            'audio_bitrate_kbps': None,
            'audio_language': None
        }
        validation_result = {
            'is_corrupted': True,
            'validation_errors': [f"Error al extraer metadatos: {str(e)}"],
            'quality_score': 0.0
        }

    # Parsear tags si se proporcionaron
    tags_list = []
    if tags:
        tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

    # Crear registro en la base de datos con el nuevo modelo completo
    video_doc = VideoMetadata(
        # Metadatos básicos
        filename=file.filename,
        original_filename=file.filename,
        file_path=temp_file_path,
        file_size_bytes=file_size,
        mime_type=file.content_type,
        upload_date=datetime.utcnow(),
        status=VideoStatus.UPLOADED.value,

        # Metadatos de video (FFmpeg) - usando valores extraídos o por defecto
        duration_seconds=extracted_metadata['duration_seconds'],
        bitrate_kbps=extracted_metadata['bitrate_kbps'],
        codec_name=extracted_metadata['codec_name'],
        codec_long_name=extracted_metadata['codec_long_name'],
        profile=extracted_metadata['profile'],
        width=extracted_metadata['width'],
        height=extracted_metadata['height'],
        display_aspect_ratio=extracted_metadata['display_aspect_ratio'],
        pixel_aspect_ratio=extracted_metadata['pixel_aspect_ratio'],
        frame_rate=extracted_metadata['frame_rate'],
        color_space=extracted_metadata['color_space'],
        color_primaries=extracted_metadata['color_primaries'],
        color_transfer=extracted_metadata['color_transfer'],
        color_range=extracted_metadata['color_range'],

        # Audio stream
        has_audio=extracted_metadata['has_audio'],
        audio_codec=extracted_metadata['audio_codec'],
        audio_sample_rate=extracted_metadata['audio_sample_rate'],
        audio_channels=extracted_metadata['audio_channels'],
        audio_bitrate_kbps=extracted_metadata['audio_bitrate_kbps'],
        audio_language=extracted_metadata['audio_language'],

        # Procesamiento FFmpeg
        ffmpeg_version="N/A",  # Se actualizará durante el procesamiento
        processing_options={},
        filters_applied=[],
        encoding_preset=None,
        crf_value=None,

        # Calidad y análisis
        quality_score=validation_result['quality_score'],
        is_corrupted=validation_result['is_corrupted'],
        validation_errors=validation_result['validation_errors'],

        # Thumbnails y previews (se generarán durante el procesamiento)
        thumbnail_path=None,
        thumbnail_width=None,
        thumbnail_height=None,
        preview_gif_path=None,

        # Segmentación (se actualizará durante el procesamiento)
        has_segments=False,
        segment_duration=None,
        segment_count=None,
        segments_path=None,

        # DRM y seguridad
        is_protected=False,
        encryption_type=None,
        access_control={},

        # Estadísticas y uso
        view_count=0,
        download_count=0,
        last_accessed=None,
        popularity_score=0.0,

        # Relaciones y categorización
        user_id="507f1f77bcf86cd799439011",  # Placeholder temporal - debería obtenerse del token de autenticación
        category=category,
        tags=tags_list,
        description=description,
        custom_metadata={},

        # Control de versiones
        version=1,
        parent_video_id=None,
        is_master_copy=True,

        # Timestamps
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        deleted_at=None,

        # Campos específicos para procesamiento
        add_subtitles=add_subtitles,
        add_branding=add_branding,
        title=title or file.filename,
        original_file_path=temp_file_path,
    )

    # Obtener la base de datos y guardar el documento
    db = get_database()
    result = await db.videos.insert_one(video_doc.dict(by_alias=True))

    # Usar BackgroundTasks para procesamiento local inmediato y confiable
    background_tasks.add_task(process_video_task, str(result.inserted_id))

    return {
        "video_id": str(result.inserted_id),
        "filename": file.filename,
        "status": "uploaded",
        "message": "Video subido exitosamente y añadido a la cola de procesamiento"
    }