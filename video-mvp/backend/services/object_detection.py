# backend/services/object_detection.py
import logging
from typing import List, Tuple, Dict, Any
import os
import cv2
import numpy as np

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

logger = logging.getLogger(__name__)

class ObjectDetectionService:
    def __init__(self):
        """
        Inicializa el servicio de detección de objetos usando MediaPipe
        """
        self.mp_face_detection = None
        self.face_detection = None
        self.cv2_available = True
        
        if not MEDIAPIPE_AVAILABLE:
            logger.warning("MediaPipe no está disponible, la detección estará desactivada")
        else:
            self.mp_face_detection = mp.solutions.face_detection

    def load_model(self):
        """
        Carga el modelo de detección de rostros de MediaPipe
        """
        if not MEDIAPIPE_AVAILABLE:
            return

        try:
            # model_selection: 0 para rostros a menos de 2 metros, 1 para más de 2 metros
            self.face_detection = self.mp_face_detection.FaceDetection(
                model_selection=1, 
                min_detection_confidence=0.5
            )
            logger.info("Modelo MediaPipe Face Detection cargado exitosamente")
        except Exception as e:
            logger.error(f"Error al cargar MediaPipe Face Detection: {e}")
            self.face_detection = None

    def detect_objects_in_frame(self, frame):
        """
        Detecta rostros en un frame individual usando MediaPipe
        """
        if not MEDIAPIPE_AVAILABLE or self.face_detection is None:
            if MEDIAPIPE_AVAILABLE and self.face_detection is None:
                self.load_model()
            
            if self.face_detection is None:
                return []

        try:
            # MediaPipe requiere RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_detection.process(rgb_frame)

            detections = []
            if results.detections:
                ih, iw, _ = frame.shape
                for detection in results.detections:
                    # Extraer bbox relativo
                    bbox = detection.location_data.relative_bounding_box
                    
                    # Convertir a coordenadas absolutas
                    x1 = int(bbox.xmin * iw)
                    y1 = int(bbox.ymin * ih)
                    width = int(bbox.width * iw)
                    height = int(bbox.height * ih)
                    x2 = x1 + width
                    y2 = y1 + height

                    # Asegurar que no se salgan del frame
                    x1 = max(0, x1)
                    y1 = max(0, y1)
                    x2 = min(iw, x2)
                    y2 = min(ih, y2)

                    detection_data = {
                        'bbox': [x1, y1, x2, y2],
                        'confidence': float(detection.score[0]),
                        'class_id': 0, # MediaPipe Face Detection solo tiene una clase
                        'class_name': 'face',
                        'center_x': x1 + width / 2,
                        'center_y': y1 + height / 2,
                        'width': width,
                        'height': height
                    }
                    detections.append(detection_data)

            return detections
        except Exception as e:
            logger.error(f"Error en detect_objects_in_frame: {e}")
            return []

    def detect_faces_and_objects(self, video_path: str, sample_rate: int = 30) -> List[Dict[str, Any]]:
        """
        Detecta rostros en un video usando MediaPipe
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"No se pudo abrir el video: {video_path}")
            return []

        fps = cap.get(cv2.CAP_PROP_FPS)
        # Si fps es 0 o inválido, usar 30 por defecto
        if fps <= 0:
            fps = 30.0

        # Analizar cada N frames para ahorrar procesador (aprox 1 vez por segundo)
        step = max(1, int(fps))

        all_detections = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % step == 0:
                detections = self.detect_objects_in_frame(frame)

                if detections:
                    frame_info = {
                        'frame_number': frame_idx,
                        'timestamp': frame_idx / fps,
                        'detections': detections
                    }
                    all_detections.append(frame_info)

            frame_idx += 1

        cap.release()
        return all_detections

    def calculate_optimal_crop(self, video_path: str, target_aspect_ratio: float = 9/16) -> Tuple[int, int, int, int]:
        """
        Calcula el recorte óptimo para mantener los rostros detectados centrados
        """
        # Obtener dimensiones del video
        cap = cv2.VideoCapture(video_path)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        if width == 0 or height == 0:
            return 0, 0, 1080, 1920 # Fallback default

        # Obtener detecciones
        detections = self.detect_faces_and_objects(video_path)

        # Calcular dimensiones deseadas para el recorte
        # El recorte debe tener el aspect ratio objetivo (9:16)
        if (width / height) > target_aspect_ratio:
            # El video es más ancho que el objetivo (paisaje), recortamos horizontalmente
            crop_height = height
            crop_width = int(height * target_aspect_ratio)
        else:
            # El video es más alto que el objetivo (poco probable), recortamos verticalmente
            crop_width = width
            crop_height = int(width / target_aspect_ratio)

        if not detections:
            # Si no hay detecciones, central el recorte
            x1 = max(0, (width - crop_width) // 2)
            y1 = max(0, (height - crop_height) // 2)
        else:
            # Calcular el centro promedio de todas las detecciones de rostros
            all_centers_x = []
            for frame_detection in detections:
                for det in frame_detection['detections']:
                    all_centers_x.append(det['center_x'])
            
            avg_center_x = int(sum(all_centers_x) / len(all_centers_x))
            
            # El eje Y lo mantenemos usualmente centrado o un poco arriba para rostros
            # Pero para simplificar, lo centramos
            center_y = height // 2
            
            # Calcular x1 basado en el centro promedio de rostros
            x1 = max(0, avg_center_x - crop_width // 2)
            y1 = max(0, center_y - crop_height // 2)
            
            # Asegurar que el recorte no se salga por la derecha o abajo
            if x1 + crop_width > width:
                x1 = width - crop_width
            if y1 + crop_height > height:
                y1 = height - crop_height

        x2 = x1 + crop_width
        y2 = y1 + crop_height

        return int(x1), int(y1), int(x2), int(y2)

# Instancia global del servicio
object_detection_service = ObjectDetectionService()