'use client';

import { useState, useCallback, useRef } from 'react';
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
  EyeOff
} from 'lucide-react';
import { uploadVideo, checkStatus, API_BASE_URL } from '@/lib/api';
import { useVideoStore } from '@/lib/store';
import { showError, showSuccess, showInfo } from '@/lib/sweetalert';
import useBackendStatus from '@/lib/useBackendStatus';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isOnline: isBackendOnline, isLoading: isBackendLoading } = useBackendStatus();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        showError('Archivo demasiado grande', 'El archivo excede el tamaño máximo de 100MB');
        return;
      }

      // Validate video duration (max 3 minutes)
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = function () {
        window.URL.revokeObjectURL(videoElement.src);
        const duration = videoElement.duration;
        if (duration > 180) { // 3 minutes
          showError('Duración excedida', 'El video no debe superar los 3 minutos de duración.');
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

          if (statusResponse.status === 'completed') {
            // Use absolute URL to avoid 404 from relative paths
            const backendHost = API_BASE_URL.replace('/api/v1', '');
            setConvertedUrl(`${backendHost}/api/v1/download/${response.video_id}`);
            setIsProcessing(false);
            setProgress(100);
            showSuccess('Conversión completada', 'Tu video ha sido convertido exitosamente.');
          } else if (statusResponse.status === 'processing' || statusResponse.status === 'uploaded') {
            // Increment progress while processing
            if (statusResponse.status === 'processing') {
              setProgress((prev: number) => Math.min(prev + 5, 90));
            }
            setTimeout(pollStatus, 2000); // Check again every 2 seconds
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

  const handleReset = () => {
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
  };

  const handleSettingChange = (setting: keyof typeof settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-[#121022] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#3b2bee] rounded-lg flex items-center justify-center">
            <Crop className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-white">VideoConverter Editor</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            {isBackendOnline ? (
              <span className="text-green-400">● Conectado</span>
            ) : (
              <span className="text-red-400">● Desconectado</span>
            )}
          </div>
          <button 
            onClick={handleReset}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/10 transition-colors"
          >
            Reiniciar
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Section: Source Workspace */}
        <section className="flex-1 p-6 flex flex-col gap-6 bg-slate-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-white/5 rounded-lg">
                <Maximize className="text-[#3b2bee] w-5 h-5" />
              </span>
              <div>
                <h2 className="font-bold text-xl text-white">Marco de Origen</h2>
                <p className="text-xs text-slate-500">1920x1080 (16:9) • Original</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSettingChange('cropX', 50)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 text-white"
              >
                Centrar
              </button>
              <button
                onClick={() => handleSettingChange('zoom', 100)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 text-white"
              >
                Ajustar
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center">
            {!videoUrl ? (
              <div
                {...getRootProps()}
                className={`w-full max-w-4xl aspect-video bg-gradient-to-br from-[#121022] to-[#0a0a0f] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-8 cursor-pointer transition-all ${
                  isDragActive ? 'border-[#3b2bee] bg-[#3b2bee]/20 scale-[1.02]' : 'border-[#3b2bee]/40'
                } ${isBackendOnline === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={(e) => isBackendOnline === false && e.stopPropagation()}
              >
                <input {...getInputProps()} disabled={isBackendOnline === false} />
                <div className="p-4 bg-[#3b2bee]/10 rounded-full mb-6">
                  <CloudUpload className="w-12 h-12 text-[#3b2bee]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Arrastra tu video aquí</h3>
                <p className="text-slate-300 mb-2">o haz clic para seleccionar un archivo MP4</p>
                <p className="text-sm text-slate-500">Máximo 100MB, duración máxima 3 minutos</p>
                {isBackendOnline === false && (
                  <p className="text-sm text-red-400 mt-4">Backend no disponible</p>
                )}
              </div>
            ) : (
              <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group border-4 border-slate-900 select-none">
                {/* Source Video Frame */}
                <div
                  className="w-full h-full transition-transform duration-300 origin-center"
                  style={{
                    transform: `scale(${settings.zoom / 100}) rotate(${settings.rotation}deg)`,
                  }}
                >
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    controls
                  />
                </div>

                {/* Cropping Guide Mask */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="h-full aspect-[9/16] border-2 border-[#3b2bee] ring-[100vw] ring-black/60 relative pointer-events-auto cursor-move transition-all duration-300"
                    style={{ 
                      left: `${(settings.cropX - 50) * 0.8}%`,
                      top: `${(settings.cropY - 50) * 0.4}%`
                    }}
                  >
                    {/* Label */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#3b2bee] text-[10px] font-bold text-white rounded-full uppercase tracking-widest shadow-lg flex items-center gap-2">
                      <Move className="w-3 h-3" />
                      Arrastra para recortar
                    </div>

                    {/* Corner Handles */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-sm"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-sm"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-sm"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-sm"></div>

                    {/* Grid lines */}
                    {settings.showGrid && (
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="border border-white/40"></div>
                        ))}
                      </div>
                    )}

                    {/* Safe zones */}
                    {settings.safeZones && (
                      <div className="absolute inset-0 border-4 border-yellow-400/50 rounded-sm pointer-events-none"></div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="text-white hover:text-[#3b2bee] transition-colors">
                    <Play className="w-5 h-5 fill-current" />
                  </button>
                  <div className="w-px h-6 bg-white/20 mx-2"></div>
                  <span className="text-xs font-mono text-white/80">00:12 / 01:45</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Section: Result Preview */}
        <section className="w-[420px] border-l border-white/5 p-6 flex flex-col gap-6 bg-[#0a0a0f]">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#3b2bee]/10 rounded-lg">
              <Smartphone className="text-[#3b2bee] w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-xl uppercase tracking-tight text-white">Vista Previa</h2>
              <p className="text-xs text-slate-500">1080x1920 (9:16) • Vertical</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {/* Phone Mockup */}
            <div className="relative w-[280px] aspect-[9/16] bg-black rounded-[3rem] p-3 border-[8px] border-slate-800 shadow-2xl overflow-hidden select-none">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>

              {/* Content Container */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden relative">
                {convertedUrl ? (
                  <video
                    src={convertedUrl}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : videoUrl ? (
                  <div
                    className="absolute inset-0 transition-all duration-300"
                    style={{
                      transform: `scale(${settings.zoom / 100}) rotate(${settings.rotation}deg)`,
                      marginLeft: `${-(settings.cropX - 50) * 1.5}px`,
                      marginTop: `${-(settings.cropY - 50) * 0.75}px`
                    }}
                  >
                    <video
                      src={videoUrl}
                      className="h-full w-auto max-w-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-cover"
                      style={{ objectPosition: `${settings.cropX}% ${settings.cropY}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                    <span className="text-slate-500">Sin vista previa</span>
                  </div>
                )}

                {/* Social Overlay */}
                {settings.showOverlay && convertedUrl && (
                  <div className="absolute inset-0 p-4 flex flex-col justify-end pointer-events-none bg-gradient-to-t from-black/40 to-transparent">
                    <div className="flex justify-between items-end gap-2 mb-4">
                      <div className="flex-1 space-y-2">
                        <div className="h-2 w-24 bg-white/30 rounded-full"></div>
                        <div className="h-2 w-32 bg-white/20 rounded-full"></div>
                      </div>
                      <div className="flex flex-col gap-4 items-center">
                        <Heart className="text-white/80 w-8 h-8" />
                        <MessageCircle className="text-white/80 w-8 h-8" />
                        <Share2 className="text-white/80 w-8 h-8" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium text-slate-400">
              Superposición TikTok
              <button
                onClick={() => handleSettingChange('showOverlay', !settings.showOverlay)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.showOverlay ? 'bg-[#3b2bee]' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showOverlay ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-400">
              Zonas Seguras
              <button
                onClick={() => handleSettingChange('safeZones', !settings.safeZones)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.safeZones ? 'bg-[#3b2bee]' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.safeZones ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-400">
              Mostrar Cuadrícula
              <button
                onClick={() => handleSettingChange('showGrid', !settings.showGrid)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.showGrid ? 'bg-[#3b2bee]' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.showGrid ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-400">
              Seguimiento Automático
              <button
                onClick={() => handleSettingChange('autoTrack', !settings.autoTrack)}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.autoTrack ? 'bg-[#3b2bee]' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.autoTrack ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Footer Bar */}
      <footer className="h-24 border-t border-white/5 px-8 flex items-center justify-between bg-[#0a0a0f] z-50">
        <div className="flex items-center gap-4">
          <div {...getRootProps()} className="cursor-pointer">
            <input {...getInputProps()} disabled={isBackendOnline === false} />
            <button
              className="h-12 px-6 rounded-full bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#3b2bee]/30"
              disabled={isBackendOnline === false}
            >
              <CloudUpload className="w-5 h-5" />
              Subir Nuevo Video
            </button>
          </div>
          <div className="h-10 w-px bg-white/10 mx-2"></div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Perfil Seleccionado</span>
            <span className="text-sm font-semibold text-white">9:16 Vertical (HD)</span>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-12 flex items-center gap-8">
          {/* Zoom Slider */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-tight">
              <span>Escala de Zoom</span>
              <span className="text-[#3b2bee]">{settings.zoom}%</span>
            </div>
            <input
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-[#3b2bee] cursor-pointer"
              type="range"
              min="50"
              max="200"
              value={settings.zoom}
              onChange={(e) => handleSettingChange('zoom', parseInt(e.target.value))}
            />
          </div>
          {/* Rotation Slider */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-tight">
              <span>Rotación</span>
              <span className="text-[#3b2bee]">{settings.rotation}°</span>
            </div>
            <input
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-[#3b2bee] cursor-pointer"
              type="range"
              min="-45"
              max="45"
              value={settings.rotation}
              onChange={(e) => handleSettingChange('rotation', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-slate-400">
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={handleConvert}
            disabled={isProcessing || !videoUrl || isBackendOnline === false}
            className={`h-14 px-10 rounded-full font-bold flex items-center gap-3 shadow-xl transition-all ${
              isProcessing || !videoUrl || isBackendOnline === false
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-[#3b2bee] text-white shadow-[#3b2bee]/30 hover:scale-[1.02] active:scale-95'
            }`}
          >
            <Download className="w-5 h-5" />
            {isProcessing ? `Procesando... ${progress}%` : 'Convertir & Descargar'}
          </button>
        </div>
      </footer>
    </div>
  );
}