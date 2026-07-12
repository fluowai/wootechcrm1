import { useState, useEffect } from "react";
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  ChevronRight, 
  Search, 
  Calendar,
  AlertCircle,
  Zap,
  CheckCircle2,
  MoreVertical
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function SalesMachine() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await apiFetch(`/api/sales/queue`);
      const data = await res.json();
      setQueue(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("[SALES_PROPOSAL_GENERATE_ERROR]", error);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-widest mb-1">
            <Zap size={14} fill="currentColor" />
            <span>Fila de Alta Prioridade</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sales Machine (SDR/BDR)</h1>
          <p className="text-gray-500 text-sm">Contatos pendentes para qualificação e agendamento.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-gray-200 px-4 py-2 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Hoje</p>
              <p className="text-lg font-bold text-gray-900">{queue.length}</p>
            </div>
            <div className="w-[1px] h-8 bg-gray-100" />
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Meta</p>
              <p className="text-lg font-bold text-gray-900">50</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Task List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {queue.map((lead, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={lead.id}
              className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg">
                  {lead.name.slice(0,1)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{lead.name}</h3>
                  <div className="flex items-center gap-3 mt-1 underline-offset-2">
                    <span className="text-xs text-gray-400 font-medium">{lead.source || 'Orgânico'}</span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md font-bold uppercase">Falar Agora</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden md:flex flex-col items-end">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempo na fila</p>
                   <p className="text-xs font-semibold text-gray-600">14 min</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all">
                    <MessageSquare size={20} />
                  </button>
                  <button className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-primary hover:bg-blue-50 transition-all">
                    <Phone size={20} />
                  </button>
                  <button className="p-3 bg-primary text-white rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-100 transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {queue.length === 0 && !loading && (
            <div className="py-20 flex flex-col items-center justify-center bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl">
               <CheckCircle2 size={48} className="text-green-500 mb-2" />
               <p className="text-gray-900 font-bold">Fila limpa!</p>
               <p className="text-gray-400 text-sm">Todos os leads foram atendidos ou qualificados.</p>
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="glass-card bg-gray-900 text-white border-none p-8">
            <h4 className="font-bold text-lg mb-4">Script Recomendado</h4>
            <div className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-orange-500 pl-4 py-2">
              "Olá [Nome], tudo bem? Vi que você solicitou informações sobre nosso serviço de tráfego pago. Meu objetivo é entender se o seu modelo de negócio está no momento ideal para escalar..."
            </div>
            <button className="w-full mt-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-900/40">
              Gerar Script IA
            </button>
          </div>

          <div className="glass-card">
            <h4 className="font-bold text-gray-900 mb-4">Próximos Agendamentos</h4>
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg text-primary shadow-sm">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Reunião com Maria S.</p>
                    <p className="text-[10px] text-gray-400 font-medium">Hoje às 16:30</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
