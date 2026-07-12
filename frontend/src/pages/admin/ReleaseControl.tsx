import { useState, useEffect } from "react";
import { Zap, ShieldCheck, Rocket, Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function ReleaseControl() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/system/settings');
      if (res.ok) setSettings(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (key: string, value: boolean) => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/system/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: value })
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 animate-pulse text-gray-400">Carregando controles de lançamento...</div>;

  const features = [
    { 
      id: 'crmPublic', 
      name: 'CRM & Pipeline', 
      desc: 'Gestão de leads, boards e colunas do pipeline.',
      icon: ShieldCheck,
      color: 'blue'
    },
    { 
      id: 'salesMachinePublic', 
      name: 'Sales Machine (SDR)', 
      desc: 'Fila de atendimento rápido e inteligência de vendas.',
      icon: Zap,
      color: 'orange'
    },
    { 
      id: 'agentBuilderPublic', 
      name: 'Agent Builder (IA)', 
      desc: 'Criação e personalização de agentes de IA.',
      icon: Rocket,
      color: 'purple'
    }
  ];

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Controle de Lançamento</h1>
        <p className="text-gray-500 font-medium">Gerencie a disponibilidade global de recursos do WooTech CRM.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-[24px] flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
           <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 mb-1">Como funciona o Staging</h4>
          <p className="text-sm text-amber-800 leading-relaxed">
            Recursos com "Lançamento Global" <b>desativado</b> só estarão visíveis para organizações marcadas como 
            <span className="bg-white px-1.5 py-0.5 rounded mx-1 font-bold">Beta Access</span> nas configurações de cliente.
            Após validar na sua conta teste, ative o recurso aqui para liberar para todos os clientes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {features.map((f) => {
          const isPublic = settings?.[f.id];
          const Icon = f.icon;
          
          return (
            <motion.div 
              key={f.id}
              className={`p-6 rounded-[32px] border-2 transition-all flex items-center justify-between ${
                isPublic ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50/50 border-dashed border-gray-200'
              }`}
            >
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  isPublic 
                    ? `bg-${f.color}-500 text-white shadow-${f.color}-200` 
                    : 'bg-gray-200 text-gray-400 shadow-none'
                }`}>
                  <Icon size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className={`font-bold text-lg ${isPublic ? 'text-gray-900' : 'text-gray-400'}`}>{f.name}</h3>
                    {isPublic ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-full">Produção</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase rounded-full">Em Validação (BETA)</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 font-medium">{f.desc}</p>
                </div>
              </div>

              <button
                disabled={saving}
                onClick={() => handleToggle(f.id, !isPublic)}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                  isPublic 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95'
                }`}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : isPublic ? 'Suspender Lançamento' : 'Liberar para Todos'}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 p-8 bg-gray-900 rounded-[32px] text-white flex items-center justify-between overflow-hidden relative">
         <div className="relative z-10">
            <h4 className="text-xl font-bold mb-2">Monitoramento de Saúde</h4>
            <p className="text-gray-400 text-sm max-w-md">Todos os sistemas estão operacionais. O tempo médio de resposta da IA é de 2.4s.</p>
         </div>
         <div className="flex items-center gap-4 relative z-10">
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Uptime</span>
               <span className="text-2xl font-black">99.9%</span>
            </div>
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
               <CheckCircle2 size={24} />
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32" />
      </div>
    </div>
  );
}
