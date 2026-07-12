import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, ArrowRight, Sparkles, Building2, Target, Users, MapPin,
  AlertCircle, HeartHandshake, CheckCircle2, Star, Lightbulb, MessageCircle,
  Palette, Mic, Loader2, Monitor, ChevronRight, Zap
} from "lucide-react";
import { apiFetch, readJsonResponse } from "../../lib/api";

const STEPS = [
  { title: "Empresa", icon: Building2 },
  { title: "Oferta", icon: Target },
  { title: "Público", icon: Users },
  { title: "Dores", icon: AlertCircle },
  { title: "Promessa", icon: HeartHandshake },
  { title: "Provas", icon: Star },
  { title: "Diferenciais", icon: Lightbulb },
  { title: "Objeções", icon: MessageCircle },
  { title: "CTA & Tom", icon: Mic },
  { title: "Cores", icon: Palette },
];

const SEGMENTS = [
  "Tecnologia", "Saúde", "Advocacia", "Indústria", "Imobiliária",
  "Serviços", "E-commerce", "Consultoria", "Contabilidade", "Educação",
  "Finanças", "Marketing", "Construção", "Automotivo", "Outro"
];

const TONES = [
  "Persuasivo Profissional", "Casual e Amigável", "Autoritário e Técnico",
  "Inspirador e Motivacional", "Direto e Objetivo", "Luxo e Exclusivo",
  "Urgente e Escasso", "Educativo e Didático"
];

const OBJECTIVES = [
  { value: "lead", label: "Captar Lead", desc: "Coletar contatos para nurture" },
  { value: "call", label: "Agendar Call", desc: "Marcar reunião comercial" },
  { value: "sale", label: "Vender Direto", desc: "Conversão imediata" },
  { value: "material", label: "Download Material", desc: "E-book, checklist, planilha" },
  { value: "whatsapp", label: "WhatsApp", desc: "Iniciar conversa no WhatsApp" },
];

interface WizardData {
  companyName: string;
  segment: string;
  product: string;
  targetAudience: string;
  city: string;
  painPoint: string;
  promise: string;
  benefits: string;
  socialProof: string;
  differentials: string;
  objections: string;
  cta: string;
  tone: string;
  objective: string;
  contactType: string;
}

export default function LandingPageWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<WizardData>({
    companyName: "", segment: "", product: "", targetAudience: "", city: "",
    painPoint: "", promise: "", benefits: "", socialProof: "", differentials: "",
    objections: "", cta: "", tone: "Persuasivo Profissional", objective: "lead", contactType: "form",
  });
  const [theme, setTheme] = useState({ primaryColor: "#3B82F6", secondaryColor: "#1E40AF", fontFamily: "'Inter', system-ui, sans-serif" });

  const update = (field: keyof WizardData, value: string) => setData(prev => ({ ...prev, [field]: value }));

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/landing-pages/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wizardData: data, theme }),
      });

      if (!res.ok) {
        const err = await readJsonResponse(res, "Erro ao gerar").catch(() => ({ error: "Erro ao gerar landing page" }));
        throw new Error(err.error || "Erro ao gerar landing page");
      }

      const result = await readJsonResponse(res);

      const createRes = await apiFetch("/api/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.name || data.companyName || "Landing Page",
          metaTitle: result.metaTitle || "",
          metaDescription: result.metaDescription || "",
          sections: result.sections || [],
          wizardData: data,
          theme,
          slug: result.slug || "",
        }),
      });

      if (!createRes.ok) {
        const err = await readJsonResponse(createRes, "Erro ao salvar").catch(() => ({ error: "Erro ao salvar" }));
        throw new Error(err.error || "Erro ao salvar landing page");
      }

      const page = await readJsonResponse(createRes);
      navigate(`/landing-pages/${page.id}/edit`);
    } catch (err: any) {
      setError(err.message || "Erro ao gerar landing page");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return data.companyName.length > 0;
      case 1: return data.product.length > 0;
      case 2: return data.targetAudience.length > 0;
      case 3: return data.painPoint.length > 0;
      case 4: return data.promise.length > 0;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome da Empresa</label>
              <input className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="Ex: Clínica Sorriso Perfeito" value={data.companyName} onChange={e => update("companyName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Segmento</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                {SEGMENTS.map(s => (
                  <button key={s} onClick={() => update("segment", s)} className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${data.segment === s ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cidade/Região</label>
              <input className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="Ex: São Paulo - SP" value={data.city} onChange={e => update("city", e.target.value)} />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Produto ou Serviço</label>
              <input className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="Ex: Plano odontológico corporativo" value={data.product} onChange={e => update("product", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Benefícios (um por linha)</label>
              <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[120px]" placeholder="Ex: Atendimento 24h&#10;Cobertura nacional&#10;Preços acessíveis" value={data.benefits} onChange={e => update("benefits", e.target.value)} />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Público-alvo</label>
              <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[100px]" placeholder="Descreva detalhadamente seu público ideal. Ex: Empresas de pequeno e médio porte do setor de serviços que buscam reduzir custos com plano de saúde para seus funcionários." value={data.targetAudience} onChange={e => update("targetAudience", e.target.value)} />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Principal dor do cliente</label>
              <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[100px]" placeholder="Qual o principal problema que seu cliente enfrenta?" value={data.painPoint} onChange={e => update("painPoint", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Objeções comuns dos clientes</label>
              <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[100px]" placeholder="O que costumam dizer para não comprar?" value={data.objections} onChange={e => update("objections", e.target.value)} />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Principal promessa da oferta</label>
              <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[100px]" placeholder="Qual a principal promessa que sua oferta faz?" value={data.promise} onChange={e => update("promise", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Diferenciais</label>
              <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[100px]" placeholder="O que te torna diferente da concorrência?" value={data.differentials} onChange={e => update("differentials", e.target.value)} />
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Provas sociais</label>
            <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[150px]" placeholder="Números, clientes atendidos, anos de mercado, cases de sucesso. Ex: Mais de 500 empresas atendidas, 98% de satisfação..." value={data.socialProof} onChange={e => update("socialProof", e.target.value)} />
          </div>
        );

      case 6:
        return (
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Diferenciais competitivos</label>
            <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[150px]" placeholder="O que faz sua empresa ser única no mercado?" value={data.differentials} onChange={e => update("differentials", e.target.value)} />
          </div>
        );

      case 7:
        return (
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Objeções comuns</label>
            <textarea className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[150px]" placeholder="O que os clientes dizem para não comprar? Como você responde?" value={data.objections} onChange={e => update("objections", e.target.value)} />
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">CTA Principal</label>
              <input className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="Ex: Quero contratar, Solicitar orçamento" value={data.cta} onChange={e => update("cta", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tom de Voz</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {TONES.map(t => (
                  <button key={t} onClick={() => update("tone", t)} className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all text-left ${data.tone === t ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Objetivo da Página</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {OBJECTIVES.map(o => (
                  <button key={o.value} onClick={() => update("objective", o.value)} className={`py-3 px-3 rounded-xl text-xs font-medium border transition-all text-left ${data.objective === o.value ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    <div className="font-semibold">{o.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cores da Marca</label>
              <div className="grid grid-cols-2 gap-6 mt-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500">Cor Primária</label>
                  <div className="flex gap-3 items-center mt-1.5">
                    <input type="color" className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" value={theme.primaryColor} onChange={e => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))} />
                    <input className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-3 text-xs font-mono uppercase" value={theme.primaryColor} onChange={e => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500">Cor Secundária</label>
                  <div className="flex gap-3 items-center mt-1.5">
                    <input type="color" className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" value={theme.secondaryColor} onChange={e => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))} />
                    <input className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-3 text-xs font-mono uppercase" value={theme.secondaryColor} onChange={e => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <p className="text-xs font-medium text-gray-500">Preview das cores</p>
              <div className="flex gap-3 mt-3">
                <div className="h-10 w-full rounded-xl" style={{ background: theme.primaryColor }} />
                <div className="h-10 w-full rounded-xl" style={{ background: theme.secondaryColor }} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate("/landing-pages")} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors mb-4">
          <ArrowLeft size="16" /> Voltar
        </button>
        <h1 className="text-2xl font-black text-gray-900">Criar Landing Page com IA</h1>
        <p className="text-sm text-gray-500 mt-1">Preencha os dados da sua oferta para gerar uma landing page profissional</p>
      </div>

      <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <button key={i} onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${i === step ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : i < step ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"}`}>
              <Icon size="12" /> {s.title}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{step + 1}</div>
            <span className="text-sm font-bold text-gray-700">{STEPS[step].title}</span>
            <span className="text-[10px] text-gray-400 ml-auto">{step + 1} de {STEPS.length}</span>
          </div>

          {renderStep()}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">{error}</div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-all flex items-center gap-1.5">
              <ArrowLeft size="16" /> Anterior
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={!canProceed()} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-30 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20">
                Próximo <ArrowRight size="16" />
              </button>
            ) : (
              <button onClick={handleGenerate} disabled={loading} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30">
                {loading ? (
                  <><Loader2 size="16" className="animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles size="16" /> Gerar Landing Page</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
