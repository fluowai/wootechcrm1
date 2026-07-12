import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  FileText, 
  Sparkles, 
  Plus, 
  Mail, 
  Shield, 
  Trash2, 
  Save, 
  Upload,
  Globe,
  Phone,
  MapPin,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";
import DomainSettings from "./DomainSettings";

export default function Settings() {
  const [activeTab, setActiveTab] = useState('agencia');
  const [loading, setLoading] = useState(false);
  
  // States
  const [agencyData, setAgencyData] = useState({
    corporateName: '', tradeName: '', cnpj: '', email: '', phone: '', website: '', address: '', city: '', state: '',
    groqKey: '', serpApiKey: '', serperApiKey: '', outscraperKey: ''
  });
  const [team, setTeam] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const orgRes = await apiFetch('/api/org/profile');
      if (orgRes.ok) {
        const data = await orgRes.json();
        setAgencyData(data);
      }

      const teamRes = await apiFetch('/api/org/team');
      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeam(data);
      }

      const templatesRes = await apiFetch('/api/org/templates');
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const TABS = [
    { id: 'agencia', label: 'Dados da Agência', icon: Building2 },
    { id: 'equipe', label: 'Gestão de Equipe', icon: Users },
    { id: 'modelos', label: 'Modelos de Contrato', icon: FileText },
    { id: 'dominios', label: 'Domínios', icon: Globe },
    { id: 'ia', label: 'Conectores & IA', icon: Sparkles },
  ];

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Configurações da Agência</h1>
        <p className="text-gray-500">Gerencie sua operação, equipe e inteligência contratual.</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 flex-1 overflow-y-auto custom-scrollbar"
          >
            {activeTab === 'agencia' && <AgencyTab data={agencyData} setData={setAgencyData} />}
            {activeTab === 'equipe' && <TeamTab team={team} onRefresh={fetchSettings} />}
            {activeTab === 'modelos' && <TemplatesTab templates={templates} onRefresh={fetchSettings} />}
            {activeTab === 'dominios' && <DomainSettings />}
            {activeTab === 'ia' && <IATab data={agencyData} setData={setAgencyData} onSave={fetchSettings} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AgencyTab({ data, setData }: any) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/org/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      alert("Dados salvos com sucesso!");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2 space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Razão Social</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-3 text-gray-400" size={18} />
            <input className="modal-input pl-12" value={data.corporateName} onChange={e => setData({...data, corporateName: e.target.value})} placeholder="Nexus Marketing LTDA" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CNPJ</label>
          <input className="modal-input" value={data.cnpj} onChange={e => setData({...data, cnpj: e.target.value})} placeholder="00.000.000/0000-00" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3 text-gray-400" size={18} />
            <input className="modal-input pl-12" value={data.email} onChange={e => setData({...data, email: e.target.value})} placeholder="contato@agencia.com" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-3 text-gray-400" size={18} />
            <input className="modal-input pl-12" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} placeholder="(11) 99999-9999" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Website</label>
          <div className="relative">
            <Globe className="absolute left-4 top-3 text-gray-400" size={18} />
            <input className="modal-input pl-12" value={data.website} onChange={e => setData({...data, website: e.target.value})} placeholder="www.agencia.com" />
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Endereço Completo</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-3 text-gray-400" size={18} />
            <input className="modal-input pl-12" value={data.address} onChange={e => setData({...data, address: e.target.value})} placeholder="Rua das Agências, 123" />
          </div>
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 shadow-lg shadow-blue-100 transition-all">
        {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}
      </button>
    </div>
  );
}

function TeamTab({ team, onRefresh }: any) {
  const [inviting, setInviting] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Membros da Equipe</h3>
          <p className="text-sm text-gray-500">Pessoas com acesso ao painel da sua agência.</p>
        </div>
        <button onClick={() => setInviting(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-black transition-all">
          <Plus size={16} /> Convidar Membro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((user: any) => (
          <div key={user.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary font-black shadow-sm">
                {user.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{user.name}</h4>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{user.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Mail size={14} />
              {user.email}
            </div>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Editar</button>
              <button className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-all"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatesTab({ templates, onRefresh }: any) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await apiFetch('/api/org/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: file.name.split('.')[0],
          content: `Conteúdo extraído do arquivo ${file.name} (Simulação)`,
          category: 'Padrão Agência'
        })
      });
      onRefresh();
      alert("Modelo enviado com sucesso!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este modelo?")) return;
    try {
      const response = await apiFetch(`/api/org/templates/${id}`, { method: 'DELETE' });
      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".doc,.docx,.pdf"
        onChange={handleUpload}
      />
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Modelos de Contrato</h3>
          <p className="text-sm text-gray-500">Suba até 4 modelos (Word/PDF) para treinamento da IA.</p>
        </div>
        <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase">
          {templates.length} / 4 Utilizados
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[0, 1, 2, 3].map(idx => {
          const template = templates[idx];
          return (
            <div key={idx} className={`p-8 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all ${
              template ? 'bg-white border-blue-100 shadow-xl shadow-blue-50/50' : 'bg-gray-50 border-gray-200 hover:border-primary/40 cursor-pointer'
            }`}
            onClick={() => !template && fileInputRef.current?.click()}
            >
              {template ? (
                <>
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <FileText size={32} />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900">{template.name}</h4>
                    <p className="text-xs text-gray-500">Modelo pronto para uso com IA</p>
                  </div>
                  <div className="flex gap-2 w-full mt-4">
                    <button className="flex-1 py-3 rounded-2xl bg-gray-50 text-[10px] font-black uppercase hover:bg-gray-100 transition-all">Visualizar</button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                      className="p-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-gray-400">Novo Modelo</h4>
                    <p className="text-xs text-gray-400">Clique para subir Word ou PDF</p>
                  </div>
                  <button className="mt-4 bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-100 pointer-events-none">
                    Upload Arquivo
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IATab({ data, setData, onSave }: any) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/org/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          groqKey: data.groqKey,
          serpApiKey: data.serpApiKey,
          serperApiKey: data.serperApiKey,
          outscraperKey: data.outscraperKey,
        })
      });
      alert("Configurações de API salvas!");
      onSave();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="p-10 bg-slate-900 rounded-[40px] text-white relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-blue-400">
            <Sparkles size={32} />
            <span className="font-black text-xl tracking-tighter uppercase">Nexus AI & Prospecting</span>
          </div>
          <h3 className="text-4xl font-black leading-tight">Conectores de API</h3>
          <p className="text-slate-400 text-lg">Configure suas próprias chaves para captação de leads e inteligência artificial.</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[120px] rounded-full -mr-20 -mt-20" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Groq API Key (IA)</label>
          <input 
            type="password"
            className="modal-input bg-gray-50" 
            value={data.groqKey || ''} 
            onChange={e => setData({...data, groqKey: e.target.value})} 
            placeholder="gsk_..." 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Serper.dev Key (Google Places)</label>
          <input 
            type="password"
            className="modal-input bg-gray-50" 
            value={data.serperApiKey || ''} 
            onChange={e => setData({...data, serperApiKey: e.target.value})} 
            placeholder="Sua chave Serper.dev" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Outscraper Key (Deep Data)</label>
          <input 
            type="password"
            className="modal-input bg-gray-50" 
            value={data.outscraperKey || ''} 
            onChange={e => setData({...data, outscraperKey: e.target.value})} 
            placeholder="Sua chave Outscraper" 
          />
        </div>
      </div>

      <button 
        onClick={handleSave} 
        disabled={saving} 
        className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 shadow-xl shadow-blue-100 transition-all"
      >
        {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Conectores</>}
      </button>
    </div>
  );
}