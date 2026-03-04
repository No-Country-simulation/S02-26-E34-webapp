from app.core.config import settings
from google import genai

print("--- MODELOS DISPONIBLES ---")
try:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    for m in client.models.list():
        print(f"Nombre: {m.name}, Título: {m.display_name}")
except Exception as e:
    print(f"Error al listar modelos: {e}")
