'use client';

import Link from 'next/link';
import { Crop, Settings, User, BarChart3, LogOut, Menu, X, Smartphone, Home, Layout } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useSessionRefresh } from '@/lib/useSessionRefresh';

interface HeaderProps {
  onLogoClick?: () => void;
  showProjectLabel?: boolean;
}

const Header = ({ onLogoClick, showProjectLabel = false }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const { refreshSession } = useSessionRefresh();

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
      const target = event.target as Node;
      const clickedMenu = mobileMenuRef.current?.contains(target);
      const clickedToggle = mobileToggleRef.current?.contains(target);

      if (!clickedMenu && !clickedToggle) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);

    const checkUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      } else {
        setUser(null);
      }
    };

    refreshSession().finally(checkUser);

    // Listen for both cross-tab and custom same-tab updates
    window.addEventListener('storage', checkUser);
    window.addEventListener('user-state-change', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('user-state-change', checkUser);
    };
  }, [refreshSession]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('user');
    setUser(null);
    setIsMenuOpen(false);
    setIsMobileMenuOpen(false);
    window.location.href = '/';
  };

  return (
    <>
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center neon-glow group-hover:scale-105 transition-transform">
            <div className="flex flex-col items-center">
              <svg className="text-foreground w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" strokeWidth="2" />
                <path d="M12 15 L12 19" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 21 L16 21" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none text-foreground">Verv.io</h1>
            <p className="hidden xs:block text-[10px] text-slate-500 font-medium tracking-widest uppercase mt-1">Mira distinto. Mira vertical.</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6"></nav>

        <div className="flex items-center gap-6">
          {showProjectLabel && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#3b2bee]/10 rounded-full border border-[#3b2bee]/20">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold text-[#3b2bee]">PROJECT_V01.MP4</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {/* User Desktop Menu */}
            <div className="hidden sm:block relative" ref={menuRef}>
              {isMounted ? (
                user ? (
                  <>
                    <div
                      className="w-10 h-10 rounded-full bg-[#3b2bee]/20 border border-[#3b2bee]/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#3b2bee]/60 transition-colors relative"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                      }}
                    >
                      <img
                        className="w-full h-full object-cover"
                        src={user.picture || "https://picsum.photos/seed/user/100/100"}
                        alt="User profile"
                      />
                      {/* Estado del usuario (ícono indicador) */}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></span>
                    </div>

                    {isMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                        <div className="px-4 py-3 border-b border-border mb-1">
                          <p className="text-sm font-medium text-foreground truncate">{user.name || 'Usuario'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email || 'usuario@ejemplo.com'}</p>
                          {/* Estado del usuario en el texto */}
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            <span className="text-[10px] uppercase font-bold text-green-500 tracking-wider">{user.status || 'Activo'} / {user.plan || 'Free'}</span>
                          </div>
                        </div>
                        <Link
                          href="/editor"
                          className="px-4 py-2 text-sm text-muted-foreground hover:bg-[#3b2bee]/20 hover:text-foreground transition-colors flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Layout className="w-4 h-4" />
                          Editor
                        </Link>
                        {user.role === 'admin' && (
                          <Link
                            href="/admin/users"
                            className="px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors flex items-center gap-2 font-medium"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <Settings className="w-4 h-4" />
                            Panel Admin
                          </Link>
                        )}
                        <Link
                          href="/stats"
                          className="px-4 py-2 text-sm text-muted-foreground hover:bg-[#3b2bee]/20 hover:text-foreground transition-colors flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <BarChart3 className="w-4 h-4" />
                          Estadísticas
                        </Link>
                        <Link
                          href="/profile"
                          className="px-4 py-2 text-sm text-muted-foreground hover:bg-[#3b2bee]/20 hover:text-foreground transition-colors flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          Perfil
                        </Link>
                        <Link
                          href="/account"
                          className="px-4 py-2 text-sm text-muted-foreground hover:bg-[#3b2bee]/20 hover:text-foreground transition-colors flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Configuración
                        </Link>
                        <div className="h-px bg-foreground/5 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-[#3b2bee]/20 transition-colors flex items-center gap-2 text-rose-400"
                        >
                          <LogOut className="w-4 h-4" />
                          Cerrar Sesión
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Link href="/auth" className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border border-border hover:border-[#3b2bee]/40 hover:bg-[#3b2bee]/10 transition-all">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </Link>
                )
              ) : (
                <div className="w-10 h-10 rounded-full bg-foreground/5 animate-pulse"></div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="p-2 text-slate-400 hover:text-foreground md:hidden transition-colors"
              ref={mobileToggleRef}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - Solid Background & Full Coverage */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-16 bottom-0 bg-background z-[100] md:hidden flex flex-col p-4 overflow-y-auto animate-in slide-in-from-top duration-300"
          ref={mobileMenuRef}
        >
          {isMounted && user ? (
            <>
              {/* Mobile User Identity Section - Compact */}
              <div className="flex items-center gap-3 p-2.5 mb-4 bg-foreground/5 rounded-xl border border-border relative">
                <div className="w-10 h-10 rounded-full bg-[#3b2bee]/20 border border-[#3b2bee]/30 flex items-center justify-center overflow-hidden relative">
                  <img
                    className="w-full h-full object-cover"
                    src={user.picture || "https://picsum.photos/seed/user/100/100"}
                    alt="User profile"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-bold leading-none">{user.name || 'Usuario'}</span>
                  <span className="text-muted-foreground text-[11px] font-medium mt-1 truncate">{user.email || 'usuario@ejemplo.com'}</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-green-500 tracking-wider">{user.status || 'Activo'} / {user.plan || 'Free'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  href="/editor"
                  className="p-3 bg-foreground/5 rounded-xl text-sm font-bold text-foreground flex items-center gap-3 hover:bg-[#3b2bee]/10 transition-colors border border-transparent"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Layout className="w-4 h-4 text-[#3b2bee]" />
                  Editor de Video
                </Link>
                <Link
                  href="/stats"
                  className="p-3 bg-foreground/5 rounded-xl text-sm font-bold text-foreground flex items-center gap-3 hover:bg-[#3b2bee]/10 transition-colors border border-transparent"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <BarChart3 className="w-4 h-4 text-[#3b2bee]" />
                  Métricas y Stats
                </Link>

                <div className="h-px bg-foreground/5 my-1"></div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/profile"
                    className="p-2.5 bg-foreground/5 rounded-xl text-[11px] font-bold text-muted-foreground flex flex-col items-center gap-1.5 hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-3.5 h-3.5 text-[#3b2bee]/80" />
                    Perfil
                  </Link>
                  <Link
                    href="/account"
                    className="p-2.5 bg-foreground/5 rounded-xl text-[11px] font-bold text-muted-foreground flex flex-col items-center gap-1.5 hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="w-3.5 h-3.5 text-[#3b2bee]/80" />
                    Ajustes
                  </Link>
                </div>

                <button
                  onClick={(e) => {
                    handleLogout(e);
                  }}
                  className="w-full p-3 text-rose-500/90 mt-4 flex items-center justify-center gap-2 border-t border-border pt-5 font-bold text-[11px] hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar Sesión
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-16 h-16 rounded-full bg-foreground/5 border border-border flex items-center justify-center mb-2">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Inicia sesión</h2>
              <p className="text-sm text-muted-foreground text-center px-4">Accede a todas las herramientas de creación y estadísticas de tus videos.</p>
              <Link
                href="/auth"
                className="mt-4 px-8 py-3 bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white font-bold rounded-full transition-all shadow-lg shadow-[#3b2bee]/30"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ingresar / Registrarse
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Header;