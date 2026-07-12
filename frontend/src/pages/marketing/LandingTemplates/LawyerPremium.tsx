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
  Linkedin,
  Instagram,
  Facebook
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import './LawyerPremium.css';

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
  aboutImage: string;
}

const DEFAULT_CONFIG: LandingConfig = {
  firmName: "MARTINS & ALMEIDA",
  heroTitle: "Advocacia de alta performance para casos complexos",
  heroSubtitle: "Atuação estratégica e personalizada em demandas que exigem excelência, discrição e profundo conhecimento jurídico.",
  ctaText: "Solicitar Atendimento",
  whatsappNumber: "5511999999999",
  aboutTitle: "Compromisso, ética e excelência na defesa dos seus direitos.",
  aboutText: "Atuação pautada na ética, transparência e dedicação integral a cada caso. Nosso compromisso é oferecer soluções jurídicas eficientes e precisas, sempre com foco na justiça e na proteção dos seus interesses.",
  aboutImage: "/lawyer_man.png",
  services: [
    {
      id: "1",
      title: "Direito Empresarial",
      description: "Assessoria jurídica estratégica para empresas em todos os estágios e segmentos.",
      icon: <Scale />
    },
    {
      id: "2",
      title: "Contratos e Negociações",
      description: "Elaboração, revisão e negociação de contratos com segurança jurídica e foco em resultados.",
      icon: <Shield />
    },
    {
      id: "3",
      title: "Contencioso Cível",
      description: "Atuação estratégica em litígios de alta complexidade em todas as instâncias.",
      icon: <Clock />
    }
  ],
  testimonials: [
    {
      id: "1",
      name: "Ricardo S.",
      role: "CEO, Indústria X",
      content: "O escritório Martins & Almeida foi fundamental para a condução do nosso processo. Profissionais excepcionais."
    },
    {
      id: "2",
      name: "Juliana T.",
      role: "Diretora Financeira",
      content: "Atendimento personalizado e profundo domínio técnico. Recomendo pela excelência e segurança jurídica."
    }
  ],
  faqs: [
    {
      id: "1",
      question: "Como funciona o primeiro atendimento?",
      answer: "Analisamos seu caso detalhadamente em uma reunião inicial para traçar a melhor estratégia jurídica."
    },
    {
      id: "2",
      question: "Quais documentos são necessários?",
      answer: "A lista de documentos varia conforme a área de atuação, mas geralmente solicitamos RG, CPF e comprovante de residência."
    }
  ]
};

export const LawyerPremium: React.FC<{ config?: Partial<LandingConfig> }> = ({ config }) => {
  const c = { ...DEFAULT_CONFIG, ...config };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setActiveFaq(activeFaq === id ? null : id);
  };

  return (
    <div className="lp-container">
      {/* Navigation */}
      <nav className="lp-nav fixed top-0 w-full z-50 transition-all duration-300">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Scale className="text-[var(--lp-gold)]" size={32} />
            <span className="text-xl font-bold tracking-widest lp-heading-serif">{c.firmName}</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium text-sm tracking-wide">
            <a href="#inicio" className="hover:text-[var(--lp-gold)] transition-colors">INÍCIO</a>
            <a href="#servicos" className="hover:text-[var(--lp-gold)] transition-colors">ÁREAS DE ATUAÇÃO</a>
            <a href="#sobre" className="hover:text-[var(--lp-gold)] transition-colors">SOBRE</a>
            <a href="#faq" className="hover:text-[var(--lp-gold)] transition-colors">FAQ</a>
            <a href="#contato" className="lp-btn-gold">CONTATO</a>
          </div>

          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="lp-hero-gradient min-h-screen flex items-center pt-20">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl text-white"
          >
            <span className="text-[var(--lp-gold)] font-bold tracking-[0.3em] text-sm mb-6 block">ESTRATÉGIA . TÉCNICA . RESULTADOS</span>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 lp-heading-serif leading-tight">
              {c.heroTitle}
            </h1>
            <p className="text-xl text-[var(--lp-text-muted)] mb-10 leading-relaxed max-w-2xl">
              {c.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#contato" className="lp-btn-gold text-lg">
                {c.ctaText} <ArrowRight size={20} />
              </a>
              <a href="#servicos" className="border border-white/20 hover:bg-white/10 px-8 py-3 rounded-lg font-semibold transition-all backdrop-blur-sm flex items-center justify-center gap-2">
                Conheça nossas áreas
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="bg-[var(--lp-navy)] py-12 border-y border-[var(--lp-gold)]/20">
        <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Anos de Experiência", value: "15+" },
            { label: "Casos Concluídos", value: "1.200+" },
            { label: "Índice de Satisfação", value: "98%" },
            { label: "Profissionais", value: "20+" }
          ].map((stat, idx) => (
            <div key={idx}>
              <div className="text-3xl font-bold text-[var(--lp-gold)] mb-2">{stat.value}</div>
              <div className="text-xs tracking-widest text-[var(--lp-text-muted)] uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="lp-section bg-gray-50">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-[var(--lp-gold)]"></div>
              <img 
                src={c.aboutImage} 
                alt="Lawyer" 
                className="rounded-2xl shadow-2xl relative z-10 w-full object-cover aspect-[4/5]"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800";
                }}
              />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-[var(--lp-gold)]"></div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[var(--lp-gold)] font-bold tracking-widest text-sm mb-4 block">SOBRE O ESCRITÓRIO</span>
            <h2 className="text-4xl font-bold mb-8 lp-heading-serif text-[var(--lp-navy)]">
              {c.aboutTitle}
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              {c.aboutText}
            </p>
            <ul className="space-y-4 mb-10">
              {[
                "Atendimento Humanizado e Exclusivo",
                "Especialização Técnica Multidisciplinar",
                "Foco em Soluções Ágeis e Eficazes",
                "Transparência e Sigilo Absoluto"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="text-[var(--lp-gold)]" size={20} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <a href="#contato" className="lp-btn-gold">Agendar Consulta</a>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="lp-section">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[var(--lp-gold)] font-bold tracking-widest text-sm mb-4 block">NOSSAS ÁREAS</span>
            <h2 className="text-4xl font-bold lp-heading-serif text-[var(--lp-navy)] mb-6">Soluções jurídicas sob medida para desafios complexos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {c.services.map((service, idx) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="lp-card p-8 group"
              >
                <div className="lp-service-icon group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold mb-4 text-[var(--lp-navy)]">{service.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {service.description}
                </p>
                <a href="#contato" className="text-[var(--lp-gold)] font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                  Saiba mais <ArrowRight size={16} />
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-[var(--lp-navy)] py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[var(--lp-gold)]/5 skew-x-12 translate-x-1/2"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 lp-heading-serif">Precisa de auxílio jurídico especializado?</h2>
          <p className="text-xl text-[var(--lp-text-muted)] mb-10 max-w-2xl mx-auto">
            Estamos prontos para ouvir o seu caso e oferecer a melhor estratégia para proteger seus direitos.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <a href={`https://wa.me/${c.whatsappNumber}`} className="bg-[#25d366] text-white px-8 py-4 rounded-lg font-bold flex items-center justify-center gap-3 hover:brightness-110 transition-all">
              <MessageCircle size={24} /> Falar pelo WhatsApp
            </a>
            <a href="#contato" className="lp-btn-gold px-12 py-4">Enviar Mensagem</a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="lp-section bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <span className="text-[var(--lp-gold)] font-bold tracking-widest text-sm mb-4 block">DÚVIDAS FREQUENTES</span>
              <h2 className="text-4xl font-bold lp-heading-serif text-[var(--lp-navy)] mb-8">Perguntas que recebemos com frequência</h2>
              <p className="text-gray-600 mb-8">
                Separamos as principais dúvidas para ajudar você a entender como trabalhamos e como podemos ajudar no seu caso.
              </p>
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[var(--lp-gold)]/10 rounded-full flex items-center justify-center text-[var(--lp-gold)]">
                    <Phone size={24} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Ainda tem dúvidas?</div>
                    <div className="font-bold text-[var(--lp-navy)]">+55 (11) 4000-1234</div>
                  </div>
                </div>
                <a href="#contato" className="text-[var(--lp-gold)] font-bold hover:underline">Entre em contato direto →</a>
              </div>
            </div>
            <div className="space-y-4">
              {c.faqs.map((faq) => (
                <div key={faq.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-bold text-[var(--lp-navy)]">{faq.question}</span>
                    <ChevronDown 
                      className={`text-[var(--lp-gold)] transition-transform duration-300 ${activeFaq === faq.id ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  <AnimatePresence>
                    {activeFaq === faq.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 text-gray-600 leading-relaxed border-t border-gray-50">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contato" className="lp-section">
        <div className="container mx-auto px-6">
          <div className="bg-[var(--lp-navy)] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            <div className="md:w-2/5 p-12 text-white bg-[var(--lp-navy-light)] relative">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold lp-heading-serif mb-8">Estamos prontos para ouvir e ajudar você.</h2>
                <div className="space-y-8">
                  <div className="flex gap-4">
                    <MapPin className="text-[var(--lp-gold)] shrink-0" />
                    <div>
                      <div className="font-bold mb-1">Nosso Escritório</div>
                      <div className="text-sm text-[var(--lp-text-muted)] leading-relaxed">
                        Av. Paulista, 1.374, 12º andar<br />
                        Bela Vista – São Paulo/SP<br />
                        CEP 01310-100
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Mail className="text-[var(--lp-gold)] shrink-0" />
                    <div>
                      <div className="font-bold mb-1">E-mail</div>
                      <div className="text-sm text-[var(--lp-text-muted)]">contato@martinsalmeida.adv.br</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Phone className="text-[var(--lp-gold)] shrink-0" />
                    <div>
                      <div className="font-bold mb-1">Telefone</div>
                      <div className="text-sm text-[var(--lp-text-muted)]">+55 (11) 4000-1234</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-12">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--lp-gold)] transition-all">
                    <Linkedin size={20} />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--lp-gold)] transition-all">
                    <Instagram size={20} />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[var(--lp-gold)] transition-all">
                    <Facebook size={20} />
                  </a>
                </div>
              </div>
            </div>
            <div className="md:w-3/5 p-12 bg-white">
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[var(--lp-navy)] mb-2 uppercase tracking-wider">Nome Completo</label>
                    <input type="text" className="lp-input" placeholder="Seu nome" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--lp-navy)] mb-2 uppercase tracking-wider">E-mail</label>
                    <input type="email" className="lp-input" placeholder="seu@email.com" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[var(--lp-navy)] mb-2 uppercase tracking-wider">Telefone / WhatsApp</label>
                    <input type="tel" className="lp-input" placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--lp-navy)] mb-2 uppercase tracking-wider">Área de Interesse</label>
                    <select className="lp-input bg-white">
                      <option>Selecione uma área</option>
                      <option>Direito Empresarial</option>
                      <option>Contratos</option>
                      <option>Contencioso Cível</option>
                      <option>Outros</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--lp-navy)] mb-2 uppercase tracking-wider">Mensagem</label>
                  <textarea className="lp-input min-h-[150px]" placeholder="Como podemos ajudar?"></textarea>
                </div>
                <button type="submit" className="lp-btn-gold w-full py-4 text-lg justify-center">
                  Enviar Mensagem <ArrowRight size={20} />
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Seus dados estão protegidos e não serão compartilhados.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Scale className="text-[var(--lp-gold)]" size={32} />
                <span className="text-xl font-bold tracking-widest lp-heading-serif">{c.firmName}</span>
              </div>
              <p className="text-[var(--lp-text-muted)] max-w-md leading-relaxed mb-8">
                Escritório de advocacia com atuação nacional, focado na excelência técnica e na defesa intransigente dos interesses de nossos clientes.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 tracking-widest text-sm text-white uppercase">Links Rápidos</h4>
              <ul className="space-y-4 text-sm text-[var(--lp-text-muted)]">
                <li><a href="#inicio" className="hover:text-[var(--lp-gold)] transition-colors">Início</a></li>
                <li><a href="#servicos" className="hover:text-[var(--lp-gold)] transition-colors">Áreas de Atuação</a></li>
                <li><a href="#sobre" className="hover:text-[var(--lp-gold)] transition-colors">Sobre Nós</a></li>
                <li><a href="#faq" className="hover:text-[var(--lp-gold)] transition-colors">Dúvidas Frequentes</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 tracking-widest text-sm text-white uppercase">Áreas de Atuação</h4>
              <ul className="space-y-4 text-sm text-[var(--lp-text-muted)]">
                <li><a href="#" className="hover:text-[var(--lp-gold)] transition-colors">Direito Empresarial</a></li>
                <li><a href="#" className="hover:text-[var(--lp-gold)] transition-colors">Contratos e Negociações</a></li>
                <li><a href="#" className="hover:text-[var(--lp-gold)] transition-colors">Contencioso Cível</a></li>
                <li><a href="#" className="hover:text-[var(--lp-gold)] transition-colors">Fusões e Aquisições</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:row justify-between items-center gap-4 text-xs text-[var(--lp-text-muted)]">
            <div>© 2026 {c.firmName}. Todos os direitos reservados.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            </div>
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
