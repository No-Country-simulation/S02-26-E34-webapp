# 🎥 MVP Smart Cropping - Módulo de IA (PoC)

Este módulo contiene la Prueba de Concepto (PoC) para el motor de reencuadre inteligente.
Actualmente, el script detecta rostros en un video y genera un "bounding box" visual para validar el tracking.

## 🚀 Prerrequisitos

* Python 3.10 o superior
* Un archivo de video `.mp4` para probar (hay uno de prueba ya colocado).

## 🛠️ Instalación

Sigue estos pasos para configurar el entorno localmente:


1. **Crear y activar un Entorno Virtual:**

   * **En Windows (PowerShell):**
     python -m venv venv
     .\venv\Scripts\Activate

   * **En Mac/Linux:**
     python3 -m venv venv
     source venv/bin/activate

3. **Instalar dependencias:**
   pip install -r requirements.txt

## ▶️ Cómo ejecutar

1. Coloca un video de prueba en la raíz del proyecto y renómbralo a `input.mp4`.
2. Ejecuta el script:
   python poc_tracker.py

3. El proceso mostrará una ventana con el análisis en tiempo real.
   - Presiona 'q' para salir antes de que termine.
   
4. El resultado se guardará como `output_debug.mp4` en la misma carpeta.

## 📦 Stack Tecnológico
* **OpenCV:** Lectura y escritura de frames.
* **MediaPipe:** Detección de rostros (Modelo BlazeFace).
* **NumPy:** Operaciones matriciales.