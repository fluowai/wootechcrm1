import { useState, useEffect } from "react";
import { 
  Check, 
  Plus, 
  Settings2, 
  Zap, 
  Shield, 
  Crown,
  Archive,
  Copy,
  Power,
  Users,
  Target,
  Layers,
  ChevronRight,
  Save,
  X,
  CreditCard,
  Gauge
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'limits' | 'features'>('general');

  useEffect(() => {
    fetchPlans();
    fetchFeatures();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await apiFetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const res = await apiFetch('/api/admin/plans/features-list');
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget as HTMLFormElement);
    const textValue = (key: string) => {
      const value = data.get(key);
      return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    };
    const numberValue = (key: string) => {
      const raw = data.get(key);
      if (raw === null || raw === '') return undefined;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    
    const planData = Object.fromEntries(
      Object.entries({
        name: textValue('name'),
        slug: textValue('slug'),
        description: textValue('description'),
        priceMonthly: numberValue('priceMonthly'),
        priceYearly: numberValue('priceYearly'),
        maxUsers: numberValue('maxUsers'),
        maxClients: numberValue('maxClients'),
        maxLeads: numberValue('maxLeads'),
        maxContacts: numberValue('maxContacts'),
        maxDeals: numberValue('maxDeals'),
        maxPipelines: numberValue('maxPipelines'),
        maxAutomations: numberValue('maxAutomations'),
        maxLandingPages: numberValue('maxLandingPages'),
        maxInboxes: numberValue('maxInboxes'),
        maxAIRequests: numberValue('maxAIRequests'),
        maxReports: numberValue('maxReports'),
        maxIntegrations: numberValue('maxIntegrations'),
        maxMessages: numberValue('maxMessages'),
        isActive: textValue('isActive'),
        isPublic: textValue('isPublic'),
      }).filter(([, value]) => value !== undefined)
    );

    try {
      const method = editingPlan ? 'PATCH' : 'POST';
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });

      if (res.ok) {
        fetchPlans();
        setIsModalOpen(false);
        setEditingPlan(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFeature = async (planId: string, featureKey: string, isEnabled: boolean) => {
    try {
      await apiFetch(`/api/admin/plans/${planId}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey, isEnabled })
      });
      fetchPlans(); // Refresh to show changes
    } catch (err) {
      console.error(err);
    }
  };

  const runPlanAction = async (planId: string, action: 'duplicate' | 'archive' | 'activate') => {
    try {
      const res = await apiFetch(`/api/admin/plans/${planId}/${action}`, { method: 'POST' });
      if (res.ok) fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de Assinaturas</h1>
          <p className="text-gray-500 mt-2">Configuração de tiers, limites e matriz de permissões SaaS.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPlan(null);
            setActiveTab('general');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 font-bold"
        >
          <Plus size={20} />
          <span>Criar Novo Plano</span>
        </button>
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-white rounded-[40px] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-500 overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                  <Crown size={28} />
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-2xl font-black text-gray-900">R$ {plan.priceMonthly || 0}</span>
                   <span className={`mt-2 text-[10px] font-black px-2 py-1 rounded-full ${plan.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                     {plan.isActive ? 'ATIVO' : 'INATIVO'}
                   </span>
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">por mês</span>
                </div>
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2">{plan.description || 'Nenhuma descrição fornecida.'}</p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-400">
                        <Users size={16} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Usuários</span>
                   </div>
                   <span className="text-sm font-black text-primary">{plan.maxUsers}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-400">
                        <Target size={16} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Leads</span>
                   </div>
                   <span className="text-sm font-black text-primary">{plan.maxLeads}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingPlan(plan);
                    setActiveTab('general');
                    setIsModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  <Settings2 size={18} />
                  <span>Configurar</span>
                </button>
                <button
                  onClick={() => runPlanAction(plan.id, 'duplicate')}
                  title="Duplicar plano"
                  className="w-12 flex items-center justify-center py-3 bg-gray-50 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={() => runPlanAction(plan.id, plan.isActive ? 'archive' : 'activate')}
                  title={plan.isActive ? 'Arquivar plano' : 'Ativar plano'}
                  className={`w-12 flex items-center justify-center py-3 rounded-2xl font-bold text-sm transition-all ${plan.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                >
                  {plan.isActive ? <Archive size={18} /> : <Power size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[48px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}</h2>
                  <p className="text-sm text-gray-500 font-medium">Configure os parâmetros técnicos e comerciais.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white hover:shadow-md rounded-2xl transition-all text-gray-400"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs Nav */}
              <div className="px-10 py-4 flex gap-8 border-b border-gray-100 overflow-x-auto no-scrollbar">
                {[
                  { id: 'general', label: 'Geral & Preço', icon: CreditCard },
                  { id: 'limits', label: 'Limites de Uso', icon: Gauge },
                  { id: 'features', label: 'Matriz de Features', icon: Layers },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 pb-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}
                  >
                    <tab.icon size={18} />
                    <span className="font-bold text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <form id="plan-form" onSubmit={handleSave}>
                  {activeTab === 'general' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Nome Comercial</label>
                        <input name="name" defaultValue={editingPlan?.name} required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 border-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Slug ID</label>
                        <input name="slug" defaultValue={editingPlan?.slug} required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 border-none font-medium" placeholder="ex: starter-plan" />
                      </div>
                      <div>
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Status</label>
                         <select name="isActive" defaultValue={editingPlan?.isActive === false ? 'false' : 'true'} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border-none font-bold">
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                         </select>
                      </div>
                      <div>
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Visibilidade</label>
                         <select name="isPublic" defaultValue={editingPlan?.isPublic === false ? 'false' : 'true'} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border-none font-bold">
                            <option value="true">Publico</option>
                            <option value="false">Privado</option>
                         </select>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Preço Mensal (R$)</label>
                        <input name="priceMonthly" type="number" defaultValue={editingPlan?.priceMonthly} required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 border-none font-black text-blue-600" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Preço Anual (R$)</label>
                        <input name="priceYearly" type="number" defaultValue={editingPlan?.priceYearly} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 border-none font-black text-blue-600" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Descrição (Marketing)</label>
                        <textarea name="description" defaultValue={editingPlan?.description} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 border-none font-medium h-32" />
                      </div>
                    </div>
                  )}

                  {activeTab === 'limits' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-blue-50/50 p-6 rounded-3xl col-span-2 flex items-center gap-4 border border-blue-100">
                         <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center">
                            <Zap size={24} />
                         </div>
                         <div>
                            <h4 className="font-black text-blue-900">Limites Estruturais</h4>
                            <p className="text-xs text-blue-700 font-medium">Defina os limites máximos de recursos por agência neste plano.</p>
                         </div>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Máximo de Usuários</label>
                        <input name="maxUsers" type="number" defaultValue={editingPlan?.maxUsers} required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Máximo de Clientes</label>
                        <input name="maxClients" type="number" defaultValue={editingPlan?.maxClients} required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Maximo de Contatos</label>
                        <input name="maxContacts" type="number" defaultValue={editingPlan?.maxContacts} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Máximo de Leads</label>
                        <input name="maxLeads" type="number" defaultValue={editingPlan?.maxLeads} required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Maximo de Pipelines</label>
                        <input name="maxPipelines" type="number" defaultValue={editingPlan?.maxPipelines} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Maximo de Oportunidades</label>
                        <input name="maxDeals" type="number" defaultValue={editingPlan?.maxDeals} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Máximo de Automações</label>
                        <input name="maxAutomations" type="number" defaultValue={editingPlan?.maxAutomations} required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Mensagens/Mês</label>
                        <input name="maxMessages" type="number" defaultValue={editingPlan?.maxMessages} required className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Agentes IA / Requests</label>
                        <input name="maxAIRequests" type="number" defaultValue={editingPlan?.maxAIRequests} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Paginas</label>
                        <input name="maxLandingPages" type="number" defaultValue={editingPlan?.maxLandingPages} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Caixas / Instancias</label>
                        <input name="maxInboxes" type="number" defaultValue={editingPlan?.maxInboxes} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Relatorios</label>
                        <input name="maxReports" type="number" defaultValue={editingPlan?.maxReports} className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" />
                      </div>
                    </div>
                  )}

                  {activeTab === 'features' && editingPlan && (
                    <div className="space-y-8">
                      {modules.map((mod: any) => (
                        <div key={mod.id} className="border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                           <div className="bg-gray-50 px-8 py-4 flex items-center gap-3">
                              <Layers size={18} className="text-gray-400" />
                              <span className="font-black text-gray-900 text-sm">{mod.name}</span>
                              <span className="ml-auto text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">{mod.category}</span>
                           </div>
                           <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {mod.features.map((feat: any) => {
                                const isEnabled = editingPlan.planFeatures?.some((f: any) => f.featureKey === feat.key && f.isEnabled);
                                return (
                                  <div 
                                    key={feat.id} 
                                    className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isEnabled ? 'bg-blue-50/30' : 'opacity-60 hover:opacity-100'}`}
                                  >
                                    <div>
                                       <div className="font-bold text-gray-800 text-sm">{feat.name}</div>
                                       <div className="text-[10px] text-gray-400 font-medium">{feat.key}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleFeature(editingPlan.id, feat.key, !isEnabled)}
                                      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                                    >
                                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isEnabled ? 'left-7' : 'left-1'}`} />
                                    </button>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {activeTab === 'features' && !editingPlan && (
                    <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                        <Layers size={48} className="mx-auto text-gray-300 mb-4" />
                        <h4 className="font-bold text-gray-500">Salve o plano primeiro para gerenciar features.</h4>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div className="px-10 py-8 border-t border-gray-100 flex gap-4 bg-gray-50/50">
                 <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 font-bold text-gray-400 hover:bg-white hover:shadow-md rounded-2xl transition-all"
                 >
                   Descartar Alterações
                 </button>
                 <button 
                  form="plan-form"
                  type="submit"
                  className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                 >
                   <Save size={20} />
                   <span>Salvar Configurações</span>
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


