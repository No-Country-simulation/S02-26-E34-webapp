# Verv.io - Frontend (Next.js)

Aplicación web de Verv.io construida con Next.js para autenticación, edición visual y seguimiento del procesamiento de videos 16:9 → 9:16.

## 🚀 Qué está implementado hoy

- **Landing + onboarding** con tutorial inicial y feedback.
- **Auth dual**: login/registro con email + contraseña y login con Google.
- **Refresh de sesión** para mantener tokens actualizados en cliente.
- **Editor avanzado** con:
  - carga de video (`.mp4`),
  - selección 9:16 ajustable,
  - trim de clip,
  - opciones de subtítulos y branding,
  - polling de progreso y descarga al finalizar.
- **Paneles de usuario**: perfil editable, actividad reciente y estadísticas.
- **Panel admin** para gestión de usuarios (aprobar/rechazar/promover/editar/desactivar).
- **Estado de backend** visible desde la UI.

## 🛠️ Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- Zustand
- Axios + Fetch API
- Lucide React
- SweetAlert2
- Framer Motion

## 📦 Setup local

1. Ir al frontend:

```bash
cd video-mvp/frontend
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear entorno local:

```bash
cp .env.example .env.local
```

4. Ejecutar en desarrollo:

```bash
npm run dev
```

App disponible en `http://localhost:3000`.

## 🔌 Integración con backend

- El frontend usa `/api/v1` y en desarrollo aplica rewrite hacia `http://localhost:8000/api/v1` (ver `next.config.ts`).
- Variables principales:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_MAX_FILE_SIZE_MB=50
NEXT_PUBLIC_MAX_VIDEO_DURATION_MINUTES=3
```

## 🗂️ Estructura principal

- `app/`: rutas (`/`, `/auth`, `/editor`, `/profile`, `/stats`, `/admin/users`).
- `components/`: UI reutilizable y módulos del editor.
- `lib/`: cliente API, sesión auth, hooks y store global.
- `data/`: contenido estático usado por la landing.

---
Verv.io Frontend - Experiencia completa para convertir y gestionar video vertical.
