'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Shield, FileText, Info, LogOut, MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { LegalModals } from './LegalFooter';
import CookieConsent from './CookieConsent';
import useBackendStatus from '@/lib/useBackendStatus';

const Footer = () => {
    const { isOnline } = useBackendStatus();
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'contact' | 'cookies' | null>(null);

    const closeModal = () => setActiveModal(null);

    return (
        <footer className="py-12 border-t border-white/5 bg-background relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-150 h-75 bg-[#3b2bee]/5 blur-[100px] rounded-full -z-10"></div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand Section */}
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-linear-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                <svg className="text-foreground w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                                    <path d="M12 15 L12 19" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M8 21 L16 21" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">Verv.io</span>
                        </Link>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                            La plataforma inteligente para convertir tus videos a formato vertical con un solo clic. Mira distinto. Mira vertical.
                        </p>
                    </div>

                    {/* Product Section */}
                    <div>
                        <h4 className="text-foreground font-bold mb-4 uppercase text-xs tracking-widest">Herramientas</h4>
                        <ul className="space-y-3">
                            <li><Link href="/editor" className="text-sm text-slate-400 hover:text-foreground transition-colors">Editor de Video</Link></li>
                            <li><button onClick={() => setActiveModal('cookies')} className="text-sm text-slate-400 hover:text-foreground transition-colors">Configurar Cookies</button></li>
                        </ul>
                    </div>

                    {/* Legal Section */}
                    <div>
                        <h4 className="text-foreground font-bold mb-4 uppercase text-xs tracking-widest">Compañía</h4>
                        <ul className="space-y-3">
                            <li><button onClick={() => setActiveModal('privacy')} className="text-sm text-slate-400 hover:text-foreground transition-colors">Política de Privacidad</button></li>
                            <li><button onClick={() => setActiveModal('terms')} className="text-sm text-slate-400 hover:text-foreground transition-colors">Términos de Servicio</button></li>
                            <li><button onClick={() => setActiveModal('contact')} className="text-sm text-slate-400 hover:text-foreground transition-colors">Contacto</button></li>
                        </ul>
                    </div>

                    {/* Social/Community Section */}
                    <div>
                        <h4 className="text-foreground font-bold mb-4 uppercase text-xs tracking-widest">Soporte</h4>
                        <div className="p-4 bg-white/2 rounded-xl border border-white/5">
                            <p className="text-xs text-slate-500 mb-3">¿Necesitas ayuda con tu video?</p>
                            <button
                                onClick={() => setActiveModal('contact')}
                                className="flex items-center gap-2 text-xs font-bold text-foreground bg-[#3b2bee]/20 px-4 py-2 rounded-lg border border-[#3b2bee]/30 hover:bg-[#3b2bee]/30 transition-all w-full justify-center"
                            >
                                <MessageCircle className="w-3 h-3 text-[#3b2bee]" />
                                Hablar con Soporte
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                        © {new Date().getFullYear()} Verv.io. Todos los derechos reservados.
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Backend Status Badge */}
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all ${isOnline
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            }`}>
                            {isOnline ? (
                                <ThumbsUp className="w-4 h-4 animate-bounce" />
                            ) : (
                                <ThumbsDown className="w-4 h-4" />
                            )}
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-0.5">
                                    Servidor
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-tight leading-none">
                                    {isOnline ? 'Conectado' : 'Desconectado'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Powered by AI Video Tech</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/10"></div>
                        </div>
                    </div>
                </div>
            </div>

            <LegalModals activeModal={activeModal} onClose={closeModal} />
            <CookieConsent />
        </footer>
    );
};

export default Footer;
