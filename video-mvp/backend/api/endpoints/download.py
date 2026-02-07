# backend/api/endpoints/download.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
import os
from sqlalchemy.orm import Session
from models.database import get_db
from models.video import VideoDB, VideoStatusResponse

router = APIRouter()

@router.get("/download/{video_id}")
async def download_video(video_id: str, db: Session = Depends(get_db)):
    """
    Endpoint para descargar un video procesado
    """
    # Buscar video en la base de datos
    video_record = db.query(VideoDB).filter(VideoDB.id == video_id).first()
    
    if not video_record:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    if not video_record.processed_file_path:
        raise HTTPException(status_code=404, detail="Video aún no procesado")
    
    if not os.path.exists(video_record.processed_file_path):
        raise HTTPException(status_code=404, detail="Archivo de video no encontrado")
    
    return FileResponse(
        path=video_record.processed_file_path,
        media_type="video/mp4",
        filename=f"converted_{video_id}.mp4"
    )

@router.get("/status/{video_id}", response_model=VideoStatusResponse)
async def get_processing_status(video_id: str, db: Session = Depends(get_db)):
    """
    Endpoint para verificar el estado de procesamiento de un video
    """
    video_record = db.query(VideoDB).filter(VideoDB.id == video_id).first()
    
    if not video_record:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    
    status_response = VideoStatusResponse(
        video_id=video_id,
        status=video_record.status,
        message=get_status_message(video_record.status)
    )
    
    if video_record.status == "completed" and video_record.processed_file_path:
        status_response.download_url = f"/api/v1/download/{video_id}"
    
    return status_response

def get_status_message(status: str) -> str:
    """
    Devuelve un mensaje descriptivo según el estado
    """
    messages = {
        "uploaded": "Video subido, esperando procesamiento",
        "processing": "El video está siendo procesado",
        "completed": "Video procesado exitosamente",
        "failed": "Hubo un error al procesar el video"
    }
    return messages.get(status, "Estado desconocido")