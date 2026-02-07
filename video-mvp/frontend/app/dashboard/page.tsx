// frontend/app/dashboard/page.tsx
'use client';

import UsageMetrics from '@/components/UsageMetrics';
import Head from 'next/head';

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Dashboard - VideoConverter</title>
        <meta name="description" content="Panel de control de métricas de uso" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-800">Dashboard de Métricas</h1>
            <p className="text-gray-600 mt-2">Monitorea el rendimiento y uso de la plataforma</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <UsageMetrics />
          
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Últimas conversiones</h2>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">Video {item}.mp4</p>
                      <p className="text-sm text-gray-500">Hace 2 horas</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Completado</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Satisfacción del usuario</h2>
              <div className="h-64 flex items-center justify-center text-gray-500">
                Gráfico de satisfacción (simulado)
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}