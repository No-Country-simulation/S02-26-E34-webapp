# backend/test_full_pipeline.py
import os
import asyncio
import logging
import argparse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

# Importar servicios
from services.video_processor import process_video_task
from models.database import get_database
from config.settings import settings

# Configurar logging para ver todo el proceso
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

async def run_full_test(video_path, sel_cx=0.5, sel_cy=0.5, sel_w=0.4, sel_h=0.7, sel_time=0.0, is_premium=False):
    """
    Simula el proceso completo desde la subida hasta el video final.
    """
    if not os.path.exists(video_path):
        logger.error(f"Video no encontrado: {video_path}")
        return

    # 1. Conectar a la base de datos global
    from models.database import database as global_db
    await global_db.connect()
    
    # 2. Crear registro en la base de datos (Simular subida)
    logger.info(f"--- PASO 1: Creando registro de video en MongoDB (Premium: {is_premium}) ---")
    db = global_db.get_database()
    
    video_id = str(ObjectId())
    video_doc = {
        "_id": ObjectId(video_id),
        "title": "Test Video Pipeline",
        "original_file_path": os.path.abspath(video_path),
        "status": "uploaded",
        "add_subtitles": True,
        "add_branding": False,
        "is_premium": is_premium, # Usar el valor del test
        "selection_cx": sel_cx,
        "selection_cy": sel_cy,
        "selection_w": sel_w,
        "selection_h": sel_h,
        "selection_time": sel_time,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "duration_seconds": 60.0 # Valor aproximado para pruebas
    }
    
    await db.videos.insert_one(video_doc)
    logger.info(f"Video registrado con ID: {video_id}")

    # 2. Ejecutar el Orquestador (Pipeline Completo)
    logger.info("--- PASO 2: Iniciando el Pipeline (Whisper -> Gemini -> Dynamic Tracking) ---")
    try:
        # Llamamos directamente a la tarea (sin Celery para simplificar el test)
        result = await process_video_task(video_id)
        
        if result.get("status") == "processed":
            logger.info("--- PRUEBA EXITOSA ---")
            logger.info(f"Video final generado en: {result.get('output_path')}")
            logger.info("Revisa la carpeta tmp/ para ver los clips virales individuales y el montaje final.")
        else:
            logger.error(f"Error en el pipeline: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Fallo crítico en el test: {e}")
    finally:
        await global_db.disconnect()

def build_parser():
    p = argparse.ArgumentParser(description="Test completo del Pipeline de Video")
    p.add_argument("--video", required=True, help="Ruta al video .mp4 real para la prueba")
    p.add_argument("--cx", "--sel-cx", type=float, default=0.5, help="Centro X de selección (0.0 a 1.0)")
    p.add_argument("--cy", "--sel-cy", type=float, default=0.5, help="Centro Y de selección (0.0 a 1.0)")
    p.add_argument("--w", "--sel-w", type=float, default=0.3, help="Ancho de selección (0.0 a 1.0)")
    p.add_argument("--h", "--sel-h", type=float, default=0.5, help="Alto de selección (0.0 a 1.0)")
    p.add_argument("--time", "--sel-time", type=float, default=0.0, help="Segundo en el que se hizo la selección")
    p.add_argument("--premium", action="store_true", help="Simular usuario logueado (sin marca de agua)")
    return p

if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()
    
    # Ejecutar loop asíncrono
    asyncio.run(run_full_test(
        args.video, 
        sel_cx=args.cx, 
        sel_cy=args.cy,
        sel_w=args.w,
        sel_h=args.h,
        sel_time=args.time,
        is_premium=args.premium
    ))
