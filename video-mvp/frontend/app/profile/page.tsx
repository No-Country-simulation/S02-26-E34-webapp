'use client';

import { useState } from 'react';
import { Video, Zap, HardDrive, Clock, CheckCircle, Loader2, XCircle, Edit2, Save, X } from 'lucide-react';
import { showSuccess, showError } from '@/lib/sweetalert';

export default function ProfilePage() {
    // Editable user data state
    const [isEditing, setIsEditing] = useState(false);
    const [userData, setUserData] = useState({
        name: 'Carlos Mendoza',
        email: 'carlos@email.com',
        plan: 'Pro', // Free | Pro | Team
        memberSince: 'enero 2026',
        initials: 'CM'
    });
    
    const [editForm, setEditForm] = useState({
        name: userData.name,
        email: userData.email
    });

    const stats = {
        videosProcessed: 42,
        shortsGenerated: 118,
        storageUsed: '3.2 GB',
        totalTime: '5h 24m'
    };

    const recentActivity = [
        { 
            id: 1, 
            name: 'Video Marketing Digital 2026', 
            date: '15 feb 2026', 
            status: 'completed' 
        },
        { 
            id: 2, 
            name: 'Video NoCountry 2026', 
            date: '14 feb 2026', 
            status: 'processing' 
        },
        { 
            id: 3, 
            name: 'Video Tiktok 1080p', 
            date: '12 feb 2026', 
            status: 'completed' 
        }
    ];

    const getBadgeStyles = (plan: string) => {
        if (plan === 'Pro') {
            return 'bg-gradient-to-r from-[#3b2bee] to-[#8a7cff] text-white shadow-lg shadow-[#3b2bee]/30';
        }
        if (plan === 'Team') {
            return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30';
        }
        return 'bg-white/5 text-slate-300 border border-white/10';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'processing':
                return <Loader2 className="w-4 h-4 text-[#3b2bee] animate-spin" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-400" />;
            default:
                return null;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="text-emerald-400 text-sm">Completado</span>;
            case 'processing':
                return <span className="text-[#3b2bee] text-sm">Procesando</span>;
            case 'error':
                return <span className="text-red-400 text-sm">Error</span>;
            default:
                return null;
        }
    };

    const handleEdit = () => {
        setEditForm({
            name: userData.name,
            email: userData.email
        });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditForm({
            name: userData.name,
            email: userData.email
        });
        setIsEditing(false);
    };

    const handleSave = () => {
        // Validaciones básicas
        if (!editForm.name.trim()) {
            showError('Error', 'El nombre no puede estar vacío');
            return;
        }
        
        if (!editForm.email.trim() || !editForm.email.includes('@')) {
            showError('Error', 'Email inválido');
            return;
        }

        // Actualizar datos
        const initials = editForm.name.split(' ').map(n => n[0]).join('').toUpperCase();
        setUserData({
            ...userData,
            name: editForm.name,
            email: editForm.email,
            initials: initials
        });
        
        setIsEditing(false);
        showSuccess('Perfil actualizado', 'Tus cambios han sido guardados correctamente');
        
        // TODO: Aquí iría la llamada al backend
        // await fetch('/api/user/profile', { method: 'PUT', body: JSON.stringify(editForm) });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <div className="container mx-auto px-4 py-8 sm:py-12">
                <div className="max-w-6xl mx-auto space-y-8">
                    
                    {/* Header Section: User Identity */}
                    <div className="bg-[#121022] rounded-2xl border border-white/10 p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            {/* Avatar */}
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#3b2bee] to-[#8a7cff] flex items-center justify-center text-white text-2xl sm:text-3xl font-bold border-4 border-[#121022] shadow-lg shadow-[#3b2bee]/20">
                                {userData.initials}
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                                {!isEditing ? (
                                    <>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                                            <h1 className="text-2xl sm:text-3xl font-bold text-white">{userData.name}</h1>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${getBadgeStyles(userData.plan)}`}>
                                                {userData.plan}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 mb-1">{userData.email}</p>
                                        <p className="text-slate-500 text-sm">Miembro desde {userData.memberSince}</p>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                                Nombre completo
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                className="w-full bg-[#0a0a0f] border border-white/10 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3b2bee] focus:border-transparent"
                                                placeholder="Tu nombre"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                                className="w-full bg-[#0a0a0f] border border-white/10 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3b2bee] focus:border-transparent"
                                                placeholder="tu@email.com"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            {!isEditing ? (
                                <button 
                                    onClick={handleEdit}
                                    className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar perfil
                                </button>
                            ) : (
                                <div className="flex gap-2 self-start sm:self-auto">
                                    <button 
                                        onClick={handleSave}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white rounded-lg text-sm font-medium transition-all duration-200"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar
                                    </button>
                                    <button 
                                        onClick={handleCancel}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all duration-200"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid: Activity Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[#121022] rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <Video className="w-5 h-5 text-[#3b2bee]" />
                                <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <Video className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white mb-1">{stats.videosProcessed}</p>
                            <p className="text-sm text-slate-400">Videos procesados</p>
                        </div>

                        <div className="bg-[#121022] rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <Zap className="w-5 h-5 text-[#3b2bee]" />
                                <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <Zap className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white mb-1">{stats.shortsGenerated}</p>
                            <p className="text-sm text-slate-400">Shorts generados</p>
                        </div>

                        <div className="bg-[#121022] rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <HardDrive className="w-5 h-5 text-[#3b2bee]" />
                                <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <HardDrive className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white mb-1">{stats.storageUsed}</p>
                            <p className="text-sm text-slate-400">Espacio usado</p>
                        </div>

                        <div className="bg-[#121022] rounded-xl border border-white/10 p-6 hover:border-white/20 transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <Clock className="w-5 h-5 text-[#3b2bee]" />
                                <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <Clock className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white mb-1">{stats.totalTime}</p>
                            <p className="text-sm text-slate-400">Tiempo total procesado</p>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-[#121022] rounded-2xl border border-white/10 p-6 sm:p-8">
                        <h2 className="text-xl font-bold text-white mb-6">Actividad reciente</h2>
                        <div className="space-y-4">
                            {recentActivity.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#0a0a0f]/50 rounded-lg border border-white/5 hover:border-white/10 transition-all duration-200"
                                >
                                    <div className="flex-1 mb-2 sm:mb-0">
                                        <p className="text-white font-medium mb-1">{item.name}</p>
                                        <p className="text-slate-500 text-sm">{item.date}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(item.status)}
                                        {getStatusText(item.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
