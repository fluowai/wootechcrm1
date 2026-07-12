import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Rocket, ChevronRight, ArrowLeft, CheckCircle2, Sparkles,
  Palette, Globe, Users, Key, Building2, Loader2, Upload,
  X, Monitor, AlertCircle, ShieldCheck, UserPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuthSession, readJsonResponse } from "../../lib/api";

const steps = [
  { id: 1, title: "Identidade da Marca", icon: Palette },
  { id: 2, title: "Domínio", icon: Globe },
  { id: 3, title: "Equipe", icon: Users },
  { id: 4, title: "Inteligência", icon: Key },
  { id: 5, title: "Revisão", icon: Sparkles },
];

export default function WhitelabelOnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [brand, setBrand] = useState({
    name: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
  });

  const [domain, setDomain] = useState("");
  const [domainStatus, setDomainStatus] = useState<string | null>(null);
  const [domainDns, setDomainDns] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string; role: string }[]>([]);
  const [tempMember, setTempMember] = useState({ name: "", email: "", role: "Comercial" });

  const [aiKeys, setAiKeys] = useState({ groqKey: "", geminiKey: "" });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await apiFetch("/api/onboarding/whitelabel/status");
      const data = await readJsonResponse(res, "Erro ao carregar status");
      if (data.whitelabel) {
        setCurrentStep(data.step || 1);
        if (data.brand) setBrand(prev => ({ ...prev, ...data.brand }));
        if (data.domain) setDomain(data.domain);
        if (data.domainStatus) setDomainStatus(data.domainStatus);
        if (data.domainDns) setDomainDns(JSON.stringify(data.domainDns, null, 2));
        if (data.checklist) setChecklist(data.checklist);
        if (data.complete) finishAndGoToLogin();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) saveBrand();
    else if (currentStep === 2) saveDomain();
    else if (currentStep === 3) saveAgency();
    else if (currentStep === 4) saveAiKeys();
    else if (currentStep === 5) completeOnboarding();
    else setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const saveBrand = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/onboarding/whitelabel/brand", {
        method: "POST",
        body: JSON.stringify(brand),
      });
      applyBrandColors(brand.primaryColor, brand.secondaryColor);
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const saveDomain = async () => {
    if (!domain) {
      setCurrentStep(3);
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/onboarding/whitelabel/domain", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
      const data = await readJsonResponse(res, "Erro ao configurar domínio");
      setDomainStatus(data.verified ? "verified" : "pending");
      setDomainDns(data.domain?.dns ? JSON.stringify(data.domain.dns, null, 2) : null);
      setCurrentStep(3);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao configurar domínio");
    } finally {
      setSaving(false);
    }
  };

  const saveAgency = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/onboarding/whitelabel/agency", {
        method: "POST",
        body: JSON.stringify({ teamMembers }),
      });
      setCurrentStep(4);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const saveAiKeys = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/onboarding/whitelabel/ai-keys", {
        method: "POST",
        body: JSON.stringify(aiKeys),
      });
      setCurrentStep(5);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/onboarding/whitelabel/complete", { method: "POST" });
      if (!res.ok) {
        const data = await readJsonResponse(res, "Erro ao finalizar onboarding");
        throw new Error(data.error || data.details || "Erro ao finalizar onboarding");
      }
      await finishAndGoToLogin();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao finalizar onboarding");
    } finally {
      setSaving(false);
    }
  };

  const finishAndGoToLogin = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    clearAuthSession();
    localStorage.removeItem("nexus_onboarding_done");
    navigate("/login", { replace: true });
  };

  const applyBrandColors = (primary: string, secondary: string) => {
    document.documentElement.style.setProperty("--nexus-primary", primary);
    document.documentElement.style.setProperty("--nexus-primary-hover", primary);
    document.documentElement.style.setProperty("--nexus-nav-dark", secondary);
    document.documentElement.style.setProperty("--nexus-nav-dark-2", secondary);
  };

  const addMember = () => {
    if (tempMember.name && tempMember.email) {
      setTeamMembers(prev => [...prev, { ...tempMember }]);
      setTempMember({ name: "", email: "", role: "Comercial" });
    }
  };

  const removeMember = (index: number) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-4 font-sans overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        <div className="lg:col-span-4 space-y-8 hidden lg:block">
          <div className="mb-12">
            <div className="flex items-center gap-3 text-2xl font-black tracking-tighter italic">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 not-italic">
                <Monitor size={20} />
              </div>
              {brand.name ? (
                <span>{brand.name}</span>
              ) : (
                <span>NEXUS<span className="text-primary">360</span></span>
              )}
            </div>
          </div>
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-6 group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                currentStep >= s.id ? "bg-primary border-primary text-white shadow-xl shadow-blue-500/20" : "bg-white/5 border-white/10 text-gray-500"
              }`}>
                {currentStep > s.id ? <CheckCircle2 size={24} /> : <s.icon size={24} />}
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${currentStep >= s.id ? "text-primary" : "text-gray-500"}`}>
                  Passo {s.id}
                </span>
                <span className={`font-bold text-lg transition-colors ${currentStep >= s.id ? "text-white" : "text-gray-600"}`}>
                  {s.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 w-full">
          <motion.div layout className="bg-white/5 backdrop-blur-2xl rounded-[48px] p-8 lg:p-14 border border-white/10 shadow-3xl shadow-black/50">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mb-4 border border-primary/20">
                    <Palette size={40} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black leading-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                      Identidade da Sua Marca
                    </h1>
                    <p className="text-gray-400 text-lg">
                      Personalize a aparência do sistema para seus clientes. Sua marca, suas cores.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome da Marca</label>
                      <input
                        placeholder="Ex: Minha Agência"
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary focus:bg-white/10 transition-all text-xl"
                        value={brand.name}
                        onChange={e => setBrand({ ...brand, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Logo URL</label>
                        <input
                          placeholder="https://..."
                          className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary transition-all text-sm font-mono"
                          value={brand.logoUrl}
                          onChange={e => setBrand({ ...brand, logoUrl: e.target.value })}
                        />
                        {brand.logoUrl && (
                          <img src={brand.logoUrl} alt="Preview" className="w-16 h-16 rounded-xl object-contain bg-white/5 border border-white/10 mt-2" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Favicon URL</label>
                        <input
                          placeholder="https://..."
                          className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary transition-all text-sm font-mono"
                          value={brand.faviconUrl}
                          onChange={e => setBrand({ ...brand, faviconUrl: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{ color: brand.primaryColor }}>Cor Primária</label>
                        <div className="flex gap-3 items-center">
                          <input
                            type="color"
                            className="w-16 h-16 rounded-2xl border border-white/10 bg-transparent cursor-pointer"
                            value={brand.primaryColor}
                            onChange={e => { setBrand({ ...brand, primaryColor: e.target.value }); applyBrandColors(e.target.value, brand.secondaryColor); }}
                          />
                          <input
                            className="flex-1 px-4 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary transition-all text-sm font-mono uppercase"
                            value={brand.primaryColor}
                            onChange={e => setBrand({ ...brand, primaryColor: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{ color: brand.secondaryColor }}>Cor Secundária</label>
                        <div className="flex gap-3 items-center">
                          <input
                            type="color"
                            className="w-16 h-16 rounded-2xl border border-white/10 bg-transparent cursor-pointer"
                            value={brand.secondaryColor}
                            onChange={e => { setBrand({ ...brand, secondaryColor: e.target.value }); applyBrandColors(brand.primaryColor, e.target.value); }}
                          />
                          <input
                            className="flex-1 px-4 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary transition-all text-sm font-mono uppercase"
                            value={brand.secondaryColor}
                            onChange={e => setBrand({ ...brand, secondaryColor: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Prévia</p>
                      <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl">
                        {brand.logoUrl ? (
                          <img src={brand.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black" style={{ backgroundColor: brand.primaryColor + "30", color: brand.primaryColor }}>
                            N
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-lg">{brand.name || "Sua Marca"}</p>
                          <p className="text-xs text-gray-500">Portal white label personalizado</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => navigate("/login")} className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 text-gray-400">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={saveBrand} disabled={saving || !brand.name} className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                      {saving ? <><Loader2 size={20} className="animate-spin" /> Salvando...</> : "Salvar & Continuar"}
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mb-4 border border-primary/20">
                    <Globe size={40} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black leading-tight">Domínio Personalizado</h1>
                    <p className="text-gray-400 text-lg">
                      Configure um domínio próprio para seus clientes acessarem o sistema.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">URL do Sistema</label>
                      <input
                        placeholder="crm.suaagencia.com.br"
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary transition-all text-xl font-mono"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-2">Deixe em branco para pular esta etapa (poderá configurar depois)</p>
                    </div>

                    {domainStatus === "verified" && (
                      <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-start gap-3">
                        <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-green-300">Domínio verificado com sucesso!</p>
                      </div>
                    )}

                    {domainDns && domainStatus !== "verified" && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={20} />
                          <p className="text-sm text-amber-300">Configure o DNS do seu domínio:</p>
                        </div>
                        <pre className="text-xs text-gray-400 bg-black/20 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap">{domainDns}</pre>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={prevStep} className="p-5 rounded-2xl bg-white/5 text-gray-400 border border-white/10">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={saveDomain} disabled={saving} className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                      {saving ? <><Loader2 size={20} className="animate-spin" /> Verificando...</> : domain ? "Salvar Domínio" : "Pular Etapa"}
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mb-4 border border-primary/20">
                    <Users size={40} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black leading-tight">Sua Equipe</h1>
                    <p className="text-gray-400 text-lg">
                      Adicione os membros da sua agência que terão acesso ao painel.
                    </p>
                  </div>

                  <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        placeholder="Nome"
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-primary transition-all"
                        value={tempMember.name}
                        onChange={e => setTempMember({ ...tempMember, name: e.target.value })}
                      />
                      <input
                        placeholder="Email"
                        type="email"
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-primary transition-all"
                        value={tempMember.email}
                        onChange={e => setTempMember({ ...tempMember, email: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <select
                          className="flex-1 px-3 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-gray-400 text-sm"
                          value={tempMember.role}
                          onChange={e => setTempMember({ ...tempMember, role: e.target.value })}
                        >
                          <option value="Comercial">Comercial</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Operacional">Operacional</option>
                          <option value="Admin">Admin</option>
                        </select>
                        <button onClick={addMember} className="p-3 bg-primary rounded-xl hover:bg-blue-600 transition-all shrink-0">
                          <UserPlus size={20} />
                        </button>
                      </div>
                    </div>

                    {teamMembers.length > 0 && (
                      <div className="space-y-2">
                        {teamMembers.map((m, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl border border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-xs font-bold text-primary">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{m.name}</p>
                                <p className="text-[10px] text-gray-500">{m.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-1 rounded">{m.role}</span>
                              <button onClick={() => removeMember(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={prevStep} className="p-5 rounded-2xl bg-white/5 text-gray-400 border border-white/10">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={saveAgency} disabled={saving} className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                      {saving ? <><Loader2 size={20} className="animate-spin" /> Salvando...</> : "Salvar Equipe"}
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mb-4 border border-primary/20">
                    <Key size={40} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black leading-tight">Inteligência Artificial</h1>
                    <p className="text-gray-400 text-lg">
                      Conecte sua chave da Groq para habilitar diagnósticos com IA.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Groq API Key</label>
                        <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">Recomendado</span>
                      </div>
                      <input
                        type="password"
                        placeholder="gsk_..."
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm"
                        value={aiKeys.groqKey}
                        onChange={e => setAiKeys({ ...aiKeys, groqKey: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gemini API Key</label>
                      <input
                        type="password"
                        placeholder="(opcional)"
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm"
                        value={aiKeys.geminiKey}
                        onChange={e => setAiKeys({ ...aiKeys, geminiKey: e.target.value })}
                      />
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex gap-4 items-start">
                      <ShieldCheck className="text-blue-500 shrink-0" size={20} />
                      <p className="text-xs text-gray-400">Suas chaves são criptografadas e nunca compartilhadas. Você pode alterar isso a qualquer momento.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={prevStep} className="p-5 rounded-2xl bg-white/5 text-gray-400 border border-white/10">
                      <ArrowLeft size={24} />
                    </button>
                    <button onClick={saveAiKeys} disabled={saving} className="flex-1 bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                      {saving ? <><Loader2 size={20} className="animate-spin" /> Salvando...</> : "Salvar & Continuar"}
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {currentStep === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-10 py-10">
                  <div className="relative inline-block">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute -inset-8 bg-gradient-to-tr from-primary to-purple-500 rounded-full blur-3xl opacity-20" />
                    <div className="w-32 h-32 bg-primary text-white rounded-[40px] flex items-center justify-center mx-auto relative z-10 shadow-3xl shadow-primary/40">
                      <CheckCircle2 size={64} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-5xl font-black italic">Tudo Pronto!</h2>
                    <p className="text-gray-400 max-w-md mx-auto text-lg leading-relaxed">
                      Sua agência <span className="text-white font-bold">{brand.name}</span> está configurada.
                      Agora você pode gerenciar seus clientes com sua própria marca.
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-3xl border border-white/10 p-6 max-w-md mx-auto text-left space-y-3">
                    <div className="flex items-center gap-3">
                      <Palette size={16} className="text-primary" />
                      <span className="text-sm text-gray-400">{checklist.brand ? "Marca personalizada" : "Marca pendente"}</span>
                    </div>
                    {domain && (
                      <div className="flex items-center gap-3">
                        <Globe size={16} className="text-primary" />
                        <span className="text-sm text-gray-400">Domínio: {domain}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-primary" />
                      <span className="text-sm text-gray-400">{teamMembers.length + 1} membros na equipe</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Key size={16} className="text-primary" />
                      <span className="text-sm text-gray-400">{aiKeys.groqKey ? "IA configurada" : "IA não configurada"}</span>
                    </div>
                  </div>

                  <button
                    onClick={completeOnboarding}
                    disabled={saving}
                    className="w-full max-w-md bg-white text-gray-900 py-6 rounded-[32px] font-black text-xl hover:bg-gray-100 transition-all shadow-2xl flex items-center justify-center gap-3"
                  >
                    {saving ? <><Loader2 size={20} className="animate-spin" /> Finalizando...</> : "ACESSAR PLATAFORMA"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
