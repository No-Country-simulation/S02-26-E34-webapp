import google.generativeai as genai
import os
from config.settings import settings

genai.configure(api_key=settings.GEMINI_API_KEY)
print("--- MODELOS DISPONIBLES ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Nombre: {m.name}, Título: {m.display_name}")
except Exception as e:
    print(f"Error al listar modelos: {e}")
