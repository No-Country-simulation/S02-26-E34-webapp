# backend/app/api/endpoints/upload.py (mejorado)
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import Optional
import uuid
import os
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.video import VideoMetadataCreate, VideoDB
from ...services.video_processor import process_video_task

router = APIRouter()

@router.post("/upload/")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = None,
    add_subtitles: bool = False,
    add_branding: bool = False,
    db: Session = Depends(get_db)
):
    """
    Endpoint para subir un video y añadirlo a la cola de procesamiento
    """
    # Validar tipo de archivo
    if not file.content_type or not file.content_type.startswith("video/"):
        # Permitir algunos tipos comunes si el navegador no envía el content-type correcto
        extension = file.filename.split('.')[-1].lower()
        if extension not in ['mp4', 'mov', 'avi', 'mkv']:
            raise HTTPException(status_code=400, detail="El archivo debe ser un video")
    
    # Validar tamaño (máximo 100MB)
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > 100 * 1024 * 1024:  # 100MB
        raise HTTPException(status_code=400, detail="El video excede el tamaño máximo de 100MB")
    
    # Generar ID único para el video
    video_id = str(uuid.uuid4())
    
    # Crear directorio temporal si no existe
    storage_path = settings.TMP_DIR
    os.makedirs(storage_path, exist_ok=True)
    
    # Guardar archivo temporalmente
    temp_file_path = os.path.join(storage_path, f"{video_id}_{file.filename}")
    with open(temp_file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Crear registro en la base de datos
    video_record = VideoDB(
        id=video_id,
        original_filename=file.filename,
        title=title or file.filename,
        original_file_path=temp_file_path,
        add_subtitles=add_subtitles,
        add_branding=add_branding,
        status="uploaded"
    )
    
    db.add(video_record)
    db.commit()
    db.refresh(video_record)
    
    # Intentar usar Celery si está configurado, de lo contrario usar BackgroundTasks
    try:
        from ...services.video_processor import celery_app
        # Si redis está levantado, usamos Celery
        process_video_task.delay(video_id)
        print(f"Tarea enviada a Celery: {video_id}")
    except Exception as e:
        print(f"No se pudo usar Celery, usando BackgroundTasks: {e}")
        background_tasks.add_task(process_video_task, video_id)
    
    return {
        "video_id": video_id,
        "filename": file.filename,
        "status": "uploaded",
        "message": "Video subido exitosamente y añadido a la cola de procesamiento"
    }