'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { Search, MoreVertical, ShieldCheck, ShieldAlert, Trash2, Check, X, Shield, Lock, User as UserIcon, Loader2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';

interface User {
    _id: string;
    email: string;
    name: string;
    last_name?: string;
    role: 'admin' | 'user';
    verification_status: 'verified' | 'pending' | 'rejected';
    created_at: string;
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState({ name: '', email: '', role: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
                headers: { Authorization: `Bearer ${user.access_token}` },
            });
            setUsers(response.data.users);
            setError('');
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError('No se pudieron cargar los usuarios. Verifica tu conexión e intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (userId: string, action: 'approve' | 'reject' | 'delete' | 'promote') => {
        try {
            setActionLoading(`${userId}-${action}`);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const config = { headers: { Authorization: `Bearer ${user.access_token}` } };

            const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`;

            if (action === 'approve') await axios.put(`${baseUrl}/approve`, {}, config);
            if (action === 'reject') await axios.put(`${baseUrl}/reject`, {}, config);
            if (action === 'delete') await axios.delete(baseUrl, config);
            if (action === 'promote') await axios.put(`${baseUrl}/role?role=admin`, {}, config);

            await fetchUsers();
        } catch (err) {
            console.error(`Error performing ${action} on user ${userId}:`, err);
            alert(`Error al intentar realizar esta acción.`);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEditSave = async () => {
        if (!editingUser) return;
        try {
            setActionLoading('saving-edit');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const config = { headers: { Authorization: `Bearer ${user.access_token}` } };

            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/users/${editingUser._id}`, {
                name: editFormData.name,
                role: editFormData.role
            }, config);

            setEditingUser(null);
            await fetchUsers();
        } catch (err) {
            console.error('Error saving user edit', err);
            alert('Error al guardar los cambios del usuario');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <AdminLayout>
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-125">
                {/* Toolbar */}
                <div className="p-4 sm:p-6 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Directorio de Usuarios</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {users.length} usuarios registrados en total
                        </p>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-foreground/5 border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#3b2bee] transition-shadow"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <div className="w-12 h-12 rounded-full border-2 border-[#3b2bee]/20 border-t-[#3b2bee] animate-spin mb-4"></div>
                            <p className="text-sm font-medium text-muted-foreground">Cargando usuarios...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <ShieldAlert className="w-12 h-12 text-rose-500 mb-4 opacity-75" />
                            <p className="text-sm font-medium text-rose-400">{error}</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                            <Search className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                            <p className="text-sm font-medium text-muted-foreground">No se encontraron usuarios que coincidan con la búsqueda.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-foreground/5 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-foreground">Usuario</th>
                                    <th className="px-6 py-4 font-semibold text-foreground">Estado</th>
                                    <th className="px-6 py-4 font-semibold text-foreground">Rol</th>
                                    <th className="px-6 py-4 font-semibold text-foreground">Registro</th>
                                    <th className="px-6 py-4 font-semibold text-right text-foreground">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-foreground/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-linear-to-tr from-[#3b2bee]/20 to-purple-500/20 border border-[#3b2bee]/30 flex items-center justify-center text-foreground font-bold shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground">
                                                        {user.name} {user.last_name || ''}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.verification_status === 'verified' && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                                    <Check className="w-3 h-3" /> Verificado
                                                </div>
                                            )}
                                            {user.verification_status === 'pending' && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                                                    <Loader2 className="w-3 h-3" /> Pendiente
                                                </div>
                                            )}
                                            {user.verification_status === 'rejected' && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                                                    <X className="w-3 h-3" /> Rechazado
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {user.role === 'admin' ? (
                                                    <ShieldCheck className="w-4 h-4 text-[#3b2bee]" />
                                                ) : (
                                                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                                                )}
                                                <span className={`text-xs font-semibold uppercase tracking-wider ${user.role === 'admin' ? 'text-[#3b2bee]' : 'text-muted-foreground'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {format(new Date(user.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">

                                                {/* Single Approval/Rejection Toggle */}
                                                {user.role !== 'admin' && (
                                                    <button
                                                        onClick={() => handleAction(user._id, user.verification_status === 'verified' ? 'reject' : 'approve')}
                                                        disabled={!!actionLoading}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors tooltip-trigger relative ${user.verification_status === 'verified'
                                                            ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-foreground'
                                                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-foreground'
                                                            }`}
                                                        title={user.verification_status === 'verified' ? "Rechazar usuario" : "Aprobar usuario"}
                                                    >
                                                        {actionLoading === `${user._id}-approve` || actionLoading === `${user._id}-reject` ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : user.verification_status === 'verified' ? (
                                                            <X className="w-4 h-4" />
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}

                                                {/* Revoke / Delete Actions */}
                                                {user.role !== 'admin' && (
                                                    <>
                                                        {user.verification_status === 'verified' && (
                                                            <button
                                                                onClick={() => {
                                                                    Swal.fire({
                                                                        title: '¿Hacer administrador a este usuario?',
                                                                        text: 'Tendrá acceso completo al panel de control.',
                                                                        icon: 'warning',
                                                                        showCancelButton: true,
                                                                        confirmButtonColor: '#3b2bee',
                                                                        cancelButtonColor: '#475569',
                                                                        confirmButtonText: 'Sí, ascender',
                                                                        cancelButtonText: 'Cancelar',
                                                                        background: '#1a1736',
                                                                        color: '#fff'
                                                                    }).then((result) => {
                                                                        if (result.isConfirmed) {
                                                                            handleAction(user._id, 'promote');
                                                                        }
                                                                    });
                                                                }}
                                                                disabled={!!actionLoading}
                                                                className="w-8 h-8 rounded-lg bg-foreground/5 text-muted-foreground hover:bg-[#3b2bee] hover:text-white flex items-center justify-center transition-colors tooltip-trigger relative"
                                                                title="Hacer Administrador"
                                                            >
                                                                {actionLoading === `${user._id}-promote` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                setEditingUser(user);
                                                                setEditFormData({ name: user.name, email: user.email, role: user.role });
                                                            }}
                                                            disabled={!!actionLoading}
                                                            className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-foreground flex items-center justify-center transition-colors tooltip-trigger relative"
                                                            title="Editar usuario"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                Swal.fire({
                                                                    title: '¿Desactivar usuario?',
                                                                    text: 'El usuario ya no podrá iniciar sesión. (Soft delete)',
                                                                    icon: 'warning',
                                                                    showCancelButton: true,
                                                                    confirmButtonColor: '#f43f5e',
                                                                    cancelButtonColor: '#475569',
                                                                    confirmButtonText: 'Sí, desactivar',
                                                                    cancelButtonText: 'Cancelar',
                                                                    background: '#1a1736',
                                                                    color: '#fff'
                                                                }).then((result) => {
                                                                    if (result.isConfirmed) {
                                                                        handleAction(user._id, 'delete');
                                                                    }
                                                                });
                                                            }}
                                                            disabled={!!actionLoading}
                                                            className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-foreground flex items-center justify-center transition-colors tooltip-trigger relative"
                                                            title="Desactivar usuario"
                                                        >
                                                            {actionLoading === `${user._id}-delete` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </button>
                                                    </>
                                                )}

                                                {/* Protection logic for Admins */}
                                                {user.role === 'admin' && (
                                                    <div className="w-8 h-8 flex items-center justify-center" title="Protegido">
                                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-border/60 flex justify-between items-center bg-foreground/5">
                            <h3 className="font-bold text-lg text-foreground">Editar Usuario</h3>
                            <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-[#3b2bee]/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Correo Electrónico (No editable)</label>
                                <input
                                    type="email"
                                    value={editFormData.email}
                                    disabled
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-muted-foreground cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Rol</label>
                                <select
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-[#3b2bee]/50 appearance-none"
                                >
                                    <option value="user">Usuario (USER)</option>
                                    <option value="admin">Administrador (ADMIN)</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3 mt-2">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 px-4 py-2 rounded-xl border border-border font-medium text-foreground hover:bg-foreground/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={actionLoading === 'saving-edit'}
                                className="flex-1 px-4 py-2 rounded-xl bg-[#3b2bee] hover:bg-[#3b2bee]/90 font-medium text-white transition-colors flex justify-center items-center"
                            >
                                {actionLoading === 'saving-edit' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
