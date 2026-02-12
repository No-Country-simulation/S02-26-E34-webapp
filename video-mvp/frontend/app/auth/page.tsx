'use client';

import { useState } from 'react';
import { Crop, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

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
              <Crop className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">VideoConverter.ai</h1>
            <p className="text-slate-400 text-center text-sm leading-relaxed">
              Transforma tu contenido 16:9 en videos verticales virales en segundos.
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
            <button
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-4 rounded-full transition-all active:scale-[0.98] shadow-xl"
            >
              <img className="w-6 h-6" src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" />
              Continuar con Google
            </button>

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

          <footer className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 opacity-60">
            <a className="text-[10px] text-slate-500 hover:text-[#3b2bee] transition-colors uppercase tracking-widest font-semibold" href="#">Privacidad</a>
            <a className="text-[10px] text-slate-500 hover:text-[#3b2bee] transition-colors uppercase tracking-widest font-semibold" href="#">Términos</a>
            <a className="text-[10px] text-slate-500 hover:text-[#3b2bee] transition-colors uppercase tracking-widest font-semibold" href="#">Ayuda</a>
          </footer>
        </div>
      </main>
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