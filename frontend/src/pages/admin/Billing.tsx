import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, CreditCard, Search } from "lucide-react";
import { apiFetch } from "../../lib/api";

type Invoice = { id: string; amount: number | string; status: string; dueDate: string; invoiceUrl?: string; organization?: { name: string } };

export default function AdminBilling() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState({ totalPaid: 0, totalPending: 0, activeSubscribers: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/admin/billing")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Falha ao carregar faturamento");
        setInvoices(body.invoices);
        setMetrics(body.metrics);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar faturamento"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term ? invoices.filter((invoice) => `${invoice.organization?.name || ""} ${invoice.id}`.toLocaleLowerCase("pt-BR").includes(term)) : invoices;
  }, [invoices, search]);
  const money = (value: number | string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Faturas SaaS</h1>
        <p className="text-sm text-gray-500">Faturamento consolidado a partir dos registros reais da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Metric label="Total recebido" value={money(metrics.totalPaid)} icon={CheckCircle2} />
        <Metric label="Total pendente" value={money(metrics.totalPending)} icon={Clock} />
        <Metric label="Assinantes ativos" value={String(metrics.activeSubscribers)} icon={CreditCard} />
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <label className="relative block p-4 border-b border-gray-100">
          <span className="sr-only">Pesquisar por organização ou fatura</span>
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por organização ou ID..." className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" />
        </label>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50 text-xs uppercase text-gray-500"><th className="p-4">Organização</th><th className="p-4">Valor</th><th className="p-4">Vencimento</th><th className="p-4">Status</th><th className="p-4">Documento</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="p-16 text-center text-gray-400">Carregando faturas...</td></tr>
                : error ? <tr><td colSpan={5} role="alert" className="p-16 text-center text-red-600">{error}</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={5} className="p-16 text-center text-gray-400">Nenhuma fatura encontrada.</td></tr>
                : filtered.map((invoice) => <tr key={invoice.id} className="border-t border-gray-100 text-sm">
                  <td className="p-4"><strong>{invoice.organization?.name || "—"}</strong><div className="text-xs text-gray-400">{invoice.id}</div></td>
                  <td className="p-4 font-bold">{money(invoice.amount)}</td>
                  <td className="p-4">{new Date(invoice.dueDate).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4"><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">{invoice.status}</span></td>
                  <td className="p-4">{invoice.invoiceUrl ? <a className="text-primary underline" href={invoice.invoiceUrl} target="_blank" rel="noreferrer">Abrir</a> : "—"}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CreditCard }) {
  return <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm"><Icon className="text-primary mb-4" /><p className="text-xs font-bold uppercase text-gray-400">{label}</p><h2 className="text-2xl font-bold mt-1">{value}</h2></div>;
}
