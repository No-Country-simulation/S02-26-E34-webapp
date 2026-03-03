# backend/services/transcription_service.py
import os
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self, model_size: str = "base"):
        """
        Inicializa el servicio de transcripción usando Whisper
        """
        self.model_size = model_size
        self.model = None
        self._whisper = None
        
        try:
            import whisper
            self._whisper = whisper
            self.available = True
        except ImportError:
            logger.warning("Whisper no está instalado. La transcripción no funcionará.")
            self.available = False

    def _load_model(self):
        """Carga el modelo en memoria si no está cargado."""
        if not self.available:
            return False
        
        if self.model is None:
            try:
                logger.info(f"Cargando modelo Whisper '{self.model_size}'...")
                self.model = self._whisper.load_model(self.model_size)
                return True
            except Exception as e:
                logger.error(f"Error cargando modelo Whisper: {e}")
                return False
        return True

    def transcribe(self, video_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe un video y devuelve el texto con timestamps.
        
        Args:
            video_path: Ruta al archivo de video/audio
            language: Código de idioma opcional (ej: 'es', 'en')
            
        Returns:
            Dict con:
                'text': Texto completo
                'segments': Lista de dicts con 'start', 'end', 'text'
                'language': Idioma detectado
        """
        if not self._load_model():
            return {"text": "", "segments": [], "error": "Whisper not available"}

        try:
            logger.info(f"Iniciando transcripción de: {video_path}")
            # transcribe() acepta rutas de video directamente (usa ffmpeg internamente para extraer audio)
            options = {}
            if language:
                options["language"] = language
                
            result = self.model.transcribe(video_path, **options)
            
            # Limpiamos los segmentos para que sean más ligeros para el LLM
            clean_segments = []
            for seg in result.get("segments", []):
                clean_segments.append({
                    "start": round(seg["start"], 2),
                    "end": round(seg["end"], 2),
                    "text": seg["text"].strip()
                })
                
            return {
                "text": result.get("text", "").strip(),
                "segments": clean_segments,
                "language": result.get("language", "")
            }
        except Exception as e:
            logger.error(f"Error durante la transcripción: {e}")
            return {"text": "", "segments": [], "error": str(e)}

    def save_transcription_json(self, data: Dict[str, Any], output_path: str):
        """Guarda la transcripción en un archivo JSON."""
        import json
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error guardando JSON de transcripción: {e}")
            return False

# Instancia global
transcription_service = TranscriptionService(model_size="base")
