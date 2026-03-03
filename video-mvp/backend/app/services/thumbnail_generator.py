import subprocess
import os
from typing import Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def generate_thumbnail(video_path: str, output_path: str, timestamp: str = "00:00:01", width: int = 320, height: int = 180) -> bool:
    """
    Genera una miniatura (thumbnail) de un video en un momento específico
    
    Args:
        video_path: Ruta del video de entrada
        output_path: Ruta donde se guardará la miniatura
        timestamp: Momento del video para capturar la imagen (formato HH:MM:SS)
        width: Ancho deseado de la miniatura
        height: Alto deseado de la miniatura
    
    Returns:
        bool: True si la miniatura se generó correctamente, False en caso contrario
    """
    try:
        # Asegurarse de que el directorio de salida exista
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Comando FFmpeg para generar la miniatura
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-ss', timestamp,  # Tiempo para capturar la imagen
            '-vframes', '1',   # Capturar solo un fotograma
            '-s', f'{width}x{height}',  # Dimensiones de la miniatura
            '-y',  # Sobrescribir archivo si existe
            output_path
        ]
        
        # Ejecutar el comando
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Verificar que el archivo se haya generado
        if os.path.exists(output_path):
            logger.info(f"Thumbnail generado exitosamente: {output_path}")
            return True
        else:
            logger.error(f"No se pudo generar el thumbnail: {output_path}")
            return False
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Error ejecutando FFmpeg para generar thumbnail: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"Error inesperado generando thumbnail: {e}")
        return False


def generate_multiple_thumbnails(video_path: str, output_dir: str, count: int = 5) -> list:
    """
    Genera múltiples thumbnails distribuidos a lo largo del video
    
    Args:
        video_path: Ruta del video de entrada
        output_dir: Directorio donde se guardarán las miniaturas
        count: Número de miniaturas a generar
    
    Returns:
        list: Lista de rutas de las miniaturas generadas
    """
    try:
        # Primero obtener la duración del video
        import json
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        metadata = json.loads(result.stdout)
        duration = float(metadata['format']['duration'])
        
        # Generar thumbnails en diferentes puntos del video
        thumbnails = []
        for i in range(count):
            # Calcular el tiempo para este thumbnail (distribuido uniformemente)
            time_point = (duration / (count + 1)) * (i + 1)
            
            # Convertir a formato HH:MM:SS
            hours = int(time_point // 3600)
            minutes = int((time_point % 3600) // 60)
            seconds = int(time_point % 60)
            timestamp = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            
            # Nombre del archivo de thumbnail
            thumb_filename = f"thumb_{i+1:02d}.jpg"
            thumb_path = os.path.join(output_dir, thumb_filename)
            
            # Generar thumbnail individual
            success = generate_thumbnail(video_path, thumb_path, timestamp)
            if success:
                thumbnails.append(thumb_path)
        
        return thumbnails
        
    except Exception as e:
        logger.error(f"Error generando múltiples thumbnails: {e}")
        return []


def generate_preview_gif(video_path: str, output_path: str, duration: float = 3.0, fps: int = 10) -> bool:
    """
    Genera un GIF de vista previa corto del video
    
    Args:
        video_path: Ruta del video de entrada
        output_path: Ruta donde se guardará el GIF
        duration: Duración del GIF en segundos
        fps: Frames por segundo para el GIF
    
    Returns:
        bool: True si el GIF se generó correctamente, False en caso contrario
    """
    try:
        # Asegurarse de que el directorio de salida exista
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Comando FFmpeg para generar el GIF
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-ss', '00:00:01',  # Comenzar desde el segundo 1
            '-t', str(duration),  # Duración del GIF
            '-vf', f'fps={fps},scale=320:-1',  # FPS y escala
            '-y',  # Sobrescribir archivo si existe
            output_path
        ]
        
        # Ejecutar el comando
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Verificar que el archivo se haya generado
        if os.path.exists(output_path):
            logger.info(f"GIF de vista previa generado exitosamente: {output_path}")
            return True
        else:
            logger.error(f"No se pudo generar el GIF de vista previa: {output_path}")
            return False
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Error ejecutando FFmpeg para generar GIF: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"Error inesperado generando GIF: {e}")
        return False