import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PremiumTemplate, LandingTheme } from './PremiumTemplate';
import { Save, Eye, Edit3, Type, Image as ImageIcon, MessageSquare, Palette, Layout, Sparkles, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../../lib/api';

const LandingEditor = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get('id');
  const initialTheme = (searchParams.get('theme') as LandingTheme) || 'ancora';

  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [config, setConfig] = useState<{
    theme: LandingTheme;
    firmName: string;
    heroTitle: string;
    heroSubtitle: string;
    ctaText: string;
    whatsappNumber: string;
  }>({
    theme: initialTheme,
    firmName: "CARREGANDO...",
    heroTitle: "Carregando título...",
    heroSubtitle: "Carregando descrição...",
    ctaText: "Solicitar Atendimento",
    whatsappNumber: "5511999999999"
  });

  useEffect(() => {
    if (id) {
      fetchPageData();
    }
  }, [id]);

  const fetchPageData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/marketing/landing-pages`);
      const pages = await res.json();
      const page = pages.find((p: any) => p.id === id);
      
      if (page) {
        // Tentar extrair dados do JSON salvo ou usar o que tem
        let savedConfig = {};
        try {
          if (page.config) {
            savedConfig = JSON.parse(page.config);
          }
        } catch (e) {
          console.error("Erro ao parsear config:", e);
        }

        setConfig({
          theme: initialTheme, // Priorizar o do URL ou do banco
          firmName: page.name.replace('LP - ', ''),
          heroTitle: page.headline || "Título Premium",
          heroSubtitle: page.subheadline || "Subtítulo detalhado da sua oferta.",
          ctaText: "Solicitar Atendimento",
          whatsappNumber: "5511999999999",
          ...savedConfig
        });
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: `LP - ${config.firmName}`,
        headline: config.heroTitle,
        subheadline: config.heroSubtitle,
        // No futuro podemos salvar o HTML gerado aqui também
        // Mas por enquanto salvamos a config para re-renderizar
        config: JSON.stringify(config)
      };

      const res = await apiFetch(`/api/marketing/landing-pages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações.");
    }
    setSaving(false);
  };

  const themes: { id: LandingTheme; label: string; color: string }[] = [
    { id: 'ancora', label: 'Âncora Clean (Verde)', color: 'bg-[#2e7d32]' },
    { id: 'executive', label: 'Executive Gold (Black)', color: 'bg-[#000000]' },
    { id: 'modern', label: 'Modern Security (Blue)', color: 'bg-[#0f172a]' },
    { id: 'prestige', label: 'Prestige Agility (Navy)', color: 'bg-[#1e293b]' },
    { id: 'elegance', label: 'Elegance Strategy (Wine)', color: 'bg-[#4a0404]' }
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500 font-medium">Carregando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Editor Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/landing-pages')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-none mb-1">Editor Premium</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{config.theme} Style active</p>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200">
          <button 
            onClick={() => setView('edit')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${view === 'edit' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Edit3 size={16} /> Editar
          </button>
          <button 
            onClick={() => setView('preview')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${view === 'preview' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Eye size={16} /> Preview
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${saveSuccess ? 'bg-green-500 text-white shadow-green-100' : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'}`}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : (saveSuccess ? <CheckCircle size={18} /> : <Save size={18} />)}
            {saving ? 'Salvando...' : (saveSuccess ? 'Salvo!' : 'Salvar Alterações')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <aside className={`w-96 bg-white border-r border-gray-200 overflow-y-auto transition-all custom-scrollbar ${view === 'preview' ? '-ml-96' : 'ml-0'}`}>
          <div className="p-8 space-y-10">
            {/* Section: Theme Selection */}
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-6">
                <Palette size={18} />
                <h3 className="font-bold text-xs uppercase tracking-widest">Estilo Visual</h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setConfig(prev => ({ ...prev, theme: t.id }))}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${config.theme === t.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${t.color} shadow-sm`}></div>
                      <span className={`text-sm font-bold ${config.theme === t.id ? 'text-indigo-900' : 'text-gray-600'}`}>{t.label}</span>
                    </div>
                    {config.theme === t.id && <CheckCircle size={16} className="text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Section: Branding */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-indigo-600 mb-6">
                <Type size={18} />
                <h3 className="font-bold text-xs uppercase tracking-widest">Conteúdo Principal</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Nome da Empresa</label>
                  <input 
                    name="firmName"
                    value={config.firmName}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Título do Hero</label>
                  <textarea 
                    name="heroTitle"
                    value={config.heroTitle}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Subtítulo</label>
                  <textarea 
                    name="heroSubtitle"
                    value={config.heroSubtitle}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Section: CTA */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-indigo-600 mb-6">
                <MessageSquare size={18} />
                <h3 className="font-bold text-xs uppercase tracking-widest">Contato & Botões</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Texto do Botão</label>
                  <input 
                    name="ctaText"
                    value={config.ctaText}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Número WhatsApp</label>
                  <input 
                    name="whatsappNumber"
                    value={config.whatsappNumber}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Live Preview Area */}
        <main className="flex-1 bg-slate-100 overflow-y-auto p-12 flex justify-center custom-scrollbar">
          <div className={`transition-all duration-700 bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[2.5rem] overflow-hidden ${view === 'edit' ? 'max-w-5xl scale-95 origin-top' : 'max-w-full w-full'}`}>
            <div className="h-10 bg-gray-50 border-b border-gray-100 flex items-center px-6 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/30"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400/30"></div>
              <div className="w-3 h-3 rounded-full bg-green-400/30"></div>
              <div className="ml-6 bg-white/80 border border-gray-200 px-6 py-1 rounded-full text-[10px] text-gray-400 font-bold tracking-widest uppercase">nexus360.ai/preview/{id}</div>
            </div>
            <div className="relative h-[calc(100%-40px)] overflow-y-auto custom-scrollbar">
              <PremiumTemplate config={config} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LandingEditor;
