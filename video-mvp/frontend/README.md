# Frontend - MVP Conversor Video

Esta es la aplicación web desarrollada con **Next.js 14** para el proyecto de conversión de videos.

## 🛠️ Tecnologías

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Gestión de Archivos**: `react-dropzone`
- **Reproductor**: `video.js`

## 🚀 Inicio Rápido

### 1. Instalación de dependencias

```bash
npm install --legacy-peer-deps
```

### 2. Configuración de entorno

Crea un archivo `.env.local` en esta carpeta con la URL de la API:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. Ejecución del servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## 📁 Estructura de carpetas

- `app/`: Rutas y páginas principales.
- `components/`: Componentes reutilizables de React.
- `lib/`: Utilidades y configuraciones compartidas.
- `public/`: Archivos estáticos e imágenes.
