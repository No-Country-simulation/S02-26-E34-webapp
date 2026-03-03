# backend/services/branding_service.py
import cv2
import numpy as np
import os
import logging
from typing import Optional, Tuple
from PIL import Image, ImageDraw, ImageFont
import ffmpeg

logger = logging.getLogger(__name__)

class BrandingService:
    def __init__(self):
        """
        Inicializa el servicio de branding
        """
        pass
    
    def add_logo_overlay(self, video_path: str, logo_path: str, position: str = "top-right", 
                         size_percentage: float = 0.15, opacity: float = 0.8) -> str:
        """
        Añade un logo overlay al video
        """
        output_path = video_path.replace('.mp4', '_with_logo.mp4')
        
        try:
            # Usar FFmpeg para añadir el logo
            input_video = ffmpeg.input(video_path)
            input_logo = ffmpeg.input(logo_path)
            
            # Escalar el logo
            logo_scaled = ffmpeg.filter(input_logo, 'scale', 
                                      f'iw*{size_percentage}', f'ih*{size_percentage}')
            
            # Posicionar el logo
            if position == "top-right":
                logo_positioned = ffmpeg.filter(logo_scaled, 'overlay', 
                                              'main_w-overlay_w-10', '10')
            elif position == "top-left":
                logo_positioned = ffmpeg.filter(logo_scaled, 'overlay', '10', '10')
            elif position == "bottom-right":
                logo_positioned = ffmpeg.filter(logo_scaled, 'overlay', 
                                              'main_w-overlay_w-10', 'main_h-overlay_h-10')
            elif position == "bottom-left":
                logo_positioned = ffmpeg.filter(logo_scaled, 'overlay', 
                                              '10', 'main_h-overlay_h-10')
            else:  # center
                logo_positioned = ffmpeg.filter(logo_scaled, 'overlay', 
                                              '(main_w-overlay_w)/2', '(main_h-overlay_h)/2')
            
            # Aplicar opacidad
            if opacity < 1.0:
                logo_positioned = ffmpeg.filter(logo_positioned, 'format', 'rgba')
                logo_positioned = ffmpeg.filter(logo_positioned, 'colorchannelmixer', 
                                              aa=opacity)
            
            # Combinar video con logo conservando el audio original
            video = ffmpeg.filter(input_video, 'overlay', 
                                  'main_w-overlay_w-10', '10') if position == "top-right" else \
                    ffmpeg.filter(input_video, 'overlay', '10', '10') if position == "top-left" else \
                    ffmpeg.filter(input_video, 'overlay', 'main_w-overlay_w-10', 'main_h-overlay_h-10') if position == "bottom-right" else \
                    ffmpeg.filter(input_video, 'overlay', '10', 'main_h-overlay_h-10') if position == "bottom-left" else \
                    ffmpeg.filter(input_video, 'overlay', '(main_w-overlay_w)/2', '(main_h-overlay_h)/2')
            
            # Usar directamente el filtro de overlay sobre el stream de video
            # pero necesitamos el stream de audio original
            audio = input_video.audio
            
            output = ffmpeg.output(video, audio, output_path, 
                                 vcodec='libx264', acodec='copy', pix_fmt='yuv420p')
            
            # Ejecutar el comando
            ffmpeg.run(output, overwrite_output=True, quiet=True)
            
            logger.info(f"Logo añadido al video: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Error añadiendo logo al video {video_path}: {e}")
            raise
    
    def add_text_overlay(self, video_path: str, text: str, position: str = "bottom-center", 
                         font_size: int = 24, font_color: str = "white", 
                         background_color: str = "black", background_opacity: float = 0.5,
                         is_watermark: bool = False) -> str:
        """
        Añade texto overlay al video. Si is_watermark es True, se optimiza para marca de agua sutil.
        """
        suffix = "_watermark.mp4" if is_watermark else "_with_text.mp4"
        output_path = video_path.replace('.mp4', suffix)
        
        try:
            # Definir posición del texto
            if position == "top-center":
                x_pos = "(w-text_w)/2"
                y_pos = "h*0.1"
            elif position == "center":
                x_pos = "(w-text_w)/2"
                y_pos = "(h-text_h)/2"
            elif position == "top-left":
                x_pos = "w*0.05"
                y_pos = "h*0.05"
            elif position == "bottom-left":
                x_pos = "w*0.05"
                y_pos = "h*0.9"
            else:  # bottom-center (default)
                x_pos = "(w-text_w)/2"
                y_pos = "h*0.9"
            
            # Configuración para marca de agua (sin caja, color tenue)
            if is_watermark:
                # Opacidad del 30% (0.3)
                drawtext_filter = (
                    f"drawtext=text='{text}':x={x_pos}:y={y_pos}:"
                    f"fontsize=h*0.05:fontcolor=white@0.3:shadowcolor=black@0.2:shadowx=2:shadowy=2"
                )
            else:
                drawtext_filter = (
                    f"drawtext=text='{text}':x={x_pos}:y={y_pos}:"
                    f"fontsize={font_size}:fontcolor={font_color}:box=1:"
                    f"boxcolor={background_color}@{background_opacity}:boxborderw=5"
                )
            
            # Usar FFmpeg para añadir texto
            input_video = ffmpeg.input(video_path)
            video = input_stream = input_video.video.filter("drawtext", text=text, x=x_pos, y=y_pos, 
                                                           fontsize="h*0.05" if is_watermark else font_size,
                                                           fontcolor="white@0.3" if is_watermark else font_color,
                                                           shadowcolor="black@0.2" if is_watermark else None,
                                                           shadowx=2 if is_watermark else 0,
                                                           shadowy=2 if is_watermark else 0)
            
            # Si no es marca de agua, añadimos la caja (filtro complejo)
            if not is_watermark:
                video = input_video.video.filter("drawtext", text=text, x=x_pos, y=y_pos, 
                                               fontsize=font_size, fontcolor=font_color, 
                                               box=1, boxcolor=f"{background_color}@{background_opacity}", boxborderw=5)

            audio = input_video.audio
            output = ffmpeg.output(video, audio, output_path, vcodec='libx264', acodec='copy', pix_fmt='yuv420p')
            
            # Ejecutar el comando
            ffmpeg.run(output, overwrite_output=True, quiet=True)
            
            logger.info(f"Texto añadido al video: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Error añadiendo texto al video {video_path}: {e}")
            return video_path
    
    def apply_branding(self, video_path: str, logo_path: Optional[str] = None, 
                       text: Optional[str] = None, logo_position: str = "top-right", 
                       text_position: str = "bottom-center") -> str:
        """
        Aplica branding completo (logo y texto) al video
        """
        intermediate_path = video_path
        
        # Aplicar logo si se proporciona
        if logo_path and os.path.exists(logo_path):
            intermediate_path = self.add_logo_overlay(intermediate_path, logo_path, logo_position)
        
        # Aplicar texto si se proporciona
        if text:
            final_path = self.add_text_overlay(intermediate_path, text, text_position)
        else:
            final_path = intermediate_path
        
        return final_path

# Instancia global del servicio
branding_service = BrandingService()