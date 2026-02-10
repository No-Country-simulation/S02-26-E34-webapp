// frontend/app/page.tsx (corregido)
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import VideoPreview from '@/components/VideoPreview';
import UploadZone from '@/components/UploadZone';
import DownloadButton from '@/components/DownloadButton';
import BackendStatusIndicator from '@/components/BackendStatusIndicator';
import { uploadVideo, checkStatus, API_BASE_URL } from '@/lib/api';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import FeedbackCollector from '@/components/FeedbackCollector';
import { useVideoStore } from '@/lib/store';
import { showError, showSuccess, showInfo } from '@/lib/sweetalert';
import useBackendStatus from '@/lib/useBackendStatus';

export default function Home() {
  const {
    videoUrl,
    convertedUrl,
    isProcessing,
    progress,
    videoId,
    options,
    setVideoFile,
    setVideoUrl,
    setConvertedUrl,
    setIsProcessing,
    setProgress,
    setVideoId,
    setOption,
  } = useVideoStore();

  const [showTutorial, setShowTutorial] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [videoFileLocal, setVideoFileLocal] = useState<File | null>(null);

  const { isOnline: isBackendOnline, isLoading: isBackendLoading } = useBackendStatus();

  // Mostrar tutorial solo en la primera visita
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      requestAnimationFrame(() => setShowTutorial(true));
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setDurationError(null);

      // Validar tamaño del archivo (máximo 100MB)
      if (file.size > 100 * 1024 * 1024) {
        showError('Archivo demasiado grande', 'El archivo excede el tamaño máximo de 100MB');
        return;
      }

      // Validar duración del video (máximo 3 minutos)
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = function () {
        window.URL.revokeObjectURL(videoElement.src);
        const duration = videoElement.duration;
        if (duration > 180) { // 3 minutos
          setDurationError('El video no debe superar los 3 minutos de duración.');
          setVideoFileLocal(null);
          setVideoUrl(null);
        } else {
          setVideoFileLocal(file);
          const url = URL.createObjectURL(file);
          setVideoUrl(url);
          setDurationError(null);
        }
      };
      videoElement.src = URL.createObjectURL(file);
    }
  }, [setVideoUrl]);

  const handleConvert = async () => {
    if (!videoFileLocal) return;

    // Check backend status before processing
    try {
      const healthUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/health`;
      const response = await fetch(healthUrl);
      if (!response.ok) {
        showInfo(
          'Backend no disponible',
          'El servidor backend no está disponible. Por favor, asegúrate de que esté corriendo antes de intentar procesar videos.'
        );
        return;
      }
    } catch (error) {
      showInfo(
        'Backend no disponible',
        'No se pudo conectar con el servidor backend. Por favor, asegúrate de que esté corriendo antes de intentar procesar videos.'
      );
      return;
    }

    try {
      setVideoFile(videoFileLocal);

      // Subir video al backend
      const response = await uploadVideo(videoFileLocal, options);
      setVideoId(response.video_id);

      // Iniciar polling para verificar estado
      setIsProcessing(true);
      setProgress(10); // Iniciar progreso

      // Polling para verificar estado de procesamiento
      const pollStatus = async () => {
        try {
          const statusResponse = await checkStatus(response.video_id);

          if (statusResponse.status === 'completed') {
            // Usar URL absoluta para evitar 404 por rutas relativas
            const backendHost = API_BASE_URL.replace('/api/v1', '');
            setConvertedUrl(`${backendHost}/api/v1/download/${response.video_id}`);
            setIsProcessing(false);
            setProgress(100);
          } else if (statusResponse.status === 'processing' || statusResponse.status === 'uploaded') {
            // Incrementar progreso simulado mientras se procesa o espera
            if (statusResponse.status === 'processing') {
              setProgress((prev: number) => Math.min(prev + 5, 90));
            }
            setTimeout(pollStatus, 2000); // Seguir verificando cada 2 segundos
          } else if (statusResponse.status === 'failed') {
            setIsProcessing(false);
            showError('Error en el procesamiento', 'Hubo un error al procesar el video. Por favor, inténtalo de nuevo.');
          }
        } catch (error) {
          setIsProcessing(false);
          showError('Error de conexión', 'Hubo un error al verificar el estado del video. Por favor, inténtalo de nuevo.');
        }
      };

      pollStatus();
    } catch (error) {
      console.error('Error uploading video:', error);
      // Error handling is now done in the API functions
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const handleOptionChange = (option: keyof typeof options) => {
    setOption(option, !options[option]);
  };


  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-100">
      {/* Tutorial de onboarding */}
      {showTutorial && <OnboardingTutorial />}

      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-center text-gray-800">Conversor Video Horizontal → Vertical (V2)</h1>
              <p className="text-center text-gray-600 mt-2">Optimiza tus videos para TikTok, Instagram Reels y YouTube Shorts</p>
            </div>
            <div className="shrink-0">
              <BackendStatusIndicator />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Mensaje de advertencia cuando el backend está offline */}
          {isBackendOnline === false && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 font-medium">El backend no está disponible. No puedes subir ni procesar videos en este momento.</p>
              </div>
            </div>
          )}

          {!videoUrl ? (
            <div className="space-y-4">
              <UploadZone
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                disabled={isBackendOnline === false}
              />
              {durationError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-center font-medium">{durationError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Opciones de procesamiento */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Opciones de conversión</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className={`flex items-center space-x-2 ${isBackendOnline === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={options.addSubtitles}
                          onChange={() => handleOptionChange('addSubtitles')}
                          disabled={isProcessing || isBackendOnline === false}
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="text-gray-700">Agregar subtítulos automáticos</span>
                      </label>

                      <label className={`flex items-center space-x-2 ${isBackendOnline === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={options.addBranding}
                          onChange={() => handleOptionChange('addBranding')}
                          disabled={isProcessing || isBackendOnline === false}
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="text-gray-700">Agregar branding (logo/texto)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleConvert}
                      disabled={isProcessing || !!convertedUrl || isBackendOnline === false}
                      className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isBackendOnline === false ? 'El backend no está disponible. No se puede procesar videos.' : undefined}
                    >
                      {isProcessing ? 'Procesando...' : convertedUrl ? 'Completado' : isBackendOnline === false ? 'Backend Offline' : 'Convertir Video'}
                    </button>
                    <button
                      onClick={() => {
                        setVideoFileLocal(null);
                        setVideoUrl(null);
                        setConvertedUrl(null);
                      }}
                      disabled={isProcessing}
                      className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                    >
                      Cambiar video
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-700">Vista previa original</h2>
                  <VideoPreview src={videoUrl} aspectRatio="horizontal" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-700">Vista previa convertido</h2>
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-4">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-gray-600">Procesando video... {progress}%</p>
                      {videoId && (
                        <p className="text-sm text-gray-500 mt-2">ID del video: {videoId}</p>
                      )}
                    </div>
                  ) : convertedUrl ? (
                    <VideoPreview src={convertedUrl} aspectRatio="vertical" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-600">Esperando conversión...</p>
                    </div>
                  )}
                </div>
              </div>

              {convertedUrl && !isProcessing && (
                <div className="text-center">
                  <DownloadButton url={convertedUrl} filename="video-convertido.mp4" />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Botón de feedback */}
      <FeedbackCollector />

      <footer className="bg-white border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Conversor Video. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}