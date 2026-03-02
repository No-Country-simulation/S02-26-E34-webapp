'use client';

import { useMemo } from 'react';
import { Smartphone, Heart, MessageCircle, Share2, RefreshCw, Download } from 'lucide-react';

interface Settings {
    selectionSize: number;
    rotation: number;
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
    settings: Settings;
    selectionArea: SelectionArea | null;
    onConvert: () => void;
    isProcessing: boolean;
    progress: number;
    videoUrlExist: boolean;
    isBackendOnline: boolean | null;
    socialConnections: {
        tiktok: { connected: boolean };
        instagram: { connected: boolean };
        youtube: { connected: boolean };
    };
}

export default function PreviewPanel({
    videoUrl,
    convertedUrl,
    settings,
    selectionArea,
    onConvert,
    isProcessing,
    progress,
    videoUrlExist,
    isBackendOnline,
    socialConnections
}: PreviewPanelProps) {
    const previewStyle = useMemo(() => {
        if (!selectionArea || selectionArea.width <= 0 || selectionArea.height <= 0 || selectionArea.frameWidth <= 0 || selectionArea.frameHeight <= 0) {
            return {
                transform: `rotate(${settings.rotation}deg)`,
                transformOrigin: '50% 50%',
                left: '0%',
                top: '0%',
                width: '100%',
                height: '100%'
            };
        }

        const widthScale = 100 / ((selectionArea.width / selectionArea.frameWidth) * 100);
        const heightScale = 100 / ((selectionArea.height / selectionArea.frameHeight) * 100);
        const top = -selectionArea.y * (heightScale / 100);
        const left = -selectionArea.x * (widthScale / 100);

        return {
            transform: `rotate(${settings.rotation}deg)`,
            transformOrigin: 'top left',
            left: `${left}px`,
            top: `${top}px`,
            width: `${selectionArea.frameWidth * (widthScale / 100)}px`,
            height: `${selectionArea.frameHeight * (heightScale / 100)}px`
        };
    }, [selectionArea, settings.rotation]);

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
            </div>

            <div className="flex-1 flex items-center justify-center py-4">
                <div className="relative w-60 md:w-70 aspect-9/16 bg-black rounded-[2.5rem] md:rounded-[3rem] p-2 md:p-3 border-8 md:border-10 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden select-none">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 md:w-32 h-5 md:h-6 bg-slate-800 rounded-b-2xl z-20"></div>

                    <div className="w-full h-full rounded-[1.8rem] md:rounded-4xl overflow-hidden relative bg-slate-900/40">
                        {convertedUrl ? (
                            <video src={convertedUrl} className="w-full h-full object-cover" controls={false} autoPlay />
                        ) : videoUrl ? (
                            <div
                                className="absolute transition-all duration-150"
                                style={previewStyle}
                            >
                                <video
                                    src={videoUrl}
                                    className="w-full h-full object-cover"
                                    controls={false}
                                />
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

                        {settings.showOverlay && (
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
                </div>
            </div>

            {/* Export Section */}
            <div className="flex flex-col gap-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Exportar a Redes</h3>

                <div className="space-y-3">
                    {/* TikTok, Instagram, YouTube rows */}
                    {[
                        { id: 'tiktok', label: 'TikTok', icon: <Share2 className="w-4 h-4" /> },
                        { id: 'instagram', label: 'Instagram', icon: <Heart className="w-4 h-4" /> },
                        { id: 'youtube', label: 'YouTube', icon: <MessageCircle className="w-4 h-4" /> },
                    ].map((platform) => {
                        const isConnected = socialConnections[platform.id as keyof typeof socialConnections]?.connected;
                        const canGenerate = videoUrlExist && isConnected && isBackendOnline !== false;

                        return (
                            <div key={platform.id} className={`flex items-center justify-between p-4 bg-[#0F0F15] rounded-2xl border border-white/5 group transition-all ${!canGenerate ? 'opacity-40 grayscale' : 'hover:bg-[#12121A]'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 bg-[#050505] rounded-xl transition-colors ${canGenerate ? 'text-slate-400 group-hover:text-white' : 'text-slate-600'}`}>
                                        {platform.icon}
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
                    onClick={onConvert}
                    disabled={isProcessing || !videoUrlExist || isBackendOnline === false}
                    className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 transition-all active:scale-[0.98] mt-4 ${isProcessing || !videoUrlExist || isBackendOnline === false ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5' : 'bg-[#3b2bee] text-white shadow-[0_20px_40px_rgba(59,43,238,0.3)] hover:shadow-[0_20px_50px_rgba(59,43,238,0.5)] active:shadow-inner'}`}
                >
                    {isProcessing ? (
                        <><RefreshCw className="w-5 h-5 animate-spin" /> {progress}%</>
                    ) : (
                        <><Download className="w-5 h-5" /> Descargar</>
                    )}
                </button>
            </div>
        </section>
    );
}
