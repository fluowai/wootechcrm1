import { useState, useEffect } from "react";
import { Users, Mail, Phone, Shield, Plus, Loader2, X, Check, Lock, Settings } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { menuGroups } from "../../lib/appNavigation";

interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  accessProfileId?: string;
  accessProfile?: { name: string };
}

interface AccessProfile {
  id: string;
  name: string;
  description: string;
  permissions: any;
  _count: { users: number };
}

const AVAILABLE_MODULES = Array.from(
  menuGroups.reduce((map, group) => {
    group.items.forEach((item) => {
      if (!map.has(item.module)) {
        map.set(item.module, { id: item.module, label: item.label, category: group.label });
      }
    });
    (group.children || []).forEach((child) => {
      if (!map.has(child.module)) {
        map.set(child.module, { id: child.module, label: child.label, category: group.label });
      }
    });
    return map;
  }, new Map<string, { id: string; label: string; category: string }>())
).map(([, value]) => value);

const PERMISSION_ACTIONS = [
  { id: 'view', label: 'Visualizar' },
  { id: 'create', label: 'Criar' },
  { id: 'edit', label: 'Editar' },
  { id: 'delete', label: 'Excluir' },
  { id: 'manage', label: 'Gerenciar' },
];

export default function Team() {
  const [activeTab, setActiveTab] = useState<'members' | 'plans'>('members');
  
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Forms state
  const [memberForm, setMemberForm] = useState({ id: '', name: '', email: '', phone: '', role: 'USER', accessProfileId: '', password: '' });
  const [profileForm, setProfileForm] = useState<{id: string, name: string, description: string, permissions: Record<string, string[]>}>({
    id: '', name: '', description: '', permissions: {}
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Usando as rotas corretas (team e access-profiles)
      const [membersRes, profilesRes] = await Promise.all([
        apiFetch('/api/team/members'),
        apiFetch('/api/access-profiles')
      ]);
      const membersData = await membersRes.json();
      const profilesData = await profilesRes.json();
      setMembers(membersData);
      setProfiles(profilesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- MEMBER HANDLERS ---
  const validatePassword = (password: string) => {
    if (password.length < 10) return "A senha deve ter no minimo 10 caracteres.";
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return "A senha deve conter letras maiusculas, minusculas e numeros.";
    }
    return null;
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const password = memberForm.password.trim();
      if (!memberForm.id && !password) {
        alert("Informe uma senha temporaria para o novo usuario.");
        return;
      }
      if (password) {
        const passwordError = validatePassword(password);
        if (passwordError) {
          alert(passwordError);
          return;
        }
      }

      if (memberForm.id) {
        const payload: Record<string, any> = {
          name: memberForm.name,
          email: memberForm.email,
          phone: memberForm.phone,
          role: memberForm.role,
          accessProfileId: memberForm.accessProfileId || null
        };
        if (password) payload.password = password;

        const res = await apiFetch(`/api/team/members/${memberForm.id}/permissions`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Erro ao atualizar usuario");
          return;
        }
        // Se houver necessidade de atualizar outros dados (como status ou permissões manuais), também manda. 
        // Assumindo que criamos a rota flexível no backend.
      } else {
        // Cria
        const res = await apiFetch('/api/team/members', {
          method: 'POST',
          body: JSON.stringify({
            name: memberForm.name,
            email: memberForm.email,
            phone: memberForm.phone,
            password,
            role: memberForm.role,
            accessProfileId: memberForm.accessProfileId || null
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Erro ao criar usuario");
          return;
        }
      }
      setIsMemberModalOpen(false);
      setMemberForm({ id: '', name: '', email: '', phone: '', role: 'USER', accessProfileId: '', password: '' });
      fetchData();
    } catch (error) {
      console.error("Error saving member:", error);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Remover este membro da equipe?")) return;
    try {
      await apiFetch(`/api/team/members/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  // --- PROFILE HANDLERS ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (profileForm.id) {
        await apiFetch(`/api/access-profiles/${profileForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(profileForm)
        });
      } else {
        await apiFetch('/api/access-profiles', {
          method: 'POST',
          body: JSON.stringify(profileForm)
        });
      }
      setIsProfileModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm("Excluir este plano de acesso?")) return;
    try {
      const res = await apiFetch(`/api/access-profiles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Erro ao excluir.");
        return;
      }
      fetchData();
    } catch (error) {
      console.error("Error deleting profile:", error);
    }
  };

  const togglePermission = (module: string, action: string) => {
    setProfileForm(prev => {
      const perms = { ...prev.permissions };
      if (!perms[module]) perms[module] = [];
      if (perms[module].includes(action)) {
        perms[module] = perms[module].filter((a: string) => a !== action);
      } else {
        perms[module].push(action);
      }
      return { ...prev, permissions: perms };
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Equipe e Acessos</h1>
          <p className="text-gray-500">Gerencie sua equipe e defina o que cada membro pode acessar.</p>
        </div>
        <button 
          onClick={() => {
            if (activeTab === 'members') {
              setMemberForm({ id: '', name: '', email: '', phone: '', role: 'USER', accessProfileId: '', password: '' });
              setIsMemberModalOpen(true);
            } else {
              setProfileForm({ id: '', name: '', description: '', permissions: {} });
              setIsProfileModalOpen(true);
            }
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium shadow-md shadow-blue-200"
        >
          <Plus size={18} />
          <span>Adicionar {activeTab === 'members' ? 'Membro' : 'Plano'}</span>
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button 
          className={`pb-4 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('members')}
        >
          <div className="flex items-center gap-2"><Users size={18} /> Membros</div>
        </button>
        <button 
          className={`pb-4 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'plans' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('plans')}
        >
          <div className="flex items-center gap-2"><Lock size={18} /> Planos de Acesso</div>
        </button>
      </div>

      {activeTab === 'members' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m) => (
            <div key={m.id} className="glass-card flex flex-col items-center text-center p-8 relative">
              {m.role === 'ORG_ADMIN' && (
                <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-700 p-1 rounded-md">
                  <Shield size={16} />
                </div>
              )}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-50 p-1 border-2 border-primary/20 mb-4 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt="avatar" />
                </div>
              </div>
              
              <h3 className="font-bold text-lg text-gray-900">{m.name}</h3>
              <p className="text-sm text-primary font-medium mb-4">{m.accessProfile?.name || (m.role === 'ORG_ADMIN' ? 'Admin. Total' : 'Sem Plano')}</p>
              
              <div className="flex flex-col gap-3 w-full border-y border-gray-50 py-6 my-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2"><Mail size={14} /><span>{m.email}</span></div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2"><Phone size={14} /><span>{m.phone || 'Telefone pendente'}</span></div>
                </div>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <button 
                  onClick={() => {
                    setMemberForm({ ...m, phone: m.phone || '', password: '', accessProfileId: m.accessProfileId || '' });
                    setIsMemberModalOpen(true);
                  }}
                  className="flex-1 py-2 bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleDeleteMember(m.id)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((p) => (
            <div key={p.id} className="glass-card p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <Settings size={18} className="text-primary"/> {p.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{p.description || "Nenhuma descrição"}</p>
                </div>
                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md font-bold">
                  {p._count?.users || 0} usuários
                </span>
              </div>
              <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                <button 
                  onClick={() => {
                    setProfileForm({ ...p });
                    setIsProfileModalOpen(true);
                  }}
                  className="flex-1 py-2 bg-primary/10 text-primary text-sm font-semibold rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Editar Permissões
                </button>
                <button 
                  onClick={() => handleDeleteProfile(p.id)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  title="Excluir"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MEMBER MODAL */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">{memberForm.id ? "Editar" : "Novo"} Membro</h2>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome</label>
                <input required className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail</label>
                <input required type="email" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Telefone com DDD</label>
                <input required type="tel" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} placeholder="(11) 99999-9999" />
              </div>
              {(
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">{memberForm.id ? "Nova senha (opcional)" : "Senha temporaria forte"}</label>
                  <input required={!memberForm.id} type="password" placeholder="Minimo 10 caracteres, com maiuscula, minuscula e numero" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={memberForm.password} onChange={e => setMemberForm({...memberForm, password: e.target.value})} />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tipo de Usuário</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})}>
                  <option value="USER">Comum (Restrito)</option>
                  <option value="ORG_ADMIN">Administrador da Agência</option>
                </select>
              </div>
              {memberForm.role !== 'ORG_ADMIN' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Plano de Acesso</label>
                  <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={memberForm.accessProfileId} onChange={e => setMemberForm({...memberForm, accessProfileId: e.target.value})}>
                    <option value="">Nenhum (Acesso Mínimo)</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="submit" disabled={isSaving} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 mt-4">
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Check size={20}/>} Salvar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">{profileForm.id ? "Editar Plano" : "Novo Plano de Acesso"}</h2>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Nome do Plano</label>
                  <input required className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} placeholder="Ex: SDR, Closer, Gestor de Tráfego" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Descrição</label>
                  <input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} placeholder="Descrição curta do perfil" />
                </div>
              </div>

              <h3 className="font-bold text-gray-900 border-b pb-2 mb-4">Permissões Módulo a Módulo</h3>
              <div className="space-y-6">
                {AVAILABLE_MODULES.map(mod => {
                  const perms = profileForm.permissions[mod.id] || [];
                  return (
                    <div key={mod.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-3">
                      <div>
                        <span className="font-bold text-gray-800">{mod.label}</span>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">{mod.category}</span>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {PERMISSION_ACTIONS.map(action => (
                          <label key={action.id} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-600 select-none">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                              checked={perms.includes(action.id)}
                              onChange={() => togglePermission(mod.id, action.id)}
                            />
                            {action.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 mt-auto">
               <button onClick={handleSaveProfile} disabled={isSaving || !profileForm.name} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Check size={20}/>} Salvar Plano de Acesso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
