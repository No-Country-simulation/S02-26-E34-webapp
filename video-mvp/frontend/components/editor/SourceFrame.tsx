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
        <section className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-[#12121A] rounded-lg border border-white/5">
                    <Maximize className="text-[#3b2bee] w-5 h-5" />
                </div>
                <div>
                    <h2 className="font-bold text-xl text-white tracking-tight">Marco de Origen</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">1920x1080 (16:9) • RAW</p>
                </div>
            </div>

            <div className="relative">
                {!videoUrl ? (
                    <div
                        {...getRootProps()}
                        className={`w-full aspect-video bg-transparent rounded-4xl border-2 border-dashed flex flex-col items-center justify-center text-center p-12 cursor-pointer transition-all ${isDragActive ? 'border-[#3b2bee] bg-[#3b2bee]/5 scale-[1.01]' : 'border-[#12121A]'
                            } ${isBackendOnline === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <input {...getInputProps()} />
                        <div className="p-4 bg-[#3b2bee]/10 rounded-full mb-6">
                            <CloudUpload className="w-10 h-10 text-[#3b2bee]" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Sube tu video aquí</h3>
                        <p className="text-slate-500 font-medium lowercase">mp4 horizontal</p>
                        {isBackendOnline === false && (
                            <p className="text-xs text-red-500 mt-6 font-bold uppercase tracking-widest">Servidor no disponible</p>
                        )}
                    </div>
                ) : (
                    <div className="relative w-full aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl group border-8 border-[#0F0F15] select-none">
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
