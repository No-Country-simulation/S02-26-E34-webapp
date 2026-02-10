// components/BackendStatusIndicator.tsx
'use client';

import { useState, useEffect } from 'react';
import { showInfo } from '@/lib/sweetalert';
import { HEALTH_URL } from '@/lib/api';

interface BackendStatusIndicatorProps {
  healthUrl?: string;
}

const BackendStatusIndicator: React.FC<BackendStatusIndicatorProps> = ({
  healthUrl = HEALTH_URL
}) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null means unknown
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkBackendStatus = async () => {
    setIsLoading(true);
    try {
      // Check the health endpoint
      const response = await fetch(healthUrl);

      if (response.ok) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      console.error('Backend status check failed:', error);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check status immediately on mount
    checkBackendStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);

    return () => clearInterval(interval);
  }, [healthUrl]);

  const getStatusText = () => {
    if (isLoading) return 'Verificando...';
    if (isOnline === null) return 'Desconocido';
    return isOnline ? 'Conectado' : 'Desconectado';
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-yellow-500';
    if (isOnline === null) return 'bg-gray-500';
    return isOnline ? 'bg-green-500' : 'bg-red-500';
  };

  const handleClick = () => {
    if (!isOnline && !isLoading) {
      showInfo(
        'Backend no disponible',
        'El servidor backend no está disponible. Por favor, asegúrate de que esté corriendo antes de intentar procesar videos.'
      );
    }
  };

  return (
    <div
      className="flex items-center space-x-2 cursor-pointer bg-gray-800 p-2 rounded-lg"
      onClick={handleClick}
      title={`Estado del backend: ${getStatusText()}`}
    >
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2`} />
        <span className="text-sm font-medium">
          {isLoading ? 'Verificando...' : isOnline ? 'Backend: Conectado' : 'Backend: Desconectado'}
        </span>
      </div>
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
    </div>
  );
};

export default BackendStatusIndicator;