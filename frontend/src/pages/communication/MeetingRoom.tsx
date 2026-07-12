import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Shield, 
  LogOut, 
  Video, 
  Copy, 
  Check, 
  BrainCircuit, 
  CheckCircle, 
  AlertTriangle, 
  ListTodo, 
  FileText,
  User,
  Mail,
  Key,
  Camera,
  Mic,
  Settings,
  ArrowRight
} from "lucide-react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";
import { TranscriptionEngine } from "../../components/TranscriptionEngine";

// Componente interno para ter acesso ao contexto da sala
function MeetingContent({ 
  onNewTranscript 
}: { 
  onNewTranscript: (text: string, sender: string) => void 
}) {
  return (
    <div className="w-full h-full relative">
      <VideoConference />
      <RoomAudioRenderer />
      <TranscriptionEngine onNewTranscript={onNewTranscript} />
    </div>
  );
}

export default function MeetingRoom() {
  const { roomName } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Estados de Entrada
  const [isPreflight, setIsPreflight] = useState(true);
  const [participantInfo, setParticipantInfo] = useState({
    name: localStorage.getItem('nexus_user_name') || '',
    email: '',
    code: searchParams.get('code') || ''
  });
  const [isValidating, setIsValidating] = useState(false);
  
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  
  // Estados para o Supervisor IA
  const [transcriptLines, setTranscriptLines] = useState<{time: string, sender: string, text: string}[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const notepadRef = useRef<HTMLDivElement>(null);
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  // Lógica de Preview de Câmera
  useEffect(() => {
    if (isPreflight) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Camera access denied", err));
    }
  }, [isPreflight]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantInfo.name || !participantInfo.email || !participantInfo.code) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsValidating(true);
    try {
      // 1. Validar Código e Convidado
      const valRes = await apiFetch('/api/livekit/validate-code', {
        method: 'POST',
        body: JSON.stringify({ code: participantInfo.code, email: participantInfo.email })
      });
      
      if (!valRes.ok) {
        const data = await valRes.json();
        throw new Error(data.error || "Código de acesso inválido.");
      }

      // 2. Buscar Token do LiveKit
      const response = await apiFetch('/api/livekit/token', {
        method: 'POST',
        body: JSON.stringify({
          roomName: `nexus-360-${roomName}`,
          participantName: participantInfo.name,
          email: participantInfo.email,
          code: participantInfo.code,
        })
      });
      
      if (!response.ok) throw new Error('Falha ao gerar credenciais de acesso.');

      const data = await response.json();
      setToken(data.token);
      setIsPreflight(false);
      
      // Salvar nome para conveniência
      localStorage.setItem('nexus_user_name', participantInfo.name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appendTranscript = (text: string, sender: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTranscriptLines(prev => [...prev, { time, sender, text }]);
  };

  useEffect(() => {
    if (notepadRef.current) {
      notepadRef.current.scrollTop = notepadRef.current.scrollHeight;
    }
  }, [transcriptLines]);

  const handleEndMeeting = async () => {
    const fullTranscriptStr = transcriptLines.map(t => `[${t.time}] ${t.sender}: ${t.text}`).join('\n');
    if (fullTranscriptStr.length < 50) {
      navigate(-1);
      return;
    }
    setShowFeedback(true);
    setIsAnalyzing(true);
    try {
      const response = await apiFetch('/api/ai/meeting-feedback', {
        method: 'POST',
        body: JSON.stringify({ transcript: fullTranscriptStr })
      });
      if (response.ok) {
        const data = await response.json();
        setFeedbackData(data.feedback);
      }
    } catch (e) {
      console.error("Erro na análise", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // -----------------------------------------------------
  // TELA DE PRE-FLIGHT (SALA DE ESPERA)
  // -----------------------------------------------------
  if (isPreflight) {
    return (
      <div className="fixed inset-0 bg-[#0A0C10] text-white flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Lado Esquerdo: Preview e Branding */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
                <BrainCircuit size={32} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tighter">Nexus Meet <span className="text-primary">Elite</span></h1>
            </div>

            <div className="relative aspect-video bg-[#15181E] rounded-[32px] overflow-hidden border border-gray-800 shadow-2xl group">
               <video 
                 ref={videoPreviewRef} 
                 autoPlay 
                 muted 
                 playsInline 
                 className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
               <div className="absolute bottom-6 left-6 right-6 flex justify-center gap-4">
                  <button className="p-4 bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700 hover:bg-gray-800 transition-all">
                    <Mic size={20} />
                  </button>
                  <button className="p-4 bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700 hover:bg-gray-800 transition-all">
                    <Camera size={20} />
                  </button>
                  <button className="p-4 bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700 hover:bg-gray-800 transition-all">
                    <Settings size={20} />
                  </button>
               </div>
            </div>

            <div className="bg-[#15181E] p-6 rounded-[24px] border border-gray-800/50">
              <div className="flex gap-4 items-start text-sm text-gray-400">
                <Shield className="text-primary mt-1 shrink-0" size={18} />
                <p>Esta reunião é protegida por criptografia ponta-a-ponta e supervisionada por nossa Inteligência Artificial para gerar insights automáticos.</p>
              </div>
            </div>
          </div>

          {/* Lado Direito: Formulário de Entrada */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#15181E] p-10 rounded-[40px] border border-gray-800 shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-2">Pronto para entrar?</h2>
            <p className="text-gray-500 mb-8 text-sm">Preencha seus dados reais para participar da sessão.</p>

            <form onSubmit={handleJoin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Seu Nome Real</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    required
                    placeholder="Como deseja ser chamado?"
                    className="w-full pl-12 pr-4 py-4 bg-[#0A0C10] border border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    value={participantInfo.name}
                    onChange={e => setParticipantInfo({...participantInfo, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">E-mail de Cadastro</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    required
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full pl-12 pr-4 py-4 bg-[#0A0C10] border border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    value={participantInfo.email}
                    onChange={e => setParticipantInfo({...participantInfo, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Código de Acesso</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input 
                    required
                    placeholder="000000"
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-4 bg-[#0A0C10] border border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono tracking-[4px] font-bold text-xl"
                    value={participantInfo.code}
                    onChange={e => setParticipantInfo({...participantInfo, code: e.target.value})}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-400 text-sm animate-shake">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={isValidating}
                className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isValidating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                ) : (
                  <>
                    <span>Entrar na Reunião</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // TELA DE FEEDBACK DO SUPERVISOR (Pós-reunião)
  // -----------------------------------------------------
  if (showFeedback) {
    return (
      <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-4xl w-full bg-[#1A1D23] rounded-3xl p-8 border border-gray-800 shadow-2xl relative">
          
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-purple-600 p-4 rounded-2xl shadow-lg shadow-primary/30">
            <BrainCircuit size={32} className="text-white" />
          </div>

          <h2 className="text-3xl font-bold text-center mt-6 mb-2">Análise do Supervisor IA</h2>
          <p className="text-gray-400 text-center mb-10">Processado via Groq Llama-3 (Ultra-Speed)</p>

          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-6"></div>
              <p className="text-xl font-medium animate-pulse">Lendo transcrição e gerando insights...</p>
              <p className="text-sm text-gray-500 mt-2">Isso leva apenas alguns segundos</p>
            </div>
          ) : feedbackData ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><CheckCircle className="text-green-400"/> Resumo Executivo</h3>
                <p className="text-gray-300 leading-relaxed">{feedbackData.resumo}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">Pontos Fortes</h3>
                  <ul className="space-y-3">
                    {feedbackData.pontosFortes?.map((pt: string, i: number) => (
                      <li key={i} className="flex gap-3 text-gray-300"><span className="text-green-500 mt-1">•</span> {pt}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20">
                  <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2"><AlertTriangle size={20}/> Pontos de Melhoria</h3>
                  <ul className="space-y-3">
                    {feedbackData.pontosMelhoria?.map((pt: string, i: number) => (
                      <li key={i} className="flex gap-3 text-gray-300"><span className="text-red-500 mt-1">•</span> {pt}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20">
                <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2"><ListTodo size={20}/> Próximos Passos</h3>
                <ul className="space-y-3">
                  {feedbackData.proximosPassos?.map((pt: string, i: number) => (
                    <li key={i} className="flex gap-3 text-gray-300"><span className="text-blue-500 mt-1">→</span> {pt}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 text-center">
                <button onClick={() => navigate(-1)} className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/25 transition-all hover:scale-105">
                  Salvar e Voltar ao Dashboard
                </button>
              </div>

            </div>
          ) : (
            <div className="text-center py-10 text-red-400">Falha ao gerar análise.</div>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // TELA PRINCIPAL DA SALA (VÍDEO)
  // -----------------------------------------------------
  if (!livekitUrl) return <div className="fixed inset-0 bg-[#0F1115] text-white flex items-center justify-center p-6 text-center">Sem configuração de LiveKit</div>;
  if (!token) return null; // Já validado no handleJoin

  return (
    <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col overflow-hidden custom-livekit-theme">
      {/* Header Nexus */}
      <div className="h-14 px-6 flex items-center justify-between bg-[#1A1D23] border-b border-gray-800/50 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Video size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">Nexus Meet Pro <span className="text-xs font-normal text-gray-400 ml-2 border border-gray-700 px-2 py-0.5 rounded-full">AI Transcription On</span></span>
        </div>
        
        <div className="flex gap-4 items-center">
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-xs font-bold">
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span className={copied ? "text-green-500" : ""}>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>
          <div className="w-[1px] h-6 bg-gray-700"></div>
          <button onClick={handleEndMeeting} className="flex items-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-red-500/20">
            <BrainCircuit size={16} />
            <span>Encerrar & Analisar IA</span>
          </button>
        </div>
      </div>

      {/* Workspace Principal */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-black">
          <LiveKitRoom
            video={true} 
            audio={true}
            token={token}
            serverUrl={livekitUrl}
            data-lk-theme="default"
            style={{ height: '100%', width: '100%' }}
            onDisconnected={handleEndMeeting}
          >
            <MeetingContent onNewTranscript={appendTranscript} />
          </LiveKitRoom>
        </div>

        {/* Bloco de Notas */}
        <div className="w-80 md:w-96 bg-[#13151A] border-l border-gray-800 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-40">
          <div className="h-14 px-4 flex items-center gap-2 border-b border-gray-800 bg-[#1A1D23]">
            <FileText size={16} className="text-primary" />
            <span className="font-bold text-sm">Bloco de Notas (Ao Vivo)</span>
          </div>

          <div 
            ref={notepadRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          >
            {transcriptLines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center">
                <BrainCircuit size={32} className="mb-3 opacity-50" />
                <p>A transcrição da reunião aparecerá aqui em tempo real.</p>
              </div>
            ) : (
              transcriptLines.map((line, i) => (
                <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-primary text-xs font-bold">{line.sender}</span>
                    <span className="text-gray-500 text-[10px]">{line.time}</span>
                  </div>
                  <div className="text-gray-300 text-sm leading-relaxed bg-gray-800/30 p-3 rounded-tr-xl rounded-b-xl border border-gray-700/30">
                    {line.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
