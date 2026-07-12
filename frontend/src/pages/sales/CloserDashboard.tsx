import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Calendar, UserCheck, AlertCircle, ArrowRight,
  CheckCircle2, Loader2, FileText, DollarSign,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import CloserPopup from "../../components/CloserPopup";

interface QueueData {
  todayEvents: any[];
  assignedQueue: any[];
  unassigned: any[];
  agendaClients: any[];
}

export default function CloserDashboard() {
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/closing/queue");
      const data = await res.json();
      setQueue(data);
    } catch {
      // Silently fail, queue stays null
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const allPending = [
    ...(queue?.assignedQueue || []),
    ...(queue?.unassigned || []),
    ...(queue?.agendaClients || []),
  ];

  const pendingReview = allPending.filter((c: any) => ["pending", "pending_review"].includes(c.closerStatus));
  const contractPending = allPending.filter((c: any) => ["verified", "contract_pending"].includes(c.closerStatus));
  const signPending = allPending.filter((c: any) => c.closerStatus === "contract_signed");
  const paymentPending = allPending.filter((c: any) => c.closerStatus === "payment_pending");

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Painel do Closer</h1>
          <p className="text-sm text-gray-500 mt-1">{allPending.length} clientes no pipeline de fechamento</p>
        </div>
        <button onClick={loadQueue} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Revisão Pendente", count: pendingReview.length, color: "bg-amber-500", icon: AlertCircle },
          { label: "Contrato Pendente", count: contractPending.length, color: "bg-blue-500", icon: FileText },
          { label: "Assinatura Pendente", count: signPending.length, color: "bg-purple-500", icon: UserCheck },
          { label: "Pagamento Pendente", count: paymentPending.length, color: "bg-emerald-500", icon: DollarSign },
        ].map((card) => (
          <motion.div
            key={card.label}
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-white mb-3`}>
              <card.icon size={20} />
            </div>
            <p className="text-3xl font-black text-gray-900">{card.count}</p>
            <p className="text-sm text-gray-500 font-semibold mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-black text-gray-900">Eventos de Hoje</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {queue?.todayEvents?.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Nenhum evento agendado para hoje</p>
            )}
            {queue?.todayEvents?.slice(0, 5).map((event: any) => (
              <div key={event.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{event.title}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      {new Date(event.startDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-black text-gray-900">Clientes para Revisão</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingReview.length === 0 && (
              <p className="p-5 text-sm text-gray-400">Nenhum cliente pendente de revisão</p>
            )}
            {pendingReview.slice(0, 10).map((client: any) => (
              <div key={client.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{client.corporateName}</p>
                    <p className="text-[10px] text-gray-400">{client.cnpj || "Sem CNPJ"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClient(client.id)}
                  className="flex items-center gap-1 text-primary text-sm font-bold hover:underline"
                >
                  Atender <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-gray-900">Pipeline de Fechamento</h2>
          <span className="text-xs text-gray-400">{allPending.length} no total</span>
        </div>
        <div className="p-5">
          {allPending.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
              <p className="font-bold">Nenhum cliente na fila</p>
              <p className="text-sm">Tudo em dia!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allPending.map((client: any) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      ["pending", "pending_review"].includes(client.closerStatus) ? "bg-amber-500" :
                      client.closerStatus === "verified" ? "bg-blue-500" :
                      client.closerStatus === "contract_pending" ? "bg-purple-500" :
                      client.closerStatus === "contract_signed" ? "bg-indigo-500" :
                      client.closerStatus === "payment_pending" ? "bg-emerald-500" : "bg-gray-300"
                    }`} />
                    <span className="text-sm font-semibold text-gray-700">{client.corporateName}</span>
                    <span className="text-[10px] uppercase font-black text-gray-400 px-2 py-0.5 bg-gray-100 rounded">
                      {client.closerStatus?.replace("_", " ")}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedClient(client.id)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Abrir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedClient && (
        <CloserPopup
          clientId={selectedClient}
          onClose={() => setSelectedClient(null)}
          onComplete={loadQueue}
        />
      )}
    </div>
  );
}
