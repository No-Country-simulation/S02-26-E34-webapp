// components/UploadZone.tsx (mejorado)
import React from 'react';

interface UploadZoneProps {
  getRootProps: (props?: Record<string, unknown>) => Record<string, unknown>;
  getInputProps: (props?: Record<string, unknown>) => Record<string, unknown>;
  isDragActive: boolean;
  disabled?: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ getRootProps, getInputProps, isDragActive, disabled = false }) => {
  const baseClasses = "border-2 border-dashed rounded-xl p-12 text-center transition-all";
  const activeClasses = isDragActive && !disabled
    ? 'border-blue-500 bg-blue-50 scale-105'
    : 'border-gray-300 bg-white';
  
  const hoverClasses = !disabled 
    ? 'hover:bg-gray-50 cursor-pointer' 
    : 'bg-gray-100 cursor-not-allowed opacity-70';
  
  return (
    <div 
      {...getRootProps()} 
      className={`${baseClasses} ${activeClasses} ${hoverClasses}`}
      style={{ pointerEvents: disabled ? 'none' : 'auto' }}
    >
      <input {...getInputProps()} disabled={disabled} />
      <div className="flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mb-4 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className={`text-xl font-medium mb-2 ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
          {disabled ? 'Backend no disponible' : isDragActive ? '¡Suelta el video aquí!' : 'Arrastra tu video aquí'}
        </h3>
        <p className={`mb-4 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
          {disabled 
            ? 'El backend no está disponible. Inténtalo más tarde.' 
            : 'Formato MP4, máximo 100MB, duración máxima 3 minutos'}
        </p>
        <button 
          className={`font-medium py-2 px-6 rounded-lg transition-colors ${
            disabled 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          disabled={disabled}
        >
          Seleccionar archivo
        </button>
      </div>
    </div>
  );
};

export default UploadZone;