'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import FeedbackCollector from '@/components/FeedbackCollector';
import { ArrowRight, CloudUpload, Frame, FileDown, Bolt } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);

  // Mostrar tutorial solo en la primera visita
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      requestAnimationFrame(() => setShowTutorial(true));
    }
  }, []);


  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-x-hidden">
      {/* Tutorial de onboarding */}
      {showTutorial && <OnboardingTutorial />}

      {/* Hero Section */}
      <section className="pt-20 md:pt-32 pb-16 md:pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full md:w-200 h-100 md:h-150 bg-[#3b2bee]/10 blur-[80px] md:blur-[120px] rounded-full -z-10"></div>
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3b2bee]/10 border border-[#3b2bee]/20 mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-[#3b2bee] animate-pulse"></span>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-[#3b2bee]">Nuevo: Ajuste de marco en tiempo real</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-bold mb-6 leading-tight tracking-tight text-white px-2">
            Transforma Tu Contenido.<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-500 to-blue-400">Verv.io</span> en Acción.
          </h1>
          <p className="text-base md:text-xl text-slate-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
            La forma más rápida de reutilizar tus videos para TikTok, Reels y Shorts con nuestra herramienta inteligente de ajuste de marco en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 md:mb-20 px-6">
            <button
              onClick={() => router.push('/editor')}
              className="w-full sm:w-auto bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-[0_0_30px_rgba(59,43,238,0.5)] flex items-center justify-center gap-2 active:scale-95"
            >
              Comenzar Gratis <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto bg-[#121022] border border-white/10 hover:border-[#3b2bee]/50 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all">
              Ver Demo
            </button>
          </div>

          {/* Preview Mockup */}
          <div className="relative max-w-4xl mx-auto rounded-xl overflow-hidden border border-[#3b2bee]/30 bg-[#121022] p-1.5 md:p-4 group shadow-2xl">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40">
              <img
                className="w-full h-full object-cover opacity-60"
                src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=1920"
                alt="Landscape background"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative aspect-9/16 h-[80%] md:h-full border-2 border-[#3b2bee] rounded-lg shadow-[0_0_30px_rgba(59,43,238,0.5)] bg-black/20">
                  <div className="absolute top-2 right-2 bg-[#3b2bee] text-white text-[8px] md:text-[10px] font-bold px-2 py-1 rounded-full uppercase">Vista previa 9:16</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md scale-75 md:scale-100">
                      <Bolt className="text-white w-6 h-6 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Converter Section */}
      <section id="converter-section" className="py-12 md:py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Convierte tu video ahora</h2>
            <p className="text-sm md:text-base text-slate-400">Sube tu video horizontal y obtén una versión vertical optimizada</p>
          </div>

          <div className="bg-[#121022] p-6 md:p-8 rounded-2xl border border-white/10 shadow-lg">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3b2bee]/10 border border-[#3b2bee]/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#3b2bee] animate-pulse"></span>
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-[#3b2bee]">Funcionalidad disponible en el editor</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-white">Accede al Editor de Video</h3>
              <p className="text-sm md:text-base text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                Para convertir tus videos de 16:9 a 9:16, por favor inicia sesión en tu cuenta y accede al editor de video.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/auth"
                  className="bg-[#3b2bee] hover:bg-[#3b2bee]/90 text-white px-6 py-3.5 rounded-full font-bold transition-all text-center"
                >
                  Iniciar Sesión
                </a>
                <a
                  href="/auth"
                  className="bg-white/5 hover:bg-white/10 text-white px-6 py-3.5 rounded-full font-bold transition-all border border-white/10 text-center"
                >
                  Crear Cuenta
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 md:py-24 px-6 bg-[#121022]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Cómo Funciona</h2>
            <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">Pasa de formato cinematográfico panorámico a formato vertical viral en tres sencillos pasos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <StepCard
              num="01"
              icon={<CloudUpload className="text-[#3b2bee]" />}
              title="Sube Video"
              desc="Arrastra tu obra maestra 16:9 a nuestra nube segura. Soportamos resolución 4K y altas tasas de bits."
            />
            <StepCard
              num="02"
              icon={<Frame className="text-[#3b2bee]" />}
              title="Ajusta Marco"
              desc="Arrastra y posiciona el selector vertical para encuadrar la acción perfectamente. Mira el resultado en tiempo real."
            />
            <StepCard
              num="03"
              icon={<FileDown className="text-[#3b2bee]" />}
              title="Exporta Instantáneamente"
              desc="Exporta en formato vertical 9:16 de alta calidad. Listo para ser compartido directamente en plataformas sociales."
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16 rounded-3xl bg-[#3b2bee] shadow-[0_0_50px_rgba(59,43,238,0.5)] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 md:p-20 opacity-10 pointer-events-none">
            <Bolt className="w-37.5 md:w-50 h-37.5 md:h-50" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-8 relative z-10 text-center">
            <StatItem val="500k+" label="Procesados" />
            <StatItem val="2.4s" label="Rapidez" />
            <StatItem val="99.9%" label="Uptime" />
            <StatItem val="4.9/5" label="Ranking" />
          </div>
        </div>
      </section>

      {/* Botón de feedback */}
      <FeedbackCollector />
    </div>
  );
}

// Helper components for the landing page
const StepCard = ({ num, icon, title, desc }: { num: string, icon: React.ReactNode, title: string, desc: string }) => (
  <div className="relative p-8 rounded-2xl bg-[#121022] border border-white/5 hover:border-[#3b2bee]/30 transition-all group overflow-hidden">
    <div className="w-16 h-16 rounded-2xl bg-[#3b2bee]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div className="absolute top-8 right-8 text-6xl font-black text-[#3b2bee]/5">{num}</div>
    <h3 className="text-2xl font-bold mb-3 text-white">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

const StatItem = ({ val, label }: { val: string, label: string }) => (
  <div>
    <div className="text-4xl font-bold mb-1">{val}</div>
    <div className="text-white/70 text-sm font-medium">{label}</div>
  </div>
);

