'use client';

import React, { useEffect, useState } from 'react';
import { X, Shield, FileText, Mail, Info } from 'lucide-react';
import { fetchCookiePreferences, saveCookiePreferences } from '@/lib/cookiePreferences';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, icon, children, footer }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl bg-[#121022] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#3b2bee]/10 rounded-lg text-[#3b2bee]">
                            {icon}
                        </div>
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar text-slate-300 space-y-4 leading-relaxed">
                    {children}
                </div>
                <div className="p-6 border-t border-white/5 bg-white/2 flex justify-end">
                    {footer || (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white font-bold rounded-full transition-all"
                        >
                            Entendido
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const LegalModals = ({
    activeModal,
    onClose
}: {
    activeModal: 'privacy' | 'terms' | 'contact' | 'cookies' | null;
    onClose: () => void;
}) => {
    const defaultPrefs = {
        necessary: true,
        preferences: false,
        analytics: false,
        marketing: false
    };
    const [cookiePrefs, setCookiePrefs] = useState(defaultPrefs);

    useEffect(() => {
        if (activeModal !== 'cookies') return;

        const loadPrefs = async () => {
            const saved = localStorage.getItem('cookie-preferences');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved) as typeof defaultPrefs;
                    setCookiePrefs({ ...defaultPrefs, ...parsed, necessary: true });
                    return;
                } catch {
                    setCookiePrefs(defaultPrefs);
                }
            }

            const serverPrefs = await fetchCookiePreferences();
            if (serverPrefs) {
                localStorage.setItem('cookie-preferences', JSON.stringify(serverPrefs));
                localStorage.setItem('cookie-consent', 'custom');
                setCookiePrefs({ ...defaultPrefs, ...serverPrefs, necessary: true });
                return;
            }

            setCookiePrefs(defaultPrefs);
        };

        void loadPrefs();
    }, [activeModal]);

    const togglePref = (key: keyof typeof defaultPrefs) => {
        if (key === 'necessary') return;
        setCookiePrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const savePrefs = () => {
        localStorage.setItem('cookie-preferences', JSON.stringify(cookiePrefs));
        localStorage.setItem('cookie-consent', 'custom');
        void saveCookiePreferences(cookiePrefs);
        onClose();
    };

    const acceptAll = () => {
        const accepted = { ...defaultPrefs, preferences: true, analytics: true, marketing: true };
        setCookiePrefs(accepted);
        localStorage.setItem('cookie-preferences', JSON.stringify(accepted));
        localStorage.setItem('cookie-consent', 'true');
        void saveCookiePreferences(accepted);
        onClose();
    };

    const rejectNonEssential = () => {
        const minimal = { ...defaultPrefs, preferences: false, analytics: false, marketing: false };
        setCookiePrefs(minimal);
        localStorage.setItem('cookie-preferences', JSON.stringify(minimal));
        localStorage.setItem('cookie-consent', 'false');
        void saveCookiePreferences(minimal);
        onClose();
    };

    return (
        <>
            {/* Privacy Policy Modal */}
            <Modal
                isOpen={activeModal === 'privacy'}
                onClose={onClose}
                title="Política de Privacidad"
                icon={<Shield className="w-5 h-5" />}
            >
                <h3 className="text-white font-bold text-lg mb-2">1. Recopilación de Información</h3>
                <p>En Verv.io, valoramos tu privacidad. Solo recopilamos los videos que subes para su procesamiento temporal y metadatos técnicos mínimos necesarios para el funcionamiento del servicio.</p>

                <h3 className="text-white font-bold text-lg mb-2">2. Uso de Datos</h3>
                <p>Tus videos son procesados automáticamente por nuestra IA. No compartimos tus archivos originales ni procesados con terceros sin tu consentimiento explícito.</p>

                <h3 className="text-white font-bold text-lg mb-2">3. Retención de Archivos</h3>
                <p>Los archivos temporales se eliminan automáticamente de nuestros servidores después de completar el procesamiento o tras un periodo máximo de 24 horas.</p>
            </Modal>

            {/* Terms of Service Modal */}
            <Modal
                isOpen={activeModal === 'terms'}
                onClose={onClose}
                title="Términos de Servicio"
                icon={<FileText className="w-5 h-5" />}
            >
                <h3 className="text-white font-bold text-lg mb-2">1. Uso del Servicio</h3>
                <p>Al utilizar Verv.io, aceptas no subir contenido que infrinja derechos de autor, sea ilegal, ofensivo o contenga malware.</p>

                <h3 className="text-white font-bold text-lg mb-2">2. Propiedad Intelectual</h3>
                <p>Sigues siendo el propietario legal de todo el contenido que subas. Verv.io solo adquiere el derecho de procesar dicho contenido para entregarte el resultado final.</p>

                <h3 className="text-white font-bold text-lg mb-2">3. Limitación de Responsabilidad</h3>
                <p>Verv.io se ofrece "tal cual". No nos hacemos responsables por pérdidas de datos o resultados de procesamiento que no cumplan con tus expectativas.</p>
            </Modal>

            {/* Cookies Policy Modal */}
            <Modal
                isOpen={activeModal === 'cookies'}
                onClose={onClose}
                title="Política de Cookies"
                icon={<Info className="w-5 h-5" />}
                footer={
                    <div className="flex flex-col sm:flex-row gap-3 w-full justify-end">
                        <button
                            onClick={rejectNonEssential}
                            className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white text-sm font-semibold rounded-full transition-colors"
                        >
                            Rechazar no esenciales
                        </button>
                        <button
                            onClick={acceptAll}
                            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-full transition-colors"
                        >
                            Aceptar todas
                        </button>
                        <button
                            onClick={savePrefs}
                            className="px-6 py-2 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white text-sm font-bold rounded-full transition-all"
                        >
                            Guardar preferencias
                        </button>
                    </div>
                }
            >
                <p>Elige que tipo de cookies quieres permitir. Las necesarias siempre estan activas.</p>
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div>
                            <p className="text-white font-semibold">Necesarias</p>
                            <p className="text-sm text-slate-400">Mantienen el sitio funcionando y seguro.</p>
                        </div>
                        <button
                            className="px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            aria-label="Cookies necesarias activas"
                        >
                            Activas
                        </button>
                    </div>
                    <button
                        onClick={() => togglePref('preferences')}
                        className="w-full flex items-center justify-between gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                    >
                        <div className="text-left">
                            <p className="text-white font-semibold">Preferencias</p>
                            <p className="text-sm text-slate-400">Recuerdan ajustes y preferencias visuales.</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${cookiePrefs.preferences ? 'bg-[#3b2bee]/20 text-[#b9b3ff] border border-[#3b2bee]/40' : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                            {cookiePrefs.preferences ? 'Activadas' : 'Desactivadas'}
                        </span>
                    </button>
                    <button
                        onClick={() => togglePref('analytics')}
                        className="w-full flex items-center justify-between gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                    >
                        <div className="text-left">
                            <p className="text-white font-semibold">Analiticas</p>
                            <p className="text-sm text-slate-400">Nos ayudan a mejorar el producto.</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${cookiePrefs.analytics ? 'bg-[#3b2bee]/20 text-[#b9b3ff] border border-[#3b2bee]/40' : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                            {cookiePrefs.analytics ? 'Activadas' : 'Desactivadas'}
                        </span>
                    </button>
                    <button
                        onClick={() => togglePref('marketing')}
                        className="w-full flex items-center justify-between gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                    >
                        <div className="text-left">
                            <p className="text-white font-semibold">Marketing</p>
                            <p className="text-sm text-slate-400">Personalizan anuncios y contenido.</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${cookiePrefs.marketing ? 'bg-[#3b2bee]/20 text-[#b9b3ff] border border-[#3b2bee]/40' : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                            {cookiePrefs.marketing ? 'Activadas' : 'Desactivadas'}
                        </span>
                    </button>
                </div>
            </Modal>

            {/* Contact Modal */}
            <Modal
                isOpen={activeModal === 'contact'}
                onClose={onClose}
                title="Contacto"
                icon={<Mail className="w-5 h-5" />}
            >
                <p className="mb-4">¿Tienes alguna duda o sugerencia? Estamos aquí para ayudarte.</p>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-[#3b2bee]" />
                        <span className="text-white">soporte@verv.io</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-[#3b2bee]" />
                        <span className="text-white">info@verv.io</span>
                    </div>
                </div>
                <p className="text-sm italic mt-4 text-slate-500 text-center">Nuestro equipo suele responder en menos de 24 horas hábiles.</p>
            </Modal>
        </>
    );
};


export const LegalFooter = () => {
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'contact' | 'cookies' | null>(null);

    const closeModal = () => setActiveModal(null);

    return (
        <>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <button onClick={() => setActiveModal('privacy')} className="hover:text-[#3b2bee] transition-colors whitespace-nowrap">Políticas de Privacidad</button>
                <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                <button onClick={() => setActiveModal('terms')} className="hover:text-[#3b2bee] transition-colors whitespace-nowrap">Términos de Servicio</button>
                <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                <button onClick={() => setActiveModal('cookies')} className="hover:text-[#3b2bee] transition-colors whitespace-nowrap">Políticas de Cookies</button>
                <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                <button onClick={() => setActiveModal('contact')} className="hover:text-[#3b2bee] transition-colors">Contacto</button>
            </div>

            <LegalModals activeModal={activeModal} onClose={closeModal} />
        </>
    );
};
