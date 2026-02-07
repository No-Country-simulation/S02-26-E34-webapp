# backend/config/ai_settings.py
import os
from pydantic_settings import BaseSettings

class AISettings(BaseSettings):
    # Configuración de modelos de IA
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    
    # Configuración de detección de objetos
    MIN_CONFIDENCE_THRESHOLD: float = float(os.getenv("MIN_CONFIDENCE_THRESHOLD", "0.5"))
    RELEVANT_CLASSES: list = os.getenv("RELEVANT_CLASSES", "person,face,human").split(",")
    
    # Configuración de subtítulos
    SUBTITLE_LANGUAGE: str = os.getenv("SUBTITLE_LANGUAGE", "es")
    SUBTITLE_FONT_SIZE: int = int(os.getenv("SUBTITLE_FONT_SIZE", "24"))
    SUBTITLE_FONT_COLOR: str = os.getenv("SUBTITLE_FONT_COLOR", "white")
    
    # Configuración de branding
    DEFAULT_LOGO_PATH: str = os.getenv("DEFAULT_LOGO_PATH", "")
    DEFAULT_BRAND_TEXT: str = os.getenv("DEFAULT_BRAND_TEXT", "Mi Marca")
    LOGO_POSITION: str = os.getenv("LOGO_POSITION", "top-right")
    TEXT_POSITION: str = os.getenv("TEXT_POSITION", "bottom-center")
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

ai_settings = AISettings()