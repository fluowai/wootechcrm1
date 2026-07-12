import React, { useState } from 'react';
import { 
  Scale, 
  Shield, 
  Clock, 
  Award, 
  ChevronDown, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  Cpu,
  Globe,
  Users,
  Anchor,
  Briefcase,
  Home,
  Users2,
  Gavel
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import './PremiumTemplate.css';

export type LandingTheme = 'ancora' | 'executive' | 'modern' | 'prestige' | 'elegance';

interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  image?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface LandingConfig {
  theme: LandingTheme;
  firmName: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  whatsappNumber: string;
  services: Service[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  aboutTitle: string;
  aboutText: string;
  aboutImage?: string;
}

const THEME_DEFAULTS: Record<LandingTheme, Partial<LandingConfig>> = {
  ancora: {
    firmName: "ÂNCORA ADVOCACIA",
    heroTitle: "Atendimento jurídico com clareza, agilidade e confiança",
    heroSubtitle: "Soluções jurídicas eficientes e personalizadas para proteger seus direitos e o que é mais importante para você.",
    ctaText: "Fale com um especialista",
  },
  executive: {
    firmName: "MARTINS & ALMEIDA",
    heroTitle: "Advocacia de alta performance para casos complexos",
    heroSubtitle: "Atuação estratégica e personalizada em demandas que exigem excelência, discrição e profundo conhecimento jurídico.",
    ctaText: "Solicitar Atendimento",
  },
  modern: {
    firmName: "CARVALHO & SOUZA",
    heroTitle: "Orientação jurídica segura para você e sua família",
    heroSubtitle: "Acreditamos que o direito deve ser acessível, humano e eficiente. Estamos aqui para ouvir, orientar e encontrar as melhores soluções.",
    ctaText: "Quero atendimento",
  },
  prestige: {
    firmName: "SEU NOME ADVOCACIA",
    heroTitle: "Atendimento jurídico rápido e eficiente para o seu caso",
    heroSubtitle: "Analisamos a sua situação com atenção e estratégia para defender seus direitos e buscar o melhor resultado.",
    ctaText: "Receber análise",
  },
  elegance: {
    firmName: "ANA BEATRIZ ADVOCACIA",
    heroTitle: "Assessoria jurídica com firmeza, elegância e estratégia",
    heroSubtitle: "Soluções jurídicas personalizadas para proteger seus direitos, preservar seu patrimônio e impulsionar seus objetivos.",
    ctaText: "Agendar consulta",
  }
};

const DEFAULT_SERVICES: Service[] = [
  {
    id: "1",
    title: "Direito de Família",
    description: "Divórcio, guarda, pensão alimentícia, partilha de bens e outras demandas familiares.",
    icon: <Users2 />
  },
  {
    id: "2",
    title: "Direito Civil",
    description: "Contratos, indenizações, responsabilidade civil e direitos do consumidor.",
    icon: <Briefcase />
  },
  {
    id: "3",
    title: "Direito Imobiliário",
    description: "Compra e venda de imóveis, contratos, regularização e disputas imobiliárias.",
    icon: <Home />
  }
];

export const PremiumTemplate: React.FC<{ config?: Partial<LandingConfig> }> = ({ config }) => {
  const theme = config?.theme || 'ancora';
  const c = { 
    ...THEME_DEFAULTS[theme], 
    services: DEFAULT_SERVICES,
    faqs: [],
    testimonials: [],
    whatsappNumber: "5511999999999",
    aboutTitle: "Sobre o Escritório",
    aboutText: "Trabalhamos incansavelmente para entregar os melhores resultados aos nossos clientes.",
    ...config 
  } as LandingConfig;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={`pt-container theme-${theme}`}>
      {/* Navigation */}
      <nav className="pt-nav fixed top-0 w-full z-50 shadow-sm">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--pt-accent)] rounded-xl flex items-center justify-center text-white shadow-lg">
              {theme === 'ancora' && <Anchor size={24} />}
              {theme === 'executive' && <Scale size={24} />}
              {theme === 'modern' && <Shield size={24} />}
              {theme === 'prestige' && <Gavel size={24} />}
              {theme === 'elegance' && <Award size={24} />}
            </div>
            <span className="text-xl font-black tracking-tighter pt-heading uppercase">{c.firmName}</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10 font-bold text-xs tracking-widest">
            <a href="#inicio" className="hover:text-[var(--pt-accent)] transition-colors">INÍCIO</a>
            <a href="#servicos" className="hover:text-[var(--pt-accent)] transition-colors">ESPECIALIDADES</a>
            <a href="#sobre" className="hover:text-[var(--pt-accent)] transition-colors">SOBRE</a>
            <a href="#contato" className="pt-btn-primary py-2.5 px-6 text-[10px]">
              {c.ctaText}
            </a>
          </div>

          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="pt-hero">
        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="z-10"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-12 bg-[var(--pt-accent)]"></div>
              <span className="text-[var(--pt-accent)] font-bold tracking-[0.3em] text-xs uppercase">Estratégia . Segurança . Resultados</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-8 pt-heading leading-[1.1] tracking-tight">
              {c.heroTitle}
            </h1>
            <p className="text-xl text-[var(--pt-text-muted)] mb-10 leading-relaxed max-w-xl">
              {c.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <a href="#contato" className="pt-btn-primary text-lg">
                {c.ctaText} <ArrowRight size={20} />
              </a>
              <div className="flex items-center gap-3 text-xs font-bold text-[var(--pt-text-muted)]">
                <CheckCircle2 size={16} className="text-[var(--pt-accent)]" />
                Atendimento sigiloso e 100% seguro
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="hidden lg:block relative"
          >
             <div className="relative z-10 bg-[var(--pt-surface)] rounded-[2.5rem] border border-[var(--pt-accent)]/10 shadow-3xl overflow-hidden aspect-[4/5] flex items-center justify-center">
                {theme === 'ancora' && <img src="/law_office_lobby.png" className="w-full h-full object-cover opacity-80" alt="Legal" />}
                {theme === 'executive' && <div className="w-full h-full bg-slate-900 flex items-center justify-center p-12 text-center"><h2 className="text-4xl text-gold pt-heading opacity-50">EXECUTIVE PRESENCE</h2></div>}
                {theme === 'modern' && <div className="w-full h-full bg-white flex items-center justify-center p-12 text-center text-navy"><h2 className="text-4xl pt-heading opacity-30">MODERN PROTECTION</h2></div>}
                {theme === 'prestige' && <div className="w-full h-full bg-navy-900 flex items-center justify-center p-12 text-center text-white"><h2 className="text-4xl pt-heading opacity-30">PRESTIGE AGILITY</h2></div>}
                {theme === 'elegance' && <div className="w-full h-full bg-wine-900 flex items-center justify-center p-12 text-center text-white"><h2 className="text-4xl pt-heading opacity-30">ELEGANCE STRATEGY</h2></div>}
             </div>
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--pt-accent)]/10 blur-[80px] rounded-full"></div>
             <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[var(--pt-accent)]/20 blur-[100px] rounded-full"></div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-[var(--pt-surface)] py-12 border-y border-[var(--pt-accent)]/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center items-center">
            {['Agilidade', 'Especialização', 'Transparência', 'Humanizado'].map((text, i) => (
              <div key={i} className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <CheckCircle2 size={24} className="text-[var(--pt-accent)]" />
                <span className="text-[10px] font-black tracking-widest uppercase">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="servicos" className="pt-section">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
             <span className="text-[var(--pt-accent)] font-bold tracking-widest text-xs mb-4 block uppercase">ÁREAS DE ATUAÇÃO</span>
             <h2 className="text-4xl md:text-5xl font-black pt-heading leading-tight mb-6">Soluções jurídicas sob medida para você</h2>
             <div className="h-1 w-20 bg-[var(--pt-accent)] mx-auto"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {c.services.map((service, idx) => (
              <motion.div 
                key={service.id}
                whileHover={{ y: -10 }}
                className="pt-card text-center group"
              >
                <div className="pt-icon-box mx-auto group-hover:bg-[var(--pt-accent)] group-hover:text-white transition-all duration-500">
                  {service.icon}
                </div>
                <h3 className="text-xl font-black mb-4 pt-heading">{service.title}</h3>
                <p className="text-[var(--pt-text-muted)] leading-relaxed text-sm">
                  {service.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="pt-section bg-[var(--pt-surface)]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20">
            <div className="lg:w-1/2">
               <h2 className="text-4xl md:text-5xl font-black pt-heading mb-8 leading-tight">Fale com um especialista</h2>
               <p className="text-[var(--pt-text-muted)] mb-12 max-w-sm leading-relaxed">
                  Preencha o formulário ao lado e nossa equipe entrará em contato o mais breve possível para analisar seu caso.
               </p>
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--pt-accent)]/10 flex items-center justify-center text-[var(--pt-accent)]">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ligue agora</p>
                      <p className="font-bold">+55 (11) 99999-9999</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--pt-accent)]/10 flex items-center justify-center text-[var(--pt-accent)]">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                      <p className="font-bold">contato@escritorio.com.br</p>
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="lg:w-1/2 bg-white p-12 rounded-[2rem] shadow-2xl">
               <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <input type="text" placeholder="Nome completo" className="w-full bg-slate-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-[var(--pt-accent)]" />
                    <input type="email" placeholder="E-mail" className="w-full bg-slate-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-[var(--pt-accent)]" />
                  </div>
                  <input type="text" placeholder="WhatsApp" className="w-full bg-slate-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-[var(--pt-accent)]" />
                  <select className="w-full bg-slate-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-[var(--pt-accent)]">
                    <option>Área de atuação</option>
                    <option>Direito de Família</option>
                    <option>Direito Civil</option>
                    <option>Direito Imobiliário</option>
                  </select>
                  <textarea placeholder="Conte brevemente sobre o seu caso" className="w-full bg-slate-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-[var(--pt-accent)] min-h-[120px]"></textarea>
                  <button className="pt-btn-primary w-full justify-center py-4 text-lg">
                    Enviar mensagem <MessageCircle size={20} />
                  </button>
               </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-white text-center">
         <div className="container mx-auto px-6">
            <h2 className="text-2xl font-black pt-heading mb-6">{c.firmName}</h2>
            <p className="text-slate-500 text-xs mb-8">© 2026 {c.firmName} . Todos os direitos reservados.</p>
            <div className="flex justify-center gap-6 text-slate-400">
               <Globe size={18} />
               <MessageCircle size={18} />
               <Shield size={18} />
            </div>
         </div>
      </footer>

      {/* Floating WhatsApp */}
      <a href={`https://wa.me/${c.whatsappNumber}`} className="whatsapp-float">
        <MessageCircle size={32} />
      </a>
    </div>
  );
};
