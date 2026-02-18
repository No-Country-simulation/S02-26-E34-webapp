'use client';

import { CloudUpload } from 'lucide-react';
import { Maximize } from 'lucide-react';
import { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';

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

interface SourceFrameProps {
    videoUrl: string | null;
    isBackendOnline: boolean | null;
    settings: Settings;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    getRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
    getInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
    isDragActive: boolean;
}

export default function SourceFrame({
    videoUrl,
    isBackendOnline,
    settings,
    videoRef,
    getRootProps,
    getInputProps,
    isDragActive,
}: SourceFrameProps) {
    return (
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
    );
}
