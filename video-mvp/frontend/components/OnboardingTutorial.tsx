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
      title: "Personaliza la conversión",
      description: "Selecciona opciones como subtítulos automáticos y branding para personalizar tu video vertical.",
      illustration: "⚙️"
    },
    {
      id: 3,
      title: "Procesamiento con IA",
      description: "Nuestra inteligencia artificial detecta rostros y objetos para mantenerlos centrados en el recorte.",
      illustration: "🤖"
    },
    {
      id: 4,
      title: "Descarga tu video optimizado",
      description: "Obtén tu video vertical listo para compartir en TikTok, Instagram Reels y YouTube Shorts.",
      illustration: "📥"
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsVisible(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Guía de inicio rápido</h2>
            <button 
              onClick={skipTutorial}
              className="text-gray-500 hover:text-gray-700"
            >
              Saltar
            </button>
          </div>
          
          <div className="flex justify-center mb-8">
            <div className="text-8xl">{steps[currentStep].illustration}</div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{steps[currentStep].title}</h3>
            <p className="text-gray-600">{steps[currentStep].description}</p>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div 
                  key={index}
                  className={`w-3 h-3 rounded-full ${index === currentStep ? 'bg-blue-600' : 'bg-gray-300'}`}
                ></div>
              ))}
            </div>
            
            <div className="flex space-x-3">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Anterior
                </button>
              )}
              
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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