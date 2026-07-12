import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Rocket, Target, Users, Zap, ChevronRight, ArrowLeft,
  CheckCircle2, Sparkles, BrainCircuit, Building2, DollarSign,
  Phone, Calendar, Clock, AlertCircle, Package, RefreshCw,
  BarChart3, UserPlus, MessageSquare, Globe, FileText, Truck,
  Loader2, Briefcase, Plus, Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";

const steps = [
  { id: 1, title: "Introdução", icon: Rocket },
  { id: 2, title: "Seu Negócio", icon: Building2 },
  { id: 3, title: "Processo Comercial", icon: BarChart3 },
  { id: 4, title: "Time & Dores", icon: Users },
  { id: 5, title: "Experiências", icon: Briefcase },
  { id: 6, title: "Entrega", icon: Package },
];

interface StepData {
  businessName: string;
  businessType: string;
  servicesOffered: string;
  targetAudience: string;
  averageTicket: string;
  salesCycle: string;
  needsMeeting: boolean;
  needsProposal: boolean;
  needsContract: boolean;
  hasRecurrence: boolean;
  salesMotions: string[];
  leadChannels: string[];
  hasSdr: boolean;
  hasCloser: boolean;
  hasPostSales: boolean;
  painPoints: string;
  biggestProblem: string;
  deliveryProcess: string;
  hasOnboarding: boolean;
  hasChecklist: boolean;
  hasRenewal: boolean;
  hasUpsell: boolean;
}

interface ProfessionalExperienceForm {
  companyName: string;
  role: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface SavedExperience {
  id: string;
  companyName: string;
  role: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

const initialData: StepData = {
  businessName: "",
  businessType: "",
  servicesOffered: "Gestao de trafego pago\nCriacao de landing pages\nProspeccao ativa BDR\nQualificacao SDR\nFechamento closer\nCriativos e copies\nGestao de WhatsApp e follow-up\nCustomer Success e relatorios",
  targetAudience: "",
  averageTicket: "",
  salesCycle: "",
  needsMeeting: false,
  needsProposal: false,
  needsContract: false,
  hasRecurrence: false,
  salesMotions: [],
  leadChannels: [],
  hasSdr: false,
  hasCloser: false,
  hasPostSales: false,
  painPoints: "",
  biggestProblem: "",
  deliveryProcess: "",
  hasOnboarding: false,
  hasChecklist: false,
  hasRenewal: false,
  hasUpsell: false,
};

export default function OnboardingWizard() {
  const [showWhitelabelChoice, setShowWhitelabelChoice] = useState(true);
  const [convertingToWL, setConvertingToWL] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StepData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [experiences, setExperiences] = useState<SavedExperience[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(false);
  const [savingExperience, setSavingExperience] = useState(false);
  const [expForm, setExpForm] = useState<ProfessionalExperienceForm>({
    companyName: "", role: "", description: "", location: "",
    startDate: "", endDate: "", isCurrent: false,
  });
  const navigate = useNavigate();

  const handleConvertToWhitelabel = async () => {
    setConvertingToWL(true);
    try {
      const res = await apiFetch("/api/onboarding/convert-to-whitelabel", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("nexus_org_type", "WHITELABEL");
        navigate("/onboarding/whitelabel", { replace: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConvertingToWL(false);
    }
  };

  useEffect(() => {
    if (currentStep === 5) loadExperiences();
  }, [currentStep]);

  const nextStep = () => {
    if (currentStep === 2 && !saved) {
      saveStep2();
      return;
    }
    if (currentStep === 6) {
      saveAll();
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const saveStep2 = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/onboarding/start", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setSaved(true);
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/onboarding/start", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      navigate("/onboarding/preview");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const prevStepWithLoad = () => {
    const prev = Math.max(currentStep - 1, 1);
    if (prev === 5) loadExperiences();
    setCurrentStep(prev);
  };

  const goToStep = (step: number) => {
    if (step === 5) loadExperiences();
    setCurrentStep(step);
  };

  const loadExperiences = async () => {
    setLoadingExperiences(true);
    try {
      const res = await apiFetch("/api/onboarding/professional-experiences");
      const data = await res.json();
      if (data.success) setExperiences(data.experiences);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExperiences(false);
    }
  };

  const addExperience = async () => {
    if (!expForm.companyName || !expForm.role || !expForm.startDate) return;
    setSavingExperience(true);
    try {
      const res = await apiFetch("/api/onboarding/professional-experiences", {
        method: "POST",
        body: JSON.stringify(expForm),
      });
      const data = await res.json();
      if (data.success) {
        setExperiences(prev => [...prev, data.experience]);
        setExpForm({ companyName: "", role: "", description: "", location: "", startDate: "", endDate: "", isCurrent: false });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingExperience(false);
    }
  };

  const removeExperience = async (id: string) => {
    try {
      const res = await apiFetch(`/api/onboarding/professional-experiences/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) setExperiences(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      leadChannels: prev.leadChannels.includes(channel)
        ? prev.leadChannels.filter(c => c !== channel)
        : [...prev.leadChannels, channel],
    }));
  };

  const toggleSalesMotion = (motion: string) => {
    setFormData(prev => ({
      ...prev,
      salesMotions: prev.salesMotions.includes(motion)
        ? prev.salesMotions.filter(item => item !== motion)
        : [...prev.salesMotions, motion],
    }));
  };

  const businessTypes = [
    "Consultoria", "Agencia", "Servicos", "Industria",
    "Representacao Comercial", "SaaS", "Educacao", "Franquia", "Outro",
    "Software House", "Design", "Educação", "E-commerce",
  ];

  const leadChannelOptions = [
    "Instagram", "Facebook", "Google Ads", "Indicação",
    "WhatsApp", "LinkedIn", "Email Marketing", "Organic",
  ];

  const salesCycleOptions = [
    "Menos de 1 semana",
    "1-2 semanas",
    "2-4 semanas",
    "1-3 meses",
    "3+ meses",
  ];

  const salesMotionOptions = [
    "Recebo leads e vendo pelo WhatsApp",
    "Faco reunioes antes de vender",
    "Trabalho com propostas comerciais",
    "Tenho equipe de vendas",
    "Vendo servicos recorrentes",
    "Vendo produtos de alto ticket",
  ];

  return (
    <div className="min-h-screen bg-[#F6F7F8] text-slate-950 flex items-center justify-center p-4 font-sans overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/70 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/70 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                        <div className={`lg:col-span-4 space-y-8 hidden lg:block ${showWhitelabelChoice ? 'opacity-30' : ''}`}>
          <div className="mb-12">
            <div className="flex items-center gap-3 text-2xl font-black tracking-tighter italic">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-card text-white not-italic">N</div>
              NEXUS<span className="text-primary">360</span>
            </div>
          </div>
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-6 group">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500 border ${
                currentStep >= s.id ? "bg-primary border-primary text-white shadow-lg shadow-blue-100" : "bg-white border-gray-200 text-gray-400"
              }`}>
                {currentStep > s.id ? <CheckCircle2 size={24} /> : <s.icon size={24} />}
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${currentStep >= s.id ? "text-primary" : "text-gray-500"}`}>
                  Passo {s.id}
                </span>
                <span className={`font-bold text-lg transition-colors ${currentStep >= s.id ? "text-slate-950" : "text-gray-500"}`}>
                  {s.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 w-full">
          <motion.div
            layout
            className="bg-white rounded-lg p-8 lg:p-12 border border-gray-200 shadow-floating"
          >
            <AnimatePresence mode="wait">
              {showWhitelabelChoice && (
                <motion.div
                  key="wl-choice"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="w-20 h-20 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center mb-4 border border-purple-200">
                    <Building2 size={40} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black leading-tight text-slate-950">
                      Como deseja usar o Nexus360?
                    </h1>
                    <p className="text-gray-500 text-lg">
                      Escolha o perfil que melhor se encaixa no seu negócio.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <button
                      onClick={() => setShowWhitelabelChoice(false)}
                      className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                      <Building2 size={48} className="text-gray-400 group-hover:text-primary transition-colors" />
                      <div className="text-center">
                        <p className="text-xl font-black text-slate-950">Usar para meu negócio</p>
                        <p className="text-sm text-gray-500 mt-1">Configurar CRM, vendas e operação para minha própria empresa</p>
                      </div>
                    </button>
                    <button
                      onClick={handleConvertToWhitelabel}
                      disabled={convertingToWL}
                      className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-gray-200 bg-white hover:border-purple-500 hover:bg-purple-50/50 transition-all group disabled:opacity-50"
                    >
                      <Globe size={48} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                      <div className="text-center">
                        <p className="text-xl font-black text-slate-950">Sou uma Agência / Revenda</p>
                        <p className="text-sm text-gray-500 mt-1">Revender o sistema white label para meus clientes com minha marca</p>
                      </div>
                    </button>
                  </div>
                  {convertingToWL && (
                    <div className="flex items-center justify-center gap-2 text-purple-600 font-bold">
                      <Loader2 size={20} className="animate-spin" /> Configando ambiente White Label...
                    </div>
                  )}
                </motion.div>
              )}

              {!showWhitelabelChoice && currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4 border border-primary/20">
                    <Rocket size={40} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black leading-tight text-slate-950">
                      Vamos configurar seu negocio.
                    </h1>
                    <p className="text-gray-500 text-lg">
                      Em 5 passos, a IA do <span className="text-primary font-bold">Nexus360</span> entende seu modelo de negocio
                      e prepara pipelines, campos personalizados e processos iniciais para sua operacao.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-4 bg-primary text-white px-10 py-5 rounded-lg font-bold text-lg hover:bg-primary-hover transition-all shadow-card"
                  >
                    Começar Diagnóstico
                    <ChevronRight size={24} />
                  </button>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-4xl font-black">Identidade da Operação</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome da Empresa</label>
                      <input
                        placeholder="Ex: Nexus360"
                        className="w-full px-6 py-5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-primary focus:bg-white transition-all text-xl"
                        value={formData.businessName}
                        onChange={e => setFormData({...formData, businessName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tipo de Negócio</label>
                      <div className="grid grid-cols-2 gap-3">
                        {businessTypes.map(t => (
                          <button
                            key={t}
                            onClick={() => setFormData({...formData, businessType: t})}
                            className={`p-4 rounded-xl border-2 transition-all font-bold ${
                              formData.businessType === t ? "border-primary bg-primary/10 text-primary" : "border-gray-200 bg-white text-gray-600 hover:border-primary/40"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Público-Alvo</label>
                      <input
                        placeholder="Ex: Pequenos empresários de marketing"
                        className="w-full px-6 py-5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-xl"
                        value={formData.targetAudience}
                        onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Servicos que a Nexus deve executar</label>
                      <textarea
                        rows={6}
                        placeholder="Um servico por linha. Ex: Gestao de trafego pago, landing pages, BDR, SDR, closer..."
                        className="w-full px-6 py-5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-base resize-none"
                        value={formData.servicesOffered}
                        onChange={e => setFormData({...formData, servicesOffered: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ticket Médio (R$)</label>
                        <input
                          type="number"
                          placeholder="5000"
                          className="w-full px-6 py-5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-xl"
                          value={formData.averageTicket}
                          onChange={e => setFormData({...formData, averageTicket: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ciclo de Vendas</label>
                        <select
                          className="w-full px-6 py-5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-lg appearance-none"
                          value={formData.salesCycle}
                          onChange={e => setFormData({...formData, salesCycle: e.target.value})}
                        >
                          <option value="">Selecione</option>
                          {salesCycleOptions.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={prevStep} className="p-5 rounded-lg bg-white hover:bg-gray-50 transition-all border border-gray-200 text-gray-500">
                      <ArrowLeft size={24} />
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={!formData.businessName || !formData.businessType || !formData.targetAudience || saving}
                      className="flex-1 bg-primary text-white py-5 rounded-lg font-bold text-lg hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {saving ? <><Loader2 size={20} className="animate-spin" /> Salvando...</> : "Salvar & Continuar"}
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-4xl font-black">Processo Comercial</h2>
                    <p className="text-gray-500 mt-2">Como funciona seu fluxo de vendas hoje?</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Canais de Captação</label>
                      <div className="flex flex-wrap gap-2">
                        {leadChannelOptions.map(c => (
                          <button
                            key={c}
                            onClick={() => toggleChannel(c)}
                            className={`px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                              formData.leadChannels.includes(c)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg border border-gray-200 space-y-4">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Como voce vende?</label>
                      <div className="grid grid-cols-2 gap-3">
                        {salesMotionOptions.map(item => (
                          <button
                            key={item}
                            onClick={() => toggleSalesMotion(item)}
                            className={`p-4 rounded-xl border-2 transition-all text-left font-bold text-sm ${
                              formData.salesMotions.includes(item)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg border border-gray-200 space-y-4">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">O que acontece durante a venda?</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "needsMeeting", label: "Reunião de Descoberta", icon: Calendar },
                          { key: "needsProposal", label: "Envio de Proposta", icon: FileText },
                          { key: "needsContract", label: "Contrato Formal", icon: FileText },
                          { key: "hasRecurrence", label: "Receita Recorrente", icon: RefreshCw },
                        ].map(item => (
                          <button
                            key={item.key}
                            onClick={() => setFormData(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                              (formData as any)[item.key]
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40"
                            }`}
                          >
                            <item.icon size={18} />
                            <span className="font-bold text-sm">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={prevStep} className="p-5 rounded-lg bg-white text-gray-500 border border-gray-200">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={nextStep} className="flex-1 bg-primary text-white py-5 rounded-lg font-bold text-lg hover:bg-primary-hover transition-all">
                      Continuar
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-4xl font-black">Time & Dores</h2>
                    <p className="text-gray-500 mt-2">Conte-nos sobre sua equipe e desafios.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Funções no Time</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { key: "hasSdr", label: "SDR", desc: "Geração" },
                          { key: "hasCloser", label: "Closer", desc: "Fechamento" },
                          { key: "hasPostSales", label: "Pós-Vendas", desc: "Sucesso" },
                        ].map(item => (
                          <button
                            key={item.key}
                            onClick={() => setFormData(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                            className={`flex flex-col items-center gap-2 p-5 rounded-lg border transition-all ${
                              (formData as any)[item.key]
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40"
                            }`}
                          >
                            <UserPlus size={24} />
                            <span className="font-bold text-sm">{item.label}</span>
                            <span className="text-[10px] text-gray-500">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Principais Dores</label>
                      <textarea
                        placeholder="Ex: Dificuldade em organizar leads, processo manual de propostas..."
                        className="w-full px-6 py-5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-lg min-h-[100px] resize-none"
                        value={formData.painPoints}
                        onChange={e => setFormData({...formData, painPoints: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Maior Desafio</label>
                      <textarea
                        placeholder="Ex: Escalar vendas sem aumentar headcount"
                        className="w-full px-6 py-5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-lg min-h-[80px] resize-none"
                        value={formData.biggestProblem}
                        onChange={e => setFormData({...formData, biggestProblem: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={prevStep} className="p-5 rounded-lg bg-white text-gray-500 border border-gray-200">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={nextStep} className="flex-1 bg-primary text-white py-5 rounded-lg font-bold text-lg hover:bg-primary-hover transition-all">
                      Continuar
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-4xl font-black">Experiências Profissionais</h2>
                    <p className="text-gray-500 mt-2">Conte sua trajetória profissional para criar credibilidade.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-lg border border-gray-200 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Empresa</label>
                          <input
                            placeholder="Ex: Nexus360"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary text-sm"
                            value={expForm.companyName}
                            onChange={e => setExpForm({...expForm, companyName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cargo</label>
                          <input
                            placeholder="Ex: CEO"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary text-sm"
                            value={expForm.role}
                            onChange={e => setExpForm({...expForm, role: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Descrição</label>
                        <textarea
                          placeholder="Ex: Responsável por liderar a equipe e definir estratégias..."
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary text-sm min-h-[60px] resize-none"
                          value={expForm.description}
                          onChange={e => setExpForm({...expForm, description: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Local</label>
                          <input
                            placeholder="Ex: São Paulo, SP"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary text-sm"
                            value={expForm.location}
                            onChange={e => setExpForm({...expForm, location: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Data Início</label>
                          <input
                            type="month"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary text-sm"
                            value={expForm.startDate}
                            onChange={e => setExpForm({...expForm, startDate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Data Término</label>
                          <div className="space-y-2">
                            <input
                              type="month"
                              disabled={expForm.isCurrent}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary text-sm disabled:opacity-50"
                              value={expForm.endDate}
                              onChange={e => setExpForm({...expForm, endDate: e.target.value})}
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-primary"
                                checked={expForm.isCurrent}
                                onChange={e => setExpForm({...expForm, isCurrent: e.target.checked, endDate: e.target.checked ? "" : expForm.endDate})}
                              />
                              <span className="text-xs text-gray-500">Trabalho atual</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={addExperience}
                        disabled={savingExperience || !expForm.companyName || !expForm.role || !expForm.startDate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-hover transition-all disabled:opacity-50"
                      >
                        {savingExperience ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Adicionar Experiência
                      </button>
                    </div>

                    {loadingExperiences ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-primary" />
                      </div>
                    ) : experiences.length > 0 ? (
                      <div className="space-y-3">
                        {experiences.map(exp => (
                          <div key={exp.id} className="flex items-start gap-4 bg-white p-4 rounded-lg border border-gray-200">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                              <Briefcase size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm">{exp.role}</h4>
                              <p className="text-xs text-gray-500">{exp.companyName}{exp.location ? ` • ${exp.location}` : ""}</p>
                              {exp.description && <p className="text-xs text-gray-400 mt-1">{exp.description}</p>}
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(exp.startDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                {exp.isCurrent ? " - Presente" : exp.endDate ? ` - ${new Date(exp.endDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}` : ""}
                              </p>
                            </div>
                            <button
                              onClick={() => removeExperience(exp.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-gray-300">
                        <Briefcase className="mx-auto text-gray-300" size={32} />
                        <p className="text-sm text-gray-400 mt-2">Nenhuma experiência cadastrada ainda</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button onClick={prevStep} className="p-5 rounded-lg bg-white text-gray-500 border border-gray-200">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={nextStep} className="flex-1 bg-primary text-white py-5 rounded-lg font-bold text-lg hover:bg-primary-hover transition-all">
                      Continuar
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-4xl font-black">Modelo de Entrega</h2>
                    <p className="text-gray-500 mt-2">Como você entrega valor aos seus clientes?</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Processo de Entrega</label>
                      <textarea
                        placeholder="Ex: Onboarding do cliente, depois entregas mensais com OKRs"
                        className="w-full px-6 py-5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-primary transition-all text-lg min-h-[100px] resize-none"
                        value={formData.deliveryProcess}
                        onChange={e => setFormData({...formData, deliveryProcess: e.target.value})}
                      />
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg border border-gray-200 space-y-4">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Recursos de Entrega</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "hasOnboarding", label: "Onboarding Estruturado", icon: Rocket },
                          { key: "hasChecklist", label: "Checklists", icon: CheckCircle2 },
                          { key: "hasRenewal", label: "Renovação", icon: RefreshCw },
                          { key: "hasUpsell", label: "Upsell", icon: TrendingUp },
                        ].map(item => (
                          <button
                            key={item.key}
                            onClick={() => setFormData(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                              (formData as any)[item.key]
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40"
                            }`}
                          >
                            <item.icon size={18} />
                            <span className="font-bold text-sm">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-lg flex gap-4 items-start">
                    <BrainCircuit className="text-blue-500 shrink-0 mt-1" size={24} />
                    <div>
                      <p className="font-bold text-slate-950 text-sm">Preparando diagnostico com IA</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Após salvar, nossa IA vai analisar suas respostas e montar o setup ideal de pipelines,
                        campos personalizados e processos para sua operação.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={prevStep} className="p-5 rounded-lg bg-white text-gray-500 border border-gray-200">
                      <ArrowLeft size={24} />
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={saving}
                      className="flex-1 bg-primary text-white py-5 rounded-lg font-bold text-lg hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-card"
                    >
                      {saving ? (
                        <><Loader2 size={20} className="animate-spin" /> Gerando Diagnóstico...</>
                      ) : (
                        <><Sparkles size={20} /> Finalizar & Analisar com IA</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function TrendingUp(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
