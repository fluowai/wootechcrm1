import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Cpu, 
  Key, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Brain,
  ShieldCheck,
  Globe,
  Search,
  Database
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

type AiModel = {
  id: string;
  displayName: string;
  modelId: string;
  provider: string;
  runtime: string;
  isSelfHosted: boolean;
  creditCost: number;
};

const AISettings: React.FC = () => {
  const [settings, setSettings] = useState({
    geminiKey: '',
    groqKey: '',
    serperApiKey: '',
    outscraperKey: '',
    togetherKey: '',
    aiProvider: 'gemini'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiFetch('/api/org/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          geminiKey: data.geminiKey || '',
          groqKey: data.groqKey || '',
          serperApiKey: data.serperApiKey || '',
          outscraperKey: data.outscraperKey || '',
          togetherKey: data.togetherKey || '',
          aiProvider: data.aiProvider || 'gemini'
        });
      }
      const modelsResponse = await apiFetch('/api/ai/available-models?capability=chat');
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        setModels(modelsData.models || []);
      }
    } catch (error) {
      console.error("Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await apiFetch('/api/org/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Configurações de API e IA atualizadas!' });
      } else {
        throw new Error();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Carregando configurações...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <header>
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Configurações de I.A. & Prospecção</h1>
        <p className="text-gray-500">Gerencie seus provedores de inteligência artificial e conectores de dados.</p>
      </header>

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-100/50">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-950">Modelos disponiveis no seu plano</h2>
            <p className="text-sm font-medium text-gray-500">LLMs auto-hospedadas e provedores externos liberados pela sua assinatura.</p>
          </div>
          <Cpu className="text-emerald-600" size={24} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {models.map((model) => (
            <div key={model.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-gray-500">{model.provider}</span>
                {model.isSelfHosted && <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-black uppercase text-gray-600">desativado</span>}
              </div>
              <p className="font-black text-gray-950">{model.displayName}</p>
              <p className="mt-1 text-xs font-medium text-gray-500">{model.modelId}</p>
              <p className="mt-3 text-xs font-bold text-gray-600">{model.creditCost} credito/base</p>
            </div>
          ))}
          {models.length === 0 && <p className="text-sm font-bold text-gray-400">Nenhum modelo retornado para este plano.</p>}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gemini Card */}
        <div className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${settings.aiProvider === 'gemini' ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100' : 'border-gray-100 bg-white hover:border-gray-200'}`}
             onClick={() => setSettings({...settings, aiProvider: 'gemini'})}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${settings.aiProvider === 'gemini' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Brain size={24} />
            </div>
            {settings.aiProvider === 'gemini' && <CheckCircle size={20} className="text-blue-500" />}
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Google Gemini</h3>
          <p className="text-xs text-gray-500 leading-relaxed">Modelo 1.5 Flash. Ideal para custo zero e alta velocidade.</p>
        </div>

        {/* Groq Card */}
        <div className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${settings.aiProvider === 'groq' ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100' : 'border-gray-100 bg-white hover:border-gray-200'}`}
             onClick={() => setSettings({...settings, aiProvider: 'groq'})}>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${settings.aiProvider === 'groq' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Zap size={24} />
            </div>
            {settings.aiProvider === 'groq' && <CheckCircle size={20} className="text-orange-500" />}
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Groq (Llama 3)</h3>
          <p className="text-xs text-gray-500 leading-relaxed">Inferência ultrarrápida. Excelente para scripts e diagnósticos.</p>
        </div>

        {/* Info Card */}
        <div className="p-6 rounded-3xl bg-slate-900 text-white flex flex-col justify-center relative overflow-hidden">
          <Globe size={32} className="text-blue-400 mb-4 relative z-10" />
          <p className="text-xs text-slate-300 leading-relaxed relative z-10 font-medium">
            Seus agentes usarão automaticamente o provedor selecionado para todas as tarefas do Método A.C.P.
          </p>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-100/50 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* AI Section */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Provedores de IA</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Key size={16} className="text-blue-500" />
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gemini API Key</label>
              </div>
              <input 
                type="password"
                placeholder="Cole sua chave do Google AI Studio"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                value={settings.geminiKey}
                onChange={e => setSettings({...settings, geminiKey: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Key size={16} className="text-orange-500" />
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Groq API Key</label>
              </div>
              <input 
                type="password"
                placeholder="Cole sua chave do Groq Console"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-mono text-sm"
                value={settings.groqKey}
                onChange={e => setSettings({...settings, groqKey: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Key size={16} className="text-purple-600" />
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Together AI Key (Geração de Imagens)</label>
              </div>
              <input 
                type="password"
                placeholder="Cole sua chave do Together AI (FLUX)"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm"
                value={settings.togetherKey}
                onChange={e => setSettings({...settings, togetherKey: e.target.value})}
              />
              <p className="text-[10px] text-gray-400">Usado para gerar artes visuais no plano de execução ACP via modelo FLUX.</p>
            </div>
          </div>

          {/* Prospecting Section */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Motores de Prospecção</h4>

            <div className="space-y-2">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Serper.dev Key (Google Places)</label>
                <input 
                  type="password"
                  placeholder="Sua chave Serper.dev"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
                  value={settings.serperApiKey}
                  onChange={e => setSettings({...settings, serperApiKey: e.target.value})}
                />
                <p className="text-[10px] text-gray-400">Obtenha sua chave em <a href="https://serper.dev" target="_blank" rel="noreferrer" className="text-primary hover:underline">serper.dev</a></p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Database size={16} className="text-purple-500" />
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Outscraper Key (Deep Data)</label>
              </div>
              <input 
                type="password"
                placeholder="Sua chave Outscraper"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm"
                value={settings.outscraperKey}
                onChange={e => setSettings({...settings, outscraperKey: e.target.value})}
              />
            </div>
          </div>
        </div>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
          >
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold">{message.text}</span>
          </motion.div>
        )}

        <div className="pt-4 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="p-2 bg-gray-50 rounded-lg">
              <ShieldCheck size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Segurança de Dados</span>
              <span className="text-xs text-gray-400">Suas chaves são criptografadas e nunca compartilhadas.</span>
            </div>
          </div>
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className="w-full md:w-auto bg-gray-900 text-white px-10 py-5 rounded-[20px] font-bold flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={20} />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
