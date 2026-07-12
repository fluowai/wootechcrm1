import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Building2, 
  Mail, 
  FileText,
  Lock,
  Globe,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const API_URL = rawApiUrl === 'same-origin' ? '' : rawApiUrl;

export default function PublicProposal() {
  const { slug } = useParams();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [formData, setFormData] = useState({ corporateName: '', cnpj: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/public/proposals/${slug}`)
      .then(res => res.json())
      .then(data => {
        setProposal(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/public/proposals/${slug}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corporateName: formData.corporateName, cnpj: formData.cnpj, email: formData.email, phone: formData.phone })
      });
      
      if (!res.ok) throw new Error("Erro ao aceitar proposta");
      
      setAccepted(true);
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao processar seu aceite. Por favor, tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Autenticando Proposta...</p>
      </div>
    </div>
  );

  if (!proposal) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Proposta expirada ou inexistente.</div>;

  const content = proposal.content;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header Premium */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 py-4">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
             {proposal.logoUrl ? (
               <img src={proposal.logoUrl} alt="Logo" className="h-8 w-auto" />
             ) : (
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black">N</div>
             )}
             <span className="font-black text-slate-900 tracking-tight text-xl">{proposal.organization?.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest border border-slate-100 px-3 py-1.5 rounded-full bg-white shadow-sm">
             <Lock size={12} className="text-emerald-500" /> Ambiente Seguro Nexus360
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          
          {/* Hero Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center md:text-left">
            <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">Proposta Estratégica Exclusive</span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[0.9]">{content.headline}</h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">{content.subheadline}</p>
          </motion.div>

          {/* Intro e Problema */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
             <div className="space-y-4">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">O Cenário Atual</h3>
                <p className="text-lg text-slate-600 leading-relaxed font-medium italic">"{content.introduction}"</p>
             </div>
             <div className="p-8 rounded-[40px] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[60px] rounded-full group-hover:bg-blue-600/40 transition-all duration-700" />
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">O Desafio</h3>
                <p className="text-slate-300 leading-relaxed font-medium">{content.problem}</p>
             </div>
          </div>

          {/* Solução */}
          <div className="space-y-8">
             <div className="text-center md:text-left">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nossa Estratégia de Solução</h2>
                <p className="text-slate-500 font-medium mt-2">Como vamos transformar o seu nicho em uma máquina de resultados.</p>
             </div>
             <div className="p-10 rounded-[40px] bg-white border border-slate-100 shadow-xl shadow-slate-200/50">
                <p className="text-xl text-slate-700 leading-relaxed font-medium">{content.solution}</p>
             </div>
          </div>

          {/* Benefícios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {content.benefits?.map((benefit: string, i: number) => (
               <div key={i} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                     <CheckCircle2 size={20} />
                  </div>
                  <p className="font-bold text-slate-800 leading-tight">{benefit}</p>
               </div>
             ))}
          </div>

          {/* CTA e Fechamento */}
          {!accepted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[50px] p-12 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
               <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <h2 className="text-4xl font-black tracking-tight">{content.callToAction}</h2>
                    <p className="text-blue-100 font-medium">Preencha os dados da sua empresa para ativarmos o fluxo de contrato e iniciarmos o projeto.</p>
                    <div className="flex items-center gap-4 text-xs font-bold text-blue-200 uppercase tracking-widest">
                       <ShieldCheck size={18} /> Dados protegidos por criptografia
                    </div>
                  </div>
                  
                   <form onSubmit={handleAccept} className="bg-white/10 backdrop-blur-md rounded-[32px] p-8 border border-white/20 space-y-4">
                      <input required className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none focus:bg-white/20 transition-all placeholder:text-white/40 font-bold" placeholder="Razão Social / Nome Completo" value={formData.corporateName} onChange={e => setFormData({...formData, corporateName: e.target.value})} />
                      <input required className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none focus:bg-white/20 transition-all placeholder:text-white/40 font-bold" placeholder="CNPJ / CPF" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <input required className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none focus:bg-white/20 transition-all placeholder:text-white/40 font-bold" placeholder="E-mail" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                         <input required className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none focus:bg-white/20 transition-all placeholder:text-white/40 font-bold" placeholder="Telefone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                     
                     <button disabled={submitting} type="submit" className="w-full py-5 bg-white text-blue-600 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 mt-4">
                        {submitting ? <Loader2 className="animate-spin" size={24} /> : 'Aceitar Proposta & Gerar Contrato'}
                        <ArrowRight size={20} />
                     </button>
                  </form>
               </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500 rounded-[50px] p-12 text-center text-white space-y-4 shadow-2xl shadow-emerald-200">
               <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={48} />
               </div>
               <h2 className="text-4xl font-black">Proposta Aceita com Sucesso!</h2>
               <p className="text-emerald-50 font-medium max-w-md mx-auto">Nossa equipe já recebeu seus dados e o contrato está sendo preparado para sua assinatura digital. Seja bem-vindo ao Nexus360.</p>
            </motion.div>
          )}

          {/* Rodapé Customizável */}
          <footer className="pt-20 border-t border-slate-100 flex flex-col items-center gap-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
             <div className="flex items-center gap-6">
                <span className="flex items-center gap-2"><Globe size={14} /> nexus360.com.br</span>
                <span className="flex items-center gap-2"><FileText size={14} /> ID: {proposal.slug}</span>
             </div>
             <p className="text-center">{proposal.footerText || `© ${new Date().getFullYear()} ${proposal.organization?.name}. Todos os direitos reservados.`}</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
