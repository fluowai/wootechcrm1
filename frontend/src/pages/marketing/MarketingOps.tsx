import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ImageIcon, 
  Video, 
  Type, 
  ExternalLink,
  MessageSquare,
  Filter,
  Sparkles,
  Layout,
  Layers,
  Palette,
  Download,
  ArrowRight,
  Eye,
  Zap,
  Image as ImageIconLucide,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function MarketingOps() {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creativeResult, setCreativeResult] = useState<any>(null);
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [generatingImg, setGeneratingImg] = useState<Record<number, boolean>>({});

  const handleGenerateImage = async (index: number, prompt: string) => {
    setGeneratingImg(prev => ({ ...prev, [index]: true }));
    try {
      const res = await apiFetch('/api/ops/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setSlideImages(prev => ({ ...prev, [index]: data.imageUrl }));
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingImg(prev => ({ ...prev, [index]: false }));
    }
  };

  const fetchCreatives = async () => {
    try {
      const res = await apiFetch(`/api/creatives`);
      const data = await res.json();
      setCreatives(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCreatives(); }, []);

  const handleGenerate = async (type: 'carousel' | 'single') => {
    const theme = (document.getElementById('creative-theme') as HTMLInputElement)?.value;
    if (!theme) return alert("Digite o tema do criativo primeiro!");

    setGenerating(true);
    setCreativeResult(null);
    try {
      const res = await apiFetch('/api/ops/generate-creative', {
        method: 'POST',
        body: JSON.stringify({ theme, type })
      });
      const data = await res.json();
      setCreativeResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const saveToQueue = async () => {
    if (!creativeResult) return;
    try {
      // Mescla as imagens geradas nos slides antes de salvar
      const finalSlides = creativeResult.slides.map((slide: any, idx: number) => ({
        ...slide,
        generatedImage: slideImages[idx] || null
      }));

      await apiFetch('/api/creatives', {
        method: 'POST',
        body: JSON.stringify({
          title: creativeResult.slides?.[0]?.headline || 'Novo Criativo IA',
          type: 'carousel',
          copyText: JSON.stringify(finalSlides),
          contentUrl: slideImages[0] || null, // Usa a primeira imagem como capa
          status: 'pending'
        })
      });
      setCreativeResult(null);
      setSlideImages({});
      fetchCreatives();
      alert("Enviado para a fila de aprovação com artes!");
    } catch (e) {
      alert("Erro ao salvar.");
    }
  };

  return (
    <div className="flex flex-col gap-10 p-2">
      {/* SEÇÃO: CREATIVE MACHINE (MANO) */}
      <section className="bg-slate-950 rounded-[50px] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_30%,#1e3a8a_0%,transparent_50%)] opacity-30" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles size={24} />
               </div>
               <span className="font-black text-xl tracking-tighter uppercase text-blue-400">Creative Machine v2.0</span>
            </div>
            <h1 className="text-6xl font-black leading-[0.9] tracking-tighter">
              A IA que <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Escreve, Educa e Vende.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-md font-medium leading-relaxed">
              O assistente <strong className="text-white">Mano</strong> agora gera roteiros profundos, estilo ChatGPT, prontos para dominar o feed.
            </p>
            
            <div className="flex flex-col gap-4 max-w-lg">
               <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Sobre o que vamos falar hoje?"
                    className="w-full bg-white/5 border border-white/10 p-6 rounded-[24px] outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold text-lg"
                    id="creative-theme"
                  />
                  <Zap className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500" size={24} />
               </div>
               <div className="flex gap-3">
                 <button 
                  onClick={() => handleGenerate('carousel')}
                  disabled={generating}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[24px] transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                 >
                   {generating ? <Loader2 className="animate-spin" /> : <Layout size={20} />} GERAR ESTRATÉGIA COMPLETA
                 </button>
                 <button 
                  onClick={() => handleGenerate('single')}
                  className="bg-white/5 hover:bg-white/10 text-white font-bold px-8 rounded-[24px] transition-all border border-white/10 uppercase text-[10px] tracking-widest"
                 >
                   POST ÚNICO
                 </button>
               </div>
            </div>
          </div>

          {/* PREVIEW MOCKUP */}
          <div className="hidden lg:flex justify-center">
             <div className="w-[380px] h-[480px] bg-white text-slate-900 rounded-[40px] p-10 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700 relative overflow-hidden group">
                <div className="space-y-6">
                   <div className="w-12 h-1 bg-blue-600 rounded-full" />
                   <h3 className="text-3xl font-black leading-tight tracking-tighter">SUA PRÓXIMA CAMPANHA DE ALTO ROI COMEÇA AQUI.</h3>
                   <div className="space-y-2">
                      <div className="w-full h-2 bg-slate-100 rounded-full" />
                      <div className="w-3/4 h-2 bg-slate-100 rounded-full" />
                      <div className="w-1/2 h-2 bg-slate-100 rounded-full" />
                   </div>
                </div>
                <div className="absolute bottom-10 left-10 right-10 flex justify-between items-center">
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white" />)}
                   </div>
                   <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                      <ArrowRight size={20} />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* RESULTADOS DA IA */}
      <AnimatePresence>
        {creativeResult && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex justify-between items-end">
               <div>
                  <h2 className="text-3xl font-black text-gray-900">Roteiro Estratégico</h2>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Desenvolvido por Mano AI Designer</p>
               </div>
               <button 
                onClick={saveToQueue}
                className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-600 transition-all"
               >
                 <Download size={18} /> Salvar Tudo na Fila
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
               {creativeResult.slides?.map((slide: any, idx: number) => (
                 <div key={idx} className="bg-white border border-gray-100 p-8 rounded-[40px] shadow-sm hover:shadow-2xl transition-all space-y-6 relative overflow-hidden group">
                    <div className="flex justify-between items-center">
                       <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black">0{idx + 1}</span>
                       <button 
                        onClick={() => handleGenerateImage(idx, slide.imagePrompt)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                          slideImages[idx] ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        }`}
                       >
                         {generatingImg[idx] ? <Loader2 size={14} className="animate-spin" /> : <ImageIconLucide size={14} />}
                         {slideImages[idx] ? 'Atualizar Arte' : 'Gerar Visual'}
                       </button>
                    </div>

                    {slideImages[idx] && (
                      <div className="aspect-square w-full rounded-3xl overflow-hidden border border-gray-100 shadow-inner">
                        <img src={slideImages[idx]} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <div className="space-y-4">
                       <h4 className="text-xl font-black text-gray-900 leading-tight">{slide.headline}</h4>
                       <p className="text-sm text-gray-500 leading-relaxed font-medium">{slide.copy}</p>
                    </div>

                    <div className="pt-6 border-t border-gray-50 flex flex-col gap-3">
                       <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Conceito Visual:</p>
                       <p className="text-[10px] text-blue-600 font-bold bg-blue-50 p-3 rounded-xl border border-blue-100 italic">
                          "{slide.visualConcept}"
                       </p>
                       <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-600 uppercase">{slide.cta}</span>
                          <button className="text-[10px] font-black uppercase text-gray-400 hover:text-primary flex items-center gap-1">
                             <Eye size={12} /> Ver Arte IA
                          </button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILA DE PRODUÇÃO */}
      <div className="space-y-6 pt-10 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Fila de Produção</h2>
            <p className="text-sm text-gray-500 font-medium">Materiais para revisão final e publicação.</p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-gray-100 px-6 py-3 rounded-2xl hover:bg-gray-50 transition-all font-bold shadow-sm text-xs uppercase tracking-widest">
            <Plus size={18} /> Novo Job Manual
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {creatives.map((item) => (
            <div key={item.id} className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm hover:shadow-lg transition-all flex flex-col gap-4">
               <div className="aspect-square rounded-[24px] bg-gray-50 flex items-center justify-center text-gray-200 border border-gray-100 relative overflow-hidden">
                  {item.type === 'image' ? <ImageIcon size={40} /> : <Type size={40} />}
                  <span className="absolute top-4 left-4 text-[9px] font-black uppercase bg-white px-2 py-1 rounded shadow-sm border border-gray-100">{item.status}</span>
               </div>
               <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
               <div className="flex gap-2 mt-auto">
                  <button className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all">Aprovar</button>
                  <button className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase hover:bg-red-100 transition-all">Ajustar</button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
