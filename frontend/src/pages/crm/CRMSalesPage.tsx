import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, BarChart3, Bot, Check, ChevronDown, CircleCheck, Clock3,
  CreditCard, Headphones, Layers3, Menu, MessageCircle, Rocket, ShieldCheck,
  Phone, Sparkles, Target, Users, Workflow, X, Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import NexusLogo from "../../components/NexusLogo";
import { publicApiFetch, readJsonResponse, setAccessToken } from "../../lib/api";

type Plan = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  maxUsers?: number;
  maxClients?: number;
  maxLeads?: number;
  maxAutomations?: number;
  maxAIRequests?: number;
  planFeatures?: Array<{ featureKey: string; isEnabled: boolean }>;
};

const fallbackPlans: Plan[] = [
  { id: "fallback-starter", name: "Starter", slug: "starter", description: "Para estruturar a operação e sair das planilhas.", priceMonthly: 97, maxUsers: 3, maxClients: 5, maxLeads: 1000, maxAutomations: 5 },
  { id: "fallback-pro", name: "Pro", slug: "pro", description: "Para agências que querem crescer com processo e IA.", priceMonthly: 197, maxUsers: 10, maxClients: 25, maxLeads: 10000, maxAutomations: 25 },
  { id: "fallback-scale", name: "Scale", slug: "scale", description: "Para operações maduras, times e múltiplas carteiras.", priceMonthly: 397, maxUsers: 30, maxClients: 100, maxLeads: 50000, maxAutomations: 100 },
];

const capabilities = [
  { icon: Target, title: "Prospecção & CRM", text: "Capture, qualifique e acompanhe oportunidades em um funil comercial completo." },
  { icon: MessageCircle, title: "WhatsApp inteligente", text: "Centralize conversas, follow-ups e automações sem perder o contexto do cliente." },
  { icon: Workflow, title: "Operação conectada", text: "Transforme vendas em projetos, tarefas, aprovações e entregas rastreáveis." },
  { icon: Bot, title: "Agentes de IA", text: "Use inteligência aplicada a diagnóstico, conteúdo, propostas e próxima melhor ação." },
  { icon: BarChart3, title: "Gestão em tempo real", text: "Veja receita, produtividade, capacidade e saúde da carteira no mesmo painel." },
  { icon: Layers3, title: "Portal do cliente", text: "Entregue uma experiência profissional, transparente e com a sua operação organizada." },
];

const outcomes = [
  "Um só lugar para comercial, marketing, projetos e clientes",
  "Menos tarefas manuais e mais previsibilidade operacional",
  "Visão clara do que vende, do que entrega e do que renova",
  "IA trabalhando junto com o seu time, não em uma aba separada",
];

function formatMoney(value = 0) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function planFeatures(plan: Plan) {
  return [
    `Até ${plan.maxUsers || 1} usuários`,
    `Até ${(plan.maxClients || 5).toLocaleString("pt-BR")} clientes`,
    `${(plan.maxLeads || 100).toLocaleString("pt-BR")} leads`,
    `${(plan.maxAutomations || 2).toLocaleString("pt-BR")} automações`,
    plan.maxAIRequests ? `${plan.maxAIRequests.toLocaleString("pt-BR")} créditos de IA` : "Dashboard e relatórios",
  ];
}

export default function CRMSalesPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllFaq, setShowAllFaq] = useState<number | null>(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", organizationName: "", password: "" });

  useEffect(() => {
    publicApiFetch("/api/billing/plans")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length) setPlans(data);
      })
      .catch(() => undefined);
  }, []);

  const featuredId = useMemo(() => plans[Math.min(1, plans.length - 1)]?.id, [plans]);

  const startTrial = (plan: Plan) => {
    setError("");
    setSelectedPlan(plan);
  };

  const submitTrial = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPlan) return;
    setLoading(true);
    setError("");

    try {
      const response = await publicApiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          ...(!selectedPlan.id.startsWith("fallback-") ? { planId: selectedPlan.id } : {}),
        }),
      });
      const data = await readJsonResponse(response, "Não foi possível criar sua conta.");
      if (!response.ok) throw new Error(data.error || "Não foi possível iniciar o teste.");

      setAccessToken(data.token);
      localStorage.setItem("nexus_user_role", data.user.role);
      localStorage.setItem("nexus_user_name", data.user.name || "");
      localStorage.setItem("nexus_org_id", data.user.orgId);
      localStorage.setItem("nexus_org_slug", data.user.orgSlug || "");
      localStorage.setItem("nexus_org_type", data.user.orgType || "CLIENT");
      localStorage.removeItem("nexus_onboarding_done");
      if (data.user.contactVerification?.required) {
        localStorage.setItem("nexus_contact_verification_required", "true");
        navigate("/verify-contact");
        return;
      }
      navigate("/onboarding");
    } catch (err: any) {
      setError(err.message || "Não foi possível iniciar o teste.");
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    ["Preciso cadastrar cartão para testar?", "Não. Você pode explorar o Nexus360 por 3 dias sem informar cartão de crédito."],
    ["O que acontece ao fim dos 3 dias?", "Você escolhe se deseja contratar o plano. Nada é cobrado automaticamente durante o teste."],
    ["Posso mudar de plano depois?", "Sim. Você pode começar com o plano mais adequado para o momento da empresa e evoluir quando precisar de mais capacidade."],
    ["Consigo migrar dados de outra ferramenta?", "Sim. O time pode orientar a migração de planilhas, CRMs e bases atuais conforme o plano contratado."],
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7FCF9] text-[#12372A]">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#DDEEE5] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <NexusLogo />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#587064] md:flex">
            <a href="#plataforma" className="transition hover:text-[#0F9F6E]">Plataforma</a>
            <a href="#resultados" className="transition hover:text-[#0F9F6E]">Benefícios</a>
            <a href="#planos" className="transition hover:text-[#0F9F6E]">Planos</a>
            <a href="#faq" className="transition hover:text-[#0F9F6E]">Dúvidas</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="px-4 py-3 text-sm font-bold text-[#12372A]">Entrar</Link>
            <button onClick={() => plans[0] && startTrial(plans[0])} className="rounded-xl bg-[#0F9F6E] px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-[#087A55]">
              Testar por 3 dias
            </button>
          </div>
          <button className="text-[#12372A] md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#DDEEE5] bg-white px-5 py-5 md:hidden">
            <div className="flex flex-col gap-4 font-semibold text-[#12372A]">
              <a href="#plataforma" onClick={() => setMenuOpen(false)}>Plataforma</a>
              <a href="#planos" onClick={() => setMenuOpen(false)}>Planos</a>
              <Link to="/login">Entrar</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#F3FCF7] to-[#E7F8EF] px-5 pb-24 pt-36 lg:px-8 lg:pb-32 lg:pt-44">
          <div className="absolute -right-40 top-20 h-[520px] w-[520px] rounded-full bg-[#6EE7B7]/25 blur-[120px]" />
          <div className="absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-[#A7F3D0]/30 blur-[100px]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_.95fr]">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B7E8CF] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#0B7C57] shadow-sm">
                <Sparkles size={14} /> Gestão completa para sua empresa
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Sua operação inteira. <span className="text-[#0F9F6E]">Finalmente conectada.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#587064] lg:text-xl">
                O Nexus360 une prospecção, CRM, WhatsApp, projetos, financeiro, clientes e agentes de IA para sua empresa crescer sem virar refém de planilhas e ferramentas soltas.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => plans[0] && startTrial(plans[0])} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F9F6E] px-7 py-4 font-black text-white shadow-xl shadow-emerald-200 transition hover:-translate-y-1 hover:bg-[#087A55]">
                  Começar teste grátis <ArrowRight size={19} className="transition group-hover:translate-x-1" />
                </button>
                <a href="#plataforma" className="inline-flex items-center justify-center rounded-2xl border border-[#BCDCCB] bg-white px-7 py-4 font-bold text-[#12372A] transition hover:border-[#0F9F6E] hover:text-[#0F9F6E]">
                  Conhecer a plataforma
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#587064]">
                <span className="flex items-center gap-2"><Check size={16} className="text-[#0F9F6E]" /> 3 dias grátis</span>
                <span className="flex items-center gap-2"><Check size={16} className="text-[#0F9F6E]" /> Sem cartão</span>
                <span className="flex items-center gap-2"><Check size={16} className="text-[#0F9F6E]" /> Cancele quando quiser</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: .96, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: .15 }} className="relative">
              <div className="rounded-[30px] border border-[#CFE7DA] bg-white/80 p-4 shadow-2xl shadow-emerald-900/10 backdrop-blur">
                <div className="rounded-[22px] bg-white p-5 text-[#12372A]">
                  <div className="flex items-center justify-between border-b border-[#E8E8F0] pb-4">
                    <div><div className="text-xs font-bold text-[#71887C]">CENTRAL DE GESTÃO</div><div className="mt-1 text-lg font-black">Visão geral da operação</div></div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F9F6E] text-white"><Zap size={20} /></div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[["Receita", "R$ 284k", "+18%"], ["Pipeline", "R$ 612k", "+24%"], ["Conversão", "31,8%", "+6,2%"]].map(([label, value, change]) => (
                      <div key={label} className="rounded-2xl border border-[#EBEBF2] bg-white p-4">
                        <div className="text-[10px] font-bold uppercase text-[#7A8F84]">{label}</div><div className="mt-2 text-lg font-black">{value}</div><div className="mt-1 text-[11px] font-bold text-[#0F9F6E]">{change}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
                    <div className="rounded-2xl border border-[#EBEBF2] bg-white p-5">
                      <div className="flex items-center justify-between"><span className="text-sm font-black">Crescimento</span><span className="text-xs text-[#71887C]">Últimos 6 meses</span></div>
                      <div className="mt-7 flex h-32 items-end gap-3">
                        {[36, 52, 44, 69, 62, 92].map((height, i) => <div key={i} className="flex-1 rounded-t-lg bg-[#0F9F6E]" style={{ height: `${height}%`, opacity: .42 + i * .1 }} />)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[#EAF8F1] p-5 text-[#12372A]">
                      <Bot className="text-[#0F9F6E]" /><div className="mt-5 text-sm font-black">IA Nexus</div><p className="mt-2 text-xs leading-5 text-[#587064]">3 oportunidades pedem follow-up hoje.</p>
                      <div className="mt-5 rounded-xl bg-[#0F9F6E] px-3 py-2 text-center text-[11px] font-black text-white">VER AÇÕES</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-5 rounded-2xl border border-[#CFE7DA] bg-white p-4 shadow-2xl shadow-emerald-900/10">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-[#E3F7ED] p-2 text-[#0F9F6E]"><CircleCheck /></div><div><div className="text-xs text-[#71887C]">Automação concluída</div><div className="text-sm font-black text-[#12372A]">Lead qualificado e distribuído</div></div></div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="plataforma" className="px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-xs font-black uppercase tracking-[.22em] text-[#0F9F6E]">Um sistema, uma operação</div>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">Tudo o que seu time precisa para vender, entregar e crescer.</h2>
              <p className="mt-5 text-lg leading-8 text-[#587064]">Cada módulo conversa com o próximo. O dado nasce no comercial e acompanha toda a jornada do cliente.</p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item, index) => (
                <motion.div key={item.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .05 }} className="group rounded-[26px] border border-[#DDEEE5] bg-white p-7 transition hover:-translate-y-1 hover:border-[#77CBA2] hover:shadow-xl hover:shadow-emerald-100/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F8F0] text-[#0F9F6E] transition group-hover:bg-[#0F9F6E] group-hover:text-white"><item.icon size={23} /></div>
                  <h3 className="mt-6 text-xl font-black">{item.title}</h3><p className="mt-3 leading-7 text-[#587064]">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="resultados" className="bg-white px-5 py-24 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
            <div className="rounded-[34px] bg-[#0B6B4A] p-8 text-white shadow-2xl shadow-emerald-900/15 lg:p-12">
              <div className="inline-flex rounded-2xl bg-white/15 p-3"><Rocket /></div>
              <h2 className="mt-7 text-4xl font-black tracking-[-.04em]">Menos caos operacional. Mais margem para crescer.</h2>
              <p className="mt-5 text-lg leading-8 text-[#D8F3E6]">O Nexus360 dá ao gestor a visão do todo e ao time a clareza da próxima ação.</p>
              <div className="mt-8 space-y-4">
                {outcomes.map((outcome) => <div key={outcome} className="flex gap-3"><div className="mt-0.5 text-[#A7F3D0]"><CircleCheck size={20} /></div><span className="font-semibold text-white">{outcome}</span></div>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {[
                { icon: Clock3, value: "1 hub", label: "para toda a operação" },
                { icon: Sparkles, value: "IA", label: "integrada aos processos" },
                { icon: ShieldCheck, value: "360°", label: "da venda à retenção" },
                { icon: Headphones, value: "Humano", label: "suporte para evoluir" },
              ].map((item) => <div key={item.label} className="rounded-[26px] border border-[#DDEEE5] bg-[#F7FCF9] p-6 sm:p-8"><item.icon className="text-[#0F9F6E]" /><div className="mt-6 text-3xl font-black">{item.value}</div><div className="mt-2 text-sm font-semibold leading-6 text-[#587064]">{item.label}</div></div>)}
            </div>
          </div>
        </section>

        <section id="planos" className="px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center"><div className="text-xs font-black uppercase tracking-[.22em] text-[#0F9F6E]">Planos para cada fase</div><h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">Comece por 3 dias. Decida depois.</h2><p className="mt-5 text-lg text-[#587064]">Sem cartão de crédito e sem cobrança automática durante o teste.</p></div>
            <div className={`mt-14 grid gap-6 ${plans.length >= 3 ? "lg:grid-cols-3" : "mx-auto max-w-4xl md:grid-cols-2"}`}>
              {plans.map((plan) => {
                const featured = plan.id === featuredId;
                return <div key={plan.id} className={`relative flex flex-col rounded-[30px] border bg-white p-8 ${featured ? "border-[#0F9F6E] shadow-2xl shadow-emerald-100 ring-4 ring-[#0F9F6E]/5" : "border-[#DDEEE5]"}`}>
                  {featured && <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#0F9F6E] px-4 py-2 text-[10px] font-black uppercase tracking-[.18em] text-white">Mais escolhido</div>}
                  <div className="text-xl font-black">{plan.name}</div><p className="mt-3 min-h-12 text-sm leading-6 text-[#587064]">{plan.description || "Plano completo para organizar e acelerar sua operação."}</p>
                  <div className="mt-7"><span className="text-4xl font-black tracking-[-.04em]">{formatMoney(plan.priceMonthly)}</span><span className="text-sm font-bold text-[#71887C]"> /mês</span></div>
                  <div className="my-7 h-px bg-[#E3EFE8]" />
                  <div className="flex-1 space-y-3">{planFeatures(plan).map((feature) => <div key={feature} className="flex items-center gap-3 text-sm font-semibold text-[#405B4F]"><Check size={17} className="shrink-0 text-[#0F9F6E]" /> {feature}</div>)}</div>
                  <button onClick={() => startTrial(plan)} className={`mt-8 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black transition hover:-translate-y-0.5 ${featured ? "bg-[#0F9F6E] text-white shadow-lg shadow-emerald-200" : "border border-[#0F9F6E] bg-white text-[#0B7C57] hover:bg-[#F0FBF5]"}`}>Testar grátis por 3 dias <ArrowRight size={18} /></button>
                </div>;
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-3xl"><div className="text-center"><h2 className="text-4xl font-black tracking-[-.04em]">Perguntas frequentes</h2></div>
            <div className="mt-10 divide-y divide-[#E8E8F0] border-y border-[#E8E8F0]">
              {faqs.map(([question, answer], index) => <button key={question} onClick={() => setShowAllFaq(showAllFaq === index ? null : index)} className="w-full py-6 text-left"><div className="flex items-center justify-between gap-5"><span className="font-black">{question}</span><ChevronDown className={`shrink-0 text-[#0F9F6E] transition ${showAllFaq === index ? "rotate-180" : ""}`} /></div>{showAllFaq === index && <p className="mt-4 pr-10 leading-7 text-[#587064]">{answer}</p>}</button>)}
            </div>
          </div>
        </section>

        <section className="bg-[#0F9F6E] px-5 py-20 text-white lg:px-8"><div className="mx-auto flex max-w-5xl flex-col items-center text-center"><NexusLogo light /><h2 className="mt-8 text-4xl font-black tracking-[-.04em] sm:text-5xl">Sua empresa já tem potencial. Agora ela pode ter um sistema.</h2><p className="mt-5 max-w-2xl text-lg text-emerald-50">Experimente o Nexus360 por 3 dias e veja sua operação por inteiro.</p><button onClick={() => plans[0] && startTrial(plans[0])} className="mt-8 rounded-2xl bg-white px-8 py-4 font-black text-[#0B7C57] shadow-xl transition hover:-translate-y-1">Começar agora</button></div></section>
      </main>

      <footer className="bg-[#064E3B] px-5 py-10 text-[#D8F3E6]"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row"><NexusLogo light /><div className="text-sm">© {new Date().getFullYear()} Nexus360. Todos os direitos reservados.</div><div className="flex gap-5 text-sm"><Link to="/legal/privacy">Privacidade</Link><Link to="/legal/terms">Termos</Link></div></div></footer>

      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#052E22]/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: .96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-white p-7 shadow-2xl sm:p-9">
              <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.18em] text-[#0F9F6E]">Teste grátis de 3 dias</div><h3 className="mt-2 text-3xl font-black tracking-[-.04em]">Comece no plano {selectedPlan.name}</h3></div><button onClick={() => setSelectedPlan(null)} className="rounded-xl bg-[#EEF7F2] p-2 text-[#587064]"><X /></button></div>
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#ECF9F2] p-4"><div><div className="text-xs font-bold text-[#587064]">Após o período de teste</div><div className="mt-1 font-black">{formatMoney(selectedPlan.priceMonthly)}/mês</div></div><div className="flex items-center gap-2 text-xs font-bold text-[#0F9F6E]"><CreditCard size={16} /> sem cartão agora</div></div>
              <form onSubmit={submitTrial} className="mt-6 space-y-4">
                <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#587064]">Seu nome</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-2xl border border-[#D5E7DD] px-4 py-3.5 outline-none transition focus:border-[#0F9F6E] focus:ring-4 focus:ring-[#0F9F6E]/10" placeholder="Como podemos te chamar?" /></label>
                <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#587064]">Empresa</span><input required value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} className="w-full rounded-2xl border border-[#D5E7DD] px-4 py-3.5 outline-none transition focus:border-[#0F9F6E] focus:ring-4 focus:ring-[#0F9F6E]/10" placeholder="Nome da sua empresa" /></label>
                <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#587064]">E-mail profissional</span><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-2xl border border-[#D5E7DD] px-4 py-3.5 outline-none transition focus:border-[#0F9F6E] focus:ring-4 focus:ring-[#0F9F6E]/10" placeholder="voce@empresa.com.br" /></label>
                <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#587064]">Telefone com DDD</span><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71887C]" size={18} /><input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-2xl border border-[#D5E7DD] px-4 py-3.5 pl-12 outline-none transition focus:border-[#0F9F6E] focus:ring-4 focus:ring-[#0F9F6E]/10" placeholder="(11) 99999-9999" /></div></label>
                <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-[#587064]">Crie uma senha</span><input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-2xl border border-[#D5E7DD] px-4 py-3.5 outline-none transition focus:border-[#0F9F6E] focus:ring-4 focus:ring-[#0F9F6E]/10" placeholder="8+ caracteres, maiúscula, minúscula e número" /></label>
                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
                <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F9F6E] px-5 py-4 font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-[#087A55] disabled:opacity-60">{loading ? "Criando seu ambiente..." : "Iniciar meu teste grátis"} {!loading && <ArrowRight size={18} />}</button>
                <p className="text-center text-[11px] leading-5 text-[#71887C]">Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade. Nenhuma cobrança será feita durante o teste.</p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
