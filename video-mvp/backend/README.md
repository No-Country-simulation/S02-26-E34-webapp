# Verv.io - Video Processor Backend (FastAPI)

El backend de Verv.io es el motor central que procesa videos, detecta sujetos mediante IA y genera las versiones verticales listas para redes sociales.

## 🚀 Características del Backend

- **Procesamiento de Video**: Gestión de colas y procesamiento asíncrono.
- **IA de Detección**:
  - Detección de rostros y seguimiento con **MediaPipe**.
  - Detección de objetos y sujetos relevantes con **OpenCV**.
- **Generación de Subtítulos**: Integración con **OpenAI Whisper** para transcripción automática.
- **Branding Dinámico**: Generación de marcos, logos y elementos visuales con **FFmpeg**.
- **API RESTful**: Endpoints modulares para gestión de videos, usuarios y estadísticas.
- **Autenticación**: Sistema robusto con JWT y Google OAuth2.
- **Rate Limiting**: Protección contra abusos mediante **Redis**.

## 🛠️ Stack Tecnológico

- **Lenguaje**: Python 3.10+
- **Framework API**: FastAPI
- **Base de Datos**: MongoDB (Motor async)
- **Caché/Rate Limit**: Redis
- **Procesamiento Gráfico**: FFmpeg-python, OpenCV, Numpy, Pillow
- **IA/ML**: MediaPipe, OpenAI Whisper
- **Tareas Asíncronas**: Celery
- **Validación**: Pydantic v2

## 📦 Instalación y Configuración

1. Asegúrate de tener **Python 3.10+** y **FFmpeg** instalados en el sistema.

2. Crea un entorno virtual y actívalo:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # En Windows: .venv\Scripts\activate
   ```

3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Configura las variables de entorno:
   ```bash
   cp .env.example .env
   # Edita .env con tus claves de MongoDB, Redis, etc.
   ```

5. Inicia el servidor:
   ```bash
   python main.py
   ```

## 🎥 Flujo de Procesamiento

1. **Subida**: El usuario sube un video MP4.
2. **Análisis**: MediaPipe detecta rostros y sujetos en cada frame clave.
3. **Cálculo de Marco**: Se determina el área vertical (9:16) óptima para no perder lo esencial.
4. **Procesado**: FFmpeg aplica el recorte, escala y opcionalmente añade subtítulos y branding.
5. **Exportación**: El archivo final se almacena y se notifica al usuario.

## 📁 Endpoints Principales

- `POST /api/v1/endpoints/upload/`: Subida de videos.
- `GET /api/v1/endpoints/video/{id}`: Obtener detalles y estado del video.
- `GET /api/v1/endpoints/stats/`: Métricas globales del sistema.
- `GET /api/v1/endpoints/user/profile`: Gestión de datos de usuario.

---
Verv.io Backend - Potenciando el contenido vertical con IA.