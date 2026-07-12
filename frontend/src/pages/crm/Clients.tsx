import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  ChevronRight,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Target,
  Globe,
  Briefcase,
  MapPin,
  Trash2,
  Edit3,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const fetchClients = async () => {
    try {
      const res = await apiFetch(`/api/clients`);
      const data = await res.json();
      setClients(data.clients || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente? Todos os dados vinculados serão perdidos.")) return;
    try {
      await apiFetch(`/api/clients/${id}`, { method: 'DELETE' });
      fetchClients();
    } catch (err) {
      alert("Erro ao excluir cliente.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo': 
        return <span className="bg-green-50 text-green-600 border border-green-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <CheckCircle2 size={12} /> Ativo
        </span>;
      case 'onboarding': 
        return <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <Clock size={12} /> Onboarding
        </span>;
      case 'churned': 
        return <span className="bg-red-50 text-red-600 border border-red-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
          <AlertCircle size={12} /> Churn
        </span>;
      default:
        return <span className="bg-gray-50 text-gray-600 border border-gray-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit">
          {status}
        </span>;
    }
  };

  const filteredClients = clients.filter(c => 
    c.corporateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tradeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 h-full p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Gestão de Clientes</h1>
          <p className="text-gray-500">Controle operacional e comercial de contas ativas.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-[250px] sm:w-[300px] focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingClient(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold text-sm shadow-lg shadow-blue-100"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa / Raio-X</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsável</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Origem</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-sm group-hover:scale-110 transition-transform">
                        {client.corporateName?.substring(0, 1) || <Building2 size={18} />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 leading-none mb-1">{client.corporateName}</div>
                        <div className="text-xs text-gray-500">{client.tradeName || 'Sem nome fantasia'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-semibold text-gray-700">{client.responsibleName || 'Não definido'}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-tighter">{client.responsibleRole || 'Sócio'}</div>
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(client.status)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                        <Target size={12} className="text-gray-400" />
                        {client.source || 'Indefinida'}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{client.sourceDetail || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/clients/${client.id}`}
                        className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1.5"
                      >
                        Visão 360 <ChevronRight size={14} />
                      </Link>
                      <button 
                        onClick={() => { setEditingClient(client); setShowModal(true); }}
                        className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(client.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <ClientModal 
            onClose={() => setShowModal(false)} 
            onSuccess={() => { setShowModal(false); fetchClients(); }}
            initialData={editingClient}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientModal({ onClose, onSuccess, initialData }: { onClose: () => void, onSuccess: () => void, initialData?: any }) {
  const [tab, setTab] = useState<'empresa' | 'raiox' | 'business' | 'pessoa'>('empresa');
  const [formData, setFormData] = useState({
    corporateName: initialData?.corporateName || '',
    tradeName: initialData?.tradeName || '',
    cnpj: initialData?.cnpj || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    website: initialData?.website || '',
    status: initialData?.status || 'prospect',
    source: initialData?.source || 'Google Ads',
    sourceDetail: initialData?.sourceDetail || '',
    segment: initialData?.segment || '',
    porte: initialData?.porte || 'Pequeno',
    revenue: initialData?.revenue || 0,
    responsibleName: initialData?.responsibleName || '',
    responsibleEmail: initialData?.responsibleEmail || '',
    responsiblePhone: initialData?.responsiblePhone || '',
    responsibleRole: initialData?.responsibleRole || '',
    cpf: initialData?.cpf || ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = initialData ? `/api/clients/${initialData.id}` : '/api/clients';
      const method = initialData ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Erro ao salvar cliente.");
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erro ao salvar cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'raiox', label: 'Raio-X', icon: Target },
    { id: 'business', label: 'Negócio', icon: Briefcase },
    { id: 'pessoa', label: 'Responsável', icon: Users },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden relative z-10 flex flex-col max-h-[92vh]">
        <div className="px-10 py-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{initialData ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Cadastro completo com dados da empresa, origem, negócio e responsável</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-gray-50 rounded-2xl transition-all">
            <X size="22" className="text-gray-400" />
          </button>
        </div>

        <div className="flex gap-1 px-10 pt-6 pb-4 bg-gray-50/30 border-b border-gray-100 shrink-0 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${isActive ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
              >
                <Icon size={16} className={isActive ? 'text-blue-600' : ''} /> {t.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-10 py-8">
          <div className="max-w-4xl">
            {tab === 'empresa' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-5">Dados da Empresa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Razão Social</label>
                      <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold" placeholder="Nome jurídico completo" value={formData.corporateName} onChange={e => setFormData({...formData, corporateName: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nome Fantasia</label>
                      <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="Como é conhecida" value={formData.tradeName} onChange={e => setFormData({...formData, tradeName: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">CNPJ</label>
                      <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono" placeholder="00.000.000/0001-00" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">E-mail Corporativo (opcional)</label>
                      <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" type="email" placeholder="contato@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Telefone / WhatsApp</label>
                      <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="(11) 99999-9999" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Site</label>
                      <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="https://..." value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'raiox' && (
              <div className="space-y-8">
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
                    <Sparkles size="24" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">Raio-X de Aquisição</h4>
                    <p className="text-xs text-blue-600/70 mt-0.5">Entenda de onde esse cliente veio para otimizar seu CAC.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Canal de Origem</label>
                    <select className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                      <option value="Google Ads">Google Ads</option>
                      <option value="Meta Ads">Meta Ads (FB/IG)</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Prospecção Ativa">Prospecção Ativa</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Orgânico / SEO">Orgânico / SEO</option>
                      <option value="Evento / Networking">Evento / Networking</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status da Conta</label>
                    <select className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="prospect">Prospect</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="ativo">Ativo</option>
                      <option value="churned">Churn</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Detalhes da Origem</label>
                    <textarea className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[100px]" placeholder="Ex: Nome da pessoa que indicou, campanha ou evento específico" value={formData.sourceDetail} onChange={e => setFormData({...formData, sourceDetail: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'business' && (
              <div className="space-y-8">
                <h3 className="text-sm font-bold text-gray-900 mb-5">Dados do Negócio</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Segmento</label>
                    <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="Ex: Advocacia, Saúde" value={formData.segment} onChange={e => setFormData({...formData, segment: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Porte</label>
                    <select className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" value={formData.porte} onChange={e => setFormData({...formData, porte: e.target.value})}>
                      <option value="Micro">Micro (até 10)</option>
                      <option value="Pequeno">Pequeno (até 50)</option>
                      <option value="Médio">Médio (até 250)</option>
                      <option value="Grande">Grande (250+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Faturamento Mensal</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                      <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold" type="number" placeholder="0,00" value={formData.revenue} onChange={e => setFormData({...formData, revenue: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'pessoa' && (
              <div className="space-y-8">
                <h3 className="text-sm font-bold text-gray-900 mb-5">Dados do Responsável</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome Completo do Decisor</label>
                    <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-semibold" placeholder="Nome completo" value={formData.responsibleName} onChange={e => setFormData({...formData, responsibleName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cargo</label>
                    <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="CEO, Diretor, Sócio" value={formData.responsibleRole} onChange={e => setFormData({...formData, responsibleRole: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">E-mail Direto</label>
                    <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" type="email" placeholder="nome@empresa.com" value={formData.responsibleEmail} onChange={e => setFormData({...formData, responsibleEmail: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Telefone Direto</label>
                    <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="(11) 99999-9999" value={formData.responsiblePhone} onChange={e => setFormData({...formData, responsiblePhone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">CPF</label>
                    <input className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono" placeholder="000.000.000-00" value={formData.cpf || ''} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
            <button type="button" onClick={onClose} className="px-6 py-3.5 text-sm font-semibold text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all">Cancelar</button>
            <button type="submit" disabled={submitting}
              className="px-10 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {submitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              {!submitting && <ChevronRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
