'use client';

import { useState, useEffect } from 'react';
import { Crop, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { showError, showSuccess, showInfo } from '@/lib/sweetalert';
import FeedbackCollector from '@/components/FeedbackCollector';
import { useSessionRefresh } from '@/lib/useSessionRefresh';

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
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { refreshSession } = useSessionRefresh();

  // Redirect to editor if already logged in
  useEffect(() => {
    const validateAndRedirect = async () => {
      const refreshedUser = await refreshSession();
      if (refreshedUser) {
        router.push('/editor');
      }
    };

    validateAndRedirect();
  }, [router, refreshSession]);

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
          window.dispatchEvent(new Event('user-state-change'));

          // Show success message
          showSuccess('Inicio de sesión exitoso', `¡Bienvenido, ${data.name}!`);

          // Redirect to editor
          router.push('/editor');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!email || !password) {
      showError('Faltan datos', 'Por favor completa todos los campos requeridos');
      return;
    }

    if (!isLogin) {
      if (!name || !lastName) {
        showError('Faltan datos', 'Por favor ingresa tu nombre y apellido');
        return;
      }
      if (password !== confirmPassword) {
        showError('Error en credenciales', 'Las contraseñas no coinciden');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Handle Login via OAuth2PasswordRequestForm matching backend
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch(`${BACKEND_API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('user', JSON.stringify(data));
          window.dispatchEvent(new Event('user-state-change'));
          showSuccess('Inicio de sesión exitoso', `¡Bienvenido!`);
          router.push('/editor');
        } else {
          // Handle standard FastAPI details OR custom rate limit errors
          const errorMessage = data.detail || (data.error && data.error.message) || 'Credenciales incorrectas.';
          showError('Error de autenticación', errorMessage);
        }

      } else {
        // Handle Registration
        const res = await fetch(`${BACKEND_API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            name,
            last_name: lastName,
            password
          }),
        });

        const data = await res.json();

        if (res.ok || res.status === 403) { // Backend returns 403 when registration is successful but pending
          showInfo('Registro exitoso', data.detail || 'Cuenta pendiente de verificación por un administrador.');
          setIsLogin(true); // Switch to login view
        } else {
          showError('Error de registro', data.detail || 'Hubo un error al registrarse.');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      showError('Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
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
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-background"></div>
      </div>

      <main className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl p-8 md:p-12 flex flex-col items-center bg-card/80 backdrop-blur-xl border border-border shadow-2xl">
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Verv.io</h1>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Plataforma SaaS que convierte automáticamente videos horizontales en verticales optimizados para TikTok, Instagram Reels, YouTube Shorts y otras plataformas. Máximo {process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50'}MB y {process.env.NEXT_PUBLIC_MAX_VIDEO_DURATION_MINUTES || '3'} minutos de duración.
            </p>
          </div>

          {/* Toggle */}
          <div className="w-full p-1 bg-muted rounded-full flex mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${isLogin ? 'bg-[#3b2bee] text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${!isLogin ? 'bg-[#3b2bee] text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Registrarse
            </button>
          </div>

          {/* Actions */}
          <div className="w-full space-y-4">
            <button
              type="button"
              onClick={() => {
                // If Google integration is active
                if (typeof window !== 'undefined' && window.google) {
                  // Fallback for custom button is trickier with new Identity Services, 
                  // but we can prompt the one-tap or redirect
                  showInfo('Google Auth', 'Iniciando sesión con Google...');
                } else {
                  showError('Error', 'Google Auth no está configurado (falta NEXT_PUBLIC_GOOGLE_CLIENT_ID)');
                }
              }}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-full transition-all shadow-md active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuar con Google
            </button>

            <div className="relative flex items-center py-4">
              <div className="grow border-t border-border"></div>
              <span className="shrink mx-4 text-xs font-medium text-slate-500 uppercase tracking-widest">o</span>
              <div className="grow border-t border-border"></div>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-3">
              {!isLogin && (
                <div className="flex gap-3">
                  <input
                    className="w-full bg-foreground/5 border border-border focus:border-[#3b2bee]/50 focus:ring-2 focus:ring-[#3b2bee]/20 rounded-full py-4 px-6 text-sm transition-all outline-none placeholder:text-slate-500 text-foreground"
                    placeholder="Nombre"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                  <input
                    className="w-full bg-foreground/5 border border-border focus:border-[#3b2bee]/50 focus:ring-2 focus:ring-[#3b2bee]/20 rounded-full py-4 px-6 text-sm transition-all outline-none placeholder:text-slate-500 text-foreground"
                    placeholder="Apellido"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}

              <input
                className="w-full bg-foreground/5 border border-border focus:border-[#3b2bee]/50 focus:ring-2 focus:ring-[#3b2bee]/20 rounded-full py-4 px-6 text-sm transition-all outline-none placeholder:text-slate-500 text-foreground"
                placeholder="Ingresa tu correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="relative">
                <input
                  className="w-full bg-foreground/5 border border-border focus:border-[#3b2bee]/50 focus:ring-2 focus:ring-[#3b2bee]/20 rounded-full py-4 px-6 pr-12 text-sm transition-all outline-none placeholder:text-slate-500 text-foreground"
                  placeholder="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {!isLogin && (
                <div className="relative">
                  <input
                    className="w-full bg-foreground/5 border border-border focus:border-[#3b2bee]/50 focus:ring-2 focus:ring-[#3b2bee]/20 rounded-full py-4 px-6 pr-12 text-sm transition-all outline-none placeholder:text-slate-500 text-foreground"
                    placeholder="Confirma tu contraseña"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
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
          {
            isLogin && (
              <div className="mt-4 w-full text-center">
                <a href="#" className="text-sm text-slate-400 hover:text-[#3b2bee] transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            )
          }

          {/* Loading overlay */}
          {
            isLoading && (
              <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center z-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3b2bee]"></div>
              </div>
            )
          }

          {/* Social Proof */}
          <div className="mt-10 flex items-center gap-4 p-4 rounded-xl bg-[#3b2bee]/5 border border-[#3b2bee]/10">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <img key={i} className="w-8 h-8 rounded-full border-2 border-background object-cover" src={`https://picsum.photos/seed/user${i}/100/100`} alt="user" />
              ))}
            </div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Únete a 5,000+ creadores
            </p>
          </div>

        </div >
      </main >

      <FeedbackCollector />
    </div >
  );
}

// Add the glass panel style as a component wrapper
function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-foreground/5 backdrop-blur-xl border border-border shadow-2xl">
      {children}
    </div>
  );
}