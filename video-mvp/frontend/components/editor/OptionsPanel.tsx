'use client';

import {
    CloudUpload,
    Settings,
    Minimize2,
    Maximize2,
    RotateCcw,
    RotateCw,
} from 'lucide-react';

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

interface Options {
    [key: string]: boolean;
}

interface OptionsPanelProps {
    videoUrl: string | null;
    isBackendOnline: boolean | null;
    isProcessing: boolean;
    progress: number;
    settings: Settings;
    options: Options;
    onConvert: () => void;
    onReset: () => void;
    onSettingChange: (setting: keyof Settings, value: any) => void;
}

export default function OptionsPanel({
    videoUrl,
    isBackendOnline,
    isProcessing,
    settings,
    onReset,
    onSettingChange,
}: OptionsPanelProps) {
    return (
        <section className="w-full p-8 flex flex-col gap-10 bg-[#0F0F15] rounded-[2.5rem] border border-white/5">
            <div className="flex items-center gap-3">
                <span className="p-2 bg-[#3b2bee]/20 rounded-lg">
                    <Settings className="text-[#3b2bee] w-4 h-4" />
                </span>
                <h2 className="font-black text-sm uppercase tracking-[0.2em] text-white">Opciones</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Column: Multimedia & Workspace Settings */}
                <div className="space-y-10">
                    {/* Multimedia */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Multimedia</h3>
                        <button
                            className={`w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-3 transition-all active:scale-95 ${isBackendOnline === false || isProcessing ? 'bg-white/5 text-slate-700 cursor-not-allowed border border-white/5' : 'bg-[#050505] hover:bg-white/5 text-white border border-white/5 shadow-inner'}`}
                            disabled={isBackendOnline === false || isProcessing}
                            onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                        >
                            <CloudUpload className="w-4 h-4 text-[#3b2bee]" />
                            {videoUrl ? 'Cambiar Video' : 'Cargar Archivo'}
                        </button>
                    </div>
                </div>

                {/* Right Column: Editing Controls (Selection, Rotation, Safe Zones) */}
                <div className="space-y-8">
                    {/* Selection Size Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tamaño Marco</span>
                            <span className="text-[#3b2bee] font-mono text-[10px] font-black">{settings.selectionSize}%</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-opacity ${!videoUrl || isBackendOnline === false || isProcessing ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <button
                                onClick={() => onSettingChange('selectionSize', Math.max(40, settings.selectionSize - 5))}
                                disabled={!videoUrl || isBackendOnline === false || isProcessing}
                                className="w-8 h-8 bg-[#050505] hover:bg-white/5 border border-white/5 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:cursor-not-allowed"
                            >
                                <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                            <button
                                onClick={() => onSettingChange('selectionSize', Math.min(100, settings.selectionSize + 5))}
                                disabled={!videoUrl || isBackendOnline === false || isProcessing}
                                className="w-8 h-8 bg-[#050505] hover:bg-white/5 border border-white/5 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:cursor-not-allowed"
                            >
                                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Rotation Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rotación</span>
                            <span className="text-[#3b2bee] font-mono text-[10px] font-black">{settings.rotation}°</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-opacity ${!videoUrl || isBackendOnline === false || isProcessing ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <button
                                onClick={() => onSettingChange('rotation', Math.max(-45, settings.rotation - 90))}
                                disabled={!videoUrl || isBackendOnline === false || isProcessing}
                                className="w-8 h-8 bg-[#050505] hover:bg-white/5 border border-white/5 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:cursor-not-allowed"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                            <button
                                onClick={() => onSettingChange('rotation', Math.min(45, settings.rotation + 90))}
                                disabled={!videoUrl || isBackendOnline === false || isProcessing}
                                className="w-8 h-8 bg-[#050505] hover:bg-white/5 border border-white/5 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:cursor-not-allowed"
                            >
                                <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Safe Zones Toggle */}
                    <div className={`flex items-center justify-between p-1 transition-all border-t border-white/5 pt-4 ${!videoUrl || isBackendOnline === false || isProcessing ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        <span className="text-xs font-medium text-slate-400 tracking-tight">Guías Seguras</span>
                        <button
                            onClick={() => onSettingChange('safeZones', !settings.safeZones)}
                            disabled={!videoUrl || isBackendOnline === false || isProcessing}
                            className={`w-11 h-6 rounded-full relative transition-all shadow-inner disabled:cursor-not-allowed ${settings.safeZones ? 'bg-[#3b2bee]' : 'bg-[#050505] border border-white/10'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white/90 rounded-full transition-all border border-black/10 shadow-sm ${settings.safeZones ? 'right-1' : 'left-1'}`}></div>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
