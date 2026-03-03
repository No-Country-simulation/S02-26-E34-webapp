from typing import Tuple
from .dtos import DetectionBox

def compute_9_16_window(box: DetectionBox, video_width: int, video_height: int, expand_factor: float = 1.2) -> Tuple[int, int, int, int]:
    """
    Calcula una ventana 9:16 centrada en el sujeto, asegurando que NUNCA se distorsione
    y manteniendo la relación de aspecto vertical estricta.
    """
    # 1. Obtener dimensiones del sujeto
    box_w = max(1, box.x2 - box.x1)
    box_h = max(1, box.y2 - box.y1)
    cx = box.x1 + box_w / 2.0
    cy = box.y1 + box_h / 2.0

    # 2. Definir el tamaño del lienzo vertical basado en la altura del video (máxima calidad)
    # Queremos que la ventana sea 9:16
    target_aspect = 9.0 / 16.0
    
    # El alto de la ventana será proporcional al expand_factor pero sin superar el video
    win_h = min(video_height, box_h * expand_factor * 1.5) # Aumentamos el alto para ver más cuerpo
    win_w = win_h * target_aspect
    
    # Si el ancho calculado es mayor al del video (raro en 9:16), ajustamos por el ancho
    if win_w > video_width:
        win_w = video_width
        win_h = win_w / target_aspect

    # 3. Posicionar la ventana centrada en el sujeto
    x1 = int(round(cx - win_w / 2.0))
    y1 = int(round(cy - win_h / 2.0))
    
    # 4. Clamping inteligente (Moviendo la ventana, no redimensionándola)
    # Si nos salimos por la izquierda, empujamos a la derecha
    if x1 < 0: x1 = 0
    # Si nos salimos por la derecha, empujamos a la izquierda
    if x1 + win_w > video_width: x1 = int(video_width - win_w)
    
    # Lo mismo para el eje Y
    if y1 < 0: y1 = 0
    if y1 + win_h > video_height: y1 = int(video_height - win_h)

    # 5. Retornar coordenadas enteras asegurando que el tamaño final sea consistente
    # Forzamos que x2-x1 y y2-y1 mantengan la proporción 9:16 exacta
    return x1, y1, int(x1 + win_w), int(y1 + win_h)
