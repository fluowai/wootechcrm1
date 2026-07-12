import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wand2, 
  History, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Globe, 
  Layout, 
  ShoppingCart, 
  Monitor, 
  LayoutDashboard, 
  BrainCircuit, 
  Zap, 
  Megaphone, 
  Image as ImageIcon, 
  Search, 
  FileText,
  Copy,
  Download,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

// --- Tipos de Prompt Master ---
const PROMPT_TYPES = [
  { id: 'lp', icon: Globe, title: 'Landing Page', desc: 'Páginas de captura e vendas de alta conversão.' },
  { id: 'site', icon: Monitor, title: 'Site Institucional', desc: 'Sites profissionais para empresas e autoridades.' },
  { id: 'sales', icon: ShoppingCart, title: 'Página de Vendas', desc: 'Foco total em copy persuasiva e oferta.' },
  { id: 'saas', icon: Layout, title: 'Sistema / SaaS', desc: 'Arquitetura completa de software e dashboards.' },
  { id: 'crm', icon: LayoutDashboard, title: 'CRM / Dashboard', desc: 'Painéis de gestão, métricas e relatórios.' },
  { id: 'agent', icon: BrainCircuit, title: 'Agente de IA', desc: 'Prompts de sistema para agentes autônomos.' },
  { id: 'automation', icon: Zap, title: 'Automação', desc: 'Fluxos de trabalho e integrações inteligentes.' },
  { id: 'marketing', icon: Megaphone, title: 'Campanha Marketing', desc: 'Estratégia completa multicanal e funis.' },
  { id: 'creative', icon: ImageIcon, title: 'Criativo / Ads', desc: 'Variações de anúncios e direção de arte.' },
  { id: 'diagnosis', icon: Search, title: 'Diagnóstico Cliente', desc: 'Análise profunda de operação e marketing.' },
  { id: 'custom', icon: FileText, title: 'Personalizado', desc: 'Prompt livre para qualquer outra necessidade.' },
];

export default function PromptArchitect() {
  const [step, setStep] = useState(0); // 0 = Home, 1-6 = Wizard
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedServices, setSuggestedServices] = useState<string[]>([]);
  const [resultPrompt, setResultPrompt] = useState<string | null>(null);

  // Estados de Criação e Hospedagem de Site com IA
  const [isCreatingSite, setIsCreatingSite] = useState(false);
  const [siteCreationMessage, setSiteCreationMessage] = useState('');
  const [generatedSite, setGeneratedSite] = useState<{ id: string; slug: string; url: string } | null>(null);
  const [siteError, setSiteError] = useState<string | null>(null);

  const handleCreateSite = async () => {
    setIsCreatingSite(true);
    setSiteError(null);
    
    const messages = [
      "Desenhando a identidade visual da sua marca...",
      "Estruturando dobras estratégicas de alta conversão...",
      "Escrevendo copywriting persuasivo com Inteligência Artificial...",
      "Estilizando layout corporativo moderno...",
      "Publicando a página nos servidores seguros do Nexus360..."
    ];
    
    let currentMsgIdx = 0;
    setSiteCreationMessage(messages[0]);
    const msgInterval = setInterval(() => {
      currentMsgIdx = (currentMsgIdx + 1) % messages.length;
      setSiteCreationMessage(messages[currentMsgIdx]);
    }, 2500);

    try {
      const res = await apiFetch('/api/marketing/generate-lp-ia', {
        method: 'POST',
        body: JSON.stringify({
          companyName: formData.projectName,
          description: `${formData.niche} - ${formData.objective}`,
          targetAudience: formData.targetAudience,
          goal: formData.objective || `Geração de leads no nicho ${formData.niche}`,
          ctaText: 'Falar com Especialista',
          colorPrimary: '#2563eb',
          colorSecondary: '#1e40af',
          tone: formData.tone,
          sectionsCount: formData.pageSections || 6,
          services: formData.selectedServices.join(", ") || formData.structure.join(", ")
        })
      });

      clearInterval(msgInterval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha na criação do site");
      }

      const data = await res.json();
      setGeneratedSite({
        id: data.pageId,
        slug: data.slug,
        url: data.url
      });
    } catch (err: any) {
      clearInterval(msgInterval);
      console.error(err);
      setSiteError(err.message || "Não foi possível gerar e hospedar o site no momento.");
    } finally {
      setIsCreatingSite(false);
    }
  };

  // Estados do Formulário
  const [formData, setFormData] = useState({
    projectName: '',
    clientId: '',
    niche: '',
    targetAudience: '',
    pain: '',
    offer: '',
    objective: '',
    tone: 'Profissional',
    structure: [] as string[],
    designStyle: 'Moderno e clean',
    colors: '',
    advancedFeatures: [] as string[],
    pageSections: 8, // Número de dobras padrão
    selectedServices: [] as string[]
  });

  const handleNicheBlur = async () => {
    if (!formData.niche || formData.niche.length < 3) return;
    
    setIsSuggesting(true);
    try {
      const res = await apiFetch('/api/prompts/suggest-context', {
        method: 'POST',
        body: JSON.stringify({ niche: formData.niche })
      });
      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        targetAudience: data.icp || prev.targetAudience
      }));
      setSuggestedServices(data.services || []);
    } catch (error) {
      console.error("Erro ao sugerir contexto:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  // --- Renderizadores de Etapas ---
  
  if (step === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                <Wand2 size={32} />
              </div>
              Arquiteto de Prompts
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Crie prompts profissionais para sites, sistemas, campanhas e automações com IA.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all shadow-sm">
              <History size={20} />
              Ver Histórico
            </button>
            <button 
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus size={20} />
              Criar Novo Prompt
            </button>
          </div>
        </div>

        {/* Tipos de Prompt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PROMPT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id);
                setFormData(prev => ({ ...prev, promptType: type.id }));
                setStep(1);
              }}
              className="group p-6 bg-white border border-gray-100 rounded-3xl text-left hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <type.icon size={80} />
              </div>
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mb-4">
                <type.icon size={24} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{type.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStep(7); // Ir para tela de loading/resultado

    try {
      const res = await apiFetch('/api/prompts/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          promptType: PROMPT_TYPES.find(t => t.id === selectedType)?.title,
          selectedServices: formData.selectedServices,
          pageSections: formData.pageSections
        })
      });

      if (!res.ok) throw new Error("Falha na geração");
      
      const data = await res.json();
      setResultPrompt(data.prompt);
    } catch (error) {
      console.error(error);
      setResultPrompt("### ❌ Erro na Geração\nNão foi possível conectar ao motor de IA. Verifique suas chaves de API nas configurações.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Wizard Progress */}
      {step > 0 && step <= 6 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Etapa {step} de 6</span>
            <span className="text-sm font-medium text-gray-400">
              {step === 1 && "Tipo de Prompt"}
              {step === 2 && "Cliente e Contexto"}
              {step === 3 && "Estrutura"}
              {step === 4 && "Design e Estilo"}
              {step === 5 && "Recursos Avançados"}
              {step === 6 && "Revisão e Geração"}
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Wizard Content */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm min-h-[500px] flex flex-col relative overflow-hidden">
        
        {step === 7 && isGenerating && (
           <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-20">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                <Loader2 size={64} className="text-blue-600 animate-spin relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-gray-900">Arquiteto em Ação...</h3>
                <p className="text-gray-500 animate-pulse">Construindo seu Prompt Master com inteligência estratégica.</p>
              </div>
           </div>
        )}

        {step === 7 && !isGenerating && resultPrompt && (
          <div className="flex-1 space-y-8 animate-in zoom-in-95 duration-500">
            {isCreatingSite ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                  <Loader2 size={64} className="text-blue-600 animate-spin relative z-10" />
                </div>
                <div className="text-center space-y-2 animate-pulse">
                  <h3 className="text-2xl font-black text-gray-900">IA Criando e Hospedando seu Site...</h3>
                  <p className="text-gray-500 font-medium">{siteCreationMessage}</p>
                </div>
              </div>
            ) : generatedSite ? (
              <div className="space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-200">
                    <CheckCircle2 size={32} />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 leading-tight">Site Criado e Hospedado!</h2>
                  <p className="text-gray-500 max-w-lg mx-auto font-medium">
                    Sua Landing Page foi construída de forma estratégica e já está publicada nos servidores do Nexus360.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <span className="inline-block px-2.5 py-0.5 bg-green-50 border border-green-200 text-green-600 text-[10px] font-black rounded-full uppercase tracking-wider">ONLINE & HOSPEDADO</span>
                    <h4 className="font-bold text-gray-900 text-sm mt-1.5">{formData.projectName}</h4>
                    <p className="text-xs text-gray-400 font-mono">/lp/{generatedSite.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open(generatedSite.url, '_blank')}
                      className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <Globe size={16} />
                      Visitar Site
                    </button>
                    <button 
                      onClick={() => window.location.href = '/marketing/landing-pages'}
                      className="flex items-center gap-2 px-6 py-3.5 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <Layout size={16} />
                      Ir para Construtor
                    </button>
                  </div>
                </div>

                {/* Iframe Preview */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Visualização do Site no Ar</label>
                  <div className="border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white relative">
                    <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      <div className="flex-1 bg-white mx-10 rounded text-[10px] text-gray-400 py-1 text-center font-mono truncate">
                        https://nexus360.consultio.com.br/lp/{generatedSite.slug}
                      </div>
                    </div>
                    <iframe 
                      src={`/lp/${generatedSite.slug}`}
                      className="w-full h-[550px] border-none"
                      title="Preview da Landing Page"
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={() => {
                      setGeneratedSite(null);
                      setStep(0);
                    }}
                    className="px-10 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
                  >
                    Criar Novo Prompt
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Banner de Hospedagem em 1-Clique */}
                {(selectedType === 'lp' || selectedType === 'site' || selectedType === 'sales') && (
                  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 rounded-[2rem] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-white/10">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="space-y-2 max-w-xl">
                      <span className="inline-block px-3 py-1 bg-white/20 text-white text-[10px] font-black rounded-full uppercase tracking-wider">Hospedagem Nexus360</span>
                      <h3 className="text-2xl font-black tracking-tight">Hospedar e Publicar este Site no Nexus360!</h3>
                      <p className="text-sm text-blue-100 leading-relaxed font-medium">
                        Em vez de copiar o prompt, nossa IA integrada pode escrever todo o copywriting persuasivo, gerar o código estruturado da Landing Page e publicá-la automaticamente em 1-Clique nos seus servidores seguros!
                      </p>
                      {siteError && (
                        <div className="flex items-center gap-2 text-red-200 text-xs font-bold mt-2 bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-500/20">
                          <AlertCircle size={14} />
                          <span>{siteError}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleCreateSite}
                      className="flex items-center gap-3 px-8 py-5 bg-white text-blue-600 hover:text-blue-700 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-xl hover:scale-[1.03] active:scale-[0.98] shrink-0 cursor-pointer"
                    >
                      <Sparkles size={20} className="fill-blue-600 animate-pulse" />
                      Criar e Hospedar Site
                    </button>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">Prompt Master Pronto!</h2>
                    <p className="text-gray-500">Copie ou baixe o Markdown para usar em sua ferramenta de desenvolvimento.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(resultPrompt);
                        alert("Copiado!");
                      }}
                      className="p-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg cursor-pointer"
                    >
                      <Copy size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        const element = document.createElement("a");
                        const file = new Blob([resultPrompt], {type: 'text/markdown'});
                        element.href = URL.createObjectURL(file);
                        element.download = `prompt-master-${formData.projectName}.md`;
                        document.body.appendChild(element);
                        element.click();
                      }}
                      className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg cursor-pointer"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-[2rem] border border-gray-200 p-8 font-mono text-sm leading-relaxed overflow-y-auto max-h-[500px] whitespace-pre-wrap text-gray-800">
                  {resultPrompt}
                </div>

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={() => setStep(0)}
                    className="px-10 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    Criar Novo Prompt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step <= 6 && (
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* ETAPA 1: TIPO (Já selecionado ou para mudar) */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 leading-tight">O que deseja criar?</h2>
                      <p className="text-gray-500 mt-2">Escolha o tipo de projeto para orientar a IA corretamente.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PROMPT_TYPES.map(type => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={`p-5 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden ${selectedType === type.id ? 'border-blue-600 bg-blue-50/50 shadow-md scale-[1.02]' : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'}`}
                        >
                          {selectedType === type.id && (
                            <div className="absolute top-4 right-4 text-blue-600">
                              <CheckCircle2 size={20} />
                            </div>
                          )}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${selectedType === type.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>
                            <type.icon size={20} />
                          </div>
                          <div className="font-bold text-gray-900">{type.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ETAPA 2: CLIENTE E CONTEXTO */}
                {step === 2 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 leading-tight">Cliente e Contexto</h2>
                      <p className="text-gray-500 mt-2">Dê um nome ao projeto e defina o nicho para que a IA ajude na estratégia.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Nome do Projeto *</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Landing Page Advocacia Criminal"
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          value={formData.projectName}
                          onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 relative">
                        <label className="text-sm font-bold text-gray-700 ml-1">
                          Nicho / Setor *
                        </label>
                        <div className="relative group">
                          <input 
                            type="text" 
                            placeholder="Ex: Direito Previdenciário"
                            className={`w-full p-4 pr-32 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium ${isSuggesting ? 'border-blue-200' : 'border-gray-100'}`}
                            value={formData.niche}
                            onChange={(e) => setFormData({...formData, niche: e.target.value})}
                          />
                          <button
                            type="button"
                            disabled={isSuggesting || !formData.niche}
                            onClick={handleNicheBlur}
                            className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                          >
                            {isSuggesting ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                            SUGERIR
                          </button>
                        </div>
                      </div>

                      {/* Sugestão de Serviços Dinâmica */}
                      {(suggestedServices.length > 0 || isSuggesting) && (
                        <div className="md:col-span-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                           <label className="text-sm font-bold text-gray-700 ml-1">Serviços que o {formData.niche} realiza (Selecione):</label>
                           <div className="flex flex-wrap gap-2">
                              {isSuggesting ? (
                                [1,2,3,4,5].map(i => <div key={i} className="h-8 w-24 bg-gray-100 animate-pulse rounded-full"></div>)
                              ) : (
                                suggestedServices.map(service => (
                                  <button
                                    key={service}
                                    onClick={() => {
                                      const selected = formData.selectedServices.includes(service)
                                        ? formData.selectedServices.filter(s => s !== service)
                                        : [...formData.selectedServices, service];
                                      setFormData({...formData, selectedServices: selected});
                                    }}
                                    className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all flex items-center gap-2 ${formData.selectedServices.includes(service) ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-gray-100 text-gray-500 hover:border-gray-200 bg-white'}`}
                                  >
                                    {formData.selectedServices.includes(service) && <CheckCircle2 size={12}/>}
                                    {service}
                                  </button>
                                ))
                              )}
                           </div>
                        </div>
                      )}

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1 flex justify-between">
                          Público-Alvo e ICP
                          {isSuggesting && <span className="text-[10px] text-blue-600">Ajustando ICP...</span>}
                        </label>
                        <textarea 
                          rows={3}
                          placeholder="Descreva quem é o público principal..."
                          className={`w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-medium ${isSuggesting ? 'border-blue-200' : 'border-gray-100'}`}
                          value={formData.targetAudience}
                          onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Número de Dobras (Seções)</label>
                        <div className="flex items-center gap-3">
                           <input 
                             type="range" min="3" max="20"
                             className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                             value={formData.pageSections}
                             onChange={(e) => setFormData({...formData, pageSections: parseInt(e.target.value)})}
                           />
                           <span className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white font-bold rounded-xl shadow-lg">
                              {formData.pageSections}
                           </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Objetivo Principal do Prompt</label>
                        <textarea 
                          rows={2}
                          placeholder="Ex: Criar uma LP que foque na dor da lentidão processual..."
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-medium"
                          value={formData.objective}
                          onChange={(e) => setFormData({...formData, objective: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ETAPA 3: ESTRUTURA */}
                {step === 3 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 leading-tight">Estrutura do Projeto</h2>
                      <p className="text-gray-500 mt-2">Escolha os elementos fundamentais para compor o prompt.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {['Header', 'Hero Section', 'Benefícios', 'Serviços', 'Prova Social', 'Depoimentos', 'FAQ', 'Footer', 'Dashboard', 'Login', 'Admin Panel', 'Área do Cliente'].map(item => (
                        <button
                          key={item}
                          onClick={() => {
                            const items = formData.structure.includes(item) 
                              ? formData.structure.filter(i => i !== item)
                              : [...formData.structure, item];
                            setFormData({...formData, structure: items});
                          }}
                          className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all flex items-center gap-3 ${formData.structure.includes(item) ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' : 'border-gray-50 bg-gray-50/50 text-gray-500 hover:border-gray-200'}`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${formData.structure.includes(item) ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>
                            {formData.structure.includes(item) && <CheckCircle2 size={12} />}
                          </div>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ETAPA 4: DESIGN */}
                {step === 4 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 leading-tight">Design e Estilo</h2>
                      <p className="text-gray-500 mt-2">Defina a estética visual e a identidade do projeto.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Estilo Visual Principal</label>
                        <select 
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          value={formData.designStyle}
                          onChange={(e) => setFormData({...formData, designStyle: e.target.value})}
                        >
                          <option>Moderno e Clean</option>
                          <option>Premium / Luxo</option>
                          <option>Tech / Futurista</option>
                          <option>Corporativo / Sério</option>
                          <option>Dark Mode</option>
                          <option>Minimalista</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Paleta de Cores</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Azul escuro e Dourado / #000, #FFF"
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          value={formData.colors}
                          onChange={(e) => setFormData({...formData, colors: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Tom de Voz da Comunicação</label>
                        <div className="flex flex-wrap gap-2">
                          {['Profissional', 'Agressivo', 'Consultivo', 'Amigável', 'Luxuoso', 'Direto'].map(tone => (
                            <button
                              key={tone}
                              onClick={() => setFormData({...formData, tone})}
                              className={`px-5 py-2 rounded-full text-xs font-bold border-2 transition-all ${formData.tone === tone ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                            >
                              {tone}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ETAPA 5: RECURSOS */}
                {step === 5 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 leading-tight">Recursos Avançados</h2>
                      <p className="text-gray-500 mt-2">Adicione funcionalidades técnicas específicas ao prompt.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['Auth Supabase', 'Integração WhatsApp', 'Pagamento Stripe', 'Dashboards Gráficos', 'Multi-tenant', 'Exportação PDF/CSV', 'Filtros Avançados', 'SEO Otimizado', 'LGPD Compliance'].map(feature => (
                        <button
                          key={feature}
                          onClick={() => {
                            const features = formData.advancedFeatures.includes(feature) 
                              ? formData.advancedFeatures.filter(f => f !== feature)
                              : [...formData.advancedFeatures, feature];
                            setFormData({...formData, advancedFeatures: features});
                          }}
                          className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all flex items-center justify-between ${formData.advancedFeatures.includes(feature) ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' : 'border-gray-50 bg-gray-50/50 text-gray-500 hover:border-gray-200'}`}
                        >
                          {feature}
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.advancedFeatures.includes(feature) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                            {formData.advancedFeatures.includes(feature) && <CheckCircle2 size={12} />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ETAPA 6: REVISÃO */}
                {step === 6 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 leading-tight">Revisar e Gerar</h2>
                      <p className="text-gray-500 mt-2">Tudo pronto para criar o seu Prompt Master.</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-400 font-bold block">Projeto</span> <span className="text-gray-900 font-bold">{formData.projectName}</span></div>
                        <div><span className="text-gray-400 font-bold block">Tipo</span> <span className="text-gray-900 font-bold">{PROMPT_TYPES.find(t => t.id === selectedType)?.title}</span></div>
                        <div><span className="text-gray-400 font-bold block">Nicho</span> <span className="text-gray-900 font-bold">{formData.niche}</span></div>
                        <div><span className="text-gray-400 font-bold block">Tom</span> <span className="text-gray-900 font-bold">{formData.tone}</span></div>
                      </div>
                      <div className="pt-4 border-t border-gray-200">
                        <span className="text-gray-400 font-bold text-sm block mb-2">Estrutura selecionada</span>
                        <div className="flex flex-wrap gap-2">
                          {formData.structure.map(s => <span key={s} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600">{s}</span>)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-600/5 p-6 rounded-[2rem] border border-blue-100 flex items-start gap-4">
                      <div className="p-3 bg-blue-600 text-white rounded-2xl">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-blue-900">Motor de IA pronto</h4>
                        <p className="text-sm text-blue-700/80 leading-relaxed">Nossa IA vai consolidar todas as suas escolhas em um Prompt Master estruturado em Markdown, pronto para ser usado no Cursor, Antigravity ou Lovable.</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        
        {/* Navigation Buttons */}
        {step <= 6 && (
          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center">
            <button 
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-2 px-8 py-3 text-gray-400 font-bold hover:text-gray-900 transition-all disabled:opacity-0"
            >
              <ChevronLeft size={20} />
              Voltar
            </button>
            
            <div className="flex gap-4">
               {step < 6 ? (
                 <button 
                  onClick={nextStep}
                  disabled={!selectedType || (step === 2 && !formData.projectName)}
                  className="flex items-center gap-2 px-10 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-30 disabled:scale-95"
                >
                  Próximo Passo
                  <ChevronRight size={20} />
                </button>
               ) : (
                <button 
                  onClick={handleGenerate}
                  className="flex items-center gap-3 px-12 py-5 bg-blue-600 text-white font-black rounded-[2rem] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/25 active:scale-95 group"
                >
                  <Sparkles size={24} className="group-hover:animate-pulse" />
                  Gerar Prompt com IA
                </button>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


