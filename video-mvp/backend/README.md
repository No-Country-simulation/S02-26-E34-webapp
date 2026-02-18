# Backend del Editor de Video

Este es el backend del proyecto de edición de video que convierte videos horizontales (16:9) en verticales (9:16) optimizados para redes sociales como TikTok, Instagram Reels y YouTube Shorts.

## Características

- API RESTful construida con FastAPI
- Procesamiento de videos con FFmpeg
- Detección de rostros con MediaPipe
- Generación de subtítulos con Whisper
- Interfaz de usuario responsive

## Instalación

1. Asegúrate de tener Python 3.10 o superior instalado
2. Instala las dependencias con `pip install -r requirements.txt`
3. Configura las variables de entorno en un archivo `.env`
4. Optimización de caché para `uv` (opcional pero recomendado si trabajas en múltiples discos):
   ```bash
   export UV_CACHE_DIR="/path/to/disk/.uv_cache"
   ```
5. Inicia el servidor con `python main.py`

## Variables de Entorno

- `MONGODB_URL`: URL de conexión a MongoDB
- `MONGODB_DATABASE`: Nombre de la base de datos
- `TMP_DIR`: Directorio para archivos temporales
- `MAX_FILE_SIZE`: Tamaño máximo de archivo en bytes
- `MEDIAPIPE_MIN_DETECTION_CONFIDENCE`: Confianza mínima para detección de rostros
- `WHISPER_MODEL_SIZE`: Tamaño del modelo Whisper
- `HOST`: Host para el servidor (ej. 0.0.0.0)
- `PORT`: Puerto para el servidor (ej. 8001)

## Endpoints

- `POST /upload/`: Subir un video para procesamiento
- `GET /status/{video_id}`: Verificar el estado de procesamiento
- `GET /download/{video_id}`: Descargar el video procesado
- `GET /health`: Verificar el estado del servicio