import { useCallback, useEffect, useState } from "react";
import { Activity, Database, MemoryStick, RefreshCw, Server } from "lucide-react";
import { apiFetch } from "../../lib/api";

type MonitorData = {
  status: string;
  database: string;
  latencyMs: number;
  uptimeSeconds?: number;
  memory?: { usedBytes: number; totalBytes: number };
  checkedAt?: string;
};

export default function AdminMonitor() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/admin/monitor");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Monitor indisponível");
      setData(body);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Monitor indisponível");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const formatUptime = (seconds = 0) => `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  const formatMb = (bytes = 0) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  const healthy = data?.status === "healthy" && !error;

  const cards = [
    { label: "API", value: healthy ? "Operacional" : "Indisponível", detail: `${data?.latencyMs ?? "—"} ms`, icon: Activity },
    { label: "Banco de dados", value: data?.database === "healthy" ? "Saudável" : "Indisponível", detail: "Consulta real de conectividade", icon: Database },
    { label: "Uptime do processo", value: formatUptime(data?.uptimeSeconds), detail: "Desde o último deploy/restart", icon: Server },
    { label: "Memória da API", value: formatMb(data?.memory?.usedBytes), detail: `Heap disponível: ${formatMb(data?.memory?.totalBytes)}`, icon: MemoryStick },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoramento do Sistema</h1>
          <p className="text-sm text-gray-500">Indicadores coletados diretamente da API e do banco.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-bold disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {error && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
            <Icon size={22} className="text-primary mb-4" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">{value}</h2>
            <p className="text-xs text-gray-500 mt-2">{detail}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">Última verificação: {data?.checkedAt ? new Date(data.checkedAt).toLocaleString("pt-BR") : "—"}</p>
    </div>
  );
}
