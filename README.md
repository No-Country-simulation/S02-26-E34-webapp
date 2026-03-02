# Verv.io - Video 16:9 to 9:16 AI Converter

Verv.io es una plataforma inteligente diseñada para creadores de contenido, que automatiza la conversión de videos horizontales (16:9) a formatos verticales (9:16) optimizados para TikTok, Instagram Reels y YouTube Shorts.

![Verv.io Preview](preview.png)

## 🚀 Características Principales

- **Conversión Inteligente**: Reencuadre automático basado en el sujeto principal del video.
- **IA de Detección**: Utiliza MediaPipe y OpenCV para detección de rostros y seguimiento de sujetos.
- **Subtítulos Automáticos**: Generación de subtítulos mediante Whisper (OpenAI).
- **Branding**: Personalización con logos, colores y marcos dinámicos.
- **Métricas**: Panel de estadísticas para monitorear el uso y rendimiento.
- **Editor en Tiempo Real**: Previsualización instantánea de los ajustes de marco.

## 🏗️ Arquitectura del Proyecto

El proyecto está organizado en una estructura monorepo simplificada:

```text
video-mvp/
├── frontend/    # Aplicación Next.js (React 19, Tailwind v4)
├── backend/     # Servicio API FastAPI (Python, FFmpeg, AI Models)
├── data-app/    # Componentes de gestión de datos
└── skills/      # Definición de habilidades para agentes/AI
```

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Lógica**: React 19, TypeScript
- **Estilos**: Tailwind CSS v4 (vanguardista, alta performance)
- **Estado**: Zustand
- **Animaciones**: Framer Motion
- **Reproductor**: Video.js

### Backend
- **Framework**: FastAPI
- **Procesamiento**: FFmpeg & OpenCV
- **Modelos IA**: MediaPipe (Face/Pose Detection), Whisper (Subtitles)
- **Base de Datos**: MongoDB (Motor async driver)
- **Caché/Tareas**: Redis & Celery
- **Autenticación**: JWT & Google OAuth2

## 🚦 Inicio Rápido

Para instrucciones detalladas sobre cómo ejecutar cada componente, consulta los README específicos:

1. [Guía del Frontend](video-mvp/frontend/README.md)
2. [Guía del Backend](video-mvp/backend/README.md)

---
Desarrollado con ❤️ para la comunidad de creadores de contenido.
