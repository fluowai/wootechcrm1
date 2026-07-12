import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Zap, 
  Users, 
  Target, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpCircle,
  Calendar,
  History,
  ShieldCheck,
  ChevronRight,
  Gauge
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function Billing() {
  const [usage, setUsage] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usageRes, plansRes] = await Promise.all([
        apiFetch('/api/usage/metrics'),
        apiFetch('/api/billing/plans')
      ]);
      
      if (usageRes.ok) setUsage(await usageRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (used: number, max: number) => {
    const percentage = (used / max) * 100;
    return Math.min(percentage, 100);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'A definir';
    return new Date(value).toLocaleDateString('pt-BR');
  };

  const renewalDate = usage?.currentPeriodEnd || usage?.trialEndsAt;

  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setSubmitting(planId);
    try {
      const res = await apiFetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle: 'monthly' })
      });
      if (res.ok) {
        alert("Plano alterado com sucesso!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="flex flex-col gap-10 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Plano e Faturamento</h1>
          <p className="text-gray-500 mt-2 font-medium">Gerencie sua assinatura, limites e faturas.</p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border border-emerald-100">
          <ShieldCheck size={20} />
          <span className="font-bold text-sm uppercase tracking-wider">Status: {usage?.status || 'Ativo'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Stats */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
               <Gauge size={120} />
            </div>
            <div className="flex items-center gap-4 mb-10">
               <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                  <Gauge size={24} />
               </div>
               <h2 className="text-2xl font-black text-gray-900">Uso do Plano</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Usuários do Time', used: usage?.usage.users, max: usage?.plan.limits.maxUsers, icon: Users, color: 'blue' },
                { label: 'Clientes Ativos', used: usage?.usage.clients, max: usage?.plan.limits.maxClients, icon: ShieldCheck, color: 'emerald' },
                { label: 'Leads na Base', used: usage?.usage.leads, max: usage?.plan.limits.maxLeads, icon: Target, color: 'amber' },
                { label: 'Fluxos de Automação', used: usage?.usage.automations, max: usage?.plan.limits.maxAutomations, icon: Zap, color: 'purple' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                       <item.icon size={18} className="text-gray-400" />
                       <span className="text-sm font-bold text-gray-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-black text-gray-900">{item.used} / {item.max}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${calculateProgress(item.used, item.max)}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ${item.used >= item.max ? 'bg-red-500' : 'bg-blue-600'}`}
                    />
                  </div>
                  {item.used >= item.max && (
                    <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                      <AlertCircle size={12} />
                      <span>Limite atingido</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current Plan Card */}
          <div className="bg-gray-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px]" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <span className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em] mb-2 block">Plano Atual</span>
                <h3 className="text-4xl font-black mb-4">{usage?.plan.name}</h3>
                <div className="flex items-center gap-4 text-gray-400 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{usage?.status === 'TRIAL' ? 'Teste ate' : 'Proxima renovacao'}: {formatDate(renewalDate)}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  const el = document.getElementById('plans-comparison');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all shadow-xl shadow-white/10 whitespace-nowrap"
              >
                Fazer Upgrade
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
             <h4 className="font-black text-gray-900 mb-6 flex items-center gap-2">
               <CreditCard size={18} className="text-blue-600" />
               Pagamento
             </h4>
             <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                   <CreditCard size={20} className="text-gray-400" />
                </div>
                <div>
                   <div className="text-sm font-black text-gray-900">Visa **** 4421</div>
                   <div className="text-[10px] font-bold text-gray-400 uppercase">Expira em 12/28</div>
                </div>
             </div>
             <button className="w-full py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
               Alterar Cartão
             </button>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
             <h4 className="font-black text-gray-900 mb-6 flex items-center gap-2">
               <History size={18} className="text-blue-600" />
               Últimas Faturas
             </h4>
             <div className="space-y-4">
                {[
                  { date: '12 Mai 2026', value: 'R$ 499,00', status: 'Paga' },
                  { date: '12 Abr 2026', value: 'R$ 499,00', status: 'Paga' },
                ].map((inv, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{inv.date}</div>
                      <div className="text-[10px] font-bold text-emerald-500 uppercase">{inv.status}</div>
                    </div>
                    <div className="text-sm font-black text-gray-900">{inv.value}</div>
                  </div>
                ))}
             </div>
             <button className="w-full mt-6 py-3 bg-gray-50 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                Ver Todo Histórico
                <ChevronRight size={14} />
             </button>
          </div>
        </div>
      </div>

      {/* Plans Comparison */}
      <div id="plans-comparison" className="mt-10 scroll-mt-10">
        <div className="text-center mb-16">
           <h2 className="text-4xl font-black text-gray-900 tracking-tight">Pronto para subir de nível?</h2>
           <p className="text-gray-500 mt-2 font-medium">Escolha o plano ideal para a escala da sua agência.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white rounded-[48px] border p-12 flex flex-col transition-all duration-500 ${usage?.plan.name === plan.name ? 'border-blue-600 shadow-2xl shadow-blue-100 ring-4 ring-blue-50' : 'border-gray-100 hover:shadow-xl'}`}
            >
              {usage?.plan.name === plan.name && (
                <div className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full w-fit mb-6 mx-auto">
                   Seu Plano Atual
                </div>
              )}
              <h3 className="text-2xl font-black text-gray-900 mb-2 text-center">{plan.name}</h3>
              <div className="text-center mb-10">
                 <span className="text-5xl font-black text-gray-900">R$ {plan.priceMonthly}</span>
                 <span className="text-gray-400 font-bold text-sm">/mês</span>
              </div>

              <ul className="space-y-5 mb-12 flex-1">
                {[
                  { label: `${plan.maxLeads} Leads`, icon: Target },
                  { label: `${plan.maxUsers} Usuários`, icon: Users },
                  { label: `${plan.maxAutomations} Automações`, icon: Zap },
                  { label: `Relatórios Ilimitados`, icon: CheckCircle2 },
                ].map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <feat.icon size={14} />
                    </div>
                    {feat.label}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSubscribe(plan.id)}
                disabled={usage?.plan.name === plan.name || submitting === plan.id}
                className={`w-full py-5 rounded-[24px] font-black transition-all ${usage?.plan.name === plan.name ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-xl shadow-gray-200'}`}
              >
                {submitting === plan.id ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mx-auto" />
                ) : (
                  usage?.plan.name === plan.name ? 'Ativo' : 'Assinar Plano'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
