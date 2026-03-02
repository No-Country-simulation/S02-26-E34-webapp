# backend/services/llm_service.py
import os
import json
import logging
import re
from typing import List, Dict, Any
import google.generativeai as genai
from config.settings import settings

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        """
        Servicio para analizar transcripciones y encontrar momentos virales usando Google Gemini.
        """
        self.api_key = settings.GEMINI_API_KEY
        # Usamos el modelo configurado en settings
        self.model_name = settings.LLM_MODEL
        print(f"DEBUG: LLMService model_name = {self.model_name}")
        logger.info(f"LLMService iniciado con modelo: {self.model_name}")
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        else:
            self.model = None
            logger.warning("GEMINI_API_KEY no configurada.")

    def find_viral_moments(self, transcription_data: Dict[str, Any], max_total_duration: int = 180) -> List[Dict[str, Any]]:
        """
        Envía la transcripción a Gemini para identificar los segmentos más virales.
        """
        if not self.model:
            return self._get_fallback_clips()

        segments = transcription_data.get("segments", [])
        if not segments:
            return []

        formatted_transcript = ""
        for s in segments:
            formatted_transcript += f"[{s['start']:.2f} - {s['end']:.2f}] {s['text']}\n"

        prompt = f"""
Eres un editor experto de TikTok/Reels. Analiza esta transcripción y selecciona los 3 mejores momentos VIRALES.
REGLAS:
1. Los clips deben ser de diferentes partes del video (no solapados).
2. Duración por clip: entre 10 y 30 segundos.
3. Devuelve un JSON con esta estructura: {{"clips": [{{"start": float, "end": float, "label": str, "viral_reason": str}}]}}

TRANSCRIPCIÓN:
{formatted_transcript}
"""

        try:
            logger.info(f"Pidiendo a Gemini ({self.model_name}) que elija los mejores momentos...")
            # Eliminamos el MIME type forzado para mayor compatibilidad
            response = self.model.generate_content(prompt)
            text_response = response.text
            
            # Limpieza agresiva de JSON
            json_match = re.search(r'\{.*\}', text_response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
                clips = result.get("clips", [])
                if clips:
                    logger.info(f"¡Éxito! Gemini encontró {len(clips)} momentos virales.")
                    return clips
            
            logger.warning("Gemini no devolvió un formato JSON válido o no encontró clips. Usando fallback.")
            return self._get_fallback_clips()

        except Exception as e:
            if "429" in str(e):
                logger.error(f"ERROR DE CUOTA EN GEMINI: Has superado el límite de uso para el modelo {self.model_name}. Por favor, cambia el modelo en el .env (ej: gemini-flash-latest) o espera a que se reinicie la cuota.")
            else:
                logger.error(f"Error en Gemini: {e}")
            return self._get_fallback_clips()

    def _get_fallback_clips(self) -> List[Dict[str, Any]]:
        return [
            {"start": 0.0, "end": 20.0, "label": "Inicio Viral", "viral_reason": "Hook inicial"},
            {"start": 30.0, "end": 50.0, "label": "Momento Clave", "viral_reason": "Explicación central"}
        ]

# Instancia global
llm_service = LLMService()
