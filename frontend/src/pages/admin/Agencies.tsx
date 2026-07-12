import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { 
  Building2, 
  Plus, 
  Search, 
  Trash2, 
  Edit3,
  ExternalLink, 
  MoreVertical,
  ArrowRight,
  Globe,
  Loader2,
  RefreshCw,
  User,
  Mail,
  Phone,
  Lock,
  Palette
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function AdminAgencies() {
  const navigate = useNavigate();
  const location = useLocation();
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ 
    name: '', 
    domain: '', 
    slug: '',
    plan: 'Pro', 
    planId: null as string | null,
    adminEmail: '', 
    adminPhone: '',
    adminPassword: '', 
    adminName: '',
    isTestAccount: false,
    betaAccess: false
  });
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [registeringDomain, setRegisteringDomain] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewOrg({ ...newOrg, adminPassword: pass });
  };

  const handleDomainRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !customDomain) return;
    
    setRegisteringDomain(true);
    try {
      const res = await apiFetch('/api/admin/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: customDomain, orgId: selectedOrg.id })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Dominio cadastrado. Configure o DNS no servidor Docker/Portainer para ativar a URL.");
        setShowDomainModal(false);
        setCustomDomain('');
        fetchAgencies();
      } else {
        alert("Erro: " + (data.details || data.error));
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setRegisteringDomain(false);
    }
  };

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const orgsRes = await apiFetch('/api/admin/orgs?type=CLIENT');
      if (orgsRes.ok) {
        setAgencies(await orgsRes.json());
      } else {
        const data = await orgsRes.json().catch(() => ({}));
        console.error("Erro ao carregar clientes", data);
        setAgencies([]);
      }
    } catch (err) {
      console.error(err);
      setAgencies([]);
    } finally {
      setLoading(false);
    }

    try {
      const plansRes = await apiFetch('/api/admin/plans', {}, 0);
      if (plansRes.ok) setAvailablePlans(await plansRes.json());
    } catch (err) {
      console.error("Erro ao carregar planos", err);
      setAvailablePlans([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/orgs', {
        method: 'POST',
        body: JSON.stringify(newOrg)
      });
      if (res.ok) {
        setShowModal(false);
        setNewOrg({ name: '', domain: '', slug: '', plan: 'Pro', planId: null, adminEmail: '', adminPhone: '', adminPassword: '', adminName: '', isTestAccount: false, betaAccess: false });
        fetchAgencies();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao criar cliente");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este cliente? Todos os dados dele serão excluídos.")) return;
    try {
      const res = await apiFetch(`/api/admin/orgs/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAgencies();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;

    const password = typeof editData.password === 'string' ? editData.password.trim() : '';
    if (password) {
      if (password.length < 10) {
        alert("A senha deve ter no minimo 10 caracteres.");
        return;
      }
      if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        alert("A senha deve conter letras maiusculas, minusculas e numeros.");
        return;
      }
    }

    const payload: Record<string, any> = {
      name: editData.name,
      slug: editData.slug,
      plan: editData.plan,
      planId: editData.planId,
    };

    if (typeof editData.domain === 'string') payload.domain = editData.domain.trim() || null;
    const adminEmail = typeof editData.adminEmail === 'string' ? editData.adminEmail.trim() : '';
    if (adminEmail) payload.adminEmail = adminEmail;
    const adminPhone = typeof editData.adminPhone === 'string' ? editData.adminPhone.trim() : '';
    if (adminPhone) payload.adminPhone = adminPhone;
    if (password) payload.password = password;

    try {
      const res = await apiFetch(`/api/admin/orgs/${editData.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setIsEditing(false);
        setEditData(null);
        fetchAgencies();
      } else {
        alert(data.details || data.error || "Erro ao atualizar agencia");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-[32px] border border-gray-100 shadow-sm p-1.5 w-fit">
        <Link
          to="/admin/agencies"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
            !location.pathname.includes('whitelabel')
              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Building2 size={18} />
          Clientes da Agência
        </Link>
        <Link
          to="/admin/whitelabel"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
            location.pathname.includes('whitelabel')
              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Palette size={18} />
          White-label
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes da Agência</h1>
          <p className="text-sm text-gray-500">Organizações que usam o Nexus360 como plataforma de gestão.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               placeholder="Pesquisar por nome, domínio ou ID..." 
               className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
             />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="px-8 py-4">Cliente</th>
                <th className="px-4 py-4">Plano</th>
                <th className="px-4 py-4">Usuários</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400">Carregando agências...</td></tr>
              ) : agencies.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400">Nenhuma agência encontrada.</td></tr>
              ) : agencies.map((org) => (
                <tr key={org.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        {org.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                          {org.name}
                          {org.isTestAccount && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black uppercase rounded-full">Test Account</span>
                          )}
                          {org.betaAccess && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase rounded-full">Beta Access</span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400 font-mono">/{org.slug || '—'}</span>
                          {org.domain ? (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">• {org.domain}</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">• Sem domínio próprio</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      org.plan === 'Enterprise' || org.planObj?.name === 'Enterprise' ? 'bg-purple-100 text-purple-600' : 
                      org.plan === 'Pro' || org.planObj?.name === 'Pro' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {org.planObj?.name || org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-5 font-medium text-gray-600">
                    {org._count?.users || 0}
                  </td>
                  <td className="px-4 py-5 text-emerald-500 font-medium">Ativo</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          localStorage.setItem('nexus_selected_client', org.id);
                          navigate('/dashboard');
                        }}
                        className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-all"
                        title="Acessar como Suporte (Impersonate)"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedOrg(org);
                          setShowDomainModal(true);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                        title="Configurar Domínio Personalizado"
                      >
                        <Globe size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditData({
                            id: org.id,
                            name: org.name || '',
                            slug: org.slug || '',
                            domain: org.domain || '',
                            plan: org.planObj?.name || org.plan || '',
                            planId: org.planId || '',
                            adminEmail: '',
                            adminPhone: '',
                            password: ''
                          });
                          setIsEditing(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-all"
                        title="Editar Agência"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(org.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                        title="Remover Agência"
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Provisionar Novo Cliente</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                 <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-[2px] mb-4">Dados da Agência</h3>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block pl-1">Nome do Cliente</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                    value={newOrg.name}
                    onChange={e => {
                      const val = e.target.value;
                      setNewOrg({
                        ...newOrg, 
                        name: val, 
                        slug: val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-')
                      });
                    }}
                    placeholder="Ex: Imobiliária Alpha"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block pl-1">Link interno (Slug)</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono text-xs"
                    value={newOrg.slug}
                    onChange={e => setNewOrg({ ...newOrg, slug: e.target.value })}
                    placeholder="imobiliaria-alpha"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                 <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-[2px] mb-4">Dados do Administrador</h3>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block pl-1">Nome do Admin</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                    value={newOrg.adminName}
                    onChange={e => setNewOrg({...newOrg, adminName: e.target.value})}
                    placeholder="Responsavel pelo CRM"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block pl-1">E-mail do Admin</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    required
                    type="email"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                    value={newOrg.adminEmail}
                    onChange={e => setNewOrg({...newOrg, adminEmail: e.target.value})}
                    placeholder="admin@cliente.com.br"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block pl-1">Telefone do Admin</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    required
                    type="tel"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                    value={newOrg.adminPhone}
                    onChange={e => setNewOrg({...newOrg, adminPhone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block pl-1">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    required
                    className="w-full pl-12 pr-12 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono"
                    value={newOrg.adminPassword}
                    onChange={e => setNewOrg({...newOrg, adminPassword: e.target.value})}
                    placeholder="Senha forte"
                  />
                  <button 
                    type="button"
                    onClick={generatePassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg text-blue-500 transition-colors"
                    title="Gerar senha forte"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block pl-1">Plano SaaS</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={newOrg.plan}
                  onChange={e => {
                    const selectedPlan = availablePlans.find(p => p.name === e.target.value || p.id === e.target.value);
                    setNewOrg({
                      ...newOrg, 
                      plan: selectedPlan?.name || e.target.value,
                      planId: selectedPlan?.id || null
                    });
                  }}
                >
                  <option value="">Selecione um Plano</option>
                  {availablePlans.length > 0 ? (
                    availablePlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Free">Gratuito</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </>
                  )}
                </select>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg border-gray-300 text-primary focus:ring-primary"
                    checked={newOrg.isTestAccount}
                    onChange={e => setNewOrg({ ...newOrg, isTestAccount: e.target.checked })}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700">Conta de Teste</span>
                    <span className="text-[10px] text-gray-400">Para validação interna</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg border-gray-300 text-orange-500 focus:ring-orange-500"
                    checked={newOrg.betaAccess}
                    onChange={e => setNewOrg({ ...newOrg, betaAccess: e.target.checked })}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700">Acesso Beta</span>
                    <span className="text-[10px] text-gray-400">Recursos em desenvolvimento</span>
                  </div>
                </label>
              </div>

              <div className="md:col-span-2 flex gap-4 mt-8">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-primary/20"
                >
                  Provisionar Cliente
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Domain Registration Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Globe size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Domínio Personalizado</h2>
                <p className="text-xs text-gray-500">Para: {selectedOrg?.name}</p>
              </div>
            </div>

            <form onSubmit={handleDomainRegister} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Novo Domínio</label>
                <input 
                  required
                  placeholder="ex: mkt.cliente.com.br"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-2">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Atenção</p>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  Este processo cadastra a URL no Nexus360 para uso com Docker/Portainer.
                  Certifique-se que o DNS do dominio aponta para o servidor configurado.
                </p>
              </div>

              <div className="flex gap-4 mt-2">
                <button 
                  type="button" 
                  disabled={registeringDomain}
                  onClick={() => setShowDomainModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={registeringDomain}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {registeringDomain ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>Confirmar</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Edit Modal */}
      {isEditing && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Editar Agência</h2>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome da Agência</label>
                <input 
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Slug / Link</label>
                <input 
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono"
                  value={editData.slug}
                  onChange={e => setEditData({...editData, slug: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Plano</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary"
                  value={editData.planId || editData.plan}
                  onChange={e => {
                    const selectedPlan = availablePlans.find(p => p.id === e.target.value || p.name === e.target.value);
                    setEditData({
                      ...editData, 
                      plan: selectedPlan?.name || e.target.value,
                      planId: selectedPlan?.id || null
                    });
                  }}
                >
                  <option value="">Selecione um Plano</option>
                  {availablePlans.length > 0 ? (
                    availablePlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Free">Gratuito</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Domínio Personalizado</label>
                <input 
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono text-xs"
                  value={editData.domain || ''}
                  onChange={e => setEditData({...editData, domain: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '')})}
                  placeholder="crm.cliente.com.br"
                />
                {editData.slug && (
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">
                    URL interna: nexus360.consultio.com.br/<span className="text-blue-500 font-bold">{editData.slug}</span>
                  </p>
                )}
              </div>

              <div className="md:col-span-2 mt-4">
                 <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-[2px] mb-2">Dados de Acesso (Opcional)</h3>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">E-mail</label>
                <input 
                  type="email"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={editData.adminEmail || ''}
                  onChange={e => setEditData({...editData, adminEmail: e.target.value})}
                  placeholder="Novo e-mail"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Telefone</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={editData.adminPhone || ''}
                  onChange={e => setEditData({...editData, adminPhone: e.target.value})}
                  placeholder="Novo telefone"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nova Senha</label>
                <input 
                  type="password"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono"
                  value={editData.password || ''}
                  onChange={e => setEditData({...editData, password: e.target.value})}
                  placeholder="********"
                />
              </div>

              <div className="flex gap-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
