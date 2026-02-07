# backend/main.py (actualizado con IA)
from fastapi import FastAPI
from api.endpoints import upload, download
from models.database import engine, Base
from config.settings import settings
from config.ai_settings import ai_settings
import os

# Crear tablas en la base de datos
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Incluir routers
app.include_router(upload.router, prefix=settings.API_V1_STR, tags=["upload"])
app.include_router(download.router, prefix=settings.API_V1_STR, tags=["download"])

@app.get("/")
def read_root():
    return {
        "message": f"{settings.PROJECT_NAME} is running!",
        "ai_features": {
            "object_detection": "enabled",
            "subtitle_generation": "enabled",
            "branding_application": "enabled"
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "version": "1.0.0",
        "ai_models_loaded": {
            "yolo_model": ai_settings.YOLO_MODEL_PATH,
            "whisper_model": ai_settings.WHISPER_MODEL_SIZE
        }
    }

# Middleware para manejar CORS si es necesario
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, restringir a dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)