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
Eres un Estratega de Contenido Viral y Editor Jefe para TikTok, Reels y Shorts con años de experiencia en retención de audiencia. 
Tu misión es analizar la siguiente transcripción y extraer los 3 momentos con mayor potencial de hacerse virales.

Para cada clip, debes garantizar esta estructura narrativa:
1. EL GANCHO (Hook): El inicio del clip debe ser impactante, una pregunta provocativa o una declaración fuerte que detenga el scroll en los primeros 3 segundos.
2. EL DESARROLLO (Body): El núcleo del clip debe entregar valor, humor o información clave de forma rápida y fluida.
3. EL CIERRE (Payoff/Loop): El clip debe terminar en un punto climático, una resolución satisfactoria o una frase que invite a ver el video de nuevo.

REGLAS ESTRICTAS:
- DURACIÓN: Cada clip debe durar entre 15 y 55 segundos.
- INTEGRIDAD: Ajusta los tiempos de inicio (start) y fin (end) para que NO se corten palabras ni oraciones a la mitad. Busca silencios naturales.
- AUTONOMÍA: Cada clip debe ser autocontenido y entenderse perfectamente sin ver el resto del video.
- FORMATO: Devuelve ÚNICAMENTE un objeto JSON válido.

TRANSCRIPCIÓN CON MARCAS DE TIEMPO:
{formatted_transcript}

RESPUESTA JSON ESPERADA:
{{
  "clips": [
    {{
      "start": float, 
      "end": float, 
      "label": "Título viral (ej: El secreto de X)", 
      "viral_reason": "Explicación breve de la estructura: Gancho [tipo] + Valor [tema] + Cierre [tipo]"
    }}
  ]
}}
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
