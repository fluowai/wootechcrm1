import { useState, useEffect } from "react";
import { 
  Activity, 
  Database, 
  Globe, 
  Zap, 
  Server,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { motion } from "motion/react";

export default function AdminMonitor() {
  const [latency, setLatency] = useState(42);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(30 + Math.floor(Math.random() * 20));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoramento do Sistema</h1>
          <p className="text-sm text-gray-500">Acompanhe a saúde da infraestrutura e performance em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          SISTEMA OPERACIONAL
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'API Gateway', status: 'Online', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50', sub: 'Latência: ' + latency + 'ms' },
          { label: 'Database (PostgreSQL)', status: 'Saudável', icon: Database, color: 'text-blue-500', bg: 'bg-blue-50', sub: 'Docker: nexus360-postgres' },
          { label: 'Storage', status: '92% Livre', icon: Server, color: 'text-purple-500', bg: 'bg-purple-50', sub: 'Uso: 4.2 GB' },
          { label: 'Uptime (30d)', status: '99.98%', icon: Globe, color: 'text-orange-500', bg: 'bg-orange-50', sub: 'Última queda: Nunca' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
              <s.icon size={20} />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
            <h4 className="text-xl font-bold text-gray-900 mb-1">{s.status}</h4>
            <p className="text-[10px] text-gray-400 font-medium">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            Performance da API (Req/min)
          </h3>
          <div className="space-y-4">
            {[
              { path: '/api/auth/login', time: '120ms', load: 85 },
              { path: '/api/crm/leads', time: '240ms', load: 42 },
              { path: '/api/video/token', time: '85ms', load: 12 },
              { path: '/api/admin/orgs', time: '310ms', load: 5 },
            ].map((route, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-600 font-mono">{route.path}</span>
                  <span className="text-emerald-500">{route.time}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${route.load}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Clock size={20} className="text-primary" />
            Logs de Incidentes
          </h3>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-gray-900 font-bold text-sm">Nenhum erro crítico detectado</p>
            <p className="text-gray-400 text-xs mt-1">O sistema está operando dentro dos parâmetros normais.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
