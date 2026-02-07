// components/UploadZone.tsx (mejorado)
import React from 'react';

interface UploadZoneProps {
  getRootProps: (props?: Record<string, unknown>) => Record<string, unknown>;
  getInputProps: (props?: Record<string, unknown>) => Record<string, unknown>;
  isDragActive: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ getRootProps, getInputProps, isDragActive }) => {
  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragActive
      ? 'border-blue-500 bg-blue-50 scale-105'
      : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="text-xl font-medium text-gray-700 mb-2">
          {isDragActive ? '¡Suelta el video aquí!' : 'Arrastra tu video aquí'}
        </h3>
        <p className="text-gray-500 mb-4">Formato MP4, máximo 100MB, duración máxima 3 minutos</p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
          Seleccionar archivo
        </button>
      </div>
    </div>
  );
};

export default UploadZone;