import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  GitBranch,
  Globe2,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Monitor,
  PieChart,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";

const agendorInspiredFeatures = [
  {
    title: "Funis e negociações",
    description: "Kanban, listagem, metas e relatórios para acompanhar oportunidades do primeiro contato ao fechamento.",
    icon: Target
  },
  {
    title: "Tarefas e follow-ups",
    description: "Rotina comercial com lembretes, reuniões, atividades e histórico de interação por lead ou cliente.",
    icon: CalendarDays
  },
  {
    title: "Histórico consultivo",
    description: "Contexto completo para vender com mais segurança: notas, propostas, contratos, reuniões e próximos passos.",
    icon: BookOpen
  },
  {
    title: "Relatórios de performance",
    description: "Indicadores de pipeline, ticket médio, conversão, receita prevista, metas e gargalos por etapa.",
    icon: BarChart3
  },
  {
    title: "Campos e processos flexíveis",
    description: "Estruture sua operação por canal, nicho, serviço, equipe, etapa e perfil de cliente ideal.",
    icon: GitBranch
  },
  {
    title: "WhatsApp e comunicação",
    description: "Atalhos de contato, histórico e base pronta para transformar conversas em dados comerciais.",
    icon: MessageCircle
  }
];

const nexusOnlyFeatures = [
  {
    title: "Captação ativa para agências",
    description: "Busque empresas por nicho, cidade e oportunidade. Envie leads prontos para o CRM com análise de IA.",
    icon: Search
  },
  {
    title: "Propostas e contratos",
    description: "Gere propostas comerciais, aceite público, onboarding de cliente e contrato com dados do negócio.",
    icon: FileText
  },
  {
    title: "Operação de delivery",
    description: "Controle entregáveis, aprovações, catálogo de serviços, horas apontadas e saúde do cliente.",
    icon: ClipboardList
  },
  {
    title: "Agentes de IA comerciais",
    description: "Use IA para diagnóstico, conteúdo, follow-up, reuniões, prompts e recomendações de crescimento.",
    icon: Bot
  }
];

const journey = [
  "Planejamento",
  "Prospecção",
  "Qualificação",
  "Follow-up",
  "Proposta",
  "Fechamento",
  "Onboarding",
  "Entrega",
  "Retenção"
];

const comparison = [
  {
    item: "CRM consultivo",
    agendor: "Forte para vendas B2B consultivas",
    nexus: "CRM consultivo com camada de agência"
  },
  {
    item: "WhatsApp e atividades",
    agendor: "Comunicação integrada e rotinas comerciais",
    nexus: "Atalhos, agenda, Nexus Meet e base para omnichannel"
  },
  {
    item: "Produtos e propostas",
    agendor: "Portfólio, propostas e histórico comercial",
    nexus: "Propostas, contrato, serviço vendido e onboarding"
  },
  {
    item: "Operação pós-venda",
    agendor: "Pós-venda e gestão comercial",
    nexus: "Delivery, aprovações, horas, health score e cliente 360"
  },
  {
    item: "IA",
    agendor: "Ecossistema com IA e automação",
    nexus: "Agentes de IA focados em agência, conteúdo e growth"
  }
];

const productCards = [
  { label: "Leads captados", value: "1.250", icon: Search, accent: "bg-emerald-50 text-emerald-700" },
  { label: "Pipeline aberto", value: "R$ 284k", icon: TrendingUp, accent: "bg-blue-50 text-blue-700" },
  { label: "Contratos", value: "38", icon: FileText, accent: "bg-violet-50 text-violet-700" },
  { label: "Health score", value: "87%", icon: PieChart, accent: "bg-amber-50 text-amber-700" }
];

function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    ["Recursos", "#recursos"],
    ["Comparativo", "#comparativo"],
    ["Operação 360", "#operacao"],
    ["FAQ", "#faq"]
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/site" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#155EEF] text-white shadow-lg shadow-blue-200">
            <Monitor size={21} />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-slate-950">Nexus360</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Agency CRM</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="text-sm font-bold text-slate-600 transition hover:text-[#155EEF]">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:text-[#155EEF]">
            Entrar
          </Link>
          <a href="#demo" className="rounded-xl bg-[#00B87A] px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-[#009F6A]">
            Criar conta grátis
          </a>
        </div>

        <button onClick={() => setOpen(!open)} className="rounded-xl p-2 text-slate-700 md:hidden">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100 bg-white px-5 py-5 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {links.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setOpen(false)} className="text-base font-bold text-slate-800">
                  {label}
                </a>
              ))}
              <Link to="/login" className="rounded-xl border border-slate-200 px-4 py-3 text-center font-bold text-slate-700">
                Entrar
              </Link>
              <a href="#demo" className="rounded-xl bg-[#00B87A] px-4 py-3 text-center font-black text-white">
                Criar conta grátis
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function MiniPipeline() {
  const columns = [
    ["Novo", "Clínica Odonto", "R$ 4.800"],
    ["Qualificação", "E-commerce Fit", "R$ 9.200"],
    ["Proposta", "Advocacia Lima", "R$ 6.500"],
    ["Ganho", "Imobiliária Max", "R$ 12.000"]
  ];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Pipeline comercial</div>
          <div className="text-lg font-black text-slate-950">Funil de vendas consultivas</div>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">+24%</div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {columns.map(([stage, name, value], index) => (
          <div key={stage} className="rounded-2xl bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stage}</span>
              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">{index + 3}</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="mb-2 text-sm font-black text-slate-900">{name}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{value}</span>
                <span className="h-6 w-6 rounded-full bg-[#155EEF] text-center text-[10px] font-black leading-6 text-white">N</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-200">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-6 py-6 text-left">
        <span className="text-lg font-black text-slate-950">{question}</span>
        <ChevronDown className={`shrink-0 text-[#155EEF] transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pb-6 text-slate-600"
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F7FAFC] text-slate-950">
      <Navbar />

      <section className="relative overflow-hidden bg-white px-5 pb-24 pt-36 lg:px-8 lg:pb-32">
        <div className="absolute left-1/2 top-20 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-[#E8F7F0] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-[#00B87A]" />
              CRM + operação 360 para agências
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-7xl">
              A central de gestão comercial feita para agências venderem, entregarem e reterem melhor.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-600">
              O Nexus360 combina CRM consultivo, captação de leads, propostas, contratos, delivery, financeiro e agentes de IA em uma plataforma única para agências de marketing.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00B87A] px-8 py-4 text-base font-black text-white shadow-xl shadow-emerald-100 transition hover:bg-[#009F6A]">
                Criar conta grátis
                <ArrowRight size={18} />
              </a>
              <a href="#operacao" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 py-4 text-base font-black text-slate-800 transition hover:border-[#155EEF] hover:text-[#155EEF]">
                <Play size={18} />
                Ver como funciona
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-500">
              <span className="flex items-center gap-2"><Check size={16} className="text-[#00B87A]" /> Acesso imediato</span>
              <span className="flex items-center gap-2"><Check size={16} className="text-[#00B87A]" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-2"><Check size={16} className="text-[#00B87A]" /> Criado para agências</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.1 }} className="relative">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-[2rem] bg-[#155EEF] opacity-10" />
            <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[#00B87A] opacity-10" />
            <MiniPipeline />
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {productCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}>
                    <card.icon size={18} />
                  </div>
                  <div className="text-2xl font-black text-slate-950">{card.value}</div>
                  <div className="text-xs font-bold text-slate-500">{card.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#F7FAFC] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#155EEF]">O que aprendemos com CRMs consultivos</p>
              <h2 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                O vendedor precisa de rotina simples. A agência precisa de visão completa.
              </h2>
            </div>
            <p className="max-w-md text-lg leading-8 text-slate-600">
              O Nexus incorpora os pilares de um CRM B2B consultivo e adiciona a camada que agências precisam depois da venda: contrato, entrega, horas, health score e IA.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {agendorInspiredFeatures.map((feature) => (
              <div key={feature.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#155EEF]">
                  <feature.icon size={22} />
                </div>
                <h3 className="text-lg font-black text-slate-950">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="recursos" className="bg-white px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#00B87A]">Diferencial Nexus360</p>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Além do CRM: uma operação completa para agência de marketing.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {nexusOnlyFeatures.map((feature) => (
              <div key={feature.title} className="rounded-[1.75rem] bg-slate-950 p-7 text-white shadow-xl shadow-slate-200">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#6EE7B7]">
                  <feature.icon size={23} />
                </div>
                <h3 className="text-xl font-black">{feature.title}</h3>
                <p className="mt-4 leading-7 text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="operacao" className="bg-[#0B1220] px-5 py-24 text-white lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Da prospecção à retenção</p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">Uma jornada comercial e operacional no mesmo fluxo.</h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Em CRMs tradicionais, o trabalho costuma terminar no fechamento. No Nexus, a venda vira onboarding, serviço, tarefa, entrega, cobrança, saúde do cliente e oportunidade de expansão.
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {journey.map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#00B87A] text-sm font-black text-white">{index + 1}</div>
                  <div className="font-black">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="comparativo" className="bg-white px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#155EEF]">Comparativo estratégico</p>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Agendor é forte em vendas consultivas. Nexus quer ser o CRM operacional das agências.</h2>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-100">
            <div className="grid grid-cols-3 bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-widest text-white">
              <div>Critério</div>
              <div>Agendor</div>
              <div>Nexus360</div>
            </div>
            {comparison.map((row) => (
              <div key={row.item} className="grid grid-cols-1 gap-4 border-t border-slate-100 px-6 py-5 md:grid-cols-3 md:gap-0">
                <div className="font-black text-slate-950">{row.item}</div>
                <div className="text-slate-600">{row.agendor}</div>
                <div className="font-bold text-slate-800">{row.nexus}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7FAFC] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-[#00B87A]">Crescimento possível</p>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Funções que podem levar o Nexus além do CRM.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Score de expansão", "Detectar clientes com chance de upsell por resultados, uso, reuniões e tickets."],
              ["Forecast por contrato", "Projetar receita recorrente, setup, churn e expansão por carteira de cliente."],
              ["Playbooks por nicho", "Modelos de funil, proposta, contrato e entregáveis para advocacia, saúde, varejo e B2B."],
              ["Assistente de vendedor", "IA que recomenda próxima ação, mensagem, objeção e follow-up por etapa."],
              ["Portal executivo do cliente", "Cliente acompanha entregas, aprovações, relatórios e próximos passos."],
              ["Benchmark de agência", "Comparar conversão, margem, horas e retenção entre contas e serviços vendidos."]
            ].map(([title, desc]) => (
              <div key={title} className="rounded-[1.5rem] border border-slate-200 bg-white p-7">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-950">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="bg-white px-5 py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-[2.5rem] bg-[#155EEF] p-8 text-white shadow-2xl shadow-blue-200 md:p-12 lg:grid-cols-[1fr_0.8fr] lg:p-16">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-blue-100">Teste o Nexus360</p>
            <h2 className="text-4xl font-black tracking-tight md:text-6xl">Tenha controle comercial e operacional da sua agência em uma única tela.</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100">
              Comece com CRM, leads e contratos. Evolua para delivery, IA, health score e automações que aumentam retenção.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" className="rounded-2xl bg-white px-8 py-4 text-base font-black text-[#155EEF] transition hover:scale-[1.02]">
                Criar conta grátis
              </Link>
              <a href="#faq" className="rounded-2xl border border-white/25 px-8 py-4 text-base font-black text-white transition hover:bg-white/10">
                Tirar dúvidas
              </a>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white p-5 text-slate-950">
            <div className="mb-5 flex items-center justify-between">
              <div className="font-black">Checklist de implantação</div>
              <Bell className="text-[#155EEF]" />
            </div>
            {[
              "Importar leads e clientes",
              "Criar funil comercial",
              "Configurar serviços vendidos",
              "Ativar agentes de IA",
              "Publicar portal do cliente"
            ].map((item) => (
              <div key={item} className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00B87A] text-white"><Check size={14} /></span>
                <span className="text-sm font-bold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#F7FAFC] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black text-slate-950">Perguntas frequentes</h2>
            <p className="mt-4 text-slate-600">As dúvidas mais comuns para quem quer migrar de planilha, CRM simples ou operação fragmentada.</p>
          </div>
          <FAQItem question="O Nexus substitui um CRM como o Agendor?" answer="Para agências, sim, porque cobre o núcleo comercial e adiciona módulos operacionais que normalmente ficam fora de um CRM puro: contratos, entregas, horas, health score e IA." />
          <FAQItem question="O Nexus é só para vendas?" answer="Não. O foco é conectar vendas, onboarding, delivery e retenção, para que a agência veja o ciclo completo do cliente." />
          <FAQItem question="Consigo usar com equipe comercial e equipe de entrega?" answer="Sim. A plataforma já tem CRM, tarefas, calendário, clientes, projetos, entregáveis, catálogo de serviços e apontamento de horas." />
          <FAQItem question="A IA já faz parte do produto?" answer="Sim. O Nexus tem estrutura de agentes, geração de conteúdo, análise de leads, prompts e apoio para reuniões e propostas." />
        </div>
      </section>

      <footer className="bg-slate-950 px-5 py-12 text-white lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#155EEF] text-white">
              <Monitor size={20} />
            </div>
            <div>
              <div className="font-black">Nexus360</div>
              <div className="text-xs text-slate-500">CRM e operação 360 para agências.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-bold text-slate-400">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#comparativo" className="hover:text-white">Comparativo</a>
            <a href="#demo" className="hover:text-white">Criar conta</a>
            <Link to="/login" className="hover:text-white">Entrar</Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck size={16} />
            Dados seguros e operação centralizada.
          </div>
        </div>
      </footer>
    </main>
  );
}
