'use client';

import {
    CloudUpload,
    Download,
    MessageCircle,
    Maximize,
    RefreshCw,
    Minimize2,
    Settings,
    Shield,
} from 'lucide-react';

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
    progress,
    settings,
    onConvert,
    onReset,
    onSettingChange,
}: OptionsPanelProps) {
    return (
        <section className="w-full lg:w-85 p-6 flex flex-col gap-6 md:gap-8 bg-[#121022]/40 rounded-3xl border border-white/5 overflow-y-auto custom-scrollbar shadow-inner">
            <div className="flex items-center gap-3">
                <span className="p-2 bg-[#3b2bee]/10 rounded-lg">
                    <Settings className="text-[#3b2bee] w-5 h-5" />
                </span>
                <h2 className="font-bold text-xl uppercase tracking-tight text-white">Opciones</h2>
            </div>

            {/* Multimedia */}
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

            {/* Encuadre */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Encuadre</h3>
                    <div className="flex gap-2">
                        <button onClick={onReset} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors border border-white/5 shadow-sm active:scale-90">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onSettingChange('cropX', 50)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors border border-white/5 shadow-sm active:scale-90">
                            <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Escala / Zoom</span>
                            <span className="text-[#3b2bee] font-mono">{settings.zoom}%</span>
                        </div>
                        <input
                            className="w-full h-2 bg-white/5 rounded-full appearance-none accent-[#3b2bee] cursor-pointer"
                            type="range" min="50" max="200" value={settings.zoom}
                            disabled={isBackendOnline === false || isProcessing}
                            onChange={(e) => onSettingChange('zoom', parseInt(e.target.value))}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Rotación</span>
                            <span className="text-[#3b2bee] font-mono">{settings.rotation}°</span>
                        </div>
                        <input
                            className="w-full h-2 bg-white/5 rounded-full appearance-none accent-[#3b2bee] cursor-pointer"
                            type="range" min="-45" max="45" value={settings.rotation}
                            disabled={isBackendOnline === false || isProcessing}
                            onChange={(e) => onSettingChange('rotation', parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Visualización */}
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
                                onClick={() => onSettingChange(toggle.id as keyof Settings, !settings[toggle.id as keyof Settings])}
                                disabled={isBackendOnline === false || isProcessing}
                                className={`w-10 h-5 rounded-full relative transition-all ${settings[toggle.id as keyof Settings] ? 'bg-[#3b2bee] shadow-[0_0_10px_rgba(59,43,238,0.4)]' : 'bg-slate-700/50 border border-white/5'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings[toggle.id as keyof Settings] ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botón Convertir */}
            <div className="mt-auto pt-6 border-t border-white/5">
                <button
                    onClick={onConvert}
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
    );
}
