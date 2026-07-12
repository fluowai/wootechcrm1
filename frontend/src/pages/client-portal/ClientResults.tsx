import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BarChart3, ExternalLink, Lightbulb, MousePointer, Target, TrendingUp } from "lucide-react";
import { publicApiFetch } from "../../lib/api";

type Report = {
  report: {
    client: { corporateName: string; tradeName?: string | null; segment?: string | null };
    totals: {
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      leads: number;
      ctr: number;
      cpc: number;
      cpa: number;
      roas: number;
    };
    campaigns: Array<{ entityId: string; name: string; platform: string; totals: Report["report"]["totals"] }>;
    recommendations: Array<{ id: string; title: string; description: string; impact: string; status: string }>;
    latestInsight?: { summary: string; severity: string } | null;
    updatedAt: string;
  };
  share: { title?: string | null };
};

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClientResults() {
  const { token } = useParams();
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    publicApiFetch(`/api/client-portal/reports/${token}`)
      .then(async response => {
        if (!response.ok) throw new Error("Relatorio indisponivel");
        return response.json();
      })
      .then(result => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 grid place-items-center text-gray-500">Carregando resultados...</div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-gray-50 grid place-items-center text-gray-500">Relatorio indisponivel.</div>;
  }

  const { report } = data;
  const clientName = report.client.tradeName || report.client.corporateName;
  const cards = [
    { label: "Investimento", value: money(report.totals.spend), icon: BarChart3, color: "text-blue-700 bg-blue-50" },
    { label: "Cliques", value: report.totals.clicks.toLocaleString("pt-BR"), icon: MousePointer, color: "text-emerald-700 bg-emerald-50" },
    { label: "Leads", value: report.totals.leads.toLocaleString("pt-BR"), icon: Target, color: "text-amber-700 bg-amber-50" },
    { label: "CPA", value: money(report.totals.cpa), icon: TrendingUp, color: "text-slate-700 bg-slate-100" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Resultados em quase tempo real</p>
            <h1 className="text-2xl font-bold">{clientName}</h1>
          </div>
          <div className="text-sm text-gray-500">
            Atualizado em {new Date(report.updatedAt).toLocaleString("pt-BR")}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(card => (
            <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {report.latestInsight && (
          <section className="rounded-lg border border-blue-100 bg-blue-50 p-5">
            <div className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
              <Lightbulb size={18} />
              Resumo do agente
            </div>
            <p className="whitespace-pre-line text-sm leading-6 text-blue-900">{report.latestInsight.summary}</p>
          </section>
        )}

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-bold">Campanhas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-5 py-3">Campanha</th>
                  <th className="px-5 py-3">Plataforma</th>
                  <th className="px-5 py-3 text-right">Investimento</th>
                  <th className="px-5 py-3 text-right">CTR</th>
                  <th className="px-5 py-3 text-right">CPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.campaigns.map(campaign => (
                  <tr key={campaign.entityId}>
                    <td className="px-5 py-4 font-medium">{campaign.name}</td>
                    <td className="px-5 py-4 capitalize text-gray-500">{campaign.platform}</td>
                    <td className="px-5 py-4 text-right">{money(campaign.totals.spend)}</td>
                    <td className="px-5 py-4 text-right">{campaign.totals.ctr.toLocaleString("pt-BR")}%</td>
                    <td className="px-5 py-4 text-right">{money(campaign.totals.cpa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {report.recommendations.map(item => (
            <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="font-bold">{item.title}</h3>
                <ExternalLink size={16} className="text-gray-400" />
              </div>
              <p className="text-sm leading-6 text-gray-600">{item.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
