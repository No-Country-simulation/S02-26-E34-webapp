'use client';

import { useState } from 'react';
import { Camera, Save, User, Mail, Lock, CreditCard, Globe } from 'lucide-react';
import FeedbackCollector from '@/components/FeedbackCollector';

export default function ProfilePage() {
    const [userData, setUserData] = useState({
        name: 'Usuario Ejemplo',
        email: 'usuario@ejemplo.com',
        bio: 'Soy un creador de contenido apasionado por el video marketing.',
        website: 'https://ejemplo.com',
        avatar: 'https://picsum.photos/seed/user/200/200'
    });

    const [isEditing, setIsEditing] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Aquí iría la lógica para guardar los cambios
        setIsEditing(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Perfil de Usuario</h1>
                        <p className="text-slate-400">Gestiona tu información personal y preferencias</p>
                    </div>

                    <div className="bg-[#121022] rounded-2xl border border-white/10 overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#3b2bee]/30">
                                        <img
                                            src={userData.avatar}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <button className="absolute bottom-0 right-0 bg-[#3b2bee] p-2 rounded-full border-4 border-[#121022]">
                                        <Camera className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white">{userData.name}</h2>
                                    <p className="text-slate-400">{userData.email}</p>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white rounded-lg transition-colors"
                                        >
                                            <User className="w-4 h-4" />
                                            {isEditing ? 'Cancelar' : 'Editar Perfil'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {isEditing ? (
                                <form onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Nombre Completo</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={userData.name}
                                                onChange={handleChange}
                                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#3b2bee]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={userData.email}
                                                onChange={handleChange}
                                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#3b2bee]"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Biografía</label>
                                            <textarea
                                                name="bio"
                                                value={userData.bio}
                                                onChange={handleChange}
                                                rows={3}
                                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#3b2bee]"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-400 mb-2">Sitio Web</label>
                                            <input
                                                type="url"
                                                name="website"
                                                value={userData.website}
                                                onChange={handleChange}
                                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#3b2bee]"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-6 py-3 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white rounded-lg transition-colors"
                                        >
                                            <Save className="w-4 h-4" />
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-400">Nombre Completo</h3>
                                            <p className="text-white">{userData.name}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-400">Correo Electrónico</h3>
                                            <p className="text-white">{userData.email}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-400">Sitio Web</h3>
                                            <p className="text-[#3b2bee]">{userData.website}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-400 mb-2">Biografía</h3>
                                        <p className="text-slate-300">{userData.bio}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#121022] rounded-2xl border border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-[#3b2bee]/20 rounded-lg">
                                    <Lock className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Seguridad</h2>
                            </div>
                            <p className="text-slate-400 mb-4">Gestiona la seguridad de tu cuenta</p>
                            <button className="w-full py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors text-left font-normal uppercase-none">
                                Cambiar contraseña
                            </button>
                        </div>

                        <div className="bg-[#121022] rounded-2xl border border-white/10 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-[#3b2bee]/20 rounded-lg">
                                    <CreditCard className="w-5 h-5 text-[#3b2bee]" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Suscripción</h2>
                            </div>
                            <p className="text-slate-400 mb-4">Detalles de tu plan actual</p>
                            <button className="w-full py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors text-left font-normal uppercase-none">
                                Administrar suscripción
                            </button>
                        </div>
                    </div>

                    <FeedbackCollector />
                </div>
            </div>
        </div>
    );
}
