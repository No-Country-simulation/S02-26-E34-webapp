'use client';

import { useState } from 'react';
import { User, Shield, Bell, CreditCard, Trash2, Smartphone } from 'lucide-react';
import FeedbackCollector from '@/components/FeedbackCollector';

export default function AccountPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Datos de Cuenta</h1>
                        <p className="text-slate-400">Gestiona la configuración global de tu cuenta Verv.io</p>
                    </div>

                    <div className="space-y-6">
                        {/* General Settings */}
                        <div className="bg-[#121022] rounded-2xl border border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-[#3b2bee]" />
                                Información General
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-400">ID de Usuario</p>
                                    <p className="text-white font-mono text-xs">usr_9283748291</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-400">Miembro desde</p>
                                    <p className="text-white">Febrero, 2024</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-400">Tipo de Plan</p>
                                    <p className="text-[#3b2bee] font-bold">Pro Developer</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-400">Estado</p>
                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">Activo</span>
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="bg-[#121022] rounded-2xl border border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-[#3b2bee]" />
                                Preferencias de Notificación
                            </h2>
                            <div className="space-y-4">
                                <ToggleItem title="Correos de procesamiento" description="Recibe un aviso cuando tus videos terminen de procesarse." enabled={true} />
                                <ToggleItem title="Actualizaciones de producto" description="Nuevas funcionalidades y mejoras en Verv.io." enabled={false} />
                                <ToggleItem title="Seguridad" description="Alertas sobre inicios de sesión sospechosos." enabled={true} />
                            </div>
                        </div>

                        {/* Security */}
                        <div className="bg-[#121022] rounded-2xl border border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-[#3b2bee]" />
                                Seguridad Avanzada
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Autenticación de dos pasos</p>
                                        <p className="text-sm text-slate-400">Añade una capa extra de seguridad a tu cuenta.</p>
                                    </div>
                                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg border border-white/10 transition-colors">Configurar</button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white font-medium">Sesiones activas</p>
                                        <p className="text-sm text-slate-400">Gestiona los dispositivos donde has iniciado sesión.</p>
                                    </div>
                                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg border border-white/10 transition-colors">Ver todas</button>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-6">
                            <h2 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" />
                                Zona de Peligro
                            </h2>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <p className="text-white font-medium">Eliminar cuenta permanentemente</p>
                                    <p className="text-sm text-slate-400">Esta acción no se puede deshacer. Se borrarán todos tus videos y datos.</p>
                                </div>
                                <button className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20">
                                    Eliminar Cuenta
                                </button>
                            </div>
                        </div>
                    </div>

                    <FeedbackCollector />
                </div>
            </div>
        </div>
    );
}

const ToggleItem = ({ title, description, enabled }: { title: string, description: string, enabled: boolean }) => (
    <div className="flex items-center justify-between py-2">
        <div>
            <p className="text-white font-medium">{title}</p>
            <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div className={`w-12 h-6 rounded-full relative cursor-pointer px-1 flex items-center transition-colors ${enabled ? 'bg-[#3b2bee]' : 'bg-slate-700'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </div>
    </div>
);
