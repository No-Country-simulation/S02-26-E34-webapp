import subprocess
import json
from typing import Dict, Any, Optional
from app.models.video import VideoMetadata
import logging

logger = logging.getLogger(__name__)


def extract_video_metadata(video_path: str) -> Dict[str, Any]:
    """
    Extrae metadatos completos de un video usando FFprobe
    """
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        video_path
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        metadata = json.loads(result.stdout)

        # Procesar y estructurar los datos
        video_stream = next((s for s in metadata['streams'] if s.get('codec_type') == 'video'), None)
        audio_stream = next((s for s in metadata['streams'] if s.get('codec_type') == 'audio'), None)

        # Extraer información de formato
        format_info = metadata.get('format', {})

        extracted_metadata = {
            # Metadatos básicos
            'duration_seconds': float(format_info.get('duration', 0)),
            'file_size_bytes': int(format_info.get('size', 0)),
            
            # Metadatos de video
            'bitrate_kbps': int(format_info.get('bit_rate', 0)) // 1000 if format_info.get('bit_rate') else 0,
            'codec_name': video_stream.get('codec_name', '') if video_stream else '',
            'codec_long_name': video_stream.get('codec_long_name', '') if video_stream else '',
            'profile': video_stream.get('profile', '') if video_stream else '',
            'width': int(video_stream.get('width', 0)) if video_stream else 0,
            'height': int(video_stream.get('height', 0)) if video_stream else 0,
            'display_aspect_ratio': video_stream.get('display_aspect_ratio', '') if video_stream else '',
            'pixel_aspect_ratio': video_stream.get('pixel_aspect_ratio', '') if video_stream else '',
            'frame_rate': eval(video_stream.get('avg_frame_rate', '0/1')) if video_stream and video_stream.get('avg_frame_rate') else 0,
            'color_space': video_stream.get('color_space', '') if video_stream else '',
            'color_primaries': video_stream.get('color_primaries', '') if video_stream else '',
            'color_transfer': video_stream.get('color_transfer', '') if video_stream else '',
            'color_range': video_stream.get('color_range', '') if video_stream else '',

            # Audio stream
            'has_audio': audio_stream is not None,
            'audio_codec': audio_stream.get('codec_name') if audio_stream else None,
            'audio_sample_rate': int(audio_stream.get('sample_rate')) if audio_stream else None,
            'audio_channels': int(audio_stream.get('channels')) if audio_stream else None,
            'audio_bitrate_kbps': int(audio_stream.get('bit_rate', 0)) // 1000 if audio_stream and audio_stream.get('bit_rate') else None,
            'audio_language': audio_stream.get('tags', {}).get('language') if audio_stream else None,
        }

        return extracted_metadata

    except subprocess.CalledProcessError as e:
        logger.error(f"Error running ffprobe: {e.stderr}")
        raise Exception(f"FFprobe error: {e.stderr}")
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing ffprobe output: {e}")
        raise Exception(f"Failed to parse metadata: {e}")
    except Exception as e:
        logger.error(f"Unexpected error extracting metadata: {e}")
        raise Exception(f"Metadata extraction failed: {e}")


def validate_video_file(video_path: str) -> Dict[str, Any]:
    """
    Valida un archivo de video y verifica si está corrupto
    """
    validation_result = {
        'is_corrupted': False,
        'validation_errors': [],
        'quality_score': 80.0  # Puntuación inicial
    }

    try:
        # Intentar extraer metadatos para validar el archivo
        metadata = extract_video_metadata(video_path)
        
        # Validaciones adicionales
        if metadata['duration_seconds'] <= 0:
            validation_result['validation_errors'].append("Video has invalid duration")
            validation_result['is_corrupted'] = True
        
        if metadata['width'] <= 0 or metadata['height'] <= 0:
            validation_result['validation_errors'].append("Video has invalid dimensions")
            validation_result['is_corrupted'] = True
            
        # Calcular puntuación de calidad basada en propiedades del video
        if metadata['width'] >= 1920 and metadata['height'] >= 1080:
            validation_result['quality_score'] += 10  # Video HD+
        elif metadata['width'] >= 1280 and metadata['height'] >= 720:
            validation_result['quality_score'] += 5  # Video HD
        
        if metadata['bitrate_kbps'] > 2000:  # Alta calidad
            validation_result['quality_score'] += 5
        elif metadata['bitrate_kbps'] < 500:  # Muy baja calidad
            validation_result['quality_score'] -= 10
            
        if not metadata['has_audio']:
            validation_result['quality_score'] -= 5  # Sin audio
            
        # Limitar la puntuación entre 0 y 100
        validation_result['quality_score'] = max(0, min(100, validation_result['quality_score']))
        
    except Exception as e:
        validation_result['is_corrupted'] = True
        validation_result['validation_errors'].append(f"Validation error: {str(e)}")
        validation_result['quality_score'] = 0.0

    return validation_result