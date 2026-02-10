# backend/services/object_detection.py - Modified to handle missing dependencies gracefully
import logging
from typing import List, Tuple, Dict, Any
import os

logger = logging.getLogger(__name__)

class ObjectDetectionService:
    def __init__(self, model_path: str = "yolov8n.pt"):
        """
        Inicializa el servicio de detección de objetos
        """
        self.model_path = model_path
        self.model = None
        try:
            import cv2  # Check if cv2 is available
            self.cv2_available = True
        except ImportError:
            logger.warning("OpenCV not available, object detection will be disabled")
            self.cv2_available = False
        
        try:
            import numpy as np  # Check if numpy is available
            self.np_available = True
        except ImportError:
            logger.warning("NumPy not available")
            self.np_available = False
            
        try:
            # Try to import ultralytics
            from ultralytics import YOLO
            self.yolo_available = True
            self.YOLO = YOLO
        except ImportError:
            logger.warning("Ultralytics not available, using mock detection")
            self.yolo_available = False

    def load_model(self):
        """
        Carga el modelo YOLOv8
        """
        if not self.yolo_available:
            logger.info("YOLO not available, skipping model loading")
            return
            
        try:
            self.model = self.YOLO(self.model_path)
            logger.info(f"Modelo YOLOv8 '{self.model_path}' cargado exitosamente")
        except Exception as e:
            logger.error(f"Error al cargar el modelo YOLOv8: {e}")
            raise

    def detect_objects_in_frame(self, frame):
        """
        Detecta objetos en un frame individual
        """
        if not self.yolo_available or self.model is None:
            # Return empty detections if model not available
            return []

        try:
            results = self.model(frame)

            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Extraer información de la detección
                        xyxy = box.xyxy[0].cpu().numpy()  # Coordenadas x1, y1, x2, y2
                        conf = float(box.conf[0])  # Confianza
                        cls = int(box.cls[0])  # Clase

                        # Obtener nombre de la clase
                        class_name = self.model.names[cls]

                        detection = {
                            'bbox': xyxy.tolist(),
                            'confidence': conf,
                            'class_id': cls,
                            'class_name': class_name,
                            'center_x': (xyxy[0] + xyxy[2]) / 2,
                            'center_y': (xyxy[1] + xyxy[3]) / 2,
                            'width': xyxy[2] - xyxy[0],
                            'height': xyxy[3] - xyxy[1]
                        }

                        # Filtrar por confianza mínima y clases relevantes
                        if conf > 0.5 and class_name in ['person', 'face', 'human']:
                            detections.append(detection)

            return detections
        except Exception as e:
            logger.error(f"Error in detect_objects_in_frame: {e}")
            return []  # Return empty list on error

    def detect_faces_and_objects(self, video_path: str, sample_rate: int = 30) -> List[Dict[str, Any]]:
        """
        Detecta rostros y objetos relevantes en un video
        """
        if not self.cv2_available:
            logger.warning("OpenCV not available, returning empty detections")
            return []
            
        import cv2
        import numpy as np

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"No se pudo abrir el video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Calcular el paso para muestreo
        step = max(1, int(fps))  # Analizar cada segundo

        all_detections = []
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Analizar cada 'step' frames
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
        Calcula el recorte óptimo para mantener objetos relevantes centrados
        """
        if not self.cv2_available:
            # If OpenCV is not available, return a central crop
            import cv2
            cap = cv2.VideoCapture(video_path)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()

            # Recorte central
            center_x, center_y = width // 2, height // 2
            crop_width = min(width, int(height * target_aspect_ratio))
            crop_height = min(height, int(width / target_aspect_ratio))

            x1 = max(0, center_x - crop_width // 2)
            y1 = max(0, center_y - crop_height // 2)
            x2 = min(width, x1 + crop_width)
            y2 = min(height, y1 + crop_height)

            return int(x1), int(y1), int(x2), int(y2)

        # Obtener detecciones del video
        detections = self.detect_faces_and_objects(video_path)

        if not detections:
            # Si no hay detecciones, retornar recorte central
            import cv2
            cap = cv2.VideoCapture(video_path)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()

            # Recorte central
            center_x, center_y = width // 2, height // 2
            crop_width = min(width, int(height * target_aspect_ratio))
            crop_height = min(height, int(width / target_aspect_ratio))

            x1 = max(0, center_x - crop_width // 2)
            y1 = max(0, center_y - crop_height // 2)
            x2 = min(width, x1 + crop_width)
            y2 = min(height, y1 + crop_height)

            return x1, y1, x2, y2

        # Calcular el área de interés basado en las detecciones
        all_centers_x = []
        all_centers_y = []

        for frame_detection in detections:
            for detection in frame_detection['detections']:
                all_centers_x.append(detection['center_x'])
                all_centers_y.append(detection['center_y'])

        # Calcular el centro promedio de todas las detecciones
        avg_center_x = int(sum(all_centers_x) / len(all_centers_x)) if all_centers_x else width // 2
        avg_center_y = int(sum(all_centers_y) / len(all_centers_y)) if all_centers_y else height // 2

        # Obtener dimensiones del video
        import cv2
        cap = cv2.VideoCapture(video_path)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        # Calcular dimensiones del recorte
        crop_width = min(width, int(height * target_aspect_ratio))
        crop_height = min(height, int(width / target_aspect_ratio))

        # Ajustar el centro para evitar recortes fuera del marco
        x1 = max(0, avg_center_x - crop_width // 2)
        y1 = max(0, avg_center_y - crop_height // 2)
        x2 = min(width, x1 + crop_width)
        y2 = min(height, y1 + crop_height)

        # Asegurar que el recorte tenga las dimensiones correctas
        if x2 - x1 < crop_width:
            if x1 == 0:
                x2 = min(width, x1 + crop_width)
            else:
                x1 = max(0, x2 - crop_width)

        if y2 - y1 < crop_height:
            if y1 == 0:
                y2 = min(height, y1 + crop_height)
            else:
                y1 = max(0, y2 - crop_height)

        return int(x1), int(y1), int(x2), int(y2)

# Instancia global del servicio
object_detection_service = ObjectDetectionService()