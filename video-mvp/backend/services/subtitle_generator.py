# backend/services/subtitle_generator.py - Modified to handle missing dependencies gracefully
import os
import logging
from typing import List, Dict, Any
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class SubtitleGeneratorService:
    def __init__(self, model_size: str = "base"):
        """
        Inicializa el servicio de generación de subtítulos
        """
        self.model_size = model_size
        self.model = None
        
        # Check if whisper is available
        try:
            import whisper
            self.whisper_available = True
            self.whisper_module = whisper
        except ImportError:
            logger.warning("Whisper not available, subtitle generation will be disabled")
            self.whisper_available = False

    def load_model(self):
        """
        Carga el modelo Whisper
        """
        if not self.whisper_available:
            logger.info("Whisper not available, skipping model loading")
            return
            
        try:
            self.model = self.whisper_module.load_model(self.model_size)
            logger.info(f"Modelo Whisper '{self.model_size}' cargado exitosamente")
        except Exception as e:
            logger.error(f"Error al cargar el modelo Whisper: {e}")
            raise

    def generate_subtitles(self, video_path: str, language: str = "es") -> List[Dict[str, Any]]:
        """
        Genera subtítulos para un video
        """
        if not self.whisper_available or self.model is None:
            logger.warning("Whisper not available, returning empty subtitles")
            # Return a mock subtitle list
            return []

        try:
            # Transcribir el video
            result = self.model.transcribe(video_path, language=language)

            subtitles = []
            for i, segment in enumerate(result['segments']):
                subtitle = {
                    'id': i + 1,
                    'start': segment['start'],
                    'end': segment['end'],
                    'text': segment['text'].strip(),
                    'words': segment.get('words', [])
                }
                subtitles.append(subtitle)

            logger.info(f"Generados {len(subtitles)} segmentos de subtítulos para {video_path}")
            return subtitles

        except Exception as e:
            logger.error(f"Error generando subtítulos para {video_path}: {e}")
            # Return empty list on error
            return []

    def save_srt_file(self, subtitles: List[Dict[str, Any]], output_path: str):
        """
        Guarda los subtítulos en formato SRT
        """
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                for subtitle in subtitles:
                    # Escribir número de subtítulo
                    f.write(f"{subtitle['id']}\n")

                    # Escribir tiempo de inicio y fin
                    start_time = self.format_time(subtitle['start'])
                    end_time = self.format_time(subtitle['end'])
                    f.write(f"{start_time} --> {end_time}\n")

                    # Escribir texto
                    f.write(f"{subtitle['text']}\n")

                    # Línea vacía para separar subtítulos
                    f.write("\n")

            logger.info(f"Archivo SRT guardado en: {output_path}")

        except Exception as e:
            logger.error(f"Error guardando archivo SRT en {output_path}: {e}")
            raise

    def format_time(self, seconds: float) -> str:
        """
        Formatea tiempo en segundos a formato SRT (HH:MM:SS,mmm)
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)

        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"

    def save_vtt_file(self, subtitles: List[Dict[str, Any]], output_path: str):
        """
        Guarda los subtítulos en formato VTT
        """
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("WEBVTT FILE\n\n")  # Encabezado VTT

                for subtitle in subtitles:
                    start_time = self.format_time_vtt(subtitle['start'])
                    end_time = self.format_time_vtt(subtitle['end'])

                    f.write(f"{start_time} --> {end_time}\n")
                    f.write(f"{subtitle['text']}\n\n")

            logger.info(f"Archivo VTT guardado en: {output_path}")

        except Exception as e:
            logger.error(f"Error guardando archivo VTT en {output_path}: {e}")
            raise

    def format_time_vtt(self, seconds: float) -> str:
        """
        Formatea tiempo en segundos a formato VTT (HH:MM:SS.mmm)
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)

        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millisecs:03d}"

# Instancia global del servicio
subtitle_generator_service = SubtitleGeneratorService()