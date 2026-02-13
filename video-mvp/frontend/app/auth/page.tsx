'use client';

import { useState, useEffect } from 'react';
import { Crop, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { showError, showSuccess, showInfo } from '@/lib/sweetalert';
import FeedbackCollector from '@/components/FeedbackCollector';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

declare global {
  interface Window {
    google: any;
  }
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Initialize Google Sign-In
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (typeof window !== 'undefined' && window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large', width: '400' }
        );
      }
    };

    // Load Google script if not already loaded
    if (!window.google && GOOGLE_CLIENT_ID) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.head.appendChild(script);
    } else if (window.google && GOOGLE_CLIENT_ID) {
      initializeGoogleSignIn();
    }
  }, []);

  const handleGoogleResponse = async (response: any) => {
    if (response.credential) {
      setIsLoading(true);

      try {
        // Send Google token to backend
        const res = await fetch(`${BACKEND_API_URL}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: response.credential }),
        });

        const data = await res.json();

        if (res.ok) {
          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(data));

          // Show success message
          showSuccess('Inicio de sesión exitoso', `¡Bienvenido, ${data.name}!`);

          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          // Handle different error cases
          if (res.status === 403) {
            // Account pending verification
            showInfo('Verificación pendiente', data.detail || 'Tu cuenta está pendiente de verificación por un administrador. Serás notificado cuando sea aprobada.');
            router.push('/');
          } else {
            showError('Error de autenticación', data.detail || 'Hubo un error al iniciar sesión con Google. Por favor, inténtalo de nuevo.');
          }
        }
      } catch (error) {
        console.error('Google login error:', error);
        showError('Error de conexión', 'No se pudo conectar con el servidor de autenticación. Por favor, inténtalo de nuevo.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!email || !password) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    // Simulate authentication
    console.log({ email, password, isLogin });

    // Redirect to editor after successful auth
    router.push('/editor');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover blur-3xl opacity-20 scale-110"
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1920"
          alt="Abstract background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0f]"></div>
      </div>

      <main className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl p-8 md:p-12 flex flex-col items-center bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#3b2bee] rounded-full flex items-center justify-center shadow-lg shadow-[#3b2bee]/30 mb-6 hover:scale-105 transition-transform cursor-pointer"
              onClick={() => router.back()}>
              <div className="flex flex-col items-center">
                <svg className="text-white w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" strokeWidth="2" />
                  <path d="M12 15 L12 19" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 21 L16 21" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Verv.io</h1>
            <p className="text-slate-400 text-center text-sm leading-relaxed">
              Plataforma SaaS que convierte automáticamente videos horizontales en verticales optimizados para TikTok, Instagram Reels, YouTube Shorts y otras plataformas. Máximo {process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50'}MB y {process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_MINUTES || '3'} minutos de duración.
            </p>
          </div>

          {/* Toggle */}
          <div className="w-full p-1 bg-white/5 rounded-full flex mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${isLogin ? 'bg-[#3b2bee] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${!isLogin ? 'bg-[#3b2bee] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Registrarse
            </button>
          </div>

          {/* Actions */}
          <div className="w-full space-y-4">
            <div id="google-signin-button" className="w-full flex justify-center"></div>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-500 uppercase tracking-widest">o</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <input
                className="w-full bg-white/5 border border-white/10 focus:border-[#3b2bee]/50 focus:ring-2 focus:ring-[#3b2bee]/20 rounded-full py-4 px-6 text-sm transition-all outline-none placeholder:text-slate-500 text-white"
                placeholder="Ingresa tu correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                className="w-full bg-white/5 border border-white/10 focus:border-[#3b2bee]/50 focus:ring-2 focus:ring-[#3b2bee]/20 rounded-full py-4 px-6 text-sm transition-all outline-none placeholder:text-slate-500 text-white"
                placeholder="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {!isLogin && (
                <input
                  className="w-full bg-white/5 border border-white/10 focus:border-[#3b2bee]/50 focus:ring-2 focus:ring-[#3b2bee]/20 rounded-full py-4 px-6 text-sm transition-all outline-none placeholder:text-slate-500 text-white"
                  placeholder="Confirma tu contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              )}

              <button
                type="submit"
                className="w-full py-4 rounded-full bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#3b2bee]/30"
              >
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            </form>
          </div>

          {/* Forgot Password */}
          {isLogin && (
            <div className="mt-4 w-full text-center">
              <a href="#" className="text-sm text-slate-400 hover:text-[#3b2bee] transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center z-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3b2bee]"></div>
            </div>
          )}

          {/* Social Proof */}
          <div className="mt-10 flex items-center gap-4 p-4 rounded-xl bg-[#3b2bee]/5 border border-[#3b2bee]/10">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <img key={i} className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] object-cover" src={`https://picsum.photos/seed/user${i}/100/100`} alt="user" />
              ))}
            </div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Únete a 5,000+ creadores
            </p>
          </div>

        </div>
      </main>

      <FeedbackCollector />
    </div>
  );
}

// Add the glass panel style as a component wrapper
function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
      {children}
    </div>
  );
}