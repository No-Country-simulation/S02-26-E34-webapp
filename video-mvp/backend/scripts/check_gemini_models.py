from app.core.config import settings

try:
    from google import genai as google_genai
except ImportError:
    google_genai = None

try:
    import google.generativeai as legacy_genai
except ImportError:
    legacy_genai = None

print("--- MODELOS DISPONIBLES ---")
try:
    if google_genai is not None:
        client = google_genai.Client(api_key=settings.GEMINI_API_KEY)
        for m in client.models.list():
            print(f"Nombre: {m.name}, Título: {m.display_name}")
    elif legacy_genai is not None:
        legacy_genai.configure(api_key=settings.GEMINI_API_KEY)
        for m in legacy_genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"Nombre: {m.name}, Título: {m.display_name}")
    else:
        print("No hay SDK de Gemini instalado")
except Exception as e:
    print(f"Error al listar modelos: {e}")
