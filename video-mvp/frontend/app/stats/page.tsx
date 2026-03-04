'use client';

import { BarChart3, TrendingUp, Clock, Download, Users, Activity, Eye, Heart, Tag, Folder, UserCheck, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import FeedbackCollector from '@/components/FeedbackCollector';
import { api } from '@/lib/api';

// Types
interface VideoStats {
    id: string;
    filename: string;
    duration: number;
    views: number;
    downloads: number;
    qualityScore: number;
    createdAt: string;
    status: string;
    category: string;
    tags: string[];
}

interface UserStats {
    totalVideos: number;
    totalViews: number;
    totalDownloads: number;
    averageQuality: number;
    totalDuration: number;
    storageUsed: string;
}

export default function DashboardPage() {
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [videos, setVideos] = useState<VideoStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatsAndVideos = async () => {
            try {
                // Fetch User Stats
                const statsRes = await api.get('/users/me/stats');
                const statsData = statsRes.data;

                setUserStats({
                    totalVideos: statsData.total_videos || 0,
                    totalViews: statsData.total_views || 0,
                    totalDownloads: statsData.total_downloads || 0,
                    averageQuality: 87.5, // Placeholder - calculating quality score requires more complex metrics
                    totalDuration: statsData.total_duration || 0,
                    storageUsed: statsData.storage_used || '0 MB'
                });

                // Fetch Recent Videos
                const videosRes = await api.get('/videos?page=1&page_size=5');
                const videosList = videosRes.data.videos;

                const mappedVideos = videosList.map((v: any) => ({
                    id: v._id,
                    filename: v.metadata?.title || 'Video Sin Título',
                    duration: v.metadata?.duration || 0,
                    views: v.view_count || 0,
                    downloads: 0, // Placeholder
                    qualityScore: 90, // Placeholder
                    createdAt: new Date(v.created_at).toISOString().split('T')[0],
                    status: v.status.toLowerCase(),
                    category: v.metadata?.category || 'general',
                    tags: v.tags || []
                }));

                setVideos(mappedVideos);

            } catch (error) {
                console.error("Error fetching stats data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatsAndVideos();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3b2bee]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-8">
                <div className="mb-12">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Estadísticas Verv.io</h1>
                    <p className="text-muted-foreground">Monitorea el rendimiento y uso de tus videos</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Videos Procesados"
                        value={userStats?.totalVideos.toString() || '0'}
                        change="+12.4%"
                        icon={<Folder className="w-6 h-6 text-[#3b2bee]" />}
                        color="from-[#3b2bee] to-violet-500"
                    />
                    <StatCard
                        title="Vistas Totales"
                        value={userStats?.totalViews.toString() || '0'}
                        change="+8.2%"
                        icon={<Eye className="w-6 h-6 text-emerald-400" />}
                        color="from-emerald-500 to-teal-500"
                    />
                    <StatCard
                        title="Descargas"
                        value={userStats?.totalDownloads.toString() || '0'}
                        change="+5.7%"
                        icon={<Download className="w-6 h-6 text-amber-400" />}
                        color="from-amber-500 to-orange-500"
                    />
                    <StatCard
                        title="Calidad Promedio"
                        value={`${userStats?.averageQuality.toFixed(1) || '0'}%`}
                        change="+3.1%"
                        icon={<Shield className="w-6 h-6 text-blue-400" />}
                        color="from-blue-500 to-cyan-500"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-[#3b2bee]" />
                                Estadísticas de Videos
                            </h2>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-xs bg-foreground/5 border border-border rounded-lg text-muted-foreground hover:bg-accent">7 días</button>
                                <button className="px-3 py-1 text-xs bg-[#3b2bee]/20 border border-[#3b2bee]/30 rounded-lg text-[#3b2bee]">30 días</button>
                                <button className="px-3 py-1 text-xs bg-foreground/5 border border-border rounded-lg text-muted-foreground hover:bg-accent">90 días</button>
                            </div>
                        </div>
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <BarChart3 className="w-12 h-12 mx-auto text-[#3b2bee]/30 mb-3" />
                                <p>Gráfico de estadísticas de videos (simulado)</p>
                                <p className="text-sm mt-2">Aquí se mostrarían las métricas detalladas de tus videos</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-2xl border border-border">
                        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#3b2bee]" />
                            Últimos Videos
                        </h2>
                        <div className="space-y-4">
                            {videos.map((video) => (
                                <div key={video.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">{video.filename}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span>{Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}</span>
                                            <span>{video.views} vistas</span>
                                            <span>{video.downloads} descargas</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${video.status === 'processed'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                            {video.status === 'processed' ? 'Completado' : 'Procesando'}
                                        </span>
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs border border-blue-500/30">
                                            {video.qualityScore}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 bg-card p-6 rounded-2xl border border-border">
                    <h2 className="text-xl font-bold text-foreground mb-6">Categorías y Etiquetas</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-background/50 p-4 rounded-xl border border-border">
                            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <Tag className="w-4 h-4" /> Categorías Populares
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Marketing</span>
                                    <span className="text-foreground">8 videos</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Educación</span>
                                    <span className="text-foreground">6 videos</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Evento</span>
                                    <span className="text-foreground">5 videos</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Demo</span>
                                    <span className="text-foreground">3 videos</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-background/50 p-4 rounded-xl border border-border">
                            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <Tag className="w-4 h-4" /> Etiquetas Comunes
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['promo', 'tutorial', 'event', 'demo', 'social', 'product', 'feature', 'test'].map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-[#3b2bee]/20 text-[#3b2bee] rounded-full text-xs border border-[#3b2bee]/30">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="bg-background/50 p-4 rounded-xl border border-border">
                            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Calidad de Videos
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Excelente (90-100%)</span>
                                        <span className="text-foreground">12</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Buena (70-89%)</span>
                                        <span className="text-foreground">8</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div className="bg-amber-500 h-2 rounded-full" style={{ width: '33%' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Regular (&lt;70%)</span>
                                        <span className="text-foreground">4</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div className="bg-rose-500 h-2 rounded-full" style={{ width: '17%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <FeedbackCollector />
        </div>
    );
}

// Stat Card Component
const StatCard = ({ title, value, change, icon, color }: {
    title: string;
    value: string;
    change: string;
    icon: React.ReactNode;
    color: string;
}) => {
    return (
        <div className="bg-card p-5 rounded-2xl border border-border hover:border-white/20 transition-colors">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-muted-foreground text-sm">{title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-linear-to-br ${color}`}>
                    {icon}
                </div>
            </div>
            <p className="text-emerald-400 text-sm mt-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" /> {change}
            </p>
        </div>
    );
};
