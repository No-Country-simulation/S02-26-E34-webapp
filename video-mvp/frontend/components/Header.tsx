'use client';

import Link from 'next/link';
import { Crop, Settings, User, BarChart3, LogOut, Menu, X, Smartphone, Home, Layout } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  onLogoClick?: () => void;
  showProjectLabel?: boolean;
}

const Header = ({ onLogoClick, showProjectLabel = false }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (onLogoClick) {
      onLogoClick();
    }
    setIsMobileMenuOpen(false);
  };

  // Cerrar el menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-3 cursor-pointer group">
        <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center neon-glow group-hover:scale-105 transition-transform">
          <div className="flex flex-col items-center">
            <svg className="text-white w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" strokeWidth="2" />
              <path d="M12 15 L12 19" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 21 L16 21" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none text-white">Verv.io</h1>
          <p className="hidden xs:block text-[10px] text-slate-500 font-medium tracking-widest uppercase mt-1">Mira distinto. Mira vertical.</p>
        </div>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        <Link href="/editor" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2">
          <Layout className="w-4 h-4" />
          Editor
        </Link>
        <Link href="/stats" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Métricas
        </Link>
      </nav>

      <div className="flex items-center gap-6">
        {showProjectLabel && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#3b2bee]/10 rounded-full border border-[#3b2bee]/20">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-[#3b2bee]">PROJECT_V01.MP4</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* User Desktop Menu */}
          <div className="hidden sm:block relative" ref={menuRef}>
            <div
              className="w-10 h-10 rounded-full bg-[#3b2bee]/20 border border-[#3b2bee]/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#3b2bee]/60 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <img
                className="w-full h-full object-cover"
                src="https://picsum.photos/seed/user/100/100"
                alt="User profile"
              />
            </div>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#121022] border border-white/10 rounded-lg shadow-lg py-2 z-50">
                <Link
                  href="/stats"
                  className="px-4 py-2 text-sm text-slate-300 hover:bg-[#3b2bee]/20 hover:text-white transition-colors flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <BarChart3 className="w-4 h-4" />
                  Estadísticas
                </Link>
                <Link
                  href="/profile"
                  className="px-4 py-2 text-sm text-slate-300 hover:bg-[#3b2bee]/20 hover:text-white transition-colors flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Perfil
                </Link>
                <Link
                  href="/account"
                  className="px-4 py-2 text-sm text-slate-300 hover:bg-[#3b2bee]/20 hover:text-white transition-colors flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  Configuración
                </Link>
                <div className="h-px bg-white/5 my-1"></div>
                <Link
                  href="/auth"
                  className="px-4 py-2 text-sm hover:bg-[#3b2bee]/20 transition-colors flex items-center gap-2 text-rose-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="p-2 text-slate-400 hover:text-white md:hidden transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay - Solid Background & Compact Items */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 bg-[#0a0a0f] z-[100] md:hidden flex flex-col p-4 animate-in slide-in-from-top duration-300"
          ref={mobileMenuRef}
          style={{ backgroundColor: '#0a0a0f', opacity: 1 }}
        >
          {/* Mobile User Identity Section - Compact */}
          <div className="flex items-center gap-3 p-2.5 mb-4 bg-white/5 rounded-xl border border-white/10">
            <div className="w-8 h-8 rounded-full bg-[#3b2bee]/20 border border-[#3b2bee]/30 flex items-center justify-center overflow-hidden">
              <img
                className="w-full h-full object-cover"
                src="https://picsum.photos/seed/user/100/100"
                alt="User profile"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white text-xs font-bold leading-none">Tomas Cazabat</span>
              <span className="text-slate-500 text-[10px] font-medium mt-1">premium@verv.io</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href="/editor"
              className="p-3 bg-white/5 rounded-xl text-sm font-bold text-white flex items-center gap-3 hover:bg-[#3b2bee]/10 transition-colors border border-transparent"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Layout className="w-4 h-4 text-[#3b2bee]" />
              Editor de Video
            </Link>
            <Link
              href="/stats"
              className="p-3 bg-white/5 rounded-xl text-sm font-bold text-white flex items-center gap-3 hover:bg-[#3b2bee]/10 transition-colors border border-transparent"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <BarChart3 className="w-4 h-4 text-[#3b2bee]" />
              Métricas y Stats
            </Link>

            <div className="h-px bg-white/5 my-1"></div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/profile"
                className="p-2.5 bg-white/5 rounded-xl text-[11px] font-bold text-slate-400 flex flex-col items-center gap-1.5 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-3.5 h-3.5 text-[#3b2bee]/80" />
                Perfil
              </Link>
              <Link
                href="/account"
                className="p-2.5 bg-white/5 rounded-xl text-[11px] font-bold text-slate-400 flex flex-col items-center gap-1.5 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings className="w-3.5 h-3.5 text-[#3b2bee]/80" />
                Ajustes
              </Link>
            </div>

            <Link
              href="/auth"
              className="p-3 text-rose-500/90 mt-4 flex items-center justify-center gap-2 border-t border-white/5 pt-5 font-bold text-[11px] hover:text-rose-400 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;