# backend/api/endpoints/download.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
import os
from models.database import get_database
from models.video import VideoStatusResponse, VideoStatus, VideoMetadataResponse
from bson import ObjectId
from services.statistics_service import StatisticsService
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()

@router.get("/download/{video_id}")
async def download_video(video_id: str, background_tasks: BackgroundTasks):
    """
    Endpoint para descargar un video procesado
    """
    # Buscar video en la base de datos (intentar como ObjectId y como string para compatibilidad)
    db = get_database()
    video_record = await db.videos.find_one({"_id": ObjectId(video_id)})
    if not video_record:
        video_record = await db.videos.find_one({"_id": video_id})
 
    if not video_record:
        raise HTTPException(status_code=404, detail="Video no encontrado")

    if not video_record.get("processed_file_path"):
        raise HTTPException(status_code=404, detail="Video aún no procesado")

    if not os.path.exists(video_record["processed_file_path"]):
        raise HTTPException(status_code=404, detail="Archivo de video no encontrado")

    # Registrar la descarga en segundo plano
    background_tasks.add_task(StatisticsService.increment_download_count, video_id)

    return FileResponse(
        path=video_record["processed_file_path"],
        media_type="video/mp4",
        filename=f"converted_{video_id}.mp4"
    )

@router.get("/status/{video_id}", response_model=VideoStatusResponse)
async def get_processing_status(video_id: str):
    """
    Endpoint para verificar el estado de procesamiento de un video
    """
    db = get_database()
    video_record = await db.videos.find_one({"_id": ObjectId(video_id)})
    if not video_record:
        video_record = await db.videos.find_one({"_id": video_id})
 
    if not video_record:
        raise HTTPException(status_code=404, detail="Video no encontrado")

    status_response = VideoStatusResponse(
        video_id=video_id,
        status=video_record["status"],
        message=video_record.get("status_message") or get_status_message(video_record["status"]),
        progress=video_record.get("progress", 0)
    )

    if video_record["status"] == VideoStatus.PROCESSED and video_record.get("processed_file_path"):
        status_response.download_url = f"/api/v1/download/{video_id}"

    return status_response

@router.get("/video/{video_id}", response_model=VideoMetadataResponse)
async def get_video_info(video_id: str, background_tasks: BackgroundTasks):
    """
    Endpoint para obtener información detallada de un video
    """
    db = get_database()
    
    # Buscar el video en la base de datos
    video = await db.videos.find_one({"_id": ObjectId(video_id)})
    
    if not video:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    # Registrar la vista en segundo plano
    background_tasks.add_task(StatisticsService.increment_view_count, video_id)
    
    # Devolver información del video
    return VideoMetadataResponse(
        id=str(video["_id"]),
        filename=video["filename"],
        original_filename=video["original_filename"],
        duration_seconds=video["duration_seconds"],
        width=video["width"],
        height=video["height"],
        status=video["status"],
        created_at=video["created_at"],
        thumbnail_path=video.get("thumbnail_path"),
        view_count=video.get("view_count", 0),
        quality_score=video.get("quality_score", 0.0),
        user_id=str(video.get("user_id", "")),
        category=video.get("category"),
        tags=video.get("tags", [])
    )

def get_status_message(status: str) -> str:
    """
    Devuelve un mensaje descriptivo según el estado
    """
    messages = {
        VideoStatus.UPLOADED.value: "Video subido, esperando procesamiento",
        VideoStatus.PROCESSING.value: "El video está siendo procesado",
        VideoStatus.PROCESSED.value: "Video procesado exitosamente",
        VideoStatus.FAILED.value: "Hubo un error al procesar el video"
    }
    return messages.get(status, "Estado desconocido")