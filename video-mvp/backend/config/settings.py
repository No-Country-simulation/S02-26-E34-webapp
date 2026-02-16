# backend/config/settings.py
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "videodb")

    # Storage
    CLOUDFLARE_R2_ACCESS_KEY_ID: str = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID", "")
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: str = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "")
    CLOUDFLARE_R2_ENDPOINT_URL: str = os.getenv("CLOUDFLARE_R2_ENDPOINT_URL", "")
    CLOUDFLARE_R2_BUCKET_NAME: str = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "")

    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_S3_BUCKET_NAME: str = os.getenv("AWS_S3_BUCKET_NAME", "")
    AWS_DEFAULT_REGION: str = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

    # Application
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Video Converter API"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))


    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    TMP_DIR: str = os.path.join(BASE_DIR, "tmp")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Video processing
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    MAX_VIDEO_DURATION_SECONDS: int = 180  # 3 minutos
    SUPPORTED_FORMATS: list = ["mp4", "mov", "avi", "mkv"]

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()