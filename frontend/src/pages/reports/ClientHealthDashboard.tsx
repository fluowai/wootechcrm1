import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Users,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  DollarSign,
  Clock,
  MessageSquare,
  Briefcase,
  X,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return { bg: "bg-green-500", text: "text-green-600", label: "Saudável" };
  if (score >= 60) return { bg: "bg-yellow-500", text: "text-yellow-600", label: "Atenção" };
  if (score >= 40) return { bg: "bg-orange-500", text: "text-orange-600", label: "Crítico" };
  return { bg: "bg-red-500", text: "text-red-600", label: "Urgente" };
};

const TREND_ICON: Record<string, any> = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const TREND_COLOR: Record<string, string> = {
  up: "text-green-600",
  down: "text-red-600",
  stable: "text-gray-400",
};

export default function ClientHealthDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [recalculating, setRecalculating] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [sumRes, cliRes] = await Promise.all([
        apiFetch("/api/health-score/summary"),
        apiFetch("/api/health-score"),
      ]);
      const sumData = await sumRes.json();
      const cliData = await cliRes.json();
      setSummary(sumData);
      setClients(Array.isArray(cliData) ? cliData : cliData.clients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecalculate = async (clientId: string) => {
    setRecalculating(clientId);
    try {
      await apiFetch(`/api/health-score/calculate/${clientId}`, { method: "POST" });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculating(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
        Carregando health scores...
      </div>
    );

  const summaryCards = [
    { label: "Total de Clientes", value: summary?.total ?? 0, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Crítico", value: summary?.critical ?? 0, icon: AlertTriangle, color: "bg-red-50 text-red-600" },
    { label: "Alto Risco", value: summary?.high ?? 0, icon: Activity, color: "bg-orange-50 text-orange-600" },
    { label: "Médio", value: summary?.medium ?? 0, icon: Heart, color: "bg-yellow-50 text-yellow-600" },
    { label: "Baixo Risco", value: summary?.low ?? 0, icon: Heart, color: "bg-green-50 text-green-600" },
  ];

  return (
    <div className="flex flex-col gap-8 p-2">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
          Health Score Dashboard
        </h1>
        <p className="text-gray-500">Monitoramento da saúde dos clientes em tempo real.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass-card flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients
          .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
          .map((client) => {
            const scoreColor = SCORE_COLOR(client.score ?? 0);
            const TrendIcon = TREND_ICON[client.trend] || Minus;
            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="glass-card cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">{client.clientName || client.name || "Cliente"}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecalculate(client.clientId);
                    }}
                    disabled={recalculating === client.clientId}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Recalcular"
                  >
                    <RefreshCw
                      size={14}
                      className={recalculating === client.clientId ? "animate-spin" : ""}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${client.score ?? 0}%` }}
                      className={`h-full ${scoreColor.bg} transition-all duration-1000`}
                    />
                  </div>
                  <span className={`text-lg font-black ${scoreColor.text}`}>
                    {client.score ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${scoreColor.text} bg-opacity-10 ${
                      scoreColor.bg.replace("bg-", "bg-").replace("500", "100")
                    }`}
                  >
                    {scoreColor.label}
                  </span>
                  <div className={`flex items-center gap-1 text-xs font-bold ${TREND_COLOR[client.trend] || "text-gray-400"}`}>
                    <TrendIcon size={14} />
                    {client.trend === "up" ? "Melhorando" : client.trend === "down" ? "Piorando" : "Estável"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-500 uppercase">Expansao</p>
                    <p className="font-black text-blue-700">{client.expansionScore ?? 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-500 uppercase">MRR</p>
                    <p className="font-black text-emerald-700">{Number(client.monthlyRecurring || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                </div>
                {client.flags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {client.flags.slice(0, 3).map((flag: string) => (
                      <span key={flag} className="px-2 py-1 rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">{flag}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        {clients.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Heart size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">Nenhum cliente com health score</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedClient && (
          <ClientDetailModal
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientDetailModal({ client, onClose }: { client: any; onClose: () => void }) {
  const scoreColor = SCORE_COLOR(client.score ?? 0);
  const prevScoreColor = SCORE_COLOR(client.prevScore ?? 0);

  const details = [
    { label: "Score Atual", value: client.score ?? 0, color: scoreColor.text },
    { label: "Score Anterior", value: client.prevScore ?? 0, color: prevScoreColor.text },
    { label: "Risk Level", value: client.riskLevel || scoreColor.label },
    { label: "Último Contato", value: client.lastContactAt ? new Date(client.lastContactAt).toLocaleDateString("pt-BR") : "N/A" },
    { label: "Pagamentos (dias)", value: client.paymentsInDay ?? "N/A" },
    { label: "Engajamento", value: client.engagementRate != null ? `${client.engagementRate}%` : "N/A" },
    { label: "Status Projeto", value: client.projectStatus || "N/A" },
    { label: "Score Expansao", value: client.expansionScore ?? 0 },
    { label: "Receita Mensal", value: Number(client.monthlyRecurring || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg relative z-10">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-gray-900">{client.clientName || client.name}</h2>
            <span className={`text-[10px] font-black uppercase ${scoreColor.text}`}>
              {scoreColor.label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${client.score ?? 0}%` }}
                className={`h-full ${scoreColor.bg} transition-all duration-1000`}
              />
            </div>
            <span className={`text-3xl font-black ${scoreColor.text}`}>{client.score ?? 0}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {details.map((d, i) => (
              <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{d.label}</p>
                <p className={`font-bold text-lg ${d.color || "text-gray-700"}`}>{d.value}</p>
              </div>
            ))}
          </div>
          {client.flags?.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Alertas</p>
              <div className="flex flex-wrap gap-2">
                {client.flags.map((flag: string) => (
                  <span key={flag} className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">{flag}</span>
                ))}
              </div>
            </div>
          )}
          {client.recommendation && (
            <div className="mt-5 p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Recomendacao Nexus</p>
              <p className="text-sm font-semibold text-blue-900">{client.recommendation}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
