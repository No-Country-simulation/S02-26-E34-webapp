# 🎬 MVP: Conversor Video Horizontal → Vertical

Plataforma SaaS que convierte automáticamente videos horizontales (16:9) en verticales (9:16) optimizados para TikTok, Instagram Reels y YouTube Shorts.

## 🚀 Características

- Subida de videos mediante arrastrar y soltar
- Conversión automática de 16:9 a 9:16
- Reencuadre inteligente con detección de rostros/objetos
- Generación de subtítulos automáticos
- Overlay de branding (logo/texto)
- Descarga de videos convertidos

## 🛠️ Tecnologías utilizadas

### Frontend

- Next.js 14 (App Router)
- React
- TypeScript
- Tailwind CSS
- react-dropzone
- video.js

### Backend

- Python
- FastAPI
- Celery
- Redis
- PostgreSQL
- FFmpeg
- YOLOv8 (Ultralytics)
- OpenCV
- Whisper.cpp

## 📁 Estructura del proyecto

```text
video-mvp/
├── frontend/               # Aplicación Next.js (Versión Actualizada)
├── backend/                # API con FastAPI (Gestionado con UV)
└── README.md
```

## 🏃‍♂️ Ejecución del proyecto

### Requisitos previos

- **Node.js 18+** y **npm**
- **UV** (Gestor de paquetes de Python)
- **PostgreSQL** y **Redis** instalados y en ejecución localmente
- **FFmpeg** instalado en el sistema

### 1. Configuración del Backend (Python + UV)

El backend utiliza `uv` para una gestión de dependencias ultrarrápida y consistente.

```bash
cd backend
# Instalar Python (si es necesario) y sincronizar dependencias
uv sync

# Configurar variables de entorno
cp .env.example .env
# Edita el archivo .env con tus credenciales locales de Base de Datos y Redis
```

**Iniciar Backend:**

```bash
uv run python main.py
# El servidor iniciará en http://localhost:8000
```

### 2. Configuración del Frontend

```bash
cd frontend
# Instalar dependencias
npm install --legacy-peer-deps

# Configurar variables de entorno
# Crea un archivo .env.local si es necesario con:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Iniciar Frontend:**

```bash
npm run dev
# La aplicación estará disponible en http://localhost:3000
```

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo LICENSE para más detalles.
