import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Sparkles, 
  Copy, 
  ExternalLink,
  Target,
  Image as ImageIcon,
  Type,
  ArrowRight,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProposals = async () => {
    try {
      const res = await apiFetch(`/api/sales/proposals`);
      const data = await res.json();
      setProposals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    alert("Link da proposta copiado!");
  };

  const filteredProposals = proposals.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client?.corporateName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Comercial Machine</h1>
          <p className="text-gray-500 font-medium">Crie propostas irrecusáveis através de links inteligentes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar proposta..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl w-[250px] focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl shadow-slate-200"
          >
            <Plus size={20} />
            <span>Criar Nova Proposta</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProposals.map((item) => (
          <motion.div 
            layoutId={item.id}
            key={item.id} 
            className="bg-white border border-gray-100 p-8 rounded-[32px] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col gap-6 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[40px] flex items-center justify-center text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity">
               <FileText size={32} />
            </div>

            <div className="flex justify-between items-start pr-12">
              <span className={`text-[10px] uppercase font-black px-3 py-1 rounded-lg tracking-widest border ${
                item.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                item.status === 'sent' ? 'bg-blue-100 text-primary border-blue-200' :
                'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {item.status === 'accepted' ? 'Aceita' : item.status === 'sent' ? 'Enviada' : 'Rascunho'}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-gray-900 text-xl group-hover:text-primary transition-colors leading-tight">{item.title}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1.5">
                 <Target size={12} /> {item.client?.corporateName || item.lead?.name || 'Cliente em Prospecção'}
              </p>
            </div>

            <div className="flex items-center gap-4 py-4 border-y border-gray-50">
               <button 
                onClick={() => copyLink(item.slug)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-500 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-gray-100 transition-all"
               >
                 <Copy size={14} /> Link
               </button>
               <a 
                href={`/p/${item.slug}`} 
                target="_blank"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-primary py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all"
               >
                 <ExternalLink size={14} /> Ver
               </a>
            </div>

            <div className="flex items-end justify-between mt-auto">
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Criada em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
               </div>
               <div className="flex gap-2">
                 <button className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
               </div>
            </div>
          </motion.div>
        ))}
        {filteredProposals.length === 0 && !loading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[40px] bg-gray-50/30">
             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300 mb-4">
               <Sparkles size={32} />
             </div>
             <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Nenhuma proposta na agulha.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewProposalModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => { setIsModalOpen(false); fetchProposals(); }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewProposalModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState("");
  const [clientName, setClientName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [footerText, setFooterText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (!niche || !clientName) return alert("Preencha o nicho e o nome do cliente.");
    setGenerating(true);
    try {
      const res = await apiFetch('/api/sales/proposals/generate', {
        method: 'POST',
        body: JSON.stringify({ niche, clientName, services: ['Gestão Estratégica', 'Automação IA', 'CRM'] })
      });
      const data = await res.json();
      setAiContent(data);
      setStep(2);
    } catch {
      alert("Erro ao gerar proposta com IA.");
    } finally {
      setGenerating(true);
      setTimeout(() => setGenerating(false), 500); // Para animação suave
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/api/sales/proposals', {
        method: 'POST',
        body: JSON.stringify({
          title: `Proposta: ${clientName}`,
          content: aiContent,
          logoUrl,
          footerText
        })
      });
      onSuccess();
    } catch {
      alert("Erro ao salvar proposta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gerador de Propostas IA</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Nível Senior Direct Response</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {step === 1 ? (
            <div className="space-y-6">
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nicho / Setor do Cliente</label>
                 <input className="modal-input font-bold" placeholder="Ex: Advocacia Previdenciária, Clínica de Estética..." value={niche} onChange={e => setNiche(e.target.value)} />
               </div>
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome do Lead / Empresa</label>
                 <input className="modal-input font-bold" placeholder="Ex: João da Silva ou Advocacia S/A" value={clientName} onChange={e => setClientName(e.target.value)} />
               </div>
               <button 
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-3 hover:bg-blue-600 transition-all"
               >
                 {generating ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                 Gerar Estratégia de Vendas
               </button>
            </div>
          ) : (
            <div className="space-y-8">
               {/* Preview Rápido */}
               <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100 space-y-3">
                  <h3 className="font-black text-primary text-lg">{aiContent.headline}</h3>
                  <p className="text-xs text-blue-900/60 font-medium leading-relaxed">{aiContent.introduction?.substring(0, 150)}...</p>
               </div>

               <div className="grid grid-cols-2 gap-6">
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                       <ImageIcon size={10} /> URL da sua Logo
                    </label>
                    <input className="modal-input text-xs" placeholder="https://sua-empresa.com/logo.png" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                       <Type size={10} /> Info Rodapé
                    </label>
                    <input className="modal-input text-xs" placeholder="Ex: CNPJ 00.000 / Endereço..." value={footerText} onChange={e => setFooterText(e.target.value)} />
                 </div>
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-400">Voltar</button>
                  <button onClick={handleSave} disabled={submitting} className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center justify-center gap-2">
                    {submitting ? 'Ativando link...' : 'Lançar Proposta ao Vivo'}
                    <ArrowRight size={18} />
                  </button>
               </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function X({ size, className }: { size: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
