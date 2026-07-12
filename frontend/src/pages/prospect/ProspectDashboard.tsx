import React, { useEffect, useState } from 'react';
import { Target, Users, CheckCircle, MessageSquare, PhoneCall } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function ProspectDashboard() {
  const [metrics, setMetrics] = useState({
    missionsActive: 0,
    leadsCaptadosHoje: 0,
    leadsValidados: 0,
    leadsAprovados: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiFetch('/api/nexus-prospect/dashboard');
        const data = await res.json();
        if (data.success) {
          setMetrics(data.data.metrics);
        }
      } catch (error) {
        console.error('Failed to load prospect metrics', error);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Nexus Prospect AI</h1>
          <p className="text-slate-500">Acompanhe suas minerações autônomas de captação e extração prontas para contato.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          icon={<Target size={20} className="text-blue-500" />}
          title="Minerações Ativas"
          value={metrics.missionsActive}
        />
        <MetricCard 
          icon={<Users size={20} className="text-emerald-500" />}
          title="Leads Captados (Hoje)"
          value={metrics.leadsCaptadosHoje}
        />
        <MetricCard 
          icon={<CheckCircle size={20} className="text-amber-500" />}
          title="Leads Validados"
          value={metrics.leadsValidados}
        />
        <MetricCard 
          icon={<MessageSquare size={20} className="text-indigo-500" />}
          title="Leads Aprovados"
          value={metrics.leadsAprovados}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="font-bold text-slate-800 mb-4">Mineração Ativa</h2>
        <p className="text-sm text-slate-500">As minerações estarão disponíveis em breve na listagem completa.</p>
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center space-x-4">
      <div className="p-3 bg-slate-50 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
