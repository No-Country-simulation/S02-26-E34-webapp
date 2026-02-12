// frontend/components/OnboardingTutorial.tsx
'use client';

import { useState } from 'react';

interface Step {
  id: number;
  title: string;
  description: string;
  illustration: string;
}

const OnboardingTutorial = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps: Step[] = [
    {
      id: 1,
      title: "Sube tu video horizontal",
      description: "Arrastra y suelta tu video en formato MP4 (hasta 100MB). Compatible con videos de hasta 3 minutos.",
      illustration: "📤"
    },
    {
      id: 2,
      title: "Ajusta el marco vertical",
      description: "Usa controles avanzados para posicionar perfectamente el contenido en formato 9:16.",
      illustration: "🖼️"
    },
    {
      id: 3,
      title: "Personaliza con IA",
      description: "Agrega subtítulos automáticos, branding y efectos para optimizar tu video vertical.",
      illustration: "✨"
    },
    {
      id: 4,
      title: "Exporta y comparte",
      description: "Descarga tu video vertical listo para compartir en TikTok, Instagram Reels y YouTube Shorts.",
      illustration: "🚀"
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsVisible(false);
      // Save to localStorage that user has seen the tutorial
      localStorage.setItem('hasSeenTutorial', 'true');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    setIsVisible(false);
    // Save to localStorage that user has seen the tutorial
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#121022] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-white">Guía de inicio rápido</h2>
            <button
              onClick={skipTutorial}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Saltar
            </button>
          </div>

          <div className="flex justify-center mb-8">
            <div className="text-8xl">{steps[currentStep].illustration}</div>
          </div>

          <div className="mb-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-3">{steps[currentStep].title}</h3>
            <p className="text-slate-400">{steps[currentStep].description}</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex space-x-2 mb-8">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${index === currentStep ? 'bg-[#3b2bee] w-6' : 'bg-slate-700'}`}
                ></div>
              ))}
            </div>

            <div className="flex space-x-4 w-full justify-center">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-6 py-3 btn-secondary text-slate-300"
                >
                  Anterior
                </button>
              )}

              <button
                onClick={nextStep}
                className="px-6 py-3 btn-primary"
              >
                {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;