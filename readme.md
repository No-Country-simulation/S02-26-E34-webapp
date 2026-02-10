# 🎬 S02-26-E34-Web App Development - MVP: Conversor Video Horizontal → Vertical

Plataforma SaaS que convierte automáticamente videos horizontales (16:9) en verticales (9:16) optimizados para TikTok, Instagram Reels y YouTube Shorts.

## 🚀 Características

- Subida de videos mediante arrastrar y soltar
- Conversión automática de 16:9 a 9:16
- Reencuadre inteligente con detección de rostros/objetos
- Generación de subtítulos automáticos
- Overlay de branding (logo/texto)
- Descarga de videos convertidos
- Indicador de estado del backend
- Manejo de errores con SweetAlert2

## 🛠️ Tecnologías utilizadas

### Frontend

- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript
- Tailwind CSS
- react-dropzone
- video.js
- SweetAlert2

### Backend

- Python 3.10+
- FastAPI
- Celery
- Redis
- **MongoDB** (migrado desde PostgreSQL para mayor flexibilidad)
- FFmpeg
- YOLOv8 (Ultralytics)
- OpenCV
- Whisper (OpenAI)

## 📁 Estructura del proyecto

```text
S02-26-E34-webapp/
├── video-mvp/              # Directorio principal del MVP
│   ├── backend/            # API con FastAPI (Gestionado con UV)
│   └── frontend/           # Aplicación Next.js (Versión Actualizada)
├── analisis.md             # Análisis del proyecto
├── readme.md               # Este archivo
└── .gitignore              # Reglas de exclusión para Git
```

## 🏃‍♂️ Ejecución del proyecto

### Requisitos previos

- **Node.js 18+** y **npm**
- **UV** (Gestor de paquetes de Python)
- **MongoDB** y **Redis** instalados y en ejecución localmente
- **FFmpeg** instalado en el sistema

### 1. Configuración del Backend (Python + UV)

El backend utiliza `uv` para una gestión de dependencias ultrarrápida y consistente.

```bash
cd video-mvp/backend
# Instalar Python (si es necesario) y sincronizar dependencias
uv sync

# Configurar variables de entorno
cp .env.example .env
# Edita el archivo .env con tus credenciales locales de MongoDB y Redis
```

**Iniciar Backend:**

```bash
uv run python main.py
# El servidor iniciará en http://localhost:8000
```

### 2. Configuración del Frontend

```bash
cd video-mvp/frontend
# Instalar dependencias
npm install

# Configurar variables de entorno
# Crea un archivo .env.local si es necesario con:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Iniciar Frontend:**

```bash
npm run dev
# La aplicación estará disponible en http://localhost:3000
```

## 🔄 Migración de PostgreSQL a MongoDB

Este proyecto fue migrado desde PostgreSQL a MongoDB para mejorar la flexibilidad del almacenamiento de datos. Las principales diferencias incluyen:

- Cambio de modelo relacional a modelo de documentos
- Eliminación de dependencias de SQLAlchemy y psycopg2
- Adición de dependencias de Motor y PyMongo
- Actualización de operaciones de base de datos para usar sintaxis asíncrona de MongoDB
- Mayor flexibilidad en el esquema de datos
- Soporte nativo para documentos complejos
- Escalabilidad horizontal

## 🎨 Mejoras del Frontend

- Implementación de SweetAlert2 para manejo de errores y mensajes
- Indicador de estado del backend con verificación automática
- Deshabilitación de funcionalidades cuando el backend está offline
- Interfaz de usuario mejorada con notificaciones amigables

## 🔧 API Endpoints

- `POST /api/v1/upload/` - Subir un video para procesamiento
- `GET /api/v1/status/{video_id}` - Verificar estado de procesamiento
- `GET /api/v1/download/{video_id}` - Descargar video procesado
- `GET /health` - Verificar estado del servicio
- `GET /` - Información del servicio

## 🧪 Pruebas

Para ejecutar pruebas unitarias:
```bash
# En el directorio backend
uv run pytest
```

## 📊 Base de Datos

### MongoDB
El sistema ahora utiliza MongoDB como base de datos principal para almacenar metadatos de videos. Esta migración proporciona:

- Mayor flexibilidad en el esquema de datos
- Soporte nativo para documentos complejos
- Escalabilidad horizontal
- Índices eficientes para consultas de metadatos

### Colecciones
La aplicación crea automáticamente la colección `videos` con los siguientes índices:
- `_id` (índice primario)
- `original_filename`
- `title`
- `status`

## 🚀 Despliegue

### Requisitos previos
- MongoDB (versión 4.0 o superior)
- Redis (para Celery)
- Python 3.10 o superior
- Node.js 18+ y npm

### Pasos para despliegue
1. Clonar el repositorio
2. Instalar dependencias del backend con `uv sync`
3. Instalar dependencias del frontend con `npm install`
4. Configurar variables de entorno en ambos `.env` (backend) y `.env.local` (frontend)
5. Asegurarse de que MongoDB y Redis estén corriendo
6. Ejecutar el backend con `uv run python main.py`
7. Ejecutar el frontend con `npm run dev`

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo LICENSE para más detalles.