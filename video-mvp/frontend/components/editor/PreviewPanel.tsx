'use client';

import Image from 'next/image';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Smartphone, Heart, MessageCircle, Share2, RefreshCw, Download, Check, Loader2, Circle } from 'lucide-react';
import PlaybackControls from './PlaybackControls';

interface Settings {
    selectionSize: number;
    cropX: number;
    cropY: number;
    showOverlay: boolean;
    safeZones: boolean;
    showGrid: boolean;
    autoTrack: boolean;
}

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

interface PreviewPanelProps {
    videoUrl: string | null;
    convertedUrl: string | null;
    generatedPreviewUrl: string | null;
    settings: Settings;
    selectionArea: SelectionArea | null;
    previewVideoRef: React.RefObject<HTMLVideoElement | null>;
    onDownloadLatestPreview: () => void;
    onGeneratePreview: () => void;
    isProcessing: boolean;
    isGeneratingPreview: boolean;
    progress: number;
    processingStage?: string;
    statusMessage?: string;
    previewStages: Array<{id: string; label: string; status: 'pending' | 'active' | 'completed'}>;
    videoUrlExist: boolean;
    isBackendOnline: boolean | null;
    canDownloadLatestPreview: boolean;
    socialConnections: {
        tiktok: { connected: boolean };
        instagram: { connected: boolean };
        youtube: { connected: boolean };
    };
}

const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// Phone states: 'idle' | 'processing' | 'result'
type PhoneState = 'idle' | 'processing' | 'result';

export default function PreviewPanel({
    videoUrl,
    convertedUrl,
    generatedPreviewUrl,
    settings,
    selectionArea,
    previewVideoRef,
    onDownloadLatestPreview,
    onGeneratePreview,
    isProcessing,
    isGeneratingPreview,
    progress,
    processingStage,
    statusMessage,
    previewStages,
    videoUrlExist,
    isBackendOnline,
    canDownloadLatestPreview,
    socialConnections
}: PreviewPanelProps) {
    // Result video playback state
    const resultVideoRef = useRef<HTMLVideoElement>(null);
    const [isResultPlaying, setIsResultPlaying] = useState(false);
    const [resultCurrentTime, setResultCurrentTime] = useState(0);
    const [resultDuration, setResultDuration] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    // Determine which state the phone mockup is in
    const phoneState: PhoneState = isGeneratingPreview
        ? 'processing'
        : generatedPreviewUrl
            ? 'result'
            : 'idle';

    // Reset playback state and reload video when preview URL changes
    useEffect(() => {
        setIsResultPlaying(false);
        setResultCurrentTime(0);
        setResultDuration(0);
        const video = resultVideoRef.current;
        if (video) {
            if (generatedPreviewUrl) {
                video.src = generatedPreviewUrl;
                video.load();
            } else {
                video.removeAttribute('src');
                video.load();
            }
        }
    }, [generatedPreviewUrl]);

    // Time update for result video
    useEffect(() => {
        const video = resultVideoRef.current;
        if (!video || phoneState !== 'result') return;

        const onTimeUpdate = () => {
            if (!isSeeking) setResultCurrentTime(video.currentTime);
        };
        const onLoadedMetadata = () => {
            setResultDuration(video.duration || 0);
        };
        const onEnded = () => {
            setIsResultPlaying(false);
        };
        const onPlay = () => setIsResultPlaying(true);
        const onPause = () => setIsResultPlaying(false);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('ended', onEnded);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);

        if (video.readyState >= 1 && video.duration) {
            setResultDuration(video.duration);
        }

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, [generatedPreviewUrl, isSeeking, phoneState]);

    const toggleResultPlayback = useCallback(() => {
        const video = resultVideoRef.current;
        if (!video || !video.src || video.readyState < 1) return;
        if (video.paused || video.ended) {
            if (video.ended) video.currentTime = 0;
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }, []);

    const restartResultPlayback = useCallback(() => {
        const video = resultVideoRef.current;
        if (!video || !video.src || video.readyState < 1) return;
        video.currentTime = 0;
        setResultCurrentTime(0);
        video.play();
    }, []);

    const stopResultPlayback = useCallback(() => {
        const video = resultVideoRef.current;
        if (!video || !video.src || video.readyState < 1) return;
        video.pause();
        video.currentTime = 0;
        setResultCurrentTime(0);
        setIsResultPlaying(false);
    }, []);

    const handleSeekStart = useCallback(() => {
        setIsSeeking(true);
    }, []);

    const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setResultCurrentTime(time);
        if (resultVideoRef.current) {
            resultVideoRef.current.currentTime = time;
        }
    }, []);

    const handleSeekEnd = useCallback(() => {
        setIsSeeking(false);
    }, []);

    const previewStyle = useMemo(() => {
        if (!selectionArea || selectionArea.width <= 0 || selectionArea.height <= 0 || selectionArea.frameWidth <= 0 || selectionArea.frameHeight <= 0) {
            return {
                left: '0%',
                top: '0%',
                width: '100%',
                height: '100%'
            };
        }

        const widthPercent = (selectionArea.frameWidth / selectionArea.width) * 100;
        const heightPercent = (selectionArea.frameHeight / selectionArea.height) * 100;
        const leftPercent = -(selectionArea.x / selectionArea.width) * 100;
        const topPercent = -(selectionArea.y / selectionArea.height) * 100;

        return {
            left: `${leftPercent}%`,
            top: `${topPercent}%`,
            width: `${widthPercent}%`,
            height: `${heightPercent}%`
        };
    }, [selectionArea]);

    const progressPercent = resultDuration > 0 ? (resultCurrentTime / resultDuration) * 100 : 0;

    return (
        <section className="w-full p-8 flex flex-col gap-10 bg-[#0F0F15] rounded-[2.5rem] border border-white/5 h-full shadow-2xl">
            <div className="flex items-center gap-3">
                <span className="p-2 bg-[#3b2bee]/10 rounded-lg">
                    <Smartphone className="text-[#3b2bee] w-5 h-5" />
                </span>
                <div>
                    <h2 className="font-bold text-lg md:text-xl uppercase tracking-tight text-white">Vista Previa</h2>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium tracking-tight">VERTICAL • 9:16 • FHD</p>
                </div>
                {phoneState === 'result' && (
                    <span className="ml-auto px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400">
                        Resultado
                    </span>
                )}
                {phoneState === 'processing' && (
                    <span className="ml-auto px-3 py-1 bg-[#3b2bee]/10 border border-[#3b2bee]/20 rounded-full text-[9px] font-black uppercase tracking-[0.15em] text-[#3b2bee]">
                        Procesando
                    </span>
                )}
            </div>

            <div className="flex-1 flex items-center justify-center py-4">
                <div className="relative w-60 md:w-70 aspect-9/16 bg-black rounded-[2.5rem] md:rounded-[3rem] p-2 md:p-3 border-8 md:border-10 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden select-none">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 md:w-32 h-5 md:h-6 bg-slate-800 rounded-b-2xl z-20"></div>

                    <div className="w-full h-full rounded-[1.8rem] md:rounded-4xl overflow-hidden relative bg-slate-900/40">

                        {/* ─── STATE 1: IDLE ─ CSS crop preview / empty ─── */}
                        <div className={`absolute inset-0 transition-opacity duration-500 ${phoneState === 'idle' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            {convertedUrl ? (
                                <video ref={previewVideoRef} src={convertedUrl} className="w-full h-full object-cover" controls={false} autoPlay muted playsInline />
                            ) : videoUrl ? (
                                <div className="absolute inset-0">
                                    <div
                                        className="absolute transition-all duration-150"
                                        style={previewStyle}
                                    >
                                        <video
                                            ref={previewVideoRef}
                                            src={videoUrl}
                                            className="w-full h-full object-cover"
                                            controls={false}
                                            muted
                                            playsInline
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-4">
                                    <div className="p-3 bg-white/5 rounded-full opacity-20">
                                        <Smartphone className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-30">
                                        Esperando contenido multimedia
                                    </span>
                                </div>
                            )}

                            {/* Social overlay */}
                            {settings.showOverlay && videoUrl && (
                                <div className="absolute inset-0 p-4 flex flex-col justify-end pointer-events-none bg-linear-to-t from-black/60 to-transparent">
                                    <div className="flex justify-between items-end gap-2 mb-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="h-1.5 w-20 bg-white/20 rounded-full"></div>
                                            <div className="h-1.5 w-24 bg-white/10 rounded-full"></div>
                                        </div>
                                        <div className="flex flex-col gap-3 items-center">
                                            <Heart className="text-white/40 w-4 h-4" />
                                            <MessageCircle className="text-white/40 w-4 h-4" />
                                            <Share2 className="text-white/40 w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── STATE 2: PROCESSING ─ Checklist inside phone ─── */}
                        <div className={`absolute inset-0 transition-opacity duration-500 ${phoneState === 'processing' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="w-full h-full bg-[#050505] flex flex-col items-center justify-center p-5 gap-4">
                                <Loader2 className="w-7 h-7 text-[#3b2bee] animate-spin mb-1" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                                    Convirtiendo video
                                </span>

                                <div className="w-full space-y-2.5">
                                    {previewStages.map((stage) => (
                                        <div key={stage.id} className={`flex items-center gap-2.5 transition-all duration-300 ${stage.status === 'pending' ? 'opacity-30' : 'opacity-100'}`}>
                                            {stage.status === 'completed' ? (
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                </div>
                                            ) : stage.status === 'active' ? (
                                                <div className="w-5 h-5 rounded-full bg-[#3b2bee]/20 flex items-center justify-center shrink-0">
                                                    <Loader2 className="w-3 h-3 text-[#3b2bee] animate-spin" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                    <Circle className="w-3 h-3 text-slate-700" />
                                                </div>
                                            )}
                                            <span className={`text-[10px] font-medium transition-colors duration-300 ${
                                                stage.status === 'completed' ? 'text-emerald-400' :
                                                stage.status === 'active' ? 'text-white' :
                                                'text-slate-600'
                                            }`}>
                                                {stage.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ─── STATE 3: RESULT ─ Video playback ─── */}
                        <div className={`absolute inset-0 transition-opacity duration-500 ${phoneState === 'result' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <video
                                ref={resultVideoRef}
                                className="w-full h-full object-cover"
                                controls={false}
                                playsInline
                            />
                        </div>

                    </div>
                </div>
            </div>

            {/* Playback controls for result video — below phone */}
            {phoneState === 'result' && (
                <div className="rounded-2xl border border-emerald-500/20 bg-[#050505] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <PlaybackControls
                            isPlaying={isResultPlaying}
                            onTogglePlay={toggleResultPlayback}
                            onRestart={restartResultPlayback}
                            onStop={stopResultPlayback}
                            playPauseButtonClassName="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                            restartButtonClassName="bg-white/5 hover:bg-white/10 text-slate-400"
                            stopButtonClassName="bg-white/5 hover:bg-white/10 text-slate-400"
                            disabledButtonClassName="bg-white/5 text-slate-600 cursor-not-allowed"
                            iconClassName="w-4 h-4"
                        />

                        <div className="flex-1 flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{formatTime(resultCurrentTime)}</span>
                            <div className="flex-1 relative group">
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-100 rounded-full"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={resultDuration || 0}
                                    step={0.01}
                                    value={resultCurrentTime}
                                    onMouseDown={handleSeekStart}
                                    onTouchStart={handleSeekStart}
                                    onChange={handleSeekChange}
                                    onMouseUp={handleSeekEnd}
                                    onTouchEnd={handleSeekEnd}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 w-8">{formatTime(resultDuration)}</span>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={onGeneratePreview}
                disabled={isGeneratingPreview || !videoUrlExist || isBackendOnline === false}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${isGeneratingPreview || !videoUrlExist || isBackendOnline === false ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5' : 'bg-white/10 text-white border border-white/15 hover:bg-white/20'}`}
            >
                {isGeneratingPreview ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Generando preview</>
                ) : (
                    <><Smartphone className="w-4 h-4" /> Preview</>
                )}
            </button>

            {isProcessing && (
                <div className="rounded-2xl border border-white/10 bg-[#050505] p-4 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span>{processingStage || 'Procesando'}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#3b2bee] transition-all duration-300"
                            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                        />
                    </div>
                    {statusMessage && (
                        <p className="text-[11px] text-slate-400 tracking-tight">{statusMessage}</p>
                    )}
                </div>
            )}

            {/* Export Section */}
            <div className="flex flex-col gap-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Exportar a Redes</h3>

                <div className="space-y-3">
                    {/* TikTok, Instagram, YouTube rows */}
                    {[
                        { id: 'tiktok', label: 'TikTok', iconPath: '/images/social/tiktok.png' },
                        { id: 'instagram', label: 'Instagram', iconPath: '/images/social/instagram.png' },
                        { id: 'youtube', label: 'YouTube', iconPath: '/images/social/youtube.png' },
                    ].map((platform) => {
                        const isConnected = socialConnections[platform.id as keyof typeof socialConnections]?.connected;
                        const canGenerate = videoUrlExist && isConnected && isBackendOnline !== false;

                        return (
                            <div key={platform.id} className={`flex items-center justify-between p-4 bg-[#0F0F15] rounded-2xl border border-white/5 group transition-all ${!canGenerate ? 'opacity-40 grayscale' : 'hover:bg-[#12121A]'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 bg-[#050505] rounded-xl transition-colors ${canGenerate ? 'text-slate-400 group-hover:text-white' : 'text-slate-600'}`}>
                                        <div className="w-5 h-5 rounded-sm overflow-hidden">
                                            <Image
                                                src={platform.iconPath}
                                                alt={platform.label}
                                                width={20}
                                                height={20}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-xs font-bold transition-colors ${canGenerate ? 'text-slate-300 group-hover:text-white' : 'text-slate-600'}`}>
                                            {platform.label}
                                        </span>
                                        {!isConnected && (
                                            <span className="text-[8px] text-red-500/60 font-medium uppercase tracking-tighter">Desconectado</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    disabled={!canGenerate}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${canGenerate
                                        ? 'bg-[#3b2bee]/10 hover:bg-[#3b2bee] text-[#3b2bee] hover:text-white active:scale-95'
                                        : 'bg-white/5 text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    Generar
                                </button>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={onDownloadLatestPreview}
                    disabled={!canDownloadLatestPreview || isBackendOnline === false}
                    className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 transition-all active:scale-[0.98] mt-4 ${!canDownloadLatestPreview || isBackendOnline === false ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5' : 'bg-[#3b2bee] text-white shadow-[0_20px_40px_rgba(59,43,238,0.3)] hover:shadow-[0_20px_50px_rgba(59,43,238,0.5)] active:shadow-inner'}`}
                >
                    <><Download className="w-5 h-5" /> Descargar</>
                </button>
            </div>
        </section>
    );
}
