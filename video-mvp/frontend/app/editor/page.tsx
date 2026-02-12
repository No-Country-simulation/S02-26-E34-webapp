'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Maximize,
  RotateCw,
  Smartphone,
  History,
  CloudUpload,
  Download,
  Move,
  Play,
  Heart,
  MessageCircle,
  Share2,
  Crop,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  Minimize2,
  Maximize2,
  ThumbsUp,
  ThumbsDown,
  Shield
} from 'lucide-react';
import { uploadVideo, checkStatus, API_BASE_URL } from '@/lib/api';
import { useVideoStore } from '@/lib/store';
import { showError, showSuccess, showInfo } from '@/lib/sweetalert';
import useBackendStatus from '@/lib/useBackendStatus';
import FeedbackCollector from '@/components/FeedbackCollector';

// Componente Tooltip simple
const Tooltip = ({ children, content, position = "top" }: { children: React.ReactNode; content: string; position?: string }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="relative"
      >
        {children}
        {isVisible && (
          <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded-md whitespace-nowrap ${position === "top" ? "bottom-full left-1/2 transform -translate-x-1/2 mb-2" : ""} ${position === "bottom" ? "top-full left-1/2 transform -translate-x-1/2 mt-2" : ""} ${position === "left" ? "right-full top-1/2 transform -translate-y-1/2 mr-2" : ""} ${position === "right" ? "left-full top-1/2 transform -translate-y-1/2 ml-2" : ""}`}>
            {content}
            <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${position === "top" ? "top-full left-1/2 transform -translate-x-1/2 -mt-1" : ""} ${position === "bottom" ? "bottom-full left-1/2 transform -translate-x-1/2 -mb-1" : ""} ${position === "left" ? "right-full top-1/2 transform -translate-y-1/2 -mr-1" : ""} ${position === "right" ? "left-full top-1/2 transform -translate-y-1/2 -ml-1" : ""}`}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ImprovedEditorPage() {
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

  const [videoFileLocal, setVideoFileLocal] = useState<File | null>(null);
  const [settings, setSettings] = useState({
    zoom: 100,
    rotation: 0,
    cropX: 50, // Horizontal offset for cropping
    cropY: 50, // Vertical offset for cropping
    showOverlay: true,
    safeZones: false,
    showGrid: true,
    autoTrack: false
  });
  const [statusMessage, setStatusMessage] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const { isOnline: isBackendOnline, isLoading: isBackendLoading } = useBackendStatus();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      // Validate file size (max configurable)
      const maxFileSizeMB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50');
      const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
      if (file.size > maxFileSizeBytes) {
        showError('Archivo demasiado grande', `El archivo excede el tamaño máximo de ${maxFileSizeMB}MB`);
        return;
      }

      // Validate video duration (max configurable)
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

      // Upload video to backend with settings
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

      // Start polling for status
      setIsProcessing(true);
      setProgress(10); // Start progress

      // Polling to check processing status
      const pollStatus = async () => {
        try {
          const statusResponse = await checkStatus(response.video_id);

          // Actualización de progreso basada en el backend
          if (statusResponse.progress !== undefined) {
            setProgress((prev: number) => Math.max(prev, statusResponse.progress));
          }

          if (statusResponse.message) {
            setStatusMessage(statusResponse.message);
          }

          if (statusResponse.status === 'processed') {
            // Use absolute URL to avoid 404 from relative paths
            const backendHost = API_BASE_URL.replace('/api/v1', '');
            setConvertedUrl(`${backendHost}/api/v1/download/${response.video_id}`);
            setIsProcessing(false);
            setProgress(100);
            setStatusMessage('');
            showSuccess('Conversión completada', 'Tu video ha sido convertido exitosamente.');
          } else if (statusResponse.status === 'processing' || statusResponse.status === 'uploaded') {
            // Increment progress while processing if backend progress is not driving it
            if (statusResponse.status === 'processing' && (!statusResponse.progress || statusResponse.progress < 10)) {
              setProgress((prev: number) => Math.min(prev + 1, 95));
            }
            setTimeout(pollStatus, 1000); // Check again every 1 second for smoother updates
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
    maxSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50') * 1024 * 1024, // configurable MB,
    disabled: isBackendOnline === false
  });

  const handleOptionChange = (option: keyof typeof options) => {
    setOption(option, !options[option]);
  };

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
  }, [setVideoUrl, setConvertedUrl, setIsProcessing, setProgress, setSettings]);

  useEffect(() => {
    if (isBackendOnline === false) {
      handleReset();
    }
  }, [isBackendOnline, handleReset]);

  const handleSettingChange = (setting: keyof typeof settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-[#0a0a0f] py-4 md:py-8 overflow-x-hidden">
      <main className="flex-1 max-w-[95%] xl:max-w-[85%] w-full mx-auto flex flex-col lg:flex-row gap-6 min-h-175 px-4 md:px-0">

        {/* Column 1: Source Workspace (Left) */}
        <section className="flex-1 p-4 md:p-6 flex flex-col gap-6 bg-slate-950/20 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/5 rounded-lg">
              <Maximize className="text-[#3b2bee] w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-lg md:text-xl text-white">Marco de Origen</h2>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium tracking-tight">1920x1080 (16:9) • RAW</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-75 md:min-h-auto">
            {!videoUrl ? (
              <div
                {...getRootProps()}
                className={`w-full max-w-4xl aspect-video bg-linear-to-br from-[#121022] to-[#0a0a0f] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-6 md:p-8 cursor-pointer transition-all ${isDragActive ? 'border-[#3b2bee] bg-[#3b2bee]/20 scale-[1.01]' : 'border-[#3b2bee]/40'
                  } ${isBackendOnline === false ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="p-3 md:p-4 bg-[#3b2bee]/10 rounded-full mb-4 md:mb-6">
                  <CloudUpload className="w-8 h-8 md:w-12 md:h-12 text-[#3b2bee]" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">Sube tu video aquí</h3>
                <p className="text-sm md:text-slate-300 mb-2 font-medium">mp4 horizontal</p>
                <p className="text-[10px] md:text-sm text-slate-500">Máx {process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50'}MB • {process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_MINUTES || '3'} min</p>
                {isBackendOnline === false && (
                  <p className="text-xs text-red-400 mt-4 font-bold uppercase tracking-widest">Servidor no disponible</p>
                )}
              </div>
            ) : (
              <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group border-4 md:border-[6px] border-slate-900 select-none">
                <div
                  className="w-full h-full transition-transform duration-300 origin-center"
                  style={{ transform: `scale(${settings.zoom / 100}) rotate(${settings.rotation}deg)` }}
                >
                  <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" controls />
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="h-full aspect-9/16 border-2 border-[#3b2bee] ring-[100vw] ring-black/60 relative pointer-events-auto cursor-move transition-all duration-300"
                    style={{
                      left: `${(settings.cropX - 50) * 0.8}%`,
                      top: `${(settings.cropY - 50) * 0.4}%`
                    }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#3b2bee] text-[8px] md:text-[10px] font-black text-white rounded-full uppercase tracking-[0.2em] shadow-xl flex items-center gap-2 whitespace-nowrap">
                      Área de Recorte
                    </div>
                    <div className="absolute -top-1 -left-1 w-4 h-4 md:w-5 md:h-5 border-t-4 border-l-4 border-white rounded-tl-sm"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 border-t-4 border-r-4 border-white rounded-tr-sm"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 md:w-5 md:h-5 border-b-4 border-l-4 border-white rounded-bl-sm"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 border-b-4 border-r-4 border-white rounded-br-sm"></div>
                    {settings.showGrid && (
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                        {[...Array(9)].map((_, i) => <div key={i} className="border border-white/20"></div>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Column 2: Configuration & Options (Center) */}
        <section className="w-full lg:w-85 p-6 flex flex-col gap-6 md:gap-8 bg-[#121022]/40 rounded-3xl border border-white/5 overflow-y-auto custom-scrollbar shadow-inner">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#3b2bee]/10 rounded-lg">
              <Settings className="text-[#3b2bee] w-5 h-5" />
            </span>
            <h2 className="font-bold text-xl uppercase tracking-tight text-white">Opciones</h2>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Multimedia</h3>
            <button
              className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-95 ${isBackendOnline === false || isProcessing ? 'bg-gray-600/10 text-gray-500 cursor-not-allowed border border-white/5' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
              disabled={isBackendOnline === false || isProcessing}
              onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
            >
              <CloudUpload className="w-5 h-5 text-[#3b2bee]" />
              {videoUrl ? 'Cambiar Video' : 'Cargar Archivo'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Encuadre</h3>
              <div className="flex gap-2">
                <button onClick={handleReset} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors border border-white/5 shadow-sm active:scale-90"><RefreshCw className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleSettingChange('cropX', 50)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors border border-white/5 shadow-sm active:scale-90"><Minimize2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Escala / Zoom</span>
                  <span className="text-[#3b2bee] font-mono">{settings.zoom}%</span>
                </div>
                <input className="w-full h-2 bg-white/5 rounded-full appearance-none accent-[#3b2bee] cursor-pointer" type="range" min="50" max="200" value={settings.zoom} disabled={isBackendOnline === false || isProcessing} onChange={(e) => handleSettingChange('zoom', parseInt(e.target.value))} />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Rotación</span>
                  <span className="text-[#3b2bee] font-mono">{settings.rotation}°</span>
                </div>
                <input className="w-full h-2 bg-white/5 rounded-full appearance-none accent-[#3b2bee] cursor-pointer" type="range" min="-45" max="45" value={settings.rotation} disabled={isBackendOnline === false || isProcessing} onChange={(e) => handleSettingChange('rotation', parseInt(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Visualización</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {[
                { id: 'showOverlay', label: 'Capa TikTok', icon: <MessageCircle className="w-4 h-4" /> },
                { id: 'safeZones', label: 'Guías Seguras', icon: <Shield className="w-4 h-4" /> },
                { id: 'showGrid', label: 'Retícula 3x3', icon: <Maximize className="w-4 h-4" /> },
                { id: 'autoTrack', label: 'Auto Tracking', icon: <RefreshCw className="w-4 h-4" /> }
              ].map((toggle) => (
                <div key={toggle.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                    <span className="text-[#3b2bee]/60">{toggle.icon}</span>
                    {toggle.label}
                  </div>
                  <button
                    onClick={() => handleSettingChange(toggle.id as any, !settings[toggle.id as keyof typeof settings])}
                    disabled={isBackendOnline === false || isProcessing}
                    className={`w-10 h-5 rounded-full relative transition-all ${settings[toggle.id as keyof typeof settings] ? 'bg-[#3b2bee] shadow-[0_0_10px_rgba(59,43,238,0.4)]' : 'bg-slate-700/50 border border-white/5'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings[toggle.id as keyof typeof settings] ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <button
              onClick={handleConvert}
              disabled={isProcessing || !videoUrl || isBackendOnline === false}
              className={`w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.97] ${isProcessing || !videoUrl || isBackendOnline === false ? 'bg-gray-600/30 text-gray-500 cursor-not-allowed border border-white/5' : 'bg-[#3b2bee] text-white shadow-[#3b2bee]/30 hover:shadow-[#3b2bee]/50 hover:-translate-y-1'}`}
            >
              {isProcessing ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> {progress}%</>
              ) : (
                <><Download className="w-5 h-5" /> Convertir Ahora</>
              )}
            </button>
          </div>
        </section>

        {/* Column 3: Result Preview (Right) */}
        <section className="w-full lg:w-90 p-4 md:p-6 flex flex-col gap-6 bg-slate-950/20 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#3b2bee]/10 rounded-lg">
              <Smartphone className="text-[#3b2bee] w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-lg md:text-xl uppercase tracking-tight text-white">Vista Previa</h2>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium tracking-tight">VERTICAL • 9:16 • FHD</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center py-4">
            <div className="relative w-60 md:w-70 aspect-9/16 bg-black rounded-[2.5rem] md:rounded-[3rem] p-2 md:p-3 border-8 md:border-10 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden select-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 md:w-32 h-5 md:h-6 bg-slate-800 rounded-b-2xl z-20"></div>
              <div className="w-full h-full rounded-[1.8rem] md:rounded-4xl overflow-hidden relative bg-slate-900/40">
                {convertedUrl ? (
                  <video src={convertedUrl} className="w-full h-full object-cover" controls autoPlay />
                ) : videoUrl ? (
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                      transform: `scale(${settings.zoom / 100}) rotate(${settings.rotation}deg)`,
                      marginLeft: `${-(settings.cropX - 50) * 1.5}px`,
                      marginTop: `${-(settings.cropY - 50) * 0.75}px`
                    }}
                  >
                    <video src={videoUrl} className="h-full w-auto max-w-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6 text-center">
                    <span className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">Esperando contenido multimedia</span>
                  </div>
                )}

                {settings.showOverlay && (
                  <div className="absolute inset-0 p-4 flex flex-col justify-end pointer-events-none bg-linear-to-t from-black/60 to-transparent">
                    <div className="flex justify-between items-end gap-2 mb-4">
                      <div className="flex-1 space-y-2"><div className="h-1.5 w-20 bg-white/20 rounded-full"></div><div className="h-1.5 w-24 bg-white/10 rounded-full"></div></div>
                      <div className="flex flex-col gap-3 items-center"><Heart className="text-white/40 w-4 h-4" /><MessageCircle className="text-white/40 w-4 h-4" /><Share2 className="text-white/40 w-4 h-4" /></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <FeedbackCollector />
    </div>
  );
}