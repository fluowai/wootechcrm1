import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Instagram, 
  Linkedin, 
  Mail, 
  Globe, 
  Send, 
  Copy, 
  Check,
  Calendar,
  Clock,
  History,
  Type,
  ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";

const PROVIDERS = {
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions"
  },
  gemini: {
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models"
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1/chat/completions"
  }
};

function getActiveConfig() {
  const saved = localStorage.getItem("nexus_api_configs");
  if (!saved) return null;
  
  const configs = JSON.parse(saved);
  return configs.find((c: any) => c.enabled);
}

export default function Content() {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("instagram");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  
  // Contexto de Vínculo
  const [clients, setClients] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [generatedArts, setGeneratedArts] = useState<string[]>([]);

  useEffect(() => {
    const config = getActiveConfig();
    setActiveProvider(config);
    
    // Buscar Clientes
    const fetchClients = async () => {
      const res = await apiFetch('/api/clients');
      const data = await res.json();
      setClients(data);
    };
    fetchClients();
  }, []);

  // Buscar Campanhas quando mudar o cliente
  useEffect(() => {
    if (selectedClientId) {
      const fetchCampaigns = async () => {
        const res = await apiFetch(`/api/marketing/campaigns?clientId=${selectedClientId}`);
        const data = await res.json();
        setCampaigns(data);
      };
      fetchCampaigns();
    } else {
      setCampaigns([]);
    }
  }, [selectedClientId]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedArts([]);
    
    try {
      const data = await apiFetch("/api/ai/generate-content", {
        method: "POST",
        body: JSON.stringify({ 
          prompt, 
          type,
          clientId: selectedClientId,
          campaignId: selectedCampaignId
        })
      });
      
      const res = await data.json();
      setGeneratedContent(res.text || "Não foi possível gerar o conteúdo.");
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Erro ao gerar conteúdo com IA no servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateArt = async () => {
    if (!generatedContent) return;
    setIsGeneratingArt(true);
    try {
      // Extract title and bullets from markdown for the art
      const lines = generatedContent.split('\n').filter(l => l.trim() !== '');
      const titulo = lines[0].replace(/[#*]/g, '').trim();
      const conteudos = lines.slice(1, 6).map(l => l.replace(/^[-*]\s*/, '').replace(/[#*]/g, '').trim());

      const res = await apiFetch("/api/ops/generate-image", {
        method: "POST",
        body: JSON.stringify({
          prompt: `${type} profissional sobre "${titulo}". Pontos principais: ${conteudos.join("; ")}`
        })
      });
      const data = await res.json();
      setGeneratedArts(data.paths || (data.imageUrl ? [data.imageUrl] : []));
    } catch (error) {
      console.error("Art Generation Error:", error);
      alert("Erro ao gerar arte para Instagram.");
    } finally {
      setIsGeneratingArt(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const contentTypes = [
    { id: 'instagram', label: 'Legenda Instagram', icon: Instagram, color: 'text-pink-500' },
    { id: 'linkedin', label: 'Post LinkedIn', icon: Linkedin, color: 'text-blue-700' },
    { id: 'email', label: 'Email Marketing', icon: Mail, color: 'text-orange-500' },
    { id: 'blog', label: 'Post Blog / Artigo', icon: Globe, color: 'text-green-600' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">Criador de Conteúdo IA</h1>
          <p className="text-sm sm:text-base text-gray-500">Gere conteúdo de alta conversão em segundos usando IA generativa.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all w-full sm:w-auto text-sm">
            <History size={18} />
            <span>Histórico</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Section */}
        <div className="glass-card flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">O que você quer criar?</label>
            <div className="grid grid-cols-2 gap-3">
              {contentTypes.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-primary bg-blue-50 ring-2 ring-blue-100' 
                        : 'border-gray-100 bg-white hover:border-blue-200'
                    }`}
                  >
                    <Icon size={20} className={t.color} />
                    <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-gray-600'}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Vincular Cliente</label>
              <select 
                className="modal-input font-semibold"
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
              >
                <option value="">Selecione um Cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.tradeName || c.corporateName}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Vincular Campanha</label>
              <select 
                className="modal-input font-semibold"
                value={selectedCampaignId}
                onChange={e => setSelectedCampaignId(e.target.value)}
                disabled={!selectedClientId}
              >
                <option value="">{selectedClientId ? "Selecione a Campanha..." : "Selecione o cliente primeiro"}</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Sobre o que é o post?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Lançamento de um novo curso de tráfego pago focado em iniciantes..."
              className="min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-sm resize-none"
            />
          </div>

          <button
            onClick={() => {
              if (!activeProvider) {
                alert("Configure um provedor de IA em Configurações primeiro!");
                return;
              }
              handleGenerate();
            }}
            disabled={isGenerating || !prompt}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isGenerating || !prompt
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-blue-600 shadow-lg shadow-blue-200 active:scale-95'
            }`}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Sparkles size={20} />
                </motion.div>
                <span>Processando IA...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Gerar Sugestões</span>
              </>
            )}
          </button>
        </div>

        {/* Output Section */}
        <div className="flex flex-col gap-6 h-full">
          {!generatedContent && !isGenerating ? (
            <div className="glass-card flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 border-dashed border-2">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Type size={32} className="text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-400">Resultado da IA</h3>
              <p className="text-gray-400 text-sm mt-2 max-w-xs">
                Seu conteúdo aparecerá aqui assim que você clicar em "Gerar Sugestões".
              </p>
            </div>
          ) : isGenerating ? (
            <div className="glass-card flex-1 flex flex-col gap-6 animate-pulse p-8">
              <div className="h-6 w-3/4 bg-gray-100 rounded" />
              <div className="flex-1 flex flex-col gap-4">
                <div className="h-4 w-full bg-gray-50 rounded" />
                <div className="h-4 w-full bg-gray-50 rounded" />
                <div className="h-4 w-5/6 bg-gray-50 rounded" />
                <div className="h-4 w-full bg-gray-50 rounded" />
                <div className="h-4 w-2/3 bg-gray-50 rounded" />
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card flex-1 flex flex-col bg-white"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center">
                    <Sparkles size={16} className="text-green-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Conteúdo Gerado</h3>
                </div>
                <div className="flex gap-2">
                  {type === 'instagram' && (
                    <button 
                      onClick={generateArt}
                      disabled={isGeneratingArt}
                      className="flex items-center gap-2 bg-blue-50 text-primary px-3 py-2 rounded-lg hover:bg-blue-100 transition-all font-bold text-xs"
                      title="Gerar Arte para Instagram"
                    >
                      {isGeneratingArt ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                      <span>{isGeneratingArt ? 'Gerando...' : 'Gerar Arte'}</span>
                    </button>
                  )}
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                    title="Copiar texto"
                  >
                    {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-gray-500" />}
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500" title="Agendar">
                    <Calendar size={18} />
                  </button>
                </div>
              </div>

              {generatedArts.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ImageIcon size={14} />
                    Artes Geradas ({generatedArts.length})
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {generatedArts.map((path, idx) => (
                      <div key={idx} className="shrink-0 w-32 h-32 rounded-lg overflow-hidden border border-gray-200 group relative">
                        <img src={`/${path}`} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                        <a 
                          href={`/${path}`} 
                          download 
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold"
                        >
                          DOWNLOAD
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="markdown-body prose prose-slate prose-sm max-w-none flex-1 overflow-auto text-gray-700 leading-relaxed">
                <ReactMarkdown>{generatedContent!}</ReactMarkdown>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    <Clock size={12} />
                    <span>Tempo de leitura: ~1 min</span>
                  </div>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-all font-bold shadow-md shadow-blue-200">
                  <Send size={16} />
                  <span>Publicar Agora</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
