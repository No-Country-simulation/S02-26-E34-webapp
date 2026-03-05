# 🎬 MVP+: Conversor Video Horizontal → Vertical Inteligente

> Plataforma SaaS avanzada que utiliza IA para convertir automáticamente videos horizontales (16:9) en verticales (9:16) optimizados para TikTok, Instagram Reels y YouTube Shorts, detectando momentos virales y manteniendo el foco en el sujeto.

**Estado Actual:** ✅ **MVP+ COMPLETADO**  
**Progreso Total:** ~95% (Funcionalidades principales operativas y optimizadas)

---

## 📋 Índice

- [¿Qué se ofrece?](#qué-se-ofrece)
- [Stack Tecnológica Real](#stack-tecnológica-real)
- [Librerías de IA y Core](#librerías-de-ia-y-core)
- [Arquitectura del Pipeline](#arquitectura-del-pipeline)
- [Hitos Alcanzados](#hitos-alcanzados)
- [Diferencial Competitivo](#diferencial-competitivo)
- [Documentación Técnica](#documentación-técnica)

---

## 🎯 ¿Qué se ofrece?

| Funcionalidad                    | Descripción                                     | Estado |
| -------------------------------- | ------------------------------------------------ | ------ |
| **Subir video**            | Streaming upload (8KB chunks) para bajo consumo de RAM | ✅ |
| **IA Viral Detection**     | Análisis con **Gemini AI** para encontrar clips de alto impacto | ✅ |
| **Smart Re-framing**       | Detección y tracking de rostros con **MediaPipe + OpenCV** | ✅ |
| **Subtítulos IA**          | Transcripción automática con **Whisper AI** y quemado estilizado | ✅ |
| **Branding Dinámico**      | Overlay de logo, texto CTA y marcas de agua automáticas | ✅ |
| **Procesamiento Async**    | Cola de tareas con **Celery + Redis** para escalabilidad | ✅ |
| **Descarga Optimizada**    | MP4 vertical listo para redes sociales con perfiles móviles | ✅ |

---

## 🛠️ Stack Tecnológica (Actualizada)

| Capa                       | Tecnología             | Estado | Por qué                                                  |
| -------------------------- | ----------------------- | ------ | --------------------------------------------------------- |
| **Frontend**         | Next.js 16 (App Router) | ✅ | React 19, SSR optimizado, Tailwind v4                    |
| **Backend API**      | Python 3.12 + FastAPI   | ✅ | Tipado estático, alto rendimiento async, Pydantic v2      |
| **Colas/Workers**    | Celery + Redis          | ✅ | Procesamiento de video en background sin bloquear la API  |
| **Base de datos**    | MongoDB (Motor)         | ✅ | Flexibilidad para metadata compleja de videos e IA        |
| **IA Engine**        | Gemini + Whisper        | ✅ | El mejor combo para análisis de contenido y transcripción |
| **Storage**          | S3 / Cloudflare R2      | ✅ | Almacenamiento agnóstico y eficiente para archivos media  |

---

## 📚 Librerías Clave (Estado Actual)

### Inteligencia Artificial & Video
- **Google Generative AI**: Detección de momentos virales y ganchos (Hooks).
- **OpenAI Whisper**: Transcripción de audio a texto con alta precisión.
- **MediaPipe**: Detección de landmarks faciales para el tracking inicial.
- **OpenCV**: Motor de visión artificial para el tracking híbrido y crop dinámico.
- **FFmpeg-python**: Pipeline de codificación profesional (libx264, aac).

### Backend & Core
- **Motor (Async MongoDB)**: Conexiones no bloqueantes y pooling optimizado.
- **Redis-py (Async)**: Caching de estados y broker de mensajes.
- **Pydantic**: Validación de esquemas y modelos de datos estrictos.

---

## ⚡ Arquitectura del Pipeline (Flujo Real)

```text
1. [API] Upload Streaming -> Guardado en R2/Local
2. [Worker] Transcripción (Whisper) -> Texto con timestamps
3. [Worker] Análisis Viral (Gemini) -> Identificación de clips (Start/End)
4. [Worker] Smart Crop (MediaPipe + OpenCV) -> Tracking dinámico del sujeto
5. [Worker] Montage -> Unión de clips + Subtítulos + Branding
6. [API] Notificación -> Video listo para descarga
```

---

## 📅 Hitos Alcanzados (Resumen de Desarrollo)

### Fase 1: Fundamentos y Streaming ✅
- Implementación de uploads por chunks para soportar archivos grandes sin agotar la memoria del servidor.
- Estructura de Repositorios y Servicios para una arquitectura mantenible.

### Fase 2: Inteligencia y Análisis ✅
- Integración completa con **Gemini AI** para que la plataforma "entienda" qué partes del video son interesantes.
- Implementación de **Whisper** para subtitulado automático sin intervención manual.

### Fase 3: Visión Artificial Avanzada ✅
- Desarrollo del **Hybrid Tracker**: Si el sujeto se mueve, la cámara vertical lo sigue suavemente.
- Estabilización de imagen para evitar saltos bruscos en el reencuadre.

### Fase 4: Personalización y Branding ✅
- Sistema de marca de agua dinámico para usuarios Free (`verv.io`).
- Overlay de logos y texto para marcas profesionales.

---

## 🚀 Diferencial Competitivo

- **Detección IA Real**: No solo corta el video, sino que elige *qué* cortar basándose en el contenido.
- **Tracking Dinámico**: A diferencia de la competencia que usa crop fijo, Verv.io sigue al orador.
- **Optimización de Costos**: Pipeline optimizado para correr en infraestructura escalable (R2 sin costo de transferencia).

---

## 📚 Documentación Técnica

Para más detalles sobre la implementación técnica, endpoints y esquemas:

- [📖 Referencia de API Endpoints (Backend)](video-mvp/backend/docs/API_ENDPOINTS_REFERENCE.md)
- [🖥️ Manual de Desarrollo Frontend](video-mvp/frontend/README.md)
- [📦 Guía de Configuración del Backend](video-mvp/backend/README.md)

---
**Última actualización:** 2026-03-05  
**Estado:** Producción Ready - MVP+ v2.5
