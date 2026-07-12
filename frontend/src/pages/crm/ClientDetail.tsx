import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Building2, 
  User, 
  DollarSign, 
  FileText, 
  ClipboardList, 
  Calendar,
  History,
  Mail,
  Phone,
  Globe,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";

const TABS = [
  { id: 'resumo', label: 'Resumo', icon: Building2 },
  { id: 'produtos', label: 'Produtos', icon: DollarSign },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'demandas', label: 'Demandas', icon: ClipboardList },
  { id: 'atividades', label: 'Atividades', icon: History }
];

export default function ClientDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('resumo');
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await apiFetch(`/api/clients/${id}/full`);
        const data = await res.json();
        setClient(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin text-primary"><Sparkles size={40} /></div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 h-full p-2">
      {/* Header / Breadcrumb */}
      <div className="flex items-center gap-4">
        <Link to="/clients" className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{client?.corporateName}</h1>
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-100">
              {client?.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{client?.tradeName || 'Nome Fantasia não informado'}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar de Informações Rápidas */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">Dados de Contato</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Responsável</p>
                  <p className="text-sm font-bold text-gray-700">{client?.responsibleName}</p>
                  <p className="text-xs text-gray-400">{client?.responsibleRole}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">E-mails</p>
                  <p className="text-sm font-bold text-gray-700">{client?.responsibleEmail}</p>
                  <p className="text-xs text-gray-400">{client?.emailFinance || 'Financeiro não informado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Online</p>
                  <a href={`https://${client?.website}`} target="_blank" className="text-sm font-bold text-blue-600 hover:underline">{client?.website || 'N/A'}</a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
             <Sparkles className="absolute -right-4 -top-4 text-white/10" size={120} />
             <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-6 relative z-10">Status de Operação</h3>
             <div className="flex items-center gap-4 relative z-10">
               <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                 <ClipboardList size={28} />
               </div>
               <div>
                 <p className="text-2xl font-black">{client?.demands?.filter((d:any) => d.status === 'completed').length || 0} / {client?.demands?.length || 0}</p>
                 <p className="text-xs text-white/50">Demandas Concluídas</p>
               </div>
             </div>
             <div className="mt-8 relative z-10">
               <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${(client?.demands?.filter((d:any) => d.status === 'completed').length / client?.demands?.length) * 100 || 0}%` }}
                   className="bg-blue-500 h-full rounded-full"
                 />
               </div>
             </div>
          </div>
        </div>

        {/* Área Principal de Abas */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-[32px] p-4 border border-gray-100 shadow-sm flex items-center gap-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex-1">
            <AnimatePresence mode="wait">
              {activeTab === 'resumo' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  <h4 className="text-lg font-black text-gray-900 mb-6">Informações Gerais</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Dados Jurídicos</p>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] text-gray-400">CNPJ</label>
                          <p className="text-sm font-bold text-gray-700">{client?.cnpj || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400">Endereço</label>
                          <p className="text-sm font-bold text-gray-700">{client?.address}, {client?.city} - {client?.state}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Resumo Financeiro</p>
                       <div className="space-y-4">
                         <div>
                           <label className="text-[10px] text-gray-400">Faturamento Mensal (LTV)</label>
                           <p className="text-lg font-black text-green-600">R$ {client?.soldProducts?.reduce((acc:any, p:any) => acc + p.monthlyValue, 0).toLocaleString() || '0,00'}</p>
                         </div>
                         <div className="flex gap-4">
                            <div>
                              <label className="text-[10px] text-gray-400">Setup Total</label>
                              <p className="text-sm font-bold text-gray-700">R$ {client?.soldProducts?.reduce((acc:any, p:any) => acc + p.setupValue, 0).toLocaleString() || '0,00'}</p>
                            </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'demandas' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-black text-gray-900">Pipeline de Onboarding</h4>
                    <button className="flex items-center gap-2 text-primary font-bold text-xs hover:underline">
                      <Plus size={14} /> Nova Demanda
                    </button>
                  </div>
                  {client?.demands?.map((demand: any) => (
                    <div key={demand.id} className="p-5 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          demand.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {demand.aiAgentType ? <Sparkles size={18} /> : <ClipboardList size={18} />}
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900">{demand.title}</h5>
                          <div className="flex items-center gap-3 mt-1">
                            {demand.aiAgentType && <span className="text-[8px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded tracking-widest uppercase">IA AGENT</span>}
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Calendar size={10} /> {new Date(demand.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                           demand.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                         }`}>
                           {demand.status === 'completed' ? 'CONCLUÍDO' : 'PENDENTE'}
                         </span>
                         <button className="p-2 text-gray-300 hover:text-gray-600">
                           <MoreVertical size={16} />
                         </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
              
              {activeTab === 'produtos' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-6">
                   <div className="flex justify-between items-center">
                      <h4 className="text-lg font-black text-gray-900">Serviços Contratados</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {client?.soldProducts?.map((p: any) => (
                        <div key={p.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-2">
                           <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{p.status}</span>
                           <h5 className="text-xl font-black text-slate-900">{p.name}</h5>
                           <div className="flex justify-between items-end mt-4">
                              <div>
                                 <p className="text-[10px] text-gray-400 font-bold uppercase">Mensalidade</p>
                                 <p className="text-lg font-black text-slate-700">R$ {p.monthlyValue.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] text-gray-400 font-bold uppercase">Setup</p>
                                 <p className="text-sm font-bold text-slate-500">R$ {p.setupValue.toLocaleString()}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}

              {activeTab === 'contratos' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                   <h4 className="text-lg font-black text-gray-900">Documentos e Contratos</h4>
                   {client?.contracts?.map((c: any) => (
                     <div key={c.id} className="p-5 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                              <FileText size={20} />
                           </div>
                           <div>
                              <p className="font-bold text-gray-900">{c.title || 'Contrato de Prestação de Serviços'}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-black">{c.contractNumber || `ID: ${c.id.substring(0,8)}`}</p>
                           </div>
                        </div>
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                           <Download size={18} />
                        </button>
                     </div>
                   ))}
                </motion.div>
              )}

              {activeTab === 'atividades' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-6">
                   <h4 className="text-lg font-black text-gray-900">Histórico Financeiro (Faturas)</h4>
                   <div className="space-y-3">
                      {client?.invoices?.map((inv: any) => (
                        <div key={inv.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                inv.status === 'paga' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                              }`}>
                                 <DollarSign size={20} />
                              </div>
                              <div>
                                 <p className="font-bold text-slate-800 text-sm">R$ {inv.total.toLocaleString()}</p>
                                 <p className="text-[10px] text-gray-400 font-bold uppercase">Vencimento: {new Date(inv.dueDate).toLocaleDateString('pt-BR')}</p>
                              </div>
                           </div>
                           <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${
                             inv.status === 'paga' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                           }`}>
                              {inv.status}
                           </span>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
