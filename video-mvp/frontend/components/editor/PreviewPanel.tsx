'use client';

import { Smartphone, Heart, MessageCircle, Share2 } from 'lucide-react';

interface Settings {
    zoom: number;
    rotation: number;
    cropX: number;
    cropY: number;
    showOverlay: boolean;
    safeZones: boolean;
    showGrid: boolean;
    autoTrack: boolean;
}

interface PreviewPanelProps {
    videoUrl: string | null;
    convertedUrl: string | null;
    settings: Settings;
}

export default function PreviewPanel({ videoUrl, convertedUrl, settings }: PreviewPanelProps) {
    return (
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
                    {/* Notch */}
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
                                <video
                                    src={videoUrl}
                                    className="h-full w-auto max-w-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-6 text-center">
                                <span className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
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
        </section>
    );
}
