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
            
            # Combinar video con logo
            output = ffmpeg.output(input_video, logo_positioned, output_path, 
                                 vcodec='libx264', pix_fmt='yuv420p')
            
            # Ejecutar el comando
            ffmpeg.run(output, overwrite_output=True, quiet=True)
            
            logger.info(f"Logo añadido al video: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Error añadiendo logo al video {video_path}: {e}")
            raise
    
    def add_text_overlay(self, video_path: str, text: str, position: str = "bottom-center", 
                         font_size: int = 24, font_color: str = "white", 
                         background_color: str = "black", background_opacity: float = 0.5) -> str:
        """
        Añade texto overlay al video
        """
        output_path = video_path.replace('.mp4', '_with_text.mp4')
        
        try:
            # Definir posición del texto
            if position == "top-center":
                x_pos = "(w-text_w)/2"
                y_pos = "10"
            elif position == "top-left":
                x_pos = "10"
                y_pos = "10"
            elif position == "top-right":
                x_pos = "w-tw-10"
                y_pos = "10"
            elif position == "bottom-left":
                x_pos = "10"
                y_pos = "h-th-10"
            elif position == "bottom-right":
                x_pos = "w-tw-10"
                y_pos = "h-th-10"
            else:  # bottom-center (default)
                x_pos = "(w-text_w)/2"
                y_pos = "h-th-10"
            
            # Usar FFmpeg para añadir texto
            input_video = ffmpeg.input(video_path)
            
            # Añadir texto con fondo
            drawtext_filter = [
                f"drawtext=text='{text}':x={x_pos}:y={y_pos}:"
                f"fontsize={font_size}:fontcolor={font_color}:box=1:"
                f"boxcolor={background_color}@{background_opacity}:boxborderw=5"
            ]
            
            output = ffmpeg.filter(input_video, 'drawtext', drawtext_filter[0])
            output = ffmpeg.output(output, output_path, vcodec='libx264', pix_fmt='yuv420p')
            
            # Ejecutar el comando
            ffmpeg.run(output, overwrite_output=True, quiet=True)
            
            logger.info(f"Texto añadido al video: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Error añadiendo texto al video {video_path}: {e}")
            raise
    
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