'use client';

import React, { useState, useEffect } from 'react';
import { Info, X, Check } from 'lucide-react';
import { fetchCookiePreferences, saveCookiePreferences } from '@/lib/cookiePreferences';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const syncFromServer = async () => {
            const consent = localStorage.getItem('cookie-consent');
            const prefs = localStorage.getItem('cookie-preferences');

            if (!consent) {
                const serverPrefs = await fetchCookiePreferences();
                if (serverPrefs) {
                    localStorage.setItem('cookie-preferences', JSON.stringify(serverPrefs));
                    localStorage.setItem('cookie-consent', 'custom');
                    setIsVisible(false);
                    return;
                }

                const timer = setTimeout(() => setIsVisible(true), 1500);
                return () => clearTimeout(timer);
            }

            if (!prefs) {
                const fallbackPrefs = consent === 'true'
                    ? { necessary: true, preferences: true, analytics: true, marketing: true }
                    : { necessary: true, preferences: false, analytics: false, marketing: false };
                localStorage.setItem('cookie-preferences', JSON.stringify(fallbackPrefs));
            }
        };

        void syncFromServer();
    }, []);

    const handleAccept = () => {
        const prefs = {
            necessary: true,
            preferences: true,
            analytics: true,
            marketing: true
        };
        localStorage.setItem('cookie-preferences', JSON.stringify(prefs));
        localStorage.setItem('cookie-consent', 'true');
        void saveCookiePreferences(prefs);
        setIsVisible(false);
    };

    const handleDecline = () => {
        const prefs = {
            necessary: true,
            preferences: false,
            analytics: false,
            marketing: false
        };
        localStorage.setItem('cookie-preferences', JSON.stringify(prefs));
        localStorage.setItem('cookie-consent', 'false');
        void saveCookiePreferences(prefs);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-100 z-200 animate-in slide-in-from-bottom-10 duration-500 ease-out">
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-6 overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-[#3b2bee]"></div>

                <div className="flex items-start gap-4 mb-4">
                    <div className="p-2 bg-[#3b2bee]/10 rounded-lg text-[#3b2bee]">
                        <Info className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-foreground font-bold mb-1">Valoramos tu privacidad</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Utilizamos cookies para personalizar tu experiencia y analizar nuestro tráfico. Al hacer clic en "Aceptar", consientes el uso de todas las cookies.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleAccept}
                        className="flex-1 h-10 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Aceptar
                    </button>
                    <button
                        onClick={handleDecline}
                        className="h-10 px-4 border border-border hover:bg-foreground/5 text-slate-400 hover:text-foreground text-xs font-medium rounded-xl transition-all"
                    >
                        Denegar
                    </button>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-3 right-3 p-1 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default CookieConsent;
