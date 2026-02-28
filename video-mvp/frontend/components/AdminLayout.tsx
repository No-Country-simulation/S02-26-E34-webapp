'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.replace('/auth');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role === 'admin') {
                setIsAuthorized(true);
            } else {
                setIsAuthorized(false);
            }
        } catch (error) {
            console.error('Failed to parse user session', error);
            setIsAuthorized(false);
        }
    }, [router]);

    if (isAuthorized === null) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[500px]">
                <Loader2 className="w-8 h-8 text-[#3b2bee] animate-spin" />
            </div>
        );
    }

    if (isAuthorized === false) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 min-h-[500px]">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="w-10 h-10 text-rose-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Acceso Denegado</h1>
                <p className="text-slate-400 max-w-md">No tienes los permisos necesarios para ver esta página. Serás redirigido a tu dashboard principal.</p>
                <button
                    onClick={() => router.push('/editor')}
                    className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium border border-white/10"
                >
                    Volver al inicio
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Zona de Administración
                </div>
                <h1 className="text-3xl font-bold text-white">Panel de Control</h1>
                <p className="text-slate-400 mt-1">Gestiona los accesos y roles de la plataforma.</p>
            </div>
            {children}
        </div>
    );
}
