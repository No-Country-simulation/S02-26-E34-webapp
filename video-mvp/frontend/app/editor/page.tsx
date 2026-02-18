'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadVideo, checkStatus, API_BASE_URL } from '@/lib/api';
import { useVideoStore } from '@/lib/store';
import { showError, showSuccess, showInfo } from '@/lib/sweetalert';
import useBackendStatus from '@/lib/useBackendStatus';
import FeedbackCollector from '@/components/FeedbackCollector';

import SourceFrame from '@/components/editor/SourceFrame';
import OptionsPanel from '@/components/editor/OptionsPanel';
import PreviewPanel from '@/components/editor/PreviewPanel';

export default function ImprovedEditorPage() {
  const {
    videoUrl,
    convertedUrl,
    isProcessing,
    progress,
    options,
    setVideoFile,
    setVideoUrl,
    setConvertedUrl,
    setIsProcessing,
    setProgress,
    setVideoId,
    setOption,
  } = useVideoStore();

  const [videoFileLocal, setVideoFileLocal] = useState<File | null>(null);
  const [settings, setSettings] = useState({
    zoom: 100,
    rotation: 0,
    cropX: 50,
    cropY: 50,
    showOverlay: true,
    safeZones: false,
    showGrid: true,
    autoTrack: false
  });
  const [statusMessage, setStatusMessage] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const { isOnline: isBackendOnline } = useBackendStatus();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      const maxFileSizeMB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50');
      const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
      if (file.size > maxFileSizeBytes) {
        showError('Archivo demasiado grande', `El archivo excede el tamaño máximo de ${maxFileSizeMB}MB`);
        return;
      }

      const maxDurationMinutes = parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_MINUTES || '3');
      const maxDurationSeconds = maxDurationMinutes * 60;
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = function () {
        window.URL.revokeObjectURL(videoElement.src);
        const duration = videoElement.duration;
        if (duration > maxDurationSeconds) {
          showError('Duración excedida', `El video no debe superar los ${maxDurationMinutes} minutos de duración.`);
          setVideoFileLocal(null);
          setVideoUrl(null);
          return;
        }
        setVideoFileLocal(file);
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
      };
      videoElement.src = URL.createObjectURL(file);
    }
  }, [setVideoUrl]);

  const handleConvert = async () => {
    if (!videoFileLocal) return;

    try {
      const healthUrl = `${API_BASE_URL}/health`;
      const response = await fetch(healthUrl);
      if (!response.ok) {
        showInfo('Backend no disponible', 'El servidor backend no está disponible. Por favor, asegúrate de que esté corriendo antes de intentar procesar videos.');
        return;
      }
    } catch {
      showInfo('Backend no disponible', 'No se pudo conectar con el servidor backend. Por favor, asegúrate de que esté corriendo antes de intentar procesar videos.');
      return;
    }

    try {
      setVideoFile(videoFileLocal);

      const enhancedOptions = {
        ...options,
        zoom: settings.zoom,
        rotation: settings.rotation,
        cropX: settings.cropX,
        cropY: settings.cropY,
        autoTrack: settings.autoTrack
      };

      const response = await uploadVideo(videoFileLocal, enhancedOptions);
      setVideoId(response.video_id);

      setIsProcessing(true);
      setProgress(10);

      const pollStatus = async () => {
        try {
          const statusResponse = await checkStatus(response.video_id);

          if (statusResponse.progress !== undefined) {
            setProgress((prev: number) => Math.max(prev, statusResponse.progress));
          }

          if (statusResponse.message) {
            setStatusMessage(statusResponse.message);
          }

          if (statusResponse.status === 'processed') {
            const backendHost = API_BASE_URL.replace('/api/v1', '');
            setConvertedUrl(`${backendHost}/api/v1/download/${response.video_id}`);
            setIsProcessing(false);
            setProgress(100);
            setStatusMessage('');
            showSuccess('Conversión completada', 'Tu video ha sido convertido exitosamente.');
          } else if (statusResponse.status === 'processing' || statusResponse.status === 'uploaded') {
            if (statusResponse.status === 'processing' && (!statusResponse.progress || statusResponse.progress < 10)) {
              setProgress((prev: number) => Math.min(prev + 1, 95));
            }
            setTimeout(pollStatus, 1000);
          } else if (statusResponse.status === 'failed') {
            setIsProcessing(false);
            showError('Error en el procesamiento', 'Hubo un error al procesar el video. Por favor, inténtalo de nuevo.');
          }
        } catch {
          setIsProcessing(false);
          showError('Error de conexión', 'Hubo un error al verificar el estado del video. Por favor, inténtalo de nuevo.');
        }
      };

      pollStatus();
    } catch (error) {
      console.error('Error uploading video:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/mp4': ['.mp4'] },
    maxFiles: 1,
    maxSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50') * 1024 * 1024,
    disabled: isBackendOnline === false
  });

  const handleReset = useCallback(() => {
    setVideoFileLocal(null);
    setVideoUrl(null);
    setConvertedUrl(null);
    setIsProcessing(false);
    setProgress(0);
    setSettings({
      zoom: 100,
      rotation: 0,
      cropX: 50,
      cropY: 50,
      showOverlay: true,
      safeZones: false,
      showGrid: true,
      autoTrack: false
    });
  }, [setVideoUrl, setConvertedUrl, setIsProcessing, setProgress]);

  useEffect(() => {
    if (isBackendOnline === false) {
      handleReset();
    }
  }, [isBackendOnline, handleReset]);

  const handleSettingChange = (setting: keyof typeof settings, value: any) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-[#0a0a0f] py-4 md:py-8 overflow-x-hidden">
      <main className="flex-1 max-w-[95%] xl:max-w-[85%] w-full mx-auto flex flex-col lg:flex-row gap-6 min-h-175 px-4 md:px-0">

        <SourceFrame
          videoUrl={videoUrl}
          isBackendOnline={isBackendOnline}
          settings={settings}
          videoRef={videoRef}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
        />

        <OptionsPanel
          videoUrl={videoUrl}
          isBackendOnline={isBackendOnline}
          isProcessing={isProcessing}
          progress={progress}
          settings={settings}
          options={options}
          onConvert={handleConvert}
          onReset={handleReset}
          onSettingChange={handleSettingChange}
        />

        <PreviewPanel
          videoUrl={videoUrl}
          convertedUrl={convertedUrl}
          settings={settings}
        />

      </main>

      <FeedbackCollector />
    </div>
  );
}