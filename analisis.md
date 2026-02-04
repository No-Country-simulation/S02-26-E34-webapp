# 🎬 MVP: Conversor Video Horizontal → Vertical

> Plataforma SaaS que convierte automáticamente videos horizontales (16:9) en verticales (9:16) optimizados para TikTok, Instagram Reels y YouTube Shorts.

---

## 📋 Índice

- [¿Qué se pide?](#qué-se-pide)
- [Stack Tecnológica Óptima](#stack-tecnológica-óptima)
- [Librerías Clave](#librerías-clave)
- [Arquitectura MVP](#arquitectura-mvp)
- [Comparativa Stacks](#comparativa-stacks)
- [Plan de Implementación](#plan-de-implementación)
- [Costos Estimados](#costos-estimados)
- [Diferencial Competitivo](#diferencial-competitivo)
- [Decisiones Clave](#decisiones-clave)

---

## 🎯 ¿Qué se pide?

| Funcionalidad                    | Descripción                                     |
| -------------------------------- | ------------------------------------------------ |
| **Subir video**            | Drag & drop (MP4, hasta 3min)                    |
| **Convertir**              | 16:9 → 9:16 automáticamente                    |
| **Reencuadre inteligente** | Detectar rostros/objetos y mantenerlos centrados |
| **Subtítulos**            | Transcripción automática quemada en video      |
| **Branding**               | Overlay de logo/texto                            |
| **Descargar**              | Video vertical listo para redes sociales         |

---

## 🛠️ Stack Tecnológica Óptima

| Capa                       | Tecnología             | Por qué                                                  |
| -------------------------- | ----------------------- | --------------------------------------------------------- |
| **Frontend**         | Next.js 14 (App Router) | SSR, API Routes, React moderno, excelente DX              |
| **Backend API**      | Python + FastAPI        | Tipado estático, async/await, autodocumentación OpenAPI |
| **Colas**            | Celery + Redis          | Procesamiento asíncrono, workers escalables              |
| **Base de datos**    | PostgreSQL              | Relacional, estable, soporta JSON                         |
| **Storage**          | Cloudflare R2           | Sin egress fees (crítico para video)                     |
| **Hosting API**      | Railway / Render        | Fácil deploy, buen precio                                |
| **Hosting Frontend** | Vercel                  | Optimizado para Next.js                                   |

---

## 📚 Librerías Clave por Función

### Backend (Python)

| Función                             | Librería                | Versión |
| ------------------------------------ | ------------------------ | -------- |
| **Conversión video**          | `ffmpeg-python`        | Última  |
| **Detección rostros/objetos** | `ultralytics` (YOLOv8) | Última  |
| **Subtítulos automáticos**   | `whisper.cpp` (local)  | Última  |
| **Procesamiento imágenes**    | `opencv-python`        | Última  |
| **Colas asíncronas**          | `celery`               | Última  |
| **Storage S3**                 | `boto3`                | Última  |
| **API Framework**              | `fastapi`              | Última  |
| **Validación**                | `pydantic`             | Última  |

### Frontend (JavaScript/TypeScript)

| Función                   | Librería                        | Versión |
| -------------------------- | -------------------------------- | -------- |
| **Upload**           | `react-dropzone`               | Última  |
| **Player preview**   | `video.js`                     | Última  |
| **UI Components**    | `shadcn/ui` o `Tailwind CSS` | Última  |
| **HTTP Client**      | `axios` o `fetch`            | Última  |
| **State Management** | `zustand` o `react-query`    | Última  |

### Sistema

| Función                      | Herramienta    | Versión |
| ----------------------------- | -------------- | -------- |
| **Procesamiento video** | `FFmpeg`     | 6.0+     |
| **Broker colas**        | `Redis`      | 7.0+     |
| **Base de datos**       | `PostgreSQL` | 15+      |

---

## ⚡ Arquitectura MVP (Flujo)

┌─────────────────────────────────────────────────────────────┐
│ USUARIO │
└──────────────────────────┬──────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js) │
│ • Landing page │
│ • Upload drag & drop │
│ • Preview video │
│ • Estado procesamiento │
│ • Descarga resultado │
└──────────────────────────┬──────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND API (FastAPI + PostgreSQL) │
│ • Recibir video → guardar metadata │
│ • Enviar a R2 → crear job en DB │
│ • Endpoint estado job │
│ • Endpoint descarga │
└──────────────────────────┬──────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ COLA (Celery + Redis) │
│ • Workers escuchan jobs │
│ • Retry automático en fallo │
│ • Priorización │
└──────────────────────────┬──────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ WORKER (Python + FFmpeg + IA) │
│ ├─ Descargar video de R2 │
│ ├─ FFmpeg: convertir 16:9 → 9:16 │
│ ├─ YOLOv8: detectar rostros/objetos │
│ ├─ OpenCV: calcular crop inteligente │
│ ├─ Whisper.cpp: generar subtítulos │
│ ├─ FFmpeg: quemar subtítulos + logo │
│ └─ Subir resultado a R2 │
└──────────────────────────┬──────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ STORAGE (Cloudflare R2) │
│ • Videos originales │
│ • Videos procesados │
│ • Subtítulos (SRT) │
└──────────────────────────┬──────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ USUARIO │
│ • Notificación: video listo │
│ • Descarga MP4 vertical │
│ • Compartir en redes │
└─────────────────────────────────────────────────────────────┘

---

## 📊 Comparativa Stacks (Objetiva)

| Stack                      | Procesamiento | IA/ML      | Velocidad MVP | Escalabilidad | Costo      | Veredicto           |
| -------------------------- | ------------- | ---------- | ------------- | ------------- | ---------- | ------------------- |
| **Python + FastAPI** | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐      | ⭐⭐⭐⭐      | ⭐⭐⭐⭐   | ✅**Óptimo** |
| Node.js + Express          | ⭐⭐⭐⭐      | ⭐⭐       | ⭐⭐⭐⭐⭐    | ⭐⭐⭐        | ⭐⭐⭐⭐   | ❌ Débil en IA     |
| Go + FFmpeg                | ⭐⭐⭐⭐⭐    | ⭐⭐       | ⭐⭐          | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐ | ❌ Curva alta       |
| Django + Celery            | ⭐⭐⭐⭐      | ⭐⭐⭐⭐⭐ | ⭐⭐⭐        | ⭐⭐⭐⭐      | ⭐⭐⭐     | ⚠️ Overkill       |
| Rust + FFmpeg              | ⭐⭐⭐⭐⭐    | ⭐⭐⭐     | ⭐            | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐ | ❌ Overkill MVP     |

---

## 🗓️ Plan de Implementación (6 Semanas)

## 📅 Semana 1: Fundamentos + Conversión Básica

### 🎯 Objetivo

Crear la base del proyecto con funcionalidad mínima de conversión de video 16:9 → 9:16.

---

### ✅ Entregables

- [ ] Landing page funcional con uploader (drag & drop)
- [ ] Procesamiento básico: conversión 16:9 → 9:16 con FFmpeg
- [ ] Descarga del video convertido
- [ ] Estructura de proyecto inicial

---

### 🔧 Tareas Técnicas

#### 1. Setup del Proyecto

```bash
# Crear estructura de carpetas
mkdir video-mvp
cd video-mvp

# Frontend (Next.js 14)
npx create-next-app@latest frontend --typescript --tailwind --app --eslint
cd frontend
npm install react-dropzone video.js axios

# Backend (FastAPI)
cd ..
mkdir backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn python-multipart boto3 ffmpeg-python python-dotenv
```

```text
video-mvp/
├── frontend/               # Next.js app
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── upload/
│   │   │   └── page.tsx    # Upload page
│   │   └── result/
│   │       └── page.tsx    # Result page
│   ├── components/
│   │   ├── UploadZone.tsx
│   │   ├── VideoPreview.tsx
│   │   └── DownloadButton.tsx
│   ├── lib/
│   │   └── api.ts          # API client
│   └── package.json
│
├── backend/                # FastAPI
│   ├── app/
│   │   ├── main.py         # FastAPI app
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── upload.py
│   │   │   │   └── download.py
│   │   │   └── __init__.py
│   │   ├── models/
│   │   │   ├── video.py
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   ├── video_processor.py
│   │   │   └── __init__.py
│   │   └── __init__.py
│   ├── requirements.txt
│   ├── .env.example
│   └── main.py
│
├── docker-compose.yml      # Para desarrollo local
├── README.md
└── .gitignore
```

---

## 📅 Semana 3: Reencuadre Inteligente (IA)

### 🎯 Objetivo

Implementar detección de rostros y objetos con YOLOv8 para reencuadre inteligente que mantenga elementos importantes centrados.

---

### ✅ Entregables

- [ ] Detección de rostros/objetos con YOLOv8n
- [ ] Algoritmo de reencuadre dinámico
- [ ] Integración con pipeline de procesamiento
- [ ] Preview del tracking en UI (opcional)
- [ ] Mejora significativa sobre crop centrado simple

---

## 📅 Semana 4: Subtítulos + Branding Básico

### 🎯 Objetivo

Implementar subtítulos automáticos con Whisper.cpp y overlay de branding (logo/texto) en videos convertidos.

---

### ✅ Entregables

- [ ] Subtítulos automáticos con Whisper.cpp
- [ ] Generación de archivos SRT/VTT
- [ ] Quemado de subtítulos en video
- [ ] Overlay de logo configurable
- [ ] Texto personalizado (CTA, marca)
- [ ] Exportación final con todos los elementos

---

## 📅 Semana 5: Polish + Validación con Usuarios

### 🎯 Objetivo

Mejorar la experiencia de usuario, implementar métricas y validar el MVP con usuarios reales.

---

### ✅ Entregables

- [ ] Landing page optimizada
- [ ] Onboarding tutorial
- [ ] Métricas de uso implementadas
- [ ] Feedback collection integrado
- [ ] 10+ usuarios reales probando el MVP
- [ ] Reporte de validación

---

## 📅 Semana 6: Deploy + Primeros Ingresos

### 🎯 Objetivo

Deploy a producción, integración de pagos y lanzamiento oficial del MVP.

---

### ✅ Entregables

- [ ] Deploy completo en producción
- [ ] Dominio configurado
- [ ] SSL automático
- [ ] Stripe integrado
- [ ] Sistema de créditos
- [ ] Documentación completa
- [ ] Primeros usuarios pagos

# FALTA MAS ANALISIS, PERO ES PARA PODER AVANZAR.
