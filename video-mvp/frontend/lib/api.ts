import { showError } from './sweetalert';

const normalizeBaseUrl = (value?: string) => {
  if (!value) return '';
  return value.trim().replace(/\/$/, '');
};

const isLocalHostName = (hostName: string) => hostName === 'localhost' || hostName === '127.0.0.1';

// Usa NEXT_PUBLIC_API_URL cuando corresponde; fallback a ruta relativa para aprovechar rewrite de Next.js.
const envApiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const envPointsToLocalhost =
  envApiBaseUrl.startsWith('http://localhost') || envApiBaseUrl.startsWith('http://127.0.0.1');

const shouldForceRelativeApiBase =
  typeof window !== 'undefined' &&
  envPointsToLocalhost &&
  !isLocalHostName(window.location.hostname);

export const API_BASE_URL = shouldForceRelativeApiBase
  ? '/api/v1'
  : envApiBaseUrl || '/api/v1';
export const BASE_URL = '';
export const HEALTH_URL = `${API_BASE_URL}/health`;

// Axios-like fetch wrapper
const getToken = () => {
  if (typeof window === 'undefined') return '';
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.access_token || '';
    }
  } catch (e) {
    console.error('Error parsing user from localStorage', e);
  }
  return '';
};

export const api = {
  get: async (url: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    return { data };
  },
  patch: async (url: string, body: any) => {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    return { data };
  }
};

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
  options: {
    addSubtitles: boolean;
    addBranding: boolean;
    cropX?: number;
    cropY?: number;
    selectionSize?: number;
    selectionArea?: {
      width?: number;
      height?: number;
      frameWidth?: number;
      frameHeight?: number;
    } | null;
    trim?: {
      start?: number;
      end?: number;
    };
  }
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('add_subtitles', options.addSubtitles.toString());
  formData.append('add_branding', options.addBranding.toString());

  const selectionArea = options.selectionArea;
  const hasSelectionArea = !!selectionArea &&
    !!selectionArea.width &&
    !!selectionArea.height &&
    !!selectionArea.frameWidth &&
    !!selectionArea.frameHeight;

  const selectionCx = typeof options.cropX === 'number' ? options.cropX / 100 : 0.5;
  const selectionCy = typeof options.cropY === 'number' ? options.cropY / 100 : 0.5;

  let selectionW = 0.3;
  let selectionH = 0.5;

  if (hasSelectionArea && selectionArea) {
    selectionW = (selectionArea.width as number) / (selectionArea.frameWidth as number);
    selectionH = (selectionArea.height as number) / (selectionArea.frameHeight as number);
  }

  formData.append('selection_cx', String(Math.max(0, Math.min(1, selectionCx))));
  formData.append('selection_cy', String(Math.max(0, Math.min(1, selectionCy))));
  formData.append('selection_w', String(Math.max(0, Math.min(1, selectionW))));
  formData.append('selection_h', String(Math.max(0, Math.min(1, selectionH))));
  formData.append('selection_time', String(options.trim?.start ?? 0));

  if (typeof options.trim?.start === 'number') {
    formData.append('trim_start', String(options.trim.start));
  }
  if (typeof options.trim?.end === 'number') {
    formData.append('trim_end', String(options.trim.end));
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout para subida

    const response = await fetch(`${API_BASE_URL}/upload`, {
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

export const generatePreview = async (
  file: File,
  payload: {
    startTime: number;
    endTime: number;
    selectionCx: number;
    selectionCy: number;
    selectionW: number;
    selectionH: number;
    selectionTime?: number;
    watermarkMode?: 'offline' | 'online';
  }
): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('start_time', String(payload.startTime));
  formData.append('end_time', String(payload.endTime));
  formData.append('selection_cx', String(payload.selectionCx));
  formData.append('selection_cy', String(payload.selectionCy));
  formData.append('selection_w', String(payload.selectionW));
  formData.append('selection_h', String(payload.selectionH));
  formData.append('selection_time', String(payload.selectionTime ?? payload.startTime));
  formData.append('watermark_mode', payload.watermarkMode ?? 'offline');

  const response = await fetch(`${API_BASE_URL}/upload/preview`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Preview generation error:', errorData);
    throw new Error(`Error generating preview: ${response.statusText}`);
  }

  return await response.blob();
};