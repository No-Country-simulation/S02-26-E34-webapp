'use client';

import React, { useState } from 'react';
import { X, Shield, FileText, Mail, Info } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, icon, children }: ModalProps) => {
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
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white font-bold rounded-full transition-all"
                    >
                        Entendido
                    </button>
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
            >
                <p>Utilizamos cookies propias y de terceros para mejorar tu experiencia.</p>
                <h3 className="text-white font-bold text-lg mb-2">Cookies Necesarias</h3>
                <p>Esenciales para el funcionamiento del sitio, como el mantenimiento de sesiones y preferencias de seguridad.</p>
                <h3 className="text-white font-bold text-lg mb-2">Cookies de Rendimiento</h3>
                <p>Nos ayudan a entender cómo los usuarios interactúan con el sitio, analizando errores y tiempos de carga.</p>
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
