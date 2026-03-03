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

2. Sincronizar dependencias con UV:

```bash
uv sync
```

Instalación 100% reproducible (recomendada para clonado en otro equipo):

```bash
uv venv
source .venv/bin/activate
uv pip sync requirements.txt
```

> Evitar mezclar instalaciones manuales (`pip install ...`) fuera de `pyproject.toml` / `requirements.txt`, porque puede romper compatibilidades de FastAPI/Pydantic.

3. Variables de entorno:

```bash
cp .env.example .env
```

4. Ejecutar API (modo recomendado FastAPI/ASGI):

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> Por defecto corre en `http://localhost:8000`.

5. Ejecutar API (modo compatible):

```bash
uv run python main.py
```

> Recomendado para desarrollo y despliegue: `uv run uvicorn app.main:app ...` usa directamente el entrypoint real en `app/main.py`.

## 🗂️ Estructura (alineada a FastAPI)

- `app/`: código principal de la API (`api`, `core`, `models`, `schemas`, `services`, `repositories`, `middleware`, `utils`, `main.py`).
- `scripts/`: utilidades operativas (seed, debug, inicialización y helpers).
- `main.py`: wrapper de compatibilidad para ejecutar la app desde la raíz del backend.

## 🧪 Scripts operativos

```bash
uv run python scripts/seed_admin.py
uv run python scripts/database_init.py
uv run python scripts/check_gemini_models.py
uv run python scripts/verify_environment.py
```

## ✅ Verificación rápida post-clone

1. Verificar imports críticos y runtime OpenCV:

```bash
uv run python scripts/verify_environment.py
```

2. Verificar backend levantado desde main:

```bash
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
curl http://127.0.0.1:8000/health
```

## 🧩 Dependencias del sistema (Linux)

- `ffmpeg` y `ffprobe` deben estar instalados en el sistema.
- Sin esas herramientas, fallan validación de duración, preview y procesamiento de video.

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