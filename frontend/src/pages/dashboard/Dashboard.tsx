import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { 
  Users, 
  Target, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  Crown
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "../../lib/api";

export default function Dashboard() {

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    const userRole = localStorage.getItem('nexus_user_role');
    const orgId = localStorage.getItem('nexus_selected_client') || localStorage.getItem('nexus_org_id') || '';
    
    // Super Admin usa /api/admin/dashboard, todos os outros usam /api/dashboard
    const endpoint = userRole === 'SUPER_ADMIN' 
      ? `/api/admin/dashboard${orgId ? `?orgId=${orgId}` : ''}`
      : '/api/dashboard';
    
    try {
      const res = await apiFetch(endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error("Erro ao carregar painel");
      const nextData = await res.json();
      setData(nextData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    const handleRefresh = () => {
      if (document.visibilityState === 'visible') fetchDashboard();
    };
    window.addEventListener('focus', fetchDashboard);
    document.addEventListener('visibilitychange', handleRefresh);
    const interval = window.setInterval(fetchDashboard, 5000);

    return () => {
      window.removeEventListener('focus', fetchDashboard);
      document.removeEventListener('visibilitychange', handleRefresh);
      window.clearInterval(interval);
    };
  }, [fetchDashboard]);

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-red-500 font-medium">{error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-white rounded-lg"
      >
        Tentar Novamente
      </button>
    </div>
  );

  if (!data || !data.metrics) return <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">Carregando painel...</div>;


  const leadLimit = data.plan?.maxLeads ?? data.plan?.leadsLimit ?? 100;
  const leadUsage = data.usage?.leads || 0;

  const stats = [
    { label: "Total de Leads", value: data.metrics.leads, icon: Users, color: "bg-blue-50 text-blue-600", trend: "+12%" },
    { label: "Taxa de Conversão", value: `${data.metrics.conversions}%`, icon: Target, color: "bg-green-50 text-green-600", trend: "+2.4%" },
    { label: "Receita Est. (MRR)", value: `R$ ${data.metrics.revenue.toLocaleString()}`, icon: DollarSign, color: "bg-purple-50 text-purple-600", trend: "+18%" },
    { label: "Conteúdos Ativos", value: data.metrics.contentCount, icon: FileText, color: "bg-orange-50 text-orange-600", trend: "+5" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-1">
          Bem-vindo, {data.userName || 'Usuário'} 👋
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-medium">
          {data.orgName || 'Nexus360'} — Resumo da performance hoje.
        </p>
      </div>
      
      {/* Plan Info */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-l-4 border-primary bg-gradient-to-r from-white to-blue-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Crown size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Plano {data.plan?.name || 'Free'}</h2>
              <p className="text-sm text-gray-500 max-w-md">Você está utilizando os recursos do plano {data.plan?.name}. Seu limite de leads é monitorado em tempo real.</p>
            </div>
          </div>
          
          <div className="w-full sm:w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Uso de Leads</span>
              <span className="text-gray-500 font-medium">{leadUsage} / {leadLimit}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((leadUsage / leadLimit) * 100, 100)}%` }}
                className={`h-full transition-all duration-1000 ${leadUsage >= leadLimit ? 'bg-red-500' : 'bg-primary'}`}
              />
            </div>
            {leadUsage >= leadLimit && (
              <p className="text-xs text-red-500 font-bold flex items-center gap-1 animate-pulse">
                <AlertCircle size={12} />
                Limite atingido! Upgrade necessário.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-card flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <Icon size={24} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend}
                  <TrendingUp size={14} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Performance Semanal</h3>
              <p className="text-sm text-gray-500">Fluxo de leads e conversão por dia</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded">Leads</span>
              <span className="flex items-center gap-1 text-xs font-medium bg-green-50 text-green-600 px-2 py-1 rounded">Conversão</span>
            </div>
          </div>
          <div className="w-full h-[300px] min-h-[300px] relative" style={{ height: '300px', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300} minWidth={0} debounce={50}>
              <AreaChart data={data.chartData?.length > 0 ? data.chartData : [
                { name: 'Seg', leads: 0, conv: 0 },
                { name: 'Ter', leads: 0, conv: 0 },
                { name: 'Qua', leads: 0, conv: 0 },
                { name: 'Qui', leads: 0, conv: 0 },
                { name: 'Sex', leads: 0, conv: 0 },
              ]}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              <Area type="monotone" dataKey="conv" stroke="#10B981" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Summary */}
        <div className="glass-card">
          <h3 className="font-bold text-lg text-gray-900 mb-6">Metas Mensais</h3>
          <div className="flex flex-col gap-8">
            {(data.monthlyGoals || [
              { label: "Leads Qualificados", current: 0, total: 100, color: "bg-blue-600" },
              { label: "Propostas Enviadas", current: 0, total: 10, color: "bg-purple-600" },
              { label: "Conversão Final", current: 0, total: 5, color: "bg-green-600", isPercent: true },
            ]).map((meta: any, i: number) => {
              const pct = meta.total > 0 ? Math.min(Math.round((meta.current / meta.total) * 100), 100) : 0;
              const displayCurrent = meta.isPercent ? `${meta.current}%` : meta.current;
              return (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{meta.label}</span>
                    <span className="text-gray-500">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={`h-full ${meta.color}`}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{displayCurrent} / {meta.isPercent ? `${meta.total}%` : meta.total} planejado</span>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <button className="w-full py-3 bg-gray-50 text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
              <TrendingUp size={18} />
              <span>Ver Relatório Completo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
