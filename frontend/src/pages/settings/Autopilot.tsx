import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Megaphone,
  Play,
  Radar,
  Target,
  Workflow,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

type AutopilotProps = {
  selectedClientId?: string | null;
};

type AutopilotStatus = {
  queue: any[];
  logs: any[];
  tasks: any[];
  pages: any[];
  campaigns: any[];
  leadSources: any[];
  counts: Record<string, number>;
};

const initialForm = {
  objective: 'Gerar oportunidades qualificadas e criar uma operacao comercial completa para vender servicos consultivos.',
  niche: 'empresas B2B',
  city: '',
  state: '',
  country: 'Brasil',
  budget: '0',
  requestedLimit: '100',
  autonomy: 'semi_autonomous',
  publishLanding: true,
};

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
          <strong className="mt-1 block text-2xl font-black text-slate-950">{value}</strong>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

export default function Autopilot({ selectedClientId }: AutopilotProps) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error, setError] = useState('');

  const landingUrl = useMemo(() => {
    const path = result?.landingPage?.publicPath;
    if (!path) return '';
    return `${window.location.origin}${path}`;
  }, [result]);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await apiFetch('/api/autopilot/status');
      if (!response.ok) throw new Error('Falha ao carregar status');
      setStatus(await response.json());
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const updateField = (field: keyof typeof initialForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const runAutopilot = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await apiFetch('/api/autopilot/run', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          clientId: selectedClientId || null,
          budget: Number(form.budget) || 0,
          requestedLimit: Number(form.requestedLimit) || 100,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Falha ao iniciar Autopilot');

      setResult(data);
      await loadStatus();
    } catch (err: any) {
      setError(err?.message || 'Falha ao iniciar Autopilot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700">
              <Bot size={16} />
              Nexus Autopilot
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-950">Operacao autonoma</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              BDR, SDR, closer, marketing, trafego, pagina de captura, funil, tarefas e gestao comercial em um ciclo executavel. Humano so entra para conectar BM e validar tokens.
            </p>
          </div>

          <button
            type="button"
            onClick={runAutopilot}
            disabled={loading || !form.objective.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            Iniciar ciclo
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Workflow} label="Fila" value={status?.counts?.queue || 0} />
        <StatCard icon={FileText} label="Tarefas" value={status?.counts?.tasks || 0} />
        <StatCard icon={Globe} label="Paginas" value={status?.counts?.pages || 0} />
        <StatCard icon={Megaphone} label="Campanhas" value={status?.counts?.campaigns || 0} />
        <StatCard icon={Radar} label="Prospeccoes" value={status?.counts?.leadSources || 0} />
        <StatCard icon={CheckCircle2} label="Runs" value={status?.counts?.logs || 0} />
      </section>

      <main className="grid gap-5 xl:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
            <Target size={18} className="text-blue-700" />
            Comando operacional
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Objetivo</span>
              <textarea
                value={form.objective}
                onChange={(event) => updateField('objective', event.target.value)}
                className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Nicho</span>
                <input
                  value={form.niche}
                  onChange={(event) => updateField('niche', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Leads</span>
                <input
                  value={form.requestedLimit}
                  onChange={(event) => updateField('requestedLimit', event.target.value)}
                  type="number"
                  min="10"
                  max="500"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Cidade</span>
                <input
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Estado</span>
                <input
                  value={form.state}
                  onChange={(event) => updateField('state', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Verba</span>
                <input
                  value={form.budget}
                  onChange={(event) => updateField('budget', event.target.value)}
                  type="number"
                  min="0"
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Autonomia</span>
                <select
                  value={form.autonomy}
                  onChange={(event) => updateField('autonomy', event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="assisted">Assistida</option>
                  <option value="semi_autonomous">Semi-autonoma</option>
                  <option value="autonomous">Autonoma</option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.publishLanding}
                onChange={(event) => updateField('publishLanding', event.target.checked)}
                className="h-4 w-4 accent-blue-700"
              />
              Publicar pagina de captura ao criar
            </label>

            {selectedClientId ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                Cliente selecionado ativo. A fila de agentes e rotina de BM serao vinculadas a ele.
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                Sem cliente selecionado. O ciclo cria campanha, pagina, prospeccao e tarefas globais.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                    <CheckCircle2 size={18} />
                    Ciclo criado
                  </div>
                  <h2 className="mt-2 text-xl font-black text-slate-950">{result.project?.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{result.summary?.objective}</p>
                </div>

                {landingUrl && (
                  <a
                    href={landingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 transition hover:bg-white"
                  >
                    <ExternalLink size={17} />
                    Abrir pagina
                  </a>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {Object.entries(result.summary?.created || {}).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">{key}</span>
                    <strong className="mt-1 block text-xl font-black text-slate-950">{String(value)}</strong>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Regra de autonomia</p>
                <p className="mt-2 text-sm font-bold text-slate-800">
                  {result.summary?.autonomyRule || 'A Nexus executa o ciclo completo; humano so entra para credenciais e tokens.'}
                </p>
                {(result.summary?.requiredHumanActions || []).length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm font-medium text-amber-800">
                    {result.summary.requiredHumanActions.map((item: string) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-800">
                    Nenhuma acao humana pendente. A operacao pode seguir no piloto automatico.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Workflow size={18} className="text-blue-700" />
                Execucoes recentes
              </div>
              {loadingStatus && <Loader2 size={16} className="animate-spin text-slate-400" />}
            </div>

            <div className="space-y-3">
              {(status?.logs || []).length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500">
                  Nenhum ciclo Autopilot executado ainda.
                </div>
              )}

              {(status?.logs || []).map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <strong className="text-sm text-slate-950">{log.prompt}</strong>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{log.response}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
