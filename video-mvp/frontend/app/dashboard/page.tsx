// frontend/app/dashboard/page.tsx
'use client';

import { BarChart3, TrendingUp, Clock, Download, Users, Activity } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Panel de Control</h1>
          <p className="text-slate-400">Monitorea el rendimiento y uso de la plataforma</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Videos Procesados" 
            value="1,248" 
            change="+12.4%" 
            icon={<Download className="w-6 h-6 text-[#3b2bee]" />} 
            color="from-[#3b2bee] to-violet-500"
          />
          <StatCard 
            title="Usuarios Activos" 
            value="842" 
            change="+4.2%" 
            icon={<Users className="w-6 h-6 text-emerald-400" />} 
            color="from-emerald-500 to-teal-500"
          />
          <StatCard 
            title="Tiempo de Procesamiento" 
            value="2.4s" 
            change="-0.3s" 
            icon={<Clock className="w-6 h-6 text-amber-400" />} 
            color="from-amber-500 to-orange-500"
          />
          <StatCard 
            title="Satisfacción" 
            value="4.8/5" 
            change="+0.2" 
            icon={<Activity className="w-6 h-6 text-rose-400" />} 
            color="from-rose-500 to-pink-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-[#121022] p-6 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#3b2bee]" />
                Estadísticas de Uso
              </h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10">7 días</button>
                <button className="px-3 py-1 text-xs bg-[#3b2bee]/20 border border-[#3b2bee]/30 rounded-lg text-[#3b2bee]">30 días</button>
                <button className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10">90 días</button>
              </div>
            </div>
            <div className="h-80 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-[#3b2bee]/30 mb-3" />
                <p>Gráfico de estadísticas de uso (simulado)</p>
                <p className="text-sm mt-2">Aquí se mostrarían las métricas detalladas</p>
              </div>
            </div>
          </div>

          <div className="bg-[#121022] p-6 rounded-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#3b2bee]" />
              Últimas Conversiones
            </h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-white">Video {item}.mp4</p>
                    <p className="text-sm text-slate-500">Hace {item*2} horas</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm border border-emerald-500/30">Completado</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-[#121022] p-6 rounded-2xl border border-white/10">
          <h2 className="text-xl font-bold text-white mb-6">Métricas de Rendimiento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0a0a0f]/50 p-4 rounded-xl border border-white/10">
              <h3 className="font-medium text-slate-300 mb-2">Éxito de Procesamiento</h3>
              <div className="text-2xl font-bold text-emerald-400">98.7%</div>
              <div className="text-xs text-slate-500 mt-1">+1.2% desde el mes pasado</div>
            </div>
            <div className="bg-[#0a0a0f]/50 p-4 rounded-xl border border-white/10">
              <h3 className="font-medium text-slate-300 mb-2">Tiempo Promedio</h3>
              <div className="text-2xl font-bold text-amber-400">2.4s</div>
              <div className="text-xs text-slate-500 mt-1">-0.3s desde el mes pasado</div>
            </div>
            <div className="bg-[#0a0a0f]/50 p-4 rounded-xl border border-white/10">
              <h3 className="font-medium text-slate-300 mb-2">Satisfacción del Usuario</h3>
              <div className="text-2xl font-bold text-[#3b2bee]">4.8/5</div>
              <div className="text-xs text-slate-500 mt-1">+0.2 desde el mes pasado</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
const StatCard = ({ title, value, change, icon, color }: { 
  title: string; 
  value: string; 
  change: string; 
  icon: React.ReactNode;
  color: string;
}) => {
  return (
    <div className="bg-[#121022] p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-emerald-400 text-sm mt-3 flex items-center">
        <TrendingUp className="w-4 h-4 mr-1" /> {change}
      </p>
    </div>
  );
};