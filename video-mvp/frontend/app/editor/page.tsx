'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadVideo, checkStatus, API_BASE_URL, generatePreview } from '@/lib/api';
import { useVideoStore } from '@/lib/store';
import { showError, showSuccess, showInfo } from '@/lib/sweetalert';
import useBackendStatus from '@/lib/useBackendStatus';
import FeedbackCollector from '@/components/FeedbackCollector';

import SourceFrame from '@/components/editor/SourceFrame';
import OptionsPanel from '@/components/editor/OptionsPanel';
import PreviewPanel from '@/components/editor/PreviewPanel';
import TimelinePanel from '@/components/editor/TimelinePanel';

interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  centerX: number;
  centerY: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface EditorSettings {
  selectionSize: number;
  cropX: number;
  cropY: number;
  showOverlay: boolean;
  safeZones: boolean;
  showGrid: boolean;
  autoTrack: boolean;
}

interface PreviewStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

const MIN_CLIP_GAP_SECONDS = 1;

const buildSelectionAreaFromSettings = (
  frameWidth: number,
  frameHeight: number,
  settings: Pick<EditorSettings, 'selectionSize' | 'cropX' | 'cropY'>
): SelectionArea => {
  const centerX = frameWidth * (settings.cropX / 100);
  const centerY = frameHeight * (settings.cropY / 100);

  const idealHeight = frameHeight * (settings.selectionSize / 100);
  const idealWidth = idealHeight * (9 / 16);

  const maxHalfWidthByCenter = Math.min(centerX, frameWidth - centerX);
  const maxHalfHeightByCenter = Math.min(centerY, frameHeight - centerY);
  const maxWidthByHorizontal = Math.max(1, maxHalfWidthByCenter * 2);
  const maxHeightByVertical = Math.max(1, maxHalfHeightByCenter * 2);
  const maxWidthByVertical = Math.max(1, maxHeightByVertical * (9 / 16));
  const maxWidth = Math.max(1, Math.min(maxWidthByHorizontal, maxWidthByVertical));

  const minHeight = frameHeight * 0.25;
  const minWidth = minHeight * (9 / 16);

  const width = Math.min(Math.max(idealWidth, minWidth), maxWidth);
  const height = width * (16 / 9);

  const x = centerX - width / 2;
  const y = centerY - height / 2;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    frameWidth: Math.round(frameWidth),
    frameHeight: Math.round(frameHeight),
    centerX: Math.round(centerX),
    centerY: Math.round(centerY),
    left: Math.round(x),
    top: Math.round(y),
    right: Math.round(x + width),
    bottom: Math.round(y + height)
  };
};

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
  const [settings, setSettings] = useState<EditorSettings>({
    selectionSize: 100,
    cropX: 50,
    cropY: 50,
    showOverlay: true,
    safeZones: false,
    showGrid: false,
    autoTrack: false
  });
  const [socialConnections, setSocialConnections] = useState({
    tiktok: { connected: false },
    instagram: { connected: false },
    youtube: { connected: false }
  });
  const [processingStage, setProcessingStage] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectionArea, setSelectionArea] = useState<SelectionArea | null>(null);
  const [selectionSyncTick, setSelectionSyncTick] = useState<number>(0);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [clipStart, setClipStart] = useState<number>(0);
  const [clipEnd, setClipEnd] = useState<number>(0);
  const [isClipPlaying, setIsClipPlaying] = useState<boolean>(false);
  const [playheadTime, setPlayheadTime] = useState<number>(0);
  const [previewStages, setPreviewStages] = useState<PreviewStage[]>([]);
  const selectionAreaRef = useRef<SelectionArea | null>(null);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wasGeneratingRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const { isOnline: isBackendOnline } = useBackendStatus();

  const syncVideosToTime = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = time;
    }
    setPlayheadTime(time);
  }, []);

  const pauseClipPlayback = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
    }
    setIsClipPlaying(false);
  }, []);

  const playSelectedRange = useCallback(async () => {
    if (!videoUrl || clipEnd <= clipStart) return;

    if (isClipPlaying) return;

    const currentTime = videoRef.current?.currentTime ?? previewVideoRef.current?.currentTime ?? clipStart;
    const resumeTime = currentTime >= clipStart && currentTime < clipEnd ? currentTime : clipStart;
    syncVideosToTime(resumeTime);

    const playPromises: Promise<void>[] = [];
    if (videoRef.current) {
      playPromises.push(videoRef.current.play());
    }
    if (previewVideoRef.current) {
      playPromises.push(previewVideoRef.current.play());
    }

    if (playPromises.length === 0) return;

    await Promise.allSettled(playPromises);
    setIsClipPlaying(true);
  }, [videoUrl, clipStart, clipEnd, isClipPlaying, syncVideosToTime]);

  const stopClipPlayback = useCallback(() => {
    pauseClipPlayback();
    syncVideosToTime(clipStart);
  }, [pauseClipPlayback, syncVideosToTime, clipStart]);

  const restartClipPlayback = useCallback(async () => {
    if (!videoUrl || clipEnd <= clipStart) return;

    pauseClipPlayback();
    syncVideosToTime(clipStart);

    const playPromises: Promise<void>[] = [];
    if (videoRef.current) {
      playPromises.push(videoRef.current.play());
    }
    if (previewVideoRef.current) {
      playPromises.push(previewVideoRef.current.play());
    }

    if (playPromises.length === 0) return;

    await Promise.allSettled(playPromises);
    setIsClipPlaying(true);
  }, [videoUrl, clipEnd, clipStart, pauseClipPlayback, syncVideosToTime]);

  const resetEditorForNewVideo = useCallback(() => {
    pauseClipPlayback();
    if (generatedPreviewUrl) {
      URL.revokeObjectURL(generatedPreviewUrl);
    }
    setGeneratedPreviewUrl(null);
    setIsGeneratingPreview(false);
    setPreviewStages([]);
    setConvertedUrl(null);
    setIsProcessing(false);
    setProgress(0);
    setProcessingStage('');
    setStatusMessage('');
    setVideoId(null);
    setSettings({
      selectionSize: 100,
      cropX: 50,
      cropY: 50,
      showOverlay: true,
      safeZones: false,
      showGrid: false,
      autoTrack: false
    });
    setSelectionArea(null);
    setSelectionSyncTick(prev => prev + 1);
    setVideoDuration(0);
    setClipStart(0);
    setClipEnd(0);
    setPlayheadTime(0);
    setIsClipPlaying(false);
  }, [generatedPreviewUrl, pauseClipPlayback, setConvertedUrl, setIsProcessing, setProgress, setVideoId]);

  const handleGeneratePreview = useCallback(async () => {
    if (!videoFileLocal || isGeneratingPreview) return;

    if (clipEnd <= clipStart) {
      showError('Rango inválido', 'El tiempo de fin debe ser mayor al tiempo de inicio.');
      return;
    }

    try {
      setIsGeneratingPreview(true);

      const selectionCx = settings.cropX / 100;
      const selectionCy = settings.cropY / 100;
      const selectionW = selectionArea && selectionArea.frameWidth > 0
        ? selectionArea.width / selectionArea.frameWidth
        : 0.3;
      const selectionH = selectionArea && selectionArea.frameHeight > 0
        ? selectionArea.height / selectionArea.frameHeight
        : 0.5;

      const previewBlob = await generatePreview(videoFileLocal, {
        startTime: clipStart,
        endTime: clipEnd,
        selectionCx: Math.max(0, Math.min(1, selectionCx)),
        selectionCy: Math.max(0, Math.min(1, selectionCy)),
        selectionW: Math.max(0.05, Math.min(1, selectionW)),
        selectionH: Math.max(0.05, Math.min(1, selectionH)),
        selectionTime: playheadTime,
        watermarkMode: (() => {
          try {
            const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            const token = userStr ? JSON.parse(userStr)?.access_token : null;
            return token ? 'online' : 'offline';
          } catch { return 'offline'; }
        })()
      });

      const nextPreviewUrl = URL.createObjectURL(previewBlob);
      setGeneratedPreviewUrl(prev => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return nextPreviewUrl;
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      showError('Error en preview', 'No se pudo generar la previsualización.');
      setPreviewStages([]);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [videoFileLocal, isGeneratingPreview, clipEnd, clipStart, settings.cropX, settings.cropY, selectionArea, playheadTime]);

  const handleDownloadLatestPreview = useCallback(() => {
    if (!generatedPreviewUrl) return;

    const readableTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const anchor = document.createElement('a');
    anchor.href = generatedPreviewUrl;
    anchor.download = `verv.io-${readableTimestamp}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [generatedPreviewUrl]);

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
        resetEditorForNewVideo();
        setVideoFileLocal(file);
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
      };
      videoElement.src = URL.createObjectURL(file);
    }
  }, [resetEditorForNewVideo, setVideoUrl]);

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
        selectionSize: settings.selectionSize,
        cropX: settings.cropX,
        cropY: settings.cropY,
        autoTrack: settings.autoTrack,
        selectionArea,
        selectionCoordinates: selectionArea
          ? {
            x: selectionArea.x,
            y: selectionArea.y,
            width: selectionArea.width,
            height: selectionArea.height,
            left: selectionArea.left,
            top: selectionArea.top,
            right: selectionArea.right,
            bottom: selectionArea.bottom
          }
          : null,
        trim: {
          start: clipStart,
          end: clipEnd
        }
      };

      const response = await uploadVideo(videoFileLocal, enhancedOptions);
      setVideoId(response.video_id);

      setIsProcessing(true);
      setProgress(10);
      setProcessingStage('Archivo subido');
      setStatusMessage('Tu video fue recibido por el servidor');

      const pollStatus = async () => {
        try {
          const statusResponse = await checkStatus(response.video_id);

          if (statusResponse.progress !== undefined) {
            setProgress((prev: number) => Math.max(prev, statusResponse.progress));
          }

          if (statusResponse.message) {
            setStatusMessage(statusResponse.message);
          }

          if (statusResponse.status === 'uploaded') {
            setProcessingStage('En cola');
          } else if (statusResponse.status === 'processing') {
            setProcessingStage('Procesando');
          }

          if (statusResponse.status === 'processed') {
            const backendHost = API_BASE_URL.replace('/api/v1', '');
            setConvertedUrl(`${backendHost}/api/v1/download/${response.video_id}`);
            setIsProcessing(false);
            setProgress(100);
            setProcessingStage('Completado');
            setStatusMessage('');
            showSuccess('Conversión completada', 'Tu video ha sido convertido exitosamente.');
          } else if (statusResponse.status === 'processing' || statusResponse.status === 'uploaded') {
            if (statusResponse.status === 'processing' && (!statusResponse.progress || statusResponse.progress < 10)) {
              setProgress((prev: number) => Math.min(prev + 1, 95));
            }
            setTimeout(pollStatus, 1000);
          } else if (statusResponse.status === 'failed') {
            setIsProcessing(false);
            setProcessingStage('Error');
            showError('Error en el procesamiento', 'Hubo un error al procesar el video. Por favor, inténtalo de nuevo.');
          }
        } catch {
          setIsProcessing(false);
          setProcessingStage('Error de conexión');
          showError('Error de conexión', 'Hubo un error al verificar el estado del video. Por favor, inténtalo de nuevo.');
        }
      };

      pollStatus();
    } catch (error) {
      console.error('Error uploading video:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'video/mp4': ['.mp4'] },
    maxFiles: 1,
    maxSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50') * 1024 * 1024,
    disabled: isBackendOnline === false
  });

  const handleReset = useCallback(() => {
    if (generatedPreviewUrl) {
      URL.revokeObjectURL(generatedPreviewUrl);
    }
    setGeneratedPreviewUrl(null);
    setIsGeneratingPreview(false);
    setPreviewStages([]);
    setVideoFileLocal(null);
    setVideoUrl(null);
    setConvertedUrl(null);
    setIsProcessing(false);
    setProgress(0);
    setProcessingStage('');
    setStatusMessage('');
    setSettings({
      selectionSize: 100,
      cropX: 50,
      cropY: 50,
      showOverlay: true,
      safeZones: false,
      showGrid: false,
      autoTrack: false
    });
    setSelectionArea(null);
    setVideoDuration(0);
    setClipStart(0);
    setClipEnd(0);
    setPlayheadTime(0);
    setIsClipPlaying(false);
  }, [generatedPreviewUrl, setVideoUrl, setConvertedUrl, setIsProcessing, setProgress]);

  useEffect(() => {
    selectionAreaRef.current = selectionArea;
  }, [selectionArea]);

  useEffect(() => {
    const currentSelection = selectionAreaRef.current;
    if (!currentSelection) return;

    const nextSelection = buildSelectionAreaFromSettings(
      currentSelection.frameWidth,
      currentSelection.frameHeight,
      settings
    );

    setSelectionArea(prev => {
      if (!prev) return nextSelection;

      const isSame =
        prev.x === nextSelection.x &&
        prev.y === nextSelection.y &&
        prev.width === nextSelection.width &&
        prev.height === nextSelection.height;

      return isSame ? prev : nextSelection;
    });
  }, [settings.selectionSize, settings.cropX, settings.cropY]);

  useEffect(() => {
    if (isBackendOnline === false) {
      handleReset();
    }
  }, [isBackendOnline, handleReset]);

  useEffect(() => {
    const fetchSocialConnections = async () => {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const accessToken = userStr ? JSON.parse(userStr)?.access_token : null;

        if (!accessToken) {
          setSocialConnections({
            tiktok: { connected: false },
            instagram: { connected: false },
            youtube: { connected: false }
          });
          return;
        }

        const res = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (res.status === 401 || res.status === 403) {
          setSocialConnections({
            tiktok: { connected: false },
            instagram: { connected: false },
            youtube: { connected: false }
          });
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.social_connections) {
            setSocialConnections(prev => ({
              ...prev,
              tiktok: {
                ...prev.tiktok,
                ...(data.social_connections.tiktok || {})
              },
              instagram: {
                ...prev.instagram,
                ...(data.social_connections.instagram || {})
              },
              youtube: {
                ...prev.youtube,
                ...(data.social_connections.youtube || {})
              }
            }));
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

  const applySettings = (updater: (prev: EditorSettings) => EditorSettings) => {
    setSettings(prev => updater(prev));
  };

  const handleSettingChange = (setting: keyof EditorSettings, value: any) => {
    applySettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleResetSelectionSize = () => {
    applySettings(prev => ({ ...prev, selectionSize: 100 }));
    setSelectionSyncTick(prev => prev + 1);
  };

  const handleCenterSelectionFrame = () => {
    applySettings(prev => ({ ...prev, cropX: 50, cropY: 50 }));
    setSelectionSyncTick(prev => prev + 1);
  };

  const handleClipStartChange = (nextStart: number) => {
    const boundedStart = Math.min(nextStart, Math.max(0, clipEnd - MIN_CLIP_GAP_SECONDS));
    setClipStart(boundedStart);
    if (!isClipPlaying) {
      syncVideosToTime(boundedStart);
    }
  };

  const handleClipEndChange = (nextEnd: number) => {
    setClipEnd(Math.max(nextEnd, Math.min(videoDuration || 0, clipStart + MIN_CLIP_GAP_SECONDS)));
  };

  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo || !videoUrl) {
      setVideoDuration(0);
      setClipStart(0);
      setClipEnd(0);
      return;
    }

    const onMetadata = () => {
      const duration = Number.isFinite(currentVideo.duration) ? currentVideo.duration : 0;
      setVideoDuration(duration);
      setClipStart(0);
      setClipEnd(duration);
      setPlayheadTime(0);
    };

    currentVideo.addEventListener('loadedmetadata', onMetadata);

    if (currentVideo.readyState >= 1) {
      onMetadata();
    }

    return () => {
      currentVideo.removeEventListener('loadedmetadata', onMetadata);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (!isClipPlaying) return;

    let rafId = 0;

    const tick = () => {
      const sourceVideo = videoRef.current;
      const previewVideo = previewVideoRef.current;

      const currentTime = sourceVideo?.currentTime ?? previewVideo?.currentTime ?? 0;
      setPlayheadTime(currentTime);

      if (sourceVideo && previewVideo && Math.abs(sourceVideo.currentTime - previewVideo.currentTime) > 0.12) {
        previewVideo.currentTime = sourceVideo.currentTime;
      }

      if (currentTime >= clipEnd) {
        pauseClipPlayback();
        syncVideosToTime(clipEnd);
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isClipPlaying, clipEnd, pauseClipPlayback, syncVideosToTime]);

  useEffect(() => {
    if (!videoUrl) {
      pauseClipPlayback();
    }
  }, [videoUrl, pauseClipPlayback]);

  useEffect(() => {
    return () => {
      if (generatedPreviewUrl) {
        URL.revokeObjectURL(generatedPreviewUrl);
      }
    };
  }, [generatedPreviewUrl]);

  // Preview stages progression
  useEffect(() => {
    if (isGeneratingPreview && !wasGeneratingRef.current) {
      wasGeneratingRef.current = true;
      stageTimersRef.current.forEach(clearTimeout);
      stageTimersRef.current = [];

      setPreviewStages([
        { id: 'upload', label: 'Enviando video al servidor', status: 'active' },
        { id: 'extract', label: 'Extrayendo clip de video', status: 'pending' },
        { id: 'crop', label: 'Aplicando Smart Dynamic Crop', status: 'pending' },
        { id: 'finalize', label: 'Generando resultado', status: 'pending' },
      ]);

      const advances = [2000, 5000, 15000];
      advances.forEach((ms, i) => {
        const t = setTimeout(() => {
          setPreviewStages(prev => prev.map((s, idx) => ({
            ...s,
            status: idx <= i ? 'completed' as const : idx === i + 1 ? 'active' as const : s.status
          })));
        }, ms);
        stageTimersRef.current.push(t);
      });
    } else if (!isGeneratingPreview && wasGeneratingRef.current) {
      wasGeneratingRef.current = false;
      stageTimersRef.current.forEach(clearTimeout);
      stageTimersRef.current = [];
      setPreviewStages(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
    }

    return () => {
      stageTimersRef.current.forEach(clearTimeout);
      stageTimersRef.current = [];
    };
  }, [isGeneratingPreview]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden font-sans">
      <main className="flex-1 flex flex-col lg:flex-row gap-8 p-8 max-w-400 mx-auto w-full">
        {/* Left Column: Editor, Options, Timeline */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">

          {/* Section 1: Source Frame */}
          <SourceFrame
            videoUrl={videoUrl}
            isBackendOnline={isBackendOnline}
            settings={settings}
            onCropXChange={(value) => handleSettingChange('cropX', value)}
            onCropYChange={(value) => handleSettingChange('cropY', value)}
            onSelectionSizeChange={(value) => handleSettingChange('selectionSize', value)}
            onSelectionAreaChange={setSelectionArea}
            videoRef={videoRef}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            selectionSyncTick={selectionSyncTick}
            isClipPlaying={isClipPlaying}
            onPlay={playSelectedRange}
            onPause={pauseClipPlayback}
            onRestart={restartClipPlayback}
            onStop={stopClipPlayback}
            videoDuration={videoDuration}
            clipStart={clipStart}
            clipEnd={clipEnd}
            playheadTime={playheadTime}
          />

          {/* Section 2: Timeline Panel */}
          <TimelinePanel
            videoUrl={videoUrl}
            videoDuration={videoDuration}
            clipStart={clipStart}
            clipEnd={clipEnd}
            playheadTime={playheadTime}
            onClipStartChange={handleClipStartChange}
            onClipEndChange={handleClipEndChange}
          />

          {/* Section 3: Options Panel */}
          <OptionsPanel
            videoUrl={videoUrl}
            isBackendOnline={isBackendOnline}
            isProcessing={isProcessing}
            progress={progress}
            settings={settings}
            options={options}
            onConvert={handleConvert}
            onReset={handleReset}
            onOpenFileDialog={open}
            onResetSelectionSize={handleResetSelectionSize}
            onCenterSelectionFrame={handleCenterSelectionFrame}
            onSettingChange={handleSettingChange}
          />
        </div>

        {/* Right Column: Preview & Export */}
        <div className="w-full lg:w-105 shrink-0">
          <PreviewPanel
            videoUrl={videoUrl}
            convertedUrl={convertedUrl}
            generatedPreviewUrl={generatedPreviewUrl}
            settings={settings}
            selectionArea={selectionArea}
            previewVideoRef={previewVideoRef}
            onDownloadLatestPreview={handleDownloadLatestPreview}
            onGeneratePreview={handleGeneratePreview}
            isProcessing={isProcessing}
            isGeneratingPreview={isGeneratingPreview}
            progress={progress}
            processingStage={processingStage}
            statusMessage={statusMessage}
            previewStages={previewStages}
            videoUrlExist={!!videoUrl}
            isBackendOnline={isBackendOnline}
            canDownloadLatestPreview={!!generatedPreviewUrl}
            socialConnections={socialConnections}
          />
        </div>
      </main>

      <FeedbackCollector />
    </div>
  );
}