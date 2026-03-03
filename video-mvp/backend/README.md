# Verv.io - Backend (FastAPI)

Backend de Verv.io para autenticación, gestión de usuarios, carga/procesamiento de videos y entrega de resultados convertidos.

## 🚀 Qué está implementado hoy

- **API versionada** con prefijo `/api/v1`.
- **Upload de video por streaming** (chunks de 8KB), validación de formato/tamaño/duración con `ffprobe`.
- **Procesamiento asíncrono** en segundo plano con actualización de estado y progreso.
- **Descarga de resultado** cuando el video finaliza (`processed`).
- **Auth completa**: registro, login email/password, Google OAuth, refresh de sesión JWT.
- **Gestión de usuarios**: perfil, cookies, stats del usuario y endpoints de administración (aprobar/rechazar/roles).
- **Infra operativa**: MongoDB + Redis, CORS configurable, rate limiting, validación de requests, health checks.

## 🛠️ Stack

- Python 3.10+
- FastAPI + Uvicorn
- MongoDB (Motor/PyMongo)
- Redis
- FFmpeg / ffprobe
- OpenCV + MediaPipe
- Whisper + Gemini (según configuración)
- Pydantic v2

## 📦 Setup local

1. Ir al backend:

```bash
cd video-mvp/backend
```

2. Crear y activar entorno virtual:

```bash
python -m venv .venv
source .venv/bin/activate
```

3. Instalar dependencias:

```bash
pip install -r requirements.txt
```

4. Variables de entorno:

```bash
cp .env.example .env
```

5. Ejecutar API:

```bash
python main.py
```

> Por defecto corre en `http://localhost:8000`.

## 🔑 Endpoints principales

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/cookie-preferences`
- `PUT /api/v1/auth/cookie-preferences`

### Videos
- `POST /api/v1/upload/`
- `GET /api/v1/status/{video_id}`
- `GET /api/v1/download/{video_id}`
- `GET /api/v1/videos`
- `GET /api/v1/videos/{video_id}`
- `PATCH /api/v1/videos/{video_id}`
- `DELETE /api/v1/videos/{video_id}`

### Users
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `GET /api/v1/users/me/stats`
- `GET /api/v1/users` (admin)
- `PUT /api/v1/users/{user_id}/approve` (admin)
- `PUT /api/v1/users/{user_id}/reject` (admin)
- `PUT /api/v1/users/{user_id}/role` (admin)

### Salud / monitoreo
- `GET /health`
- `GET /api/v1/health`
- `GET /cache/stats`
- `GET /storage/status`

---
Verv.io Backend - Conversión de video vertical con API lista para producción MVP.