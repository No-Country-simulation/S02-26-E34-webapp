# Verv.io - Video 16:9 → 9:16

Verv.io es una plataforma SaaS para convertir videos horizontales a formato vertical con flujo completo de autenticación, procesamiento y descarga.

![Verv.io Preview](preview.png)

## 🚀 Estado actual del producto

- **Editor web** para cargar video, ajustar marco 9:16, recortar clip y lanzar procesamiento.
- **Pipeline backend** con upload streaming, validaciones de formato/tamaño/duración y procesamiento asíncrono.
- **Seguimiento de estado** con polling de progreso y descarga del resultado final.
- **Autenticación** con email/password, Google OAuth y refresh de sesión JWT.
- **Gestión de usuarios** (perfil, estadísticas y panel admin con aprobación/rechazo/roles).
- **Observabilidad básica** con endpoints de salud, caché y storage.

## 🏗️ Estructura del repositorio

```text
video-mvp/
├── frontend/    # Next.js 16 + React 19 + Tailwind v4
├── backend/     # FastAPI + MongoDB + Redis + FFmpeg
├── data-app/    # Scripts y utilidades de análisis
└── skills/      # Recursos auxiliares para agentes
```

## 🛠️ Stack resumido

- **Frontend**: Next.js 16, React 19, TypeScript, Zustand, Tailwind CSS v4.
- **Backend**: FastAPI, MongoDB (Motor), Redis, FFmpeg/ffprobe, OpenCV, MediaPipe, Whisper.

## 🚦 Inicio rápido

### 1) Backend

```bash
cd video-mvp/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

### 2) Frontend

```bash
cd video-mvp/frontend
npm install
cp .env.example .env.local
npm run dev
```

Con esto:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

## 📚 Documentación por módulo

- [README Frontend](video-mvp/frontend/README.md)
- [README Backend](video-mvp/backend/README.md)

---
Proyecto Verv.io - conversión vertical enfocada en flujo MVP real.
