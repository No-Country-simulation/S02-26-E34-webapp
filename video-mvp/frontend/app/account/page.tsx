'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Globe, Video, Shield, Lock, LogOut, Share2, CheckCircle2, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/lib/sweetalert';
import { api } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    // Mock settings state
    const [settings, setSettings] = useState({
        language: 'es',
        theme: 'dark',
        emailNotifications: true,
        defaultResolution: '1080p',
        verticalFormat: '9:16',
        autoSubtitles: true,
        autoBranding: false
    });

    // Mock social media connections state
    const [socialConnections, setSocialConnections] = useState({
        tiktok: { connected: false, username: null, displayName: 'TikTok' },
        instagram: { connected: true, username: '@carlos_creator', displayName: 'Instagram' },
        youtube: { connected: false, username: null, displayName: 'YouTube' }
    });

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => ({
            ...prev,
            [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key]
        }));
    };

    useEffect(() => {
        setSettings(prev => ({ ...prev, theme: theme === 'light' ? 'light' : 'dark' }));
    }, [theme]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/users/me');
                if (res.data.settings) {
                    const persistedTheme = res.data.settings.theme === 'light' ? 'light' : 'dark';
                    setTheme(persistedTheme);
                    setSettings({
                        language: res.data.settings.language || 'es',
                        theme: persistedTheme,
                        emailNotifications: res.data.settings.email_notifications ?? true,
                        defaultResolution: res.data.settings.default_resolution || '1080p',
                        verticalFormat: res.data.settings.vertical_format || '9:16',
                        autoSubtitles: res.data.settings.auto_subtitles ?? true,
                        autoBranding: res.data.settings.auto_branding ?? false
                    });
                }

                if (res.data.social_connections) {
                    setSocialConnections(prev => ({
                        ...prev,
                        tiktok: {
                            ...prev.tiktok,
                            ...(res.data.social_connections.tiktok || {})
                        },
                        instagram: {
                            ...prev.instagram,
                            ...(res.data.social_connections.instagram || {})
                        },
                        youtube: {
                            ...prev.youtube,
                            ...(res.data.social_connections.youtube || {})
                        }
                    }));
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                showError("Error", "No se pudieron cargar las configuraciones.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleConnect = (platform: keyof typeof socialConnections) => {
        // Mock connection - en producción esto redirigiría a OAuth
        console.log(`Iniciando conexión con ${socialConnections[platform].displayName}...`);
        // TODO: window.location.href = `/api/auth/${platform}`;
        alert(`Conectando con ${socialConnections[platform].displayName}... (Funcionalidad pendiente de backend)`);
    };

    const handleDisconnect = (platform: keyof typeof socialConnections) => {
        // Mock disconnection
        console.log(`Desconectando de ${socialConnections[platform].displayName}...`);
        setSocialConnections(prev => ({
            ...prev,
            [platform]: { ...prev[platform], connected: false, username: null }
        }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const mappedSettings = {
                language: settings.language,
                theme: settings.theme,
                email_notifications: settings.emailNotifications,
                default_resolution: settings.defaultResolution,
                vertical_format: settings.verticalFormat,
                auto_subtitles: settings.autoSubtitles,
                auto_branding: settings.autoBranding
            };

            await api.patch('/users/me', {
                settings: mappedSettings,
                social_connections: socialConnections
            });

            showSuccess('Configuración Guardada', 'Tus preferencias se han actualizado correctamente.');
        } catch (error) {
            console.error("Error saving settings:", error);
            showError("Error", "No se pudieron guardar los cambios.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#3b2bee] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 sm:py-12">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Configuración</h1>
                        <p className="text-muted-foreground">Gestiona tus preferencias y configuración de la plataforma</p>
                    </div>

                    {/* General Preferences */}
                    <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center">
                                <Globe className="w-5 h-5 text-[#3b2bee]" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Preferencias generales</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Language */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                <div>
                                    <p className="text-foreground font-medium mb-1">Idioma</p>
                                    <p className="text-sm text-muted-foreground">Selecciona el idioma de la interfaz</p>
                                </div>
                                <select
                                    value={settings.language}
                                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                    className="bg-background border border-border text-foreground rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3b2bee] cursor-pointer"
                                >
                                    <option value="es">Español</option>
                                    <option value="en">English</option>
                                    <option value="pt">Português</option>
                                </select>
                            </div>

                            {/* Theme */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                <div>
                                    <p className="text-foreground font-medium mb-1">Modo oscuro</p>
                                    <p className="text-sm text-muted-foreground">Tema visual de la aplicación</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">Claro</span>
                                    <button
                                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                        className={`w-14 h-7 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-[#3b2bee]' : 'bg-muted'}`}
                                    >
                                        <div className={`w-5 h-5 bg-card border border-border rounded-full absolute top-1 transition-transform duration-200 ${theme === 'dark' ? 'translate-x-8' : 'translate-x-1'}`}></div>
                                    </button>
                                    <span className="text-foreground text-sm">Oscuro</span>
                                </div>
                            </div>

                            {/* Notifications */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-foreground font-medium mb-1">Notificaciones por email</p>
                                    <p className="text-sm text-muted-foreground">Recibe actualizaciones sobre tus videos</p>
                                </div>
                                <button
                                    onClick={() => toggleSetting('emailNotifications')}
                                    className={`w-14 h-7 rounded-full relative transition-colors ${settings.emailNotifications ? 'bg-[#3b2bee]' : 'bg-muted'}`}
                                >
                                    <div className={`w-5 h-5 bg-card border border-border rounded-full absolute top-1 transition-transform duration-200 ${settings.emailNotifications ? 'translate-x-8' : 'translate-x-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Video Preferences */}
                    <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center">
                                <Video className="w-5 h-5 text-[#3b2bee]" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Preferencias de video</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Resolution */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                <div>
                                    <p className="text-foreground font-medium mb-1">Resolución por defecto</p>
                                    <p className="text-sm text-muted-foreground">Calidad de exportación predeterminada</p>
                                </div>
                                <select
                                    value={settings.defaultResolution}
                                    onChange={(e) => setSettings({ ...settings, defaultResolution: e.target.value })}
                                    className="bg-background border border-border text-foreground rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3b2bee] cursor-pointer"
                                >
                                    <option value="720p">720p</option>
                                    <option value="1080p">1080p</option>
                                    <option value="1440p">1440p</option>
                                    <option value="4k">4K</option>
                                </select>
                            </div>

                            {/* Vertical Format */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                <div>
                                    <p className="text-foreground font-medium mb-1">Formato vertical</p>
                                    <p className="text-sm text-muted-foreground">Relación de aspecto para videos verticales</p>
                                </div>
                                <select
                                    value={settings.verticalFormat}
                                    onChange={(e) => setSettings({ ...settings, verticalFormat: e.target.value })}
                                    className="bg-background border border-border text-foreground rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3b2bee] cursor-pointer"
                                >
                                    <option value="9:16">9:16 (Estándar)</option>
                                    <option value="4:5">4:5 (Instagram)</option>
                                    <option value="1:1">1:1 (Cuadrado)</option>
                                </select>
                            </div>

                            {/* Auto Subtitles */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                <div>
                                    <p className="text-foreground font-medium mb-1">Subtítulos automáticos</p>
                                    <p className="text-sm text-muted-foreground">Generar subtítulos por defecto</p>
                                </div>
                                <button
                                    onClick={() => toggleSetting('autoSubtitles')}
                                    className={`w-14 h-7 rounded-full relative transition-colors ${settings.autoSubtitles ? 'bg-[#3b2bee]' : 'bg-muted'}`}
                                >
                                    <div className={`w-5 h-5 bg-card border border-border rounded-full absolute top-1 transition-transform duration-200 ${settings.autoSubtitles ? 'translate-x-8' : 'translate-x-1'}`}></div>
                                </button>
                            </div>

                            {/* Auto Branding */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-foreground font-medium mb-1">Branding automático</p>
                                    <p className="text-sm text-muted-foreground">Aplicar logo y marca en todos los videos</p>
                                </div>
                                <button
                                    onClick={() => toggleSetting('autoBranding')}
                                    className={`w-14 h-7 rounded-full relative transition-colors ${settings.autoBranding ? 'bg-[#3b2bee]' : 'bg-muted'}`}
                                >
                                    <div className={`w-5 h-5 bg-card border border-border rounded-full absolute top-1 transition-transform duration-200 ${settings.autoBranding ? 'translate-x-8' : 'translate-x-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Social Media Integrations */}
                    <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center">
                                <Share2 className="w-5 h-5 text-[#3b2bee]" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Redes Sociales</h2>
                        </div>
                        <p className="text-muted-foreground mb-6 text-sm">Conecta tus cuentas para exportar videos directamente desde el editor</p>

                        <div className="space-y-4">
                            {/* TikTok */}
                            <div className="p-4 bg-background/50 rounded-lg border border-border/60 hover:border-border transition-all duration-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                            <Image src="/images/social/tiktok.png" alt="TikTok" width={48} height={48} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-foreground font-medium">TikTok</p>
                                                {!socialConnections.tiktok.connected && (
                                                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">No conectado</span>
                                                )}
                                                {socialConnections.tiktok.connected && (
                                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Conectado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {socialConnections.tiktok.connected
                                                    ? socialConnections.tiktok.username
                                                    : 'Publica tus shorts automáticamente en TikTok'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => socialConnections.tiktok.connected
                                            ? handleDisconnect('tiktok')
                                            : handleConnect('tiktok')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${socialConnections.tiktok.connected
                                            ? 'bg-foreground/5 hover:bg-accent text-muted-foreground hover:text-foreground border border-border'
                                            : 'bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white shadow-lg shadow-[#3b2bee]/20'
                                            }`}
                                    >
                                        {socialConnections.tiktok.connected ? 'Desconectar' : 'Conectar'}
                                    </button>
                                </div>
                            </div>

                            {/* Instagram */}
                            <div className="p-4 bg-background/50 rounded-lg border border-border/60 hover:border-border transition-all duration-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                            <Image src="/images/social/instagram.png" alt="Instagram" width={48} height={48} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-foreground font-medium">Instagram</p>
                                                {!socialConnections.instagram.connected && (
                                                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">No conectado</span>
                                                )}
                                                {socialConnections.instagram.connected && (
                                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Conectado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {socialConnections.instagram.connected
                                                    ? socialConnections.instagram.username
                                                    : 'Sube Reels directamente a tu cuenta'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => socialConnections.instagram.connected
                                            ? handleDisconnect('instagram')
                                            : handleConnect('instagram')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${socialConnections.instagram.connected
                                            ? 'bg-foreground/5 hover:bg-accent text-muted-foreground hover:text-foreground border border-border'
                                            : 'bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white shadow-lg shadow-[#3b2bee]/20'
                                            }`}
                                    >
                                        {socialConnections.instagram.connected ? 'Desconectar' : 'Conectar'}
                                    </button>
                                </div>
                            </div>

                            {/* YouTube */}
                            <div className="p-4 bg-background/50 rounded-lg border border-border/60 hover:border-border transition-all duration-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                            <Image src="/images/social/youtube.png" alt="YouTube" width={48} height={48} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-foreground font-medium">YouTube</p>
                                                {!socialConnections.youtube.connected && (
                                                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">No conectado</span>
                                                )}
                                                {socialConnections.youtube.connected && (
                                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Conectado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {socialConnections.youtube.connected
                                                    ? socialConnections.youtube.username
                                                    : 'Publica Shorts en tu canal de YouTube'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => socialConnections.youtube.connected
                                            ? handleDisconnect('youtube')
                                            : handleConnect('youtube')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${socialConnections.youtube.connected
                                            ? 'bg-foreground/5 hover:bg-accent text-muted-foreground hover:text-foreground border border-border'
                                            : 'bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white shadow-lg shadow-[#3b2bee]/20'
                                            }`}
                                    >
                                        {socialConnections.youtube.connected ? 'Desconectar' : 'Conectar'}
                                    </button>
                                </div>
                            </div>

                        </div>

                        {/* Info Box */}
                        <div className="mt-6 p-4 bg-[#3b2bee]/5 border border-[#3b2bee]/20 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                <span className="text-[#3b2bee] font-medium">Tip:</span> Una vez conectadas tus cuentas, podrás exportar videos directamente desde el editor sin descargarlos manualmente.
                            </p>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5 text-[#3b2bee]" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Seguridad</h2>
                        </div>

                        <div className="space-y-4">
                            {/* Change Password */}
                            <button className="w-full flex items-center justify-between p-4 bg-background/50 hover:bg-background rounded-lg border border-border/60 hover:border-border transition-all duration-200 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-foreground/5 rounded-lg flex items-center justify-center group-hover:bg-accent transition-colors">
                                        <Lock className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-foreground font-medium">Cambiar contraseña</p>
                                        <p className="text-sm text-muted-foreground">Actualiza tu contraseña de acceso</p>
                                    </div>
                                </div>
                                <div className="text-muted-foreground group-hover:text-foreground transition-colors">→</div>
                            </button>

                            {/* Logout All Devices */}
                            <button className="w-full flex items-center justify-between p-4 bg-background/50 hover:bg-background rounded-lg border border-border/60 hover:border-border transition-all duration-200 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-foreground/5 rounded-lg flex items-center justify-center group-hover:bg-accent transition-colors">
                                        <LogOut className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-foreground font-medium">Cerrar sesión en todos los dispositivos</p>
                                        <p className="text-sm text-muted-foreground">Cierra todas las sesiones activas excepto esta</p>
                                    </div>
                                </div>
                                <div className="text-muted-foreground group-hover:text-foreground transition-colors">→</div>
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button onClick={handleSave} className="px-6 py-3 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-[#3b2bee]/20">
                            Guardar cambios
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
