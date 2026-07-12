import { useState } from "react";
import { 
  X, 
  Calendar, 
  Clock, 
  Mail, 
  MessageSquare, 
  Video, 
  Copy, 
  Check, 
  Loader2,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";

interface Props {
  lead?: { name: string, email: string, phone: string };
  onClose: () => void;
}

export function NexusMeetScheduler({ lead, onClose }: Props) {
  const [formData, setFormData] = useState({
    title: `Reunião Estratégica - ${lead?.name || 'Cliente'}`,
    date: '',
    time: '',
    guestEmail: lead?.email || '',
    guestPhone: lead?.phone || '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{code: string, link: string} | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch('/api/livekit/schedule', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          date: `${formData.date} ${formData.time}`,
          guests: [{ email: formData.guestEmail, phone: formData.guestPhone }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult({ code: data.code, link: data.link });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = `🚀 Convite WooTech Meet Elite\n\n📌 *${formData.title}*\n📅 Data: ${formData.date}\n⏰ Hora: ${formData.time}\n\n🔗 Link de Acesso: ${window.location.origin}${result?.link}\n🔑 Código de Acesso: *${result?.code}*\n\n_Por favor, identifique-se com seu nome real ao entrar._`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.9, y: 20 }} 
        className="bg-[#0F1115] text-white rounded-[40px] border border-gray-800 shadow-2xl w-full max-w-xl overflow-hidden relative z-10"
      >
        <div className="p-8 border-b border-gray-800/50 flex justify-between items-center bg-[#161920]">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
              <Video size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">WooTech Meet Scheduler</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Ambiente de Alta Performance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {!result ? (
            <form onSubmit={handleSchedule} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Título do Evento</label>
                <input 
                  required
                  className="w-full px-4 py-4 bg-[#161920] border border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Data</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      required
                      type="date"
                      className="w-full pl-12 pr-4 py-4 bg-[#161920] border border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Hora</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      required
                      type="time"
                      className="w-full pl-12 pr-4 py-4 bg-[#161920] border border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">E-mail Convidado</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      required
                      type="email"
                      className="w-full pl-12 pr-4 py-4 bg-[#161920] border border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.guestEmail}
                      onChange={e => setFormData({...formData, guestEmail: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">WhatsApp Convidado</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      required
                      className="w-full pl-12 pr-4 py-4 bg-[#161920] border border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50"
                      value={formData.guestPhone}
                      onChange={e => setFormData({...formData, guestPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    <Sparkles size={20} />
                    <span>Gerar Sala Elite & Código</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
               <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/30">
                 <ShieldCheck size={40} />
               </div>
               
               <div>
                 <h3 className="text-2xl font-bold">Sala Gerada com Sucesso!</h3>
                 <p className="text-gray-500 text-sm mt-2">Envie o link e o código para o seu cliente.</p>
               </div>

               <div className="w-full bg-[#161920] p-6 rounded-3xl border border-gray-800 space-y-6">
                 <div>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[2px] mb-3">Código de Acesso Exclusivo</p>
                   <p className="text-5xl font-extrabold text-primary tracking-[8px] font-mono">{result.code}</p>
                 </div>
                 
                 <div className="pt-6 border-t border-gray-800 flex flex-col gap-3">
                   <button 
                    onClick={handleCopy}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all"
                   >
                     {copied ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />}
                     <span>{copied ? 'Copiado!' : 'Copiar Convite WhatsApp'}</span>
                   </button>
                   <button 
                    onClick={onClose}
                    className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold hover:bg-gray-700 transition-all"
                   >
                     Fechar
                   </button>
                 </div>
               </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
