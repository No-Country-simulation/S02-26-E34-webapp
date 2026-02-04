# S02-26-Equipo 34-Web App Development

## I. Planteamiento del MVP

### 1. Problema a resolver
* Los videos horizontales pierden impacto al adaptarse a formato vertical.
* El recorte manual consume tiempo y recursos.
* Startups y pymes necesitan presencia constante en redes sociales pero no tienen equipos dedicados a edición.

### 2. Objetivo del proyecto
* Desarrollar una solución que convierta automáticamente videos horizontales en verticales, optimizando el encuadre para que no se pierda información relevante.
* Generar shorts automáticos a partir de videos largos, listos para publicar en redes sociales.
* Reducir la carga operativa de edición para emprendedores y empresas pequeñas.

### 3. Propuesta de solución
* Algoritmo de detección de zonas de interés (rostros, objetos, texto en pantalla) para reencuadrar automáticamente.
* Automatización de cortes: identificar momentos clave del video (picos de audio, frases destacadas, cambios de escena) y generar clips cortos.
* Plantillas de branding: añadir logo, subtítulos automáticos y llamados a la acción.
* Integración con redes sociales: exportar directamente a TikTok, Instagram Reels y YouTube Shorts.

### 4. Beneficios
* Mayor visibilidad y autoridad en redes sociales.
* Ahorro de tiempo y costos de edición.
* Escalabilidad: producir más contenido sin aumentar el equipo.
* Networking y captación de clientes/talentos gracias a presencia constante.

### 5. Público objetivo
* Startups que necesitan crecer rápido en redes.
* Pymes que buscan aumentar ventas con marketing digital.
* Emprendedores que quieren posicionarse como referentes en su sector.

### 6. Posibles tecnologías
* IA de visión por computadora (para detectar rostros/objetos).
* Procesamiento de lenguaje natural (para identificar frases clave).
* Herramientas de edición automática (FFmpeg, OpenCV, APIs de subtitulado).
* Integración SaaS: plataforma web donde el usuario sube su video y recibe shorts listos.

---

## II. Viabilidad y estrategia

### 1. Viabilidad técnica
* **Conversión de formato y orientación**: se puede hacer con librerías como FFmpeg (muy usada en backend para procesamiento de video).
* **Reencuadre automático**: con técnicas simples (crop + resize) o más avanzadas (detección de rostros/objetos con OpenCV o modelos de visión por computadora).
* **Exportación**: FFmpeg permite exportar en MP4, MOV, etc.
* **Publicación directa en redes sociales**: aquí la complejidad aumenta porque necesitaríamos integrar APIs de cada plataforma (YouTube, TikTok, Instagram). Algunas son abiertas, otras más restrictivas.

### 2. Flujo del MVP
1. Subida del video (drag & drop o selector de archivo).
2. Procesamiento en servidor:
   * Detectar proporción (16:9 → 9:16).
   * Reencuadrar (crop + resize).
   * Opcional: subtítulos automáticos o branding.
3. Descarga del archivo convertido (MP4 vertical).
4. (Opcional avanzado): botón de publicar en redes sociales vía API.

### 3. Complejidad
* **Básico (MVP realista)**: subir → convertir → descargar.
  * Poco complejo si se usa FFmpeg en backend y un framework web (Node.js, Django, etc.).
  * Se puede tener en semanas.
* **Avanzado (automatización + publicación)**:
  * Requiere integración con APIs de redes sociales, autenticación OAuth, gestión de permisos.
  * Aquí sí se vuelve más complejo, pero escalable como SaaS.

### 4. Estrategia de MVP
* **Primera versión (MVP)**: solo conversión y descarga.
* **Segunda versión**: añadir subtítulos automáticos y plantillas de branding.
* **Tercera versión**: integración con redes sociales para publicar directamente.

### 5. Benchmark
* **Convertio**: hace algo similar con archivos (usa FFmpeg detrás).
* **Herramientas**: como Kapwing, Veed.io, Clipchamp ya ofrecen recorte automático, pero nuestro diferencial sería automatizar shorts verticales desde horizontales con foco en startups/pymes.

## Conclusión
La idea es viable y realizable. El flujo no es muy complejo si se limita al MVP (subir → convertir → descargar). La parte de publicación en redes sociales sí añade complejidad, pero puede ser una segunda etapa.
