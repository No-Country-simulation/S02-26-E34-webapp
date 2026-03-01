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
  const [socialConnections, setSocialConnections] = useState({
    tiktok: { connected: false },
    instagram: { connected: false },
    youtube: { connected: false }
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

  useEffect(() => {
    const fetchSocialConnections = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/me`);
        if (res.ok) {
          const data = await res.json();
          if (data.social_connections) {
            setSocialConnections(data.social_connections);
          }
        }
      } catch (error) {
        console.error("Error fetching social connections:", error);
      }
    };
    if (isBackendOnline) {
      fetchSocialConnections();
    }
  }, [isBackendOnline]);

  const handleSettingChange = (setting: keyof typeof settings, value: any) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white overflow-x-hidden font-sans">
      <main className="flex-1 flex flex-col lg:flex-row gap-8 p-8 max-w-400 mx-auto w-full">
        {/* Left Column: Editor, Options, Timeline */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">

          {/* Section 1: Source Frame */}
          <SourceFrame
            videoUrl={videoUrl}
            isBackendOnline={isBackendOnline}
            settings={settings}
            videoRef={videoRef}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
          />

          {/* Section 2: Options Panel */}
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

          {/* Section 3: Timeline Placeholder */}
          <section className="p-6 bg-[#0F0F15] rounded-3xl border border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#3b2bee]/20 rounded-md">
                  <svg className="w-4 h-4 text-[#3b2bee]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest">Línea de Tiempo</h2>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                00:00:00 / 00:00:15
              </div>
            </div>
            <div className="h-32 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-1/4 bottom-0 w-px bg-[#3b2bee] shadow-[0_0_10px_#3b2bee] z-10">
                <div className="w-2 h-2 rounded-full bg-[#3b2bee] -ml-1 -mt-1"></div>
              </div>
              {/* Timeline Grid Background */}
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 100%' }}>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Preview & Export */}
        <div className="w-full lg:w-105 shrink-0">
          <PreviewPanel
            videoUrl={videoUrl}
            convertedUrl={convertedUrl}
            settings={settings}
            onConvert={handleConvert}
            isProcessing={isProcessing}
            progress={progress}
            videoUrlExist={!!videoUrl}
            isBackendOnline={isBackendOnline}
            socialConnections={socialConnections}
          />
        </div>
      </main>

      <FeedbackCollector />
    </div>
  );
}