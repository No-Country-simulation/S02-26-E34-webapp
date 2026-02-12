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
import { ArrowRight, CloudUpload, Frame, FileDown, Bolt, Crop } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Tutorial de onboarding */}
      {showTutorial && <OnboardingTutorial />}

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#3b2bee]/10 blur-[120px] rounded-full -z-10"></div>
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3b2bee]/10 border border-[#3b2bee]/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#3b2bee] animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#3b2bee]">Nuevo: Ajuste de marco en tiempo real</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight text-white">
            Transforma Tu Contenido.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b2bee] to-violet-400">16:9 a 9:16</span> en Segundos.
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            La forma más rápida de reutilizar tus videos para TikTok, Reels y Shorts con nuestra herramienta inteligente de ajuste de marco en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <button
              onClick={() => document.getElementById('converter-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-[0_0_30px_rgba(59,43,238,0.5)] flex items-center gap-2"
            >
              Comenzar Gratis <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-[#121022] border border-white/10 hover:border-[#3b2bee]/50 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all">
              Ver Demo
            </button>
          </div>

          {/* Preview Mockup */}
          <div className="relative max-w-4xl mx-auto rounded-xl overflow-hidden border border-[#3b2bee]/30 bg-[#121022] p-2 lg:p-4 group">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40">
              <img
                className="w-full h-full object-cover opacity-60"
                src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=1920"
                alt="Landscape background"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative aspect-[9/16] h-full border-2 border-[#3b2bee] rounded-lg shadow-[0_0_30px_rgba(59,43,238,0.5)] bg-black/20">
                  <div className="absolute top-2 right-2 bg-[#3b2bee] text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">Vista previa 9:16</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                        <Bolt className="text-white w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Converter Section */}
      <section id="converter-section" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-white">Convierte tu video ahora</h2>
            <p className="text-slate-400">Sube tu video horizontal y obtén una versión vertical optimizada</p>
          </div>

          {/* Mensaje de advertencia cuando el backend está offline */}
          {isBackendOnline === false && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-red-300 font-medium">El backend no está disponible. No puedes subir ni procesar videos en este momento.</p>
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
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-center font-medium">{durationError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Opciones de procesamiento */}
              <div className="bg-[#121022] p-6 rounded-xl border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-4 text-white">Opciones de conversión</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className={`flex items-center space-x-2 ${isBackendOnline === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={options.addSubtitles}
                          onChange={() => handleOptionChange('addSubtitles')}
                          disabled={isProcessing || isBackendOnline === false}
                          className="h-4 w-4 text-[#3b2bee] rounded focus:ring-[#3b2bee] disabled:opacity-50"
                        />
                        <span className="text-slate-300">Agregar subtítulos automáticos</span>
                      </label>

                      <label className={`flex items-center space-x-2 ${isBackendOnline === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={options.addBranding}
                          onChange={() => handleOptionChange('addBranding')}
                          disabled={isProcessing || isBackendOnline === false}
                          className="h-4 w-4 text-[#3b2bee] rounded focus:ring-[#3b2bee] disabled:opacity-50"
                        />
                        <span className="text-slate-300">Agregar branding (logo/texto)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleConvert}
                      disabled={isProcessing || !!convertedUrl || isBackendOnline === false}
                      className="px-8 py-3 bg-[#3b2bee] text-white font-bold rounded-lg shadow-lg hover:bg-[#3b2bee]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                    >
                      Cambiar video
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-white">Vista previa original</h2>
                  <VideoPreview src={videoUrl} aspectRatio="horizontal" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4 text-white">Vista previa convertido</h2>
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-[#121022] rounded-lg border-2 border-dashed border-[#3b2bee]/30">
                      <div className="w-full max-w-xs bg-[#3b2bee]/20 rounded-full h-2.5 mb-4">
                        <div
                          className="bg-[#3b2bee] h-2.5 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-slate-400">Procesando video... {progress}%</p>
                      {videoId && (
                        <p className="text-sm text-slate-500 mt-2">ID del video: {videoId}</p>
                      )}
                    </div>
                  ) : convertedUrl ? (
                    <VideoPreview src={convertedUrl} aspectRatio="vertical" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-[#121022] rounded-lg border-2 border-dashed border-[#3b2bee]/30">
                      <p className="text-slate-400">Esperando conversión...</p>
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
      </section>

      {/* Steps Section */}
      <section className="py-24 px-6 bg-[#121022]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Cómo Funciona</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Pasa de formato cinematográfico panorámico a formato vertical viral en tres sencillos pasos.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              num="01"
              icon={<CloudUpload className="text-[#3b2bee]" />}
              title="Sube Video"
              desc="Arrastra tu obra maestra 16:9 a nuestra nube segura. Soportamos resolución 4K y altas tasas de bits."
            />
            <StepCard
              num="02"
              icon={<Frame className="text-[#3b2bee]" />}
              title="Ajusta Marco"
              desc="Arrastra y posiciona el selector vertical para encuadrar la acción perfectamente. Mira el resultado en tiempo real."
            />
            <StepCard
              num="03"
              icon={<FileDown className="text-[#3b2bee]" />}
              title="Exporta Instantáneamente"
              desc="Exporta en formato vertical 9:16 de alta calidad. Listo para ser compartido directamente en plataformas sociales."
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto px-10 py-16 rounded-3xl bg-[#3b2bee] shadow-[0_0_50px_rgba(59,43,238,0.5)] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-20 opacity-10">
            <Bolt className="w-[200px] h-[200px]" />
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative z-10 text-center">
            <StatItem val="500k+" label="Videos Procesados" />
            <StatItem val="2.4s" label="Velocidad Promedio" />
            <StatItem val="99.9%" label="Garantía de Disponibilidad" />
            <StatItem val="4.9/5" label="Calificación de Usuarios" />
          </div>
        </div>
      </section>

      {/* Botón de feedback */}
      <FeedbackCollector />

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#3b2bee] rounded-lg flex items-center justify-center">
              <Crop className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">VideoConverter</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-slate-400">
            <a className="hover:text-white transition-colors" href="#">Política de Privacidad</a>
            <a className="hover:text-white transition-colors" href="#">Términos de Servicio</a>
            <a className="hover:text-white transition-colors" href="#">Contacto</a>
          </div>
          <div className="text-slate-600 text-xs text-center">
            © {new Date().getFullYear()} VideoConverter. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper components for the landing page
const StepCard = ({ num, icon, title, desc }: { num: string, icon: React.ReactNode, title: string, desc: string }) => (
  <div className="relative p-8 rounded-2xl bg-[#121022] border border-white/5 hover:border-[#3b2bee]/30 transition-all group overflow-hidden">
    <div className="w-16 h-16 rounded-2xl bg-[#3b2bee]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div className="absolute top-8 right-8 text-6xl font-black text-[#3b2bee]/5">{num}</div>
    <h3 className="text-2xl font-bold mb-3 text-white">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

const StatItem = ({ val, label }: { val: string, label: string }) => (
  <div>
    <div className="text-4xl font-bold mb-1">{val}</div>
    <div className="text-white/70 text-sm font-medium">{label}</div>
  </div>
);

