import cv2
import os
import glob

def procesar_video_poc(input_path, output_path):
    """
    Toma un video, detecta rostros usando OpenCV y dibuja un recuadro verde y un punto central.
    """
    
    # 1. Configuración del Detector de Rostros (OpenCV Haar Cascade)
    # Usamos el clasificador pre-entrenado incluido en OpenCV
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    face_cascade = cv2.CascadeClassifier(cascade_path)
    
    if face_cascade.empty():
        print("Error: No se pudo cargar el clasificador de rostros.")
        return

    # 2. Cargar el Video de Entrada
    cap = cv2.VideoCapture(input_path)
    
    if not cap.isOpened():
        print(f"Error: No se pudo abrir el video {input_path}")
        return

    # Obtener metadatos del video original para crear el de salida
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0: fps = 30 # Fallback si fps es 0
    
    # 3. Configurar el Video de Salida (Codec mp4v)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v') 
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    print(f"Procesando video: {input_path} ({width}x{height} a {fps:.2f} FPS)...")

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break # Se acabó el video

        frame_count += 1
        
        # 4. Pre-procesamiento
        # Haar Cascade funciona mejor en escala de grises
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 5. DETECCIÓN (Aquí ocurre la magia)
        # scaleFactor=1.1, minNeighbors=5 son valores estándar
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        # 6. Filtrar y Dibujar: Solo la cara más grande (la principal/más enfocada)
        if len(faces) > 0:
            # Encontrar la cara con mayor área (w * h)
            best_face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = best_face
            
            # Dibujar Rectángulo Verde (BGR: 0, 255, 0)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 3)
            
            # Dibujar un punto central (Referencia)
            center_x = x + w // 2
            center_y = y + h // 2
            cv2.circle(frame, (center_x, center_y), 5, (0, 0, 255), -1)

        # 7. Guardar frame procesado
        out.write(frame)
        
        # (Opcional) Mostrar en ventana mientras procesa (presiona 'q' para salir)
        cv2.imshow('Procesando Video - Debug View', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Limpieza
    cap.release()
    out.release()
    cv2.destroyAllWindows()
    print(f"¡Listo! Video procesado guardado en: {output_path}")

def encontrar_video():
    """Busca un archivo mp4 en el directorio actual."""
    # Prioridad al archivo original si existe
    if os.path.exists("closeFace.mp4"):
        return "closeFace.mp4"
    
    # Si no, busca cualquier otro mp4
    mp4_files = glob.glob("*.mp4")
    # Filtrar el de salida para no volver a procesarlo si existe
    mp4_files = [f for f in mp4_files if "output" not in f]
    
    if mp4_files:
        return mp4_files[0]
    return None

# --- Ejecución ---
if __name__ == "__main__":
    video_entrada = encontrar_video()
    
    if not video_entrada:
        print("No encontré ningún video .mp4 en la carpeta para procesar.")
    else:
        video_salida = f"output_{video_entrada}"
        procesar_video_poc(video_entrada, video_salida)
