import { showError } from './sweetalert';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
export const HEALTH_URL = `${API_BASE_URL}/health`;

interface UploadResponse {
  video_id: string;
  filename: string;
  status: string;
  message: string;
}

interface StatusResponse {
  video_id: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'deleted';
  message: string;
  progress: number;
  download_url?: string;
}

export const uploadVideo = async (
  file: File,
  options: { addSubtitles: boolean; addBranding: boolean }
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('add_subtitles', options.addSubtitles.toString());
  formData.append('add_branding', options.addBranding.toString());

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout para subida

    const response = await fetch(`${API_BASE_URL}/upload/`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Upload error:', errorData);
      throw new Error(`Error uploading video: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Upload API error:', error);
    // Show error to user if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError('Error de conexión', 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } else if (error.name === 'AbortError') {
      showError('Tiempo de espera agotado', 'La subida del video tardó demasiado en responder. Verifica que el backend esté corriendo.');
    } else {
      showError('Error de subida', 'Hubo un error al subir el video. Por favor, inténtalo de nuevo.');
    }
    throw error;
  }
};

export const checkStatus = async (videoId: string): Promise<StatusResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

    const response = await fetch(`${API_BASE_URL}/status/${videoId}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Status check error:', errorData);
      throw new Error(`Error checking status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Status check API error:', error);
    // Show error to user if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError('Error de conexión', 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } else if (error.name === 'AbortError') {
      showError('Tiempo de espera agotado', 'La solicitud tardó demasiado en responder. Verifica que el backend esté corriendo.');
    } else {
      showError('Error de red', 'Ocurrió un error al intentar comunicarse con el servidor.');
    }
    throw error;
  }
};

export const downloadVideo = async (videoId: string): Promise<Blob> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout para descarga

    const response = await fetch(`${API_BASE_URL}/download/${videoId}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Download error:', errorData);
      throw new Error(`Error downloading video: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error: any) {
    console.error('Download API error:', error);
    // Show error to user if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError('Error de conexión', 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } else if (error.name === 'AbortError') {
      showError('Tiempo de espera agotado', 'La descarga del video tardó demasiado en responder. Verifica que el backend esté corriendo.');
    } else {
      showError('Error de descarga', 'Ocurrió un error al intentar descargar el video.');
    }
    throw error;
  }
};