import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  PhoneCall,
  RefreshCcw,
  Target,
  Users,
} from "lucide-react";
import { apiFetch, readJsonResponse } from "../../lib/api";

type TgaReport = {
  organization: {
    name: string;
    type: string;
  };
  period: {
    calls: string;
    returns: string;
  };
  metrics: {
    kanbanLeads: number;
    callActivities: number;
    distinctCalledLeads: number;
    interestedLeads: number;
    scheduledReturns: number;
    distinctScheduledLeads: number;
    callCoveragePct: number;
    interestRatePct: number;
    scheduleRatePct: number;
  };
  callsByDate: Array<{ date: string; count: number }>;
  returnsByDate: Array<{ date: string; count: number }>;
  scheduledReturns: Array<{
    id: string;
    leadName: string;
    phone: string;
    startsAtLabel: string;
    sdrName: string;
    department: string;
    status: string;
  }>;
  leads: Array<{
    id: string;
    name: string;
    phone: string;
    callDate: string | null;
    interested: boolean;
    returnAt: string | null;
  }>;
  report: {
    filename: string;
    available: boolean;
  };
};

function formatPct(value: number) {
  return `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  helper: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-gray-950">{value}</p>
          <p className="mt-2 text-sm text-gray-500">{helper}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function BarList({ title, rows }: { title: string; rows: Array<{ date: string; count: number }> }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-950">{title}</h3>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.date} className="grid grid-cols-[56px_1fr_32px] items-center gap-3 text-sm">
            <span className="font-semibold text-gray-600">{row.date}</span>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.max((row.count / max) * 100, 8)}%` }}
              />
            </div>
            <span className="text-right font-black text-gray-900">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const [report, setReport] = useState<TgaReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/reports/tga-sdr");
      if (!response.ok) {
        throw new Error("Nao foi possivel carregar os dados do relatorio.");
      }
      setReport(await readJsonResponse<TgaReport>(response));
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar o relatorio.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const interestedPercent = useMemo(() => {
    if (!report) return "0%";
    return formatPct(report.metrics.interestRatePct);
  }, [report]);

  const downloadPdf = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/reports/tga-sdr/pdf");
      if (!response.ok) throw new Error("PDF indisponivel para download.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = report?.report.filename || "relatorio-sdr-tga-marketing-2026-06.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Erro ao baixar PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-3 text-sm font-semibold text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          Carregando relatorio...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-red-700">
        {error || "Relatorio nao encontrado."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-600">
            <FileText size={16} />
            Relatorio operacional
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
            SDR - {report.organization.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Consolidado das ligacoes feitas, leads interessados e retornos agendados na agenda SDR.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadReport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <RefreshCcw size={17} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!report.report.available || isDownloading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isDownloading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
            Baixar PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Users}
          label="Leads no kanban"
          value={report.metrics.kanbanLeads}
          helper="Base trabalhada"
          tone="bg-slate-100 text-slate-700"
        />
        <MetricCard
          icon={PhoneCall}
          label="Ligacoes feitas"
          value={report.metrics.callActivities}
          helper={`${formatPct(report.metrics.callCoveragePct)} de cobertura`}
          tone="bg-blue-50 text-blue-700"
        />
        <MetricCard
          icon={Target}
          label="Interessados"
          value={report.metrics.interestedLeads}
          helper={`${interestedPercent} sobre ligacoes`}
          tone="bg-emerald-50 text-emerald-700"
        />
        <MetricCard
          icon={CalendarClock}
          label="Retornos"
          value={report.metrics.scheduledReturns}
          helper={`${formatPct(report.metrics.scheduleRatePct)} agendados`}
          tone="bg-orange-50 text-orange-700"
        />
        <MetricCard
          icon={CheckCircle2}
          label="SDR responsavel"
          value="Ana Cristina"
          helper="Agenda SDR vinculada"
          tone="bg-violet-50 text-violet-700"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Periodo de ligacoes</p>
            <p className="mt-1 text-sm font-bold text-gray-950">{report.period.calls}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Periodo de retornos</p>
            <p className="mt-1 text-sm font-bold text-gray-950">{report.period.returns}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Arquivo</p>
            <p className="mt-1 text-sm font-bold text-gray-950">
              {report.report.available ? "PDF disponivel" : "PDF pendente"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BarList title="Ligacoes por data" rows={report.callsByDate} />
        <BarList title="Retornos agendados por data" rows={report.returnsByDate} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-gray-950">Agenda SDR</h2>
            <p className="text-sm text-gray-500">Retornos vinculados a Ana Cristina.</p>
          </div>
          <BarChart3 size={20} className="text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3">Data e hora</th>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">SDR</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.scheduledReturns.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-5 py-3 font-semibold text-gray-700">{event.startsAtLabel}</td>
                  <td className="min-w-[260px] px-5 py-3 font-bold text-gray-950">{event.leadName}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">
                    {event.sdrName} ({event.department})
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      {event.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">{event.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-black text-gray-950">Base trabalhada</h2>
          <p className="text-sm text-gray-500">Lista completa dos leads com ligacao, interesse e retorno.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Telefone</th>
                <th className="px-5 py-3">Ligacao</th>
                <th className="px-5 py-3">Interesse</th>
                <th className="px-5 py-3">Retorno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="min-w-[280px] px-5 py-3 font-bold text-gray-950">{lead.name}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">{lead.phone || "-"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">{lead.callDate || "-"}</td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-bold ${
                        lead.interested ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {lead.interested ? "Sim" : "Nao"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">{lead.returnAt || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
