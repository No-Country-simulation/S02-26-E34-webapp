// frontend/components/UsageMetrics.tsx
'use client';

import { useState, useEffect } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: string;
  positive: boolean;
}

const MetricCard = ({ title, value, change, icon, positive }: MetricCardProps) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
    <div className={`mt-4 text-sm ${positive ? 'text-green-600' : 'text-red-600'}`}>
      {change}
    </div>
  </div>
);

const UsageMetrics = () => {
  const [metrics, setMetrics] = useState({
    videosProcessed: 0,
    conversionRate: 0,
    avgProcessingTime: 0,
    userSatisfaction: 0
  });

  // Simular carga de métricas
  useEffect(() => {
    // En una implementación real, esto vendría de una API
    const mockMetrics = {
      videosProcessed: 1242,
      conversionRate: 94.3,
      avgProcessingTime: 42, // segundos
      userSatisfaction: 4.7 // de 5
    };
    
    // Simular carga con delay
    setTimeout(() => {
      setMetrics(mockMetrics);
    }, 500);
  }, []);

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Métricas de Uso</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Videos Procesados" 
          value={metrics.videosProcessed.toLocaleString()} 
          change="+12% esta semana" 
          icon="🎬" 
          positive={true} 
        />
        
        <MetricCard 
          title="Tasa de Conversión" 
          value={`${metrics.conversionRate}%`} 
          change="+3.2% esta semana" 
          icon="📈" 
          positive={true} 
        />
        
        <MetricCard 
          title="Tiempo Promedio" 
          value={`${metrics.avgProcessingTime}s`} 
          change="-8s esta semana" 
          icon="⏱️" 
          positive={true} 
        />
        
        <MetricCard 
          title="Satisfacción" 
          value={metrics.userSatisfaction} 
          change="+0.3 esta semana" 
          icon="😊" 
          positive={true} 
        />
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendencias Recientes</h3>
        <div className="bg-white p-4 rounded-lg">
          <div className="h-64 flex items-center justify-center text-gray-500">
            Gráfico de tendencias (simulado)
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageMetrics;