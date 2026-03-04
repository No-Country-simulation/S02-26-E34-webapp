# backend/services/video_processor.py (actualizado con IA)
import celery
import ffmpeg
import os
import logging
from typing import Dict, Any
from app.core.config import settings
import cv2
import numpy as np
import asyncio
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId

# Handle optional imports for AI features
try:
    import whisper
    whisper_available = True
except ImportError:
    whisper = None
    whisper_available = False

from app.utils.storage import storage_service
from app.models.database import get_database
from app.models.video import VideoStatus
from .object_detection import object_detection_service
from .subtitle_generator import subtitle_generator_service
from .branding_service import branding_service
from .metadata_extractor import extract_video_metadata, validate_video_file
from .thumbnail_generator import generate_thumbnail, generate_preview_gif
from .statistics_service import StatisticsService
from .categorization_service import CategorizationService
from .transcription_service import transcription_service
from .llm_service import llm_service

# Importar Core para tracking dinámico
from app.core.hybrid_tracker import HybridTrackerEngine
from app.core.dtos import AnalysisRequest, VideoMetadata, SelectionRect
from app.core.stabilizer import Stabilizer
from app.core.mediapipe_detector import MediaPipeDetector

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _ensure_cv2_runtime() -> None:
    if not hasattr(cv2, "VideoCapture"):
        raise RuntimeError(
            "OpenCV runtime incompleto: 'cv2.VideoCapture' no está disponible. "
            "Reinstala OpenCV en el venv (ej: `uv pip install --reinstall opencv-contrib-python==4.11.0.86`)."
        )

# --- ESTÁNDARES PROFESIONALES PARA TIKTOK/REELS/SHORTS ---
SOCIAL_MEDIA_PARAMS = {
    "vcodec": "libx264",
    "preset": "slow",
    "crf": 18,                # Calidad visual sin pérdida
    "pix_fmt": "yuv420p",     # Colores compatibles con móviles
    "r": 30,                  # 30 FPS constantes
    "acodec": "aac",
    "audio_bitrate": "256k",
    "ar": 48000,              # Audio profesional
    "movflags": "+faststart"  # Optimización para carga rápida web
}

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
        object_id = None
        try:
            object_id = ObjectId(video_id)
        except InvalidId:
            object_id = None

        video_record = await db.videos.find_one({"_id": object_id}) if object_id else None
        if not video_record:
            video_record = await db.videos.find_one({"_id": video_id})
            
        if not video_record:
            raise ValueError(f"Video con ID {video_id} no encontrado en la base de datos")

        # Obtener la ruta del archivo original
        input_file = video_record.get("original_file_path")
        if not input_file or not os.path.exists(input_file):
            # Intentar con file_path si original_file_path no está disponible
            input_file = video_record.get("file_path")
            
        if not input_file or not os.path.exists(input_file):
            raise ValueError(f"Archivo de video original no encontrado: {input_file}")

        # Actualizar estado a 'processing'
        await db.videos.update_one(
            {"_id": video_record["_id"]},
            {"$set": {
                "status": VideoStatus.PROCESSING.value, 
                "progress": 5,
                "status_message": "Iniciando procesamiento..."
            }}
        )

        # 2. Transcribir contenido con Whisper AI (CPU-bound — run in thread)
        await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 10, "status_message": "Transcribiendo contenido con Whisper AI..."}})
        transcription_data = await asyncio.to_thread(transcription_service.transcribe, input_file)
        
        # 3. Analizar momentos virales con Gemini (puede bloquear en red/CPU — run in thread)
        await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"transcription": transcription_data, "progress": 20, "status_message": "Analizando momentos virales con IA..."}})
        viral_clips = await asyncio.to_thread(llm_service.find_viral_moments, transcription_data)
        
        if not viral_clips:
            # Fallback si el LLM no devuelve nada: Usar los primeros 30 segundos
            logger.warning("LLM no devolvió clips. Usando fallback de 30s.")
            viral_clips = [{"start": 0.0, "end": min(30.0, video_record.get("duration_seconds", 30.0)), "label": "Clip Completo"}]

        await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"viral_clips": viral_clips, "progress": 30, "status_message": "Generando clips virales con tracking dinámico..."}})

        # 4. Generar clips individuales con Tracking Dinámico (Solo en los segmentos virales)
        processed_clips = []
        user_selection = {
            "selection_cx": video_record.get("selection_cx"),
            "selection_cy": video_record.get("selection_cy"),
            "selection_w": video_record.get("selection_w"),
            "selection_h": video_record.get("selection_h"),
            "selection_time": video_record.get("selection_time", 0.0)
        }

        for i, clip in enumerate(viral_clips):
            clip_msg = f"Procesando clip {i+1}/{len(viral_clips)}: {clip.get('label', 'Viral')}..."
            await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"status_message": clip_msg}})
            
            # Cortar y trackear el fragmento — run in thread to keep event loop responsive
            clip_path = await asyncio.to_thread(generate_tracked_clip, input_file, video_id, clip, user_selection, i)
            if clip_path:
                processed_clips.append(clip_path)

        if not processed_clips:
            raise Exception("No se pudo generar ningún clip viral.")

        # 5. Crear el video "Full Edit" (Unión de todos los clips virales)
        await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 80, "status_message": "Creando montaje final (Full Edit)..."}})
        output_path = await asyncio.to_thread(merge_clips, processed_clips, video_id)
        
        # 6. Aplicar subtítulos y branding al video final si es necesario
        if video_record.get("add_subtitles"):
            await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 85, "status_message": "Generando subtítulos finales..."}})
            output_path = await asyncio.to_thread(add_subtitles, output_path, video_id)
        
        if video_record.get("add_branding"):
            await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 90, "status_message": "Aplicando branding final..."}})
            output_path = await asyncio.to_thread(add_branding, output_path, video_id)
        
        # --- NUEVA LÓGICA DE MARCA DE AGUA PARA NO-LOGUEADOS ---
        if not video_record.get("is_premium", False):
            await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 95, "status_message": "Aplicando marca de agua (Free Tier)..."}})
            logger.info(f"Usuario no logueado. Aplicando marca de agua verv.io a {video_id}")
            # Usamos el branding service para poner verv.io en el centro con opacidad suave
            output_path = await asyncio.to_thread(
                branding_service.apply_branding,
                video_path=output_path,
                text="verv.io",
                text_position="center"
            )
        
        await db.videos.update_one({"_id": video_record["_id"]}, {"$set": {"progress": 98, "status_message": "Finalizando y optimizando archivo..."}})

        # Extraer metadatos completos del video procesado (runs ffprobe)
        processed_metadata = await asyncio.to_thread(extract_video_metadata, output_path)
        
        # Validar archivo procesado
        validation_result = await asyncio.to_thread(validate_video_file, output_path)
        
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
        
        if await asyncio.to_thread(generate_thumbnail, output_path, thumbnail_path):
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
        
        if await asyncio.to_thread(generate_preview_gif, output_path, preview_gif_path):
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
        if await storage_service.upload_file(output_path, final_object_name):
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

            # Eliminar solo archivos temporales generados (no el original si no está en tmp)
            temp_to_clean = [output_path]
            # No borrar input_file si es el archivo original del usuario
            cleanup_temp_files(temp_to_clean)

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

def apply_smart_crop(video_path: str, video_id: str, selection_data: Dict[str, Any] = None, watermark_mode: str = None) -> str:
    """
    Aplica recorte INTELIGENTE DINÁMICO con seguimiento de sujetos y personas de respaldo.
    Garantiza formato 9:16 sin distorsión y centrado perfecto.
    
    watermark_mode:
      - None:      Sin marca de agua (default, para uso interno del pipeline)
      - "offline": Marca de agua "VERV.IO" centrada, ocupando el ancho del video (usuario no logueado)
      - "online":  Marca de agua "VERV.IO" en esquina inferior izquierda, 5% del alto (usuario logueado)
    """
    _ensure_cv2_runtime()
    logger.info(f"Iniciando Smart Dynamic Crop para video {video_id}")
    
    # 1. Metadatos y Configuración
    cap = cv2.VideoCapture(video_path)
    vw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    # Tamaño fijo de renderizado (9:16 real basado en la altura del video)
    # Esto asegura calidad 1:1 y evita el efecto de "apretado" o zoom artificial
    render_h = vh
    render_w = int(vh * (9/16))
    if render_w > vw:
        render_w = vw
        render_h = int(vw * (16/9))
    
    # Asegurar dimensiones pares
    render_w = (render_w // 2) * 2
    render_h = (render_h // 2) * 2

    # 2. Inicializar Detectores y Trackers
    # Sujeto principal (HybridTracker)
    stabilizer = Stabilizer(alpha=0.15) 
    engine = HybridTrackerEngine(stabilizer=stabilizer)
    
    # Personas de respaldo (MediaPipe)
    try:
        mp_detector = MediaPipeDetector()
    except FileNotFoundError as e:
        logger.warning(
            "MediaPipe deshabilitado por modelo faltante (%s: %s). "
            "Descarga pose_landmarker_full.task y colócalo en backend/models/. "
            "Fallback a centro absoluto.",
            type(e).__name__,
            e,
        )
        mp_detector = None
    except Exception as e:
        logger.warning(f"MediaPipe no disponible ({type(e).__name__}: {e}). Fallback a centro absoluto.")
        mp_detector = None

    # Datos de selección
    sel_data = selection_data or {}
    sel = SelectionRect(
        cx=sel_data.get("selection_cx", 0.5),
        cy=sel_data.get("selection_cy", 0.5),
        w=sel_data.get("selection_w", 0.3),
        h=sel_data.get("selection_h", 0.5)
    )
    request = AnalysisRequest(
        video_id=video_id,
        video_metadata=VideoMetadata(width=vw, height=vh, fps=fps),
        timestamp_sec=sel_data.get("selection_time", 0.0),
        selection_rect=sel
    )

    # 3. Análisis de Sujeto Principal
    def frames_gen():
        c = cv2.VideoCapture(video_path)
        idx = 0
        while True:
            r, f = c.read()
            if not r: break
            yield idx, idx / fps, f
            idx += 1
        c.release()

    logger.info("Analizando sujeto principal...")
    analysis = engine.analyze(frames_gen(), request)
    main_crops = analysis.crop_results

    # 4. Renderizado Final con IA de Respaldo (Perfeccionado)
    storage_path = settings.TMP_DIR
    tmp_out = os.path.join(storage_path, f"tmp_cv2_{video_id}.mp4")
    output_path = os.path.join(storage_path, f"smart_crop_{video_id}.mp4")
    
    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    out_video = cv2.VideoWriter(tmp_out, fourcc, fps, (render_w, render_h))
    
    cap = cv2.VideoCapture(video_path)
    f_idx = 0
    
    # Memoria de la cámara y persistencia de respaldo
    cam_x = vw / 2
    secondary_anchor_x = vw / 2
    frames_with_secondary = 0
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        target_x = cam_x # Inercia
        
        # PRIORIDAD 1: Sujeto principal (HybridTracker)
        if f_idx < len(main_crops) and main_crops[f_idx].subject_detected:
            box = main_crops[f_idx].detection_box
            target_x = (box.x1 + box.x2) / 2
            frames_with_secondary = 0 # Resetear persistencia de respaldo
        
        # PRIORIDAD 2: Persona secundaria con persistencia (MediaPipe)
        elif mp_detector:
            persons = mp_detector.detect(frame)
            if persons:
                # Elegimos a la persona más prominente
                best_p = max(persons, key=lambda p: (p.x2 - p.x1) * (p.y2 - p.y1))
                new_secondary_x = (best_p.x1 + best_person.x2) / 2 if 'best_person' in locals() else (best_p.x1 + best_p.x2) / 2
                
                # Si es una persona nueva o llevamos poco tiempo, actualizamos el ancla
                if frames_with_secondary == 0 or abs(new_secondary_x - secondary_anchor_x) > (vw * 0.1):
                    secondary_anchor_x = new_secondary_x
                
                target_x = secondary_anchor_x
                frames_with_secondary += 1
            else:
                frames_with_secondary = max(0, frames_with_secondary - 1)
        
        # MOVIMIENTO CINEMATOGRÁFICO:
        # Detectar si estamos cambiando de "bloque" de persona (salto > 20% del video)
        if abs(target_x - cam_x) > (vw * 0.2):
            # Transición fluida pero decidida (Alpha 0.4)
            cam_x = 0.4 * target_x + 0.6 * cam_x
        else:
            # Seguimiento suave (Alpha 0.15) para evitar micro-vibraciones
            cam_x = 0.15 * target_x + 0.85 * cam_x
        
        # Calcular ventana de recorte 9:16 (Fija sobre el eje horizontal)
        x1 = int(round(cam_x - render_w / 2))
        y1 = int(round((vh - render_h) / 2))
        
        # Ajuste vertical fino: Si el video es muy alto, subir un 5% el recorte
        # para asegurar que las frentes no se corten en tomas cercanas
        if vh > render_h:
            y1 = max(0, y1 - int(vh * 0.05))
        
        # Clamping
        x1 = max(0, min(vw - render_w, x1))
        y1 = max(0, min(vh - render_h, y1))
        
        cropped = frame[y1:y1+render_h, x1:x1+render_w]
        
        if cropped.shape[1] != render_w or cropped.shape[0] != render_h:
            cropped = cv2.resize(cropped, (render_w, render_h), interpolation=cv2.INTER_LANCZOS4)
            
        out_video.write(cropped)
        f_idx += 1
        
    cap.release()
    out_video.release()
    
    # 6. Re-codificar a H.264 (browser-compatible) + re-inyectar audio si existe + watermark
    # OpenCV VideoWriter con XVID produce MPEG-4 Part 2 que los navegadores NO pueden
    # reproducir. SIEMPRE debemos re-codificar a H.264 con FFmpeg.
    
    # --- Watermark drawtext filter ---
    def _build_watermark_filter(mode: str, vid_w: int, vid_h: int) -> str:
        """Genera el filtro drawtext de FFmpeg para la marca de agua VERV.IO."""
        if mode == "online":
            # Esquina inferior izquierda, 5% del alto total del video
            font_size = max(12, int(vid_h * 0.05))
            return (
                f"drawtext=text='VERV.IO'"
                f":fontsize={font_size}"
                f":fontcolor=white@0.5"
                f":x=({font_size}*0.3)"
                f":y=h-th-({font_size}*0.3)"
                f":font='sans-serif'"
            )
        else:
            # Modo offline: centrado, ocupando el ancho del video
            # Calculamos un fontsize que haga que el texto ocupe ~80% del ancho
            # "VERV.IO" tiene 7 chars, cada char ~0.6x fontsize de ancho
            font_size = max(20, int(vid_w / (7 * 0.6) * 0.8))
            return (
                f"drawtext=text='VERV.IO'"
                f":fontsize={font_size}"
                f":fontcolor=white@0.35"
                f":x=(w-tw)/2"
                f":y=(h-th)/2"
                f":font='sans-serif'"
            )
    
    wm_filter = _build_watermark_filter(watermark_mode, render_w, render_h) if watermark_mode else None
    
    try:
        # Verificamos si el video original tiene audio
        has_audio = False
        try:
            probe = ffmpeg.probe(video_path)
            has_audio = any(s['codec_type'] == 'audio' for s in probe.get('streams', []))
        except Exception as probe_err:
            logger.warning(f"No se pudo analizar el audio de {video_path}: {probe_err}")

        if has_audio:
            if wm_filter:
                logger.info(f"Re-codificando a H.264 + audio + watermark ({watermark_mode}) desde: {video_path}")
                import subprocess as _sp
                cmd = [
                    "ffmpeg", "-y",
                    "-i", tmp_out,
                    "-i", video_path,
                    "-map", "0:v:0", "-map", "1:a:0",
                    "-vf", wm_filter,
                    "-vcodec", "libx264",
                    "-acodec", "aac",
                    "-preset", "fast",
                    "-crf", "23",
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
                    "-shortest",
                    "-b:a", "192k",
                    output_path
                ]
                result = _sp.run(cmd, capture_output=True)
                if result.returncode != 0:
                    stderr = result.stderr.decode() if result.stderr else "Error desconocido"
                    raise Exception(f"FFmpeg watermark+audio failed: {stderr}")
            else:
                logger.info(f"Re-codificando a H.264 + audio desde: {video_path}")
                input_v = ffmpeg.input(tmp_out)
                input_a = ffmpeg.input(video_path)
                (
                    ffmpeg
                    .output(
                        input_v.video,
                        input_a.audio,
                        output_path,
                        vcodec="libx264",
                        acodec="aac",
                        preset="fast",
                        crf=23,
                        pix_fmt="yuv420p",
                        movflags="+faststart",
                        shortest=None,
                        **{"b:a": "192k"}
                    )
                    .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
                )
        else:
            wm_label = f" + watermark ({watermark_mode})" if wm_filter else ""
            logger.info(f"Re-codificando a H.264{wm_label} (sin audio)")
            output_kwargs = dict(
                vcodec="libx264",
                preset="fast",
                crf=23,
                pix_fmt="yuv420p",
                movflags="+faststart",
                an=None,
            )
            if wm_filter:
                output_kwargs["vf"] = wm_filter
            (
                ffmpeg
                .input(tmp_out)
                .output(
                    output_path,
                    **output_kwargs,
                )
                .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
            )

        if os.path.exists(tmp_out):
            os.remove(tmp_out)

    except ffmpeg.Error as e:
        stderr = e.stderr.decode() if e.stderr else "Error desconocido de FFmpeg"
        logger.error(f"FALLO EN FFmpeg AL RE-CODIFICAR: {stderr}")
        # Fallback: intentar re-codificar solo video (sin audio) como última opción
        try:
            logger.warning("Intentando fallback: re-codificar solo video sin audio...")
            (
                ffmpeg
                .input(tmp_out)
                .output(
                    output_path,
                    vcodec="libx264",
                    preset="fast",
                    crf=23,
                    pix_fmt="yuv420p",
                    movflags="+faststart",
                    an=None,
                )
                .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
            )
            if os.path.exists(tmp_out):
                os.remove(tmp_out)
        except Exception as fallback_err:
            logger.error(f"Fallback FFmpeg también falló: {fallback_err}")
            # Último recurso: renombrar el archivo XVID (no ideal, pero evita crash)
            if os.path.exists(tmp_out) and not os.path.exists(output_path):
                os.rename(tmp_out, output_path)
    except Exception as e:
        logger.error(f"Error inesperado en re-codificación: {e}")
        if os.path.exists(tmp_out) and not os.path.exists(output_path):
            os.rename(tmp_out, output_path)

    return output_path

def add_subtitles(video_path: str, video_id: str) -> str:
    """
    Añade subtítulos al video usando Whisper para transcripción
    """
    logger.info(f"Añadiendo subtítulos al video: {video_id}")

    # Generar subtítulos usando Whisper
    subtitles = subtitle_generator_service.generate_subtitles(video_path)

    if not subtitles:
        logger.warning("No se generaron subtítulos (Whisper no disponible o audio vacío). Saltando paso de quemado de subtítulos.")
        return video_path

    # Crear archivo de subtítulos SRT
    storage_path = settings.TMP_DIR
    srt_path = os.path.normpath(os.path.join(storage_path, f"subtitles_{video_id}.srt"))
    subtitle_generator_service.save_srt_file(subtitles, srt_path)

    # Aplicar subtítulos al video usando FFmpeg
    output_path = os.path.join(storage_path, f"subtitled_{video_id}.mp4")

    try:
        # Usar rutas relativas para evitar problemas con C: y escapes en Windows
        rel_srt_path = os.path.relpath(srt_path)
        clean_srt_path = rel_srt_path.replace("\\", "/")
        
        # IMPORTANTE: Mapear explícitamente video (con filtro) y audio (copia directa)
        input_stream = ffmpeg.input(video_path)
        video = input_stream.video.filter("subtitles", filename=clean_srt_path)
        audio = input_stream.audio
        
        (
            ffmpeg
            .output(video, audio, output_path, 
                    vcodec='libx264', 
                    acodec='copy', # Copiamos el audio sin procesar para mantener calidad y velocidad
                    pix_fmt='yuv420p')
            .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as e:
        stderr = e.stderr.decode() if e.stderr else "Sin detalles"
        logger.error(f"Error en FFmpeg durante subtítulos: {stderr}")
        # Si falla el quemado de subtítulos, devolvemos el video original sin subtítulos en lugar de fallar todo el proceso
        return video_path
    finally:
        # Eliminar archivo SRT temporal si existe
        if os.path.exists(srt_path):
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

def generate_tracked_clip(input_path: str, video_id: str, clip_data: Dict[str, Any], selection: Dict[str, Any], clip_idx: int) -> str:
    """
    Extrae un clip temporal del video y le aplica tracking dinámico.
    """
    start = clip_data.get("start", 0.0)
    end = clip_data.get("end", 5.0)
    duration = end - start
    
    storage_path = settings.TMP_DIR
    temp_clip = os.path.join(storage_path, f"tmp_clip_{video_id}_{clip_idx}.mp4")
    output_clip = os.path.join(storage_path, f"viral_clip_{video_id}_{clip_idx}.mp4")

    # 1. Extraer fragmento temporal del video original (usando FFmpeg rápido)
    try:
        (
            ffmpeg
            .input(input_path, ss=start, t=duration)
            .output(temp_clip, vcodec='libx264', acodec='copy')
            .run(overwrite_output=True, quiet=True)
        )
    except Exception as e:
        logger.error(f"Error extrayendo fragmento temporal: {e}")
        return None

    # 2. Aplicar Tracking Dinámico sobre ese fragmento
    # AJUSTE CRÍTICO: La selección original debe ser relativa al inicio del clip (t=0)
    # para que el tracker la encuentre de inmediato.
    adjusted_selection = selection.copy()
    original_sel_time = selection.get("selection_time", 0.0)
    
    # Si la selección ocurrió dentro de este clip, la movemos a su tiempo relativo.
    # Si fue antes, la ponemos en t=0. Si fue después, t=0 (el tracker la buscará).
    if original_sel_time >= start and original_sel_time <= end:
        adjusted_selection["selection_time"] = original_sel_time - start
    else:
        adjusted_selection["selection_time"] = 0.0

    unique_id = f"{video_id}_clip_{clip_idx}"
    cropped_clip = apply_smart_crop(temp_clip, unique_id, adjusted_selection)
    
    # 3. Añadir subtítulos al clip individual
    final_clip = add_subtitles(cropped_clip, unique_id)
    
    # --- MARCA DE AGUA EN CLIPS INDIVIDUALES ---
    if not selection.get("is_premium", False):
        logger.info(f"Aplicando marca de agua al clip: {unique_id}")
        final_clip = branding_service.add_text_overlay(
            final_clip, 
            text="verv.io", 
            position="center", 
            is_watermark=True
        )
    
    # Limpieza: Si final_clip es distinto a cropped_clip, borrar el intermedio
    if final_clip != cropped_clip and os.path.exists(cropped_clip):
        os.remove(cropped_clip)
        
    if os.path.exists(temp_clip): os.remove(temp_clip)
    return final_clip

def merge_clips(clip_paths: list, video_id: str) -> str:
    """
    Une varios clips de video en uno solo (Full Montage).
    """
    if not clip_paths: return None
    if len(clip_paths) == 1: return clip_paths[0]

    storage_path = settings.TMP_DIR
    output_path = os.path.join(storage_path, f"full_montage_{video_id}.mp4")
    
    # Crear archivo de lista para FFmpeg concat
    list_path = os.path.join(storage_path, f"list_{video_id}.txt")
    with open(list_path, 'w') as f:
        for path in clip_paths:
            # FFmpeg requiere rutas escapadas en el archivo de texto
            clean_path = path.replace('\\', '/')
            f.write(f"file '{clean_path}'\n")

    try:
        (
            ffmpeg
            .input(list_path, format='concat', safe=0)
            .output(output_path, vcodec='libx264', acodec='aac', audio_bitrate='192k')
            .run(overwrite_output=True, quiet=True)
        )
    except Exception as e:
        logger.error(f"Error uniendo clips: {e}")
        return clip_paths[0]
    finally:
        if os.path.exists(list_path): os.remove(list_path)

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