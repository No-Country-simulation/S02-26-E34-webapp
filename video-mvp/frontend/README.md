# Verv.io - Video Editor Frontend (Next.js)

El frontend de Verv.io es una aplicación web moderna construida con **Next.js 16** y **React 19**, diseñada para ofrecer una experiencia de usuario fluida y receptiva.

## 🚀 Características del Frontend

- **Editor Interactivo**: Previsualización en tiempo real del reencuadre vertical (9:16).
- **Responsive Design**: Optimizado para desktop y mobile.
- **Modo Oscuro/Claro**: Soporte completo para temas, con detección automática.
- **Autenticación**: Integración con Google Sign-In y Email/Password.
- **Gestión de Estado**: Uso de Zustand para un estado global ligero y eficiente.
- **Animaciones**: Microprocesos y transiciones con Framer Motion.
- **Métricas y Estadísticas**: Tableros visuales para el seguimiento del uso.

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16 (App Router & Server Components)
- **Lógica**: React 19 (Hooks, Context, Suspense)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4 (Uso extensivo de variables CSS y performance mejorada)
- **Iconos**: Lucide React
- **Estado**: Zustand
- **Video**: Video.js para reproducción y previsualización.
- **Alertas**: SweetAlert2

## 📦 Instalación

1. Navega al directorio del frontend:
   ```bash
   cd video-mvp/frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. (Opcional) Crea un archivo `.env.local` basado en `.env.example`.

## 🎨 Desarrollo

Para iniciar el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## 📁 Estructura de Carpetas

- `app/`: Rutas de Next.js (Home, Auth, Editor, Profile, Stats, Admin).
- `components/`: Componentes React reutilizables (Header, Footer, CookieConsent, Modales).
- `lib/`: Utilidades, hooks personalizados y configuración de Zustand.
- `public/`: Assets estáticos, logos e imágenes.
- `styles/`: Archivos globales de Tailwind CSS (`globals.css`).

---
Verv.io Frontend - Reimaginando el video vertical.
