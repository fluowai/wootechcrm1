import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit3,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  X,
  Check,
  Loader2,
  Lock
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

const SYSTEM_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'agencies', label: 'Gestão de Clientes' },
  { id: 'crm', label: 'CRM e Funil' },
  { id: 'prospecting', label: 'Captação de Leads' },
  { id: 'finance', label: 'Financeiro' },
  { id: 'marketing', label: 'Marketing Ops' },
  { id: 'projects', label: 'Projetos e Tarefas' },
  { id: 'ai', label: 'Inteligência Artificial' }
];

export default function SystemTeam() {
  const [users, setUsers] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    email: '', 
    phone: '',
    role: 'USER', 
    password: '',
    organizationId: '',
    status: 'ACTIVE',
    permissions: {} as Record<string, boolean>
  });

  const fetchData = async () => {
    try {
      const [usersRes, orgsRes] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/orgs')
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (orgsRes.ok) setOrgs(await orgsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const method = formData.id ? 'PATCH' : 'POST';
      const url = formData.id ? `/api/admin/users/${formData.id}` : '/api/admin/users';
      const password = formData.password.trim();
      if (!formData.id && !password) {
        alert("Informe uma senha para o novo usuario");
        return;
      }
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
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
        permissions: formData.permissions,
        organizationId: formData.organizationId || null,
      };
      if (password) payload.password = password;
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar usuário");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    try {
      const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePermission = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: !prev.permissions[moduleId]
      }
    }));
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-sm text-gray-500">Gerencie todos os usuários do sistema e suas permissões.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: '', name: '', email: '', phone: '', role: 'USER', password: '', organizationId: '', status: 'ACTIVE', permissions: {} });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg"
        >
          <UserPlus size={20} />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="px-8 py-4">Usuário</th>
                <th className="px-4 py-4">Organização</th>
                <th className="px-4 py-4">Nível</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">Carregando...</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${u.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {u.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{u.name}</p>
                        <p className="text-[11px] text-gray-500">{u.email}</p>
                        {u.phone && <p className="text-[11px] text-gray-400">{u.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-medium text-gray-600">
                      {u.organization?.name || <span className="text-gray-400 italic">Global / Nexus360</span>}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      u.role === 'SUPER_ADMIN' ? 'bg-red-50 text-red-600' : 
                      u.role === 'ORG_ADMIN' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] font-bold uppercase ${u.status === 'ACTIVE' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {u.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setFormData({ 
                            ...u, 
                            password: '', 
                            phone: u.phone || '',
                            permissions: u.permissions || {},
                            organizationId: u.organizationId || ''
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">{formData.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                 <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dados Básicos</h3>
                 <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block pl-1">Nome</label>
                    <input 
                      required
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome completo"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block pl-1">E-mail</label>
                    <input 
                      required
                      type="email"
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="usuario@email.com"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block pl-1">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        required
                        type="tel"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block pl-1">Organização</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary"
                      value={formData.organizationId}
                      onChange={e => setFormData({...formData, organizationId: e.target.value})}
                    >
                      <option value="">Nenhuma (Super Admin / Global)</option>
                      {orgs.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block pl-1">Senha {formData.id && '(Opcional)'}</label>
                    <input 
                      required={!formData.id}
                      type="password"
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none border-none focus:ring-2 focus:ring-primary"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder="********"
                    />
                 </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                 <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <Shield size={12} /> Nível & Permissões
                 </h3>
                 
                 <div className="mb-4">
                    <label className="text-xs font-bold text-gray-700 mb-1 block pl-1">Função (Role)</label>
                    <select 
                      className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="USER">Usuário Comum</option>
                      <option value="ORG_ADMIN">Admin da Organização</option>
                      <option value="SUPER_ADMIN">Super Admin (Global)</option>
                    </select>
                 </div>

                 {formData.role === 'SUPER_ADMIN' || formData.role === 'ORG_ADMIN' ? (
                   <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                      <Shield className={formData.role === 'SUPER_ADMIN' ? 'text-red-500' : 'text-blue-500'} size={32} />
                      <p className="text-[11px] text-gray-500 font-medium">Administradores possuem acesso total ao contexto em que estão inseridos.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                      {SYSTEM_MODULES.map(mod => (
                        <label key={mod.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-primary transition-all">
                          <span className="text-xs font-bold text-gray-700">{mod.label}</span>
                          <input 
                            type="checkbox"
                            className="w-5 h-5 rounded-md text-primary border-gray-300 focus:ring-primary"
                            checked={!!formData.permissions[mod.id]}
                            onChange={() => togglePermission(mod.id)}
                          />
                        </label>
                      ))}
                   </div>
                 )}
              </div>

              <div className="md:col-span-2 flex gap-4 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-bold text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  <span>{formData.id ? "Salvar Alterações" : "Criar Usuário"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
