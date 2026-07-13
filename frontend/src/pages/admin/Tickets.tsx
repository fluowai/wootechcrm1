import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Clock, MessageSquare, Search, User } from "lucide-react";
import { apiFetch } from "../../lib/api";

type Ticket = {
  id: string; subject: string; category: string; priority: string; status: string;
  updatedAt: string; organization?: { name: string };
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState({ open: 0, resolved: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/admin/tickets")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Falha ao carregar chamados");
        setTickets(body.tickets);
        setSummary(body.summary);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar chamados"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term ? tickets.filter((ticket) => `${ticket.subject} ${ticket.organization?.name || ""} ${ticket.id}`.toLocaleLowerCase("pt-BR").includes(term)) : tickets;
  }, [search, tickets]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Suporte Global</h1>
          <p className="text-sm text-gray-500">Chamados reais registrados por todas as organizações.</p>
        </div>
        <div className="flex gap-5 text-sm font-medium text-gray-600">
          <span>{summary.open} pendentes</span><span>{summary.resolved} resolvidos</span>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <label className="relative block p-4 border-b border-gray-100">
          <span className="sr-only">Pesquisar chamados</span>
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar chamados..." className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" />
        </label>
        {loading ? <div className="p-16 text-center text-gray-400">Carregando chamados...</div>
          : error ? <div role="alert" className="p-16 text-center text-red-600">{error}</div>
          : filtered.length === 0 ? <div className="p-16 text-center text-gray-400">Nenhum chamado encontrado.</div>
          : <div className="divide-y divide-gray-100">{filtered.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)}</div>}
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const StatusIcon = ticket.status === "OPEN" ? Clock : ticket.status === "IN_PROGRESS" ? MessageSquare : CheckCircle2;
  return (
    <article className="p-6 flex items-start gap-4">
      <StatusIcon size={20} className="mt-1 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
          <span>{ticket.priority}</span><span>•</span><span>{ticket.category}</span><span>•</span><span>{ticket.status}</span>
        </div>
        <h2 className="mt-2 font-bold text-gray-900">{ticket.subject}</h2>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Building2 size={12} />{ticket.organization?.name || "Organização não identificada"}</span>
          <span className="flex items-center gap-1"><User size={12} />ID: {ticket.id}</span>
          <time dateTime={ticket.updatedAt}>{new Date(ticket.updatedAt).toLocaleString("pt-BR")}</time>
        </div>
      </div>
    </article>
  );
}
