# backend/main.py (actualizado con IA)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.endpoints import upload, download
from api.endpoints.auth import router as auth_router
from models.database import connect_to_mongo, close_mongo_connection
from config.settings import settings
from config.ai_settings import ai_settings
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Middleware para manejar CORS
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, restringir a dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(upload.router, prefix=settings.API_V1_STR, tags=["upload"])
app.include_router(download.router, prefix=settings.API_V1_STR, tags=["download"])
app.include_router(auth_router, prefix=settings.API_V1_STR, tags=["auth"])

@app.get("/")
def read_root():
    return {
        "message": f"{settings.PROJECT_NAME} is running!",
        "database": "MongoDB",
        "ai_features": {
            "object_detection": "enabled",
            "subtitle_generation": "enabled",
            "branding_application": "enabled"
        }
    }

# Global variable to hold the database client
db_client = None

@app.get("/health")
async def health_check():
    from models.database import client, get_database
    from config.settings import settings

    # Check database connectivity
    db_status = "disconnected"
    db_details = {
        "status": db_status,
        "connection_string": settings.MONGODB_URL,
        "database_name": settings.MONGODB_DATABASE
    }

    try:
        # Check if the client is available and connected
        if client:
            # Ping the database to check connectivity
            await client.admin.command("ping")
            db_status = "connected"
            db_details["status"] = db_status
        else:
            db_details["status"] = "not_initialized"
            db_details["message"] = "Database client not initialized. Check if startup event ran."
    except Exception as e:
        db_details["status"] = f"error: {str(e)}"

    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": db_details,
        "ai_models_loaded": {
            "yolo_model": ai_settings.YOLO_MODEL_PATH,
            "whisper_model": ai_settings.WHISPER_MODEL_SIZE
        }
    }

# Also expose health check at the API versioned path for consistency
@app.get("/api/v1/health")
async def health_check_api_v1():
    return await health_check()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)