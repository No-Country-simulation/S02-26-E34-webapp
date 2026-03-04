'use client';

import { useState, useEffect } from 'react';
import { Video, Zap, HardDrive, Clock, CheckCircle, Loader2, XCircle, Edit2, Save, X } from 'lucide-react';
import { showSuccess, showError } from '@/lib/sweetalert';
import { api } from '@/lib/api';

export default function ProfilePage() {
    // Editable user data state
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState({
        name: 'Usuario',
        email: '',
        plan: 'Free', // Free | Pro | Team
        memberSince: '',
        initials: 'U'
    });

    const [editForm, setEditForm] = useState({
        name: '',
        email: ''
    });

    const [stats, setStats] = useState({
        videosProcessed: 0,
        shortsGenerated: 0,
        storageUsed: '0 MB',
        totalTime: '0m'
    });

    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                // Fetch User Profile
                const profileRes = await api.get('/users/me');
                const user = profileRes.data;

                const initials = user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                const createdAt = new Date(user.created_at);
                const month = createdAt.toLocaleString('default', { month: 'long' });
                const memberSinceStr = `${month} ${createdAt.getFullYear()}`;

                setUserData({
                    name: user.name,
                    email: user.email,
                    plan: user.plan || 'Free',
                    memberSince: memberSinceStr,
                    initials: initials
                });

                setEditForm({
                    name: user.name,
                    email: user.email
                });

                // Fetch Stats
                const statsRes = await api.get('/users/me/stats');
                const dataStats = statsRes.data;

                setStats({
                    videosProcessed: dataStats.total_videos || 0,
                    shortsGenerated: 0, // Placeholder mapping - no actual short generation yet
                    storageUsed: dataStats.storage_used || '0 MB',
                    totalTime: `${Math.floor(dataStats.total_duration / 60)}m ${dataStats.total_duration % 60}s`
                });

                // Fetch Recent Activity (Videos)
                const videosRes = await api.get('/videos?page=1&page_size=3');
                const videosList = videosRes.data.videos;

                const mappedActivity = videosList.map((v: any) => ({
                    id: v._id,
                    name: v.metadata?.title || 'Video',
                    date: new Date(v.created_at).toLocaleDateString(),
                    status: v.status
                }));
                setRecentActivity(mappedActivity);

            } catch (error) {
                console.error("Error fetching profile data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfileData();
    }, []);



    const getBadgeStyles = (plan: string) => {
        if (plan === 'Pro') {
            return 'bg-gradient-to-r from-[#3b2bee] to-[#8a7cff] text-foreground shadow-lg shadow-[#3b2bee]/30';
        }
        if (plan === 'Team') {
            return 'bg-gradient-to-r from-purple-600 to-pink-600 text-foreground shadow-lg shadow-purple-500/30';
        }
        return 'bg-foreground/5 text-muted-foreground border border-border';
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

    const handleSave = async () => {
        // Validaciones básicas
        if (!editForm.name.trim()) {
            showError('Error', 'El nombre no puede estar vacío');
            return;
        }



        try {
            await api.patch('/users/me', { name: editForm.name });

            // Actualizar datos locales
            const initials = editForm.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            setUserData({
                ...userData,
                name: editForm.name,
                email: editForm.email,
                initials: initials
            });

            // Actualizar localStorage para el header
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.name = editForm.name;
                localStorage.setItem('user', JSON.stringify(parsed));
                window.dispatchEvent(new Event('user-state-change'));
            }

            setIsEditing(false);
            showSuccess('Perfil actualizado', 'Tus cambios han sido guardados correctamente');

        } catch (error) {
            showError('Error', 'No se pudo actualizar el perfil');
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
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header Section: User Identity */}
                    <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            {/* Avatar */}
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-linear-to-br from-[#3b2bee] to-[#8a7cff] flex items-center justify-center text-foreground text-2xl sm:text-3xl font-bold border-4 border-[#121022] shadow-lg shadow-[#3b2bee]/20">
                                {userData.initials}
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                                {!isEditing ? (
                                    <>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{userData.name}</h1>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${getBadgeStyles(userData.plan)}`}>
                                                {userData.plan}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground mb-1">{userData.email}</p>
                                        <p className="text-muted-foreground text-sm">Miembro desde {userData.memberSince}</p>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                Nombre completo
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full bg-background border border-border text-foreground rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3b2bee] focus:border-transparent"
                                                placeholder="Tu nombre"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                Email (No editable)
                                            </label>
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                disabled
                                                className="w-full bg-background border border-border text-muted-foreground rounded-lg px-4 py-2 cursor-not-allowed"
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
                                    className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-all duration-200"
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
                                        className="flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-all duration-200"
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
                        <div className="bg-card rounded-xl border border-border p-6 hover:border-white/20 transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <Video className="w-5 h-5 text-[#3b2bee]" />
                                <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <Video className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-foreground mb-1">{stats.videosProcessed}</p>
                            <p className="text-sm text-muted-foreground">Videos procesados</p>
                        </div>

                        <div className="bg-card rounded-xl border border-border p-6 hover:border-white/20 transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <Zap className="w-5 h-5 text-[#3b2bee]" />
                                <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <Zap className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-foreground mb-1">{stats.shortsGenerated}</p>
                            <p className="text-sm text-muted-foreground">Shorts generados</p>
                        </div>

                        <div className="bg-card rounded-xl border border-border p-6 hover:border-white/20 transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <HardDrive className="w-5 h-5 text-[#3b2bee]" />
                                <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <HardDrive className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-foreground mb-1">{stats.storageUsed}</p>
                            <p className="text-sm text-muted-foreground">Espacio usado</p>
                        </div>

                        <div className="bg-card rounded-xl border border-border p-6 hover:border-white/20 transition-all duration-200 group">
                            <div className="flex items-center justify-between mb-4">
                                <Clock className="w-5 h-5 text-[#3b2bee]" />
                                <div className="w-10 h-10 bg-[#3b2bee]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                    <Clock className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-foreground mb-1">{stats.totalTime}</p>
                            <p className="text-sm text-muted-foreground">Tiempo total procesado</p>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
                        <h2 className="text-xl font-bold text-foreground mb-6">Actividad reciente</h2>
                        <div className="space-y-4">
                            {recentActivity.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background/50 rounded-lg border border-white/5 hover:border-border transition-all duration-200"
                                >
                                    <div className="flex-1 mb-2 sm:mb-0">
                                        <p className="text-foreground font-medium mb-1">{item.name}</p>
                                        <p className="text-muted-foreground text-sm">{item.date}</p>
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
