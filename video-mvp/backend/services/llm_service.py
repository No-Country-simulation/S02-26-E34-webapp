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
        self.model_name = settings.LLM_MODEL
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        else:
            self.model = None
            logger.warning("GEMINI_API_KEY no configurada. El análisis viral estará desactivado.")

    def find_viral_moments(self, transcription_data: Dict[str, Any], max_total_duration: int = 180) -> List[Dict[str, Any]]:
        """
        Envía la transcripción a Gemini para identificar los segmentos más virales.
        Si no hay API KEY, devuelve clips genéricos para no romper el flujo del equipo.
        """
        if not self.model:
            logger.info("Modo MOCK: Devolviendo clips genéricos por falta de GEMINI_API_KEY.")
            return [
                {"start": 0.0, "end": 15.0, "label": "Clip Inicial (Mock)", "viral_reason": "Simulación sin API Key"},
                {"start": 30.0, "end": 45.0, "label": "Clip Medio (Mock)", "viral_reason": "Simulación sin API Key"}
            ]

        segments = transcription_data.get("segments", [])
        if not segments:
            logger.warning("No hay segmentos de transcripción para analizar.")
            return []

        # Formatear segmentos para el prompt
        formatted_transcript = ""
        for s in segments:
            formatted_transcript += f"[{s['start']}-{s['end']}] {s['text']}\n"

        prompt = f"""
Eres un experto editor de contenido viral para TikTok, Reels y YouTube Shorts.
Tu tarea es analizar la siguiente transcripción de un video y seleccionar los momentos más impactantes, divertidos o informativos.

REGLAS:
1. La duración TOTAL sumada de los clips no debe exceder los {max_total_duration} segundos.
2. Cada clip debe tener sentido por sí mismo.
3. Prioriza ganchos (hooks) fuertes al inicio.
4. Devuelve la respuesta ESTRICTAMENTE en formato JSON.

TRANSCRIPCIÓN:
{formatted_transcript}

FORMATO DE SALIDA (JSON):
{{
  "viral_score": 0.95,
  "summary": "Resumen breve del video",
  "clips": [
    {{
      "start": 0.0,
      "end": 15.5,
      "label": "Gancho inicial impactante",
      "viral_reason": "Explica el beneficio principal en los primeros segundos"
    }},
    {{
      "start": 45.2,
      "end": 60.0,
      "label": "Clímax de la historia",
      "viral_reason": "Momento de alta emoción o revelación"
    }}
  ]
}}
"""

        try:
            logger.info(f"Enviando {len(segments)} segmentos a {self.model_name} para análisis viral...")
            
            # Generar contenido con Gemini
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            
            # Limpiar respuesta (a veces los LLMs incluyen markdown)
            text_response = response.text
            
            # Si Gemini no soporta response_mime_type o falla el formato, limpiamos manualmente
            if "```json" in text_response:
                text_response = re.search(r'```json\n(.*?)\n```', text_response, re.DOTALL).group(1)
            
            result = json.loads(text_response)
            clips = result.get("clips", [])
            
            logger.info(f"Análisis completado. Se identificaron {len(clips)} clips virales.")
            return clips

        except Exception as e:
            logger.error(f"Error comunicando con Gemini: {e}")
            return []

# Instancia global
llm_service = LLMService()
