import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  Gauge,
  Loader2,
  RefreshCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

type AiModel = {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  runtime: string;
  modelId: string;
  contextWindow: number;
  creditCost: number;
  status: string;
  healthStatus: string;
  isDefault: boolean;
  isSelfHosted: boolean;
  lastHealthAt?: string;
};

type AiAgent = {
  id: string;
  key: string;
  name: string;
  description?: string;
  modelId?: string;
  fallbackModelId?: string;
  temperature: number;
  maxTokens: number;
  status: string;
  model?: AiModel;
  fallbackModel?: AiModel;
};

type AiEntitlement = {
  id: string;
  scope: string;
  enabled: boolean;
  rebillingEnabled: boolean;
  markupMultiplier: number;
  monthlyPrice?: number;
  maxRequestsDaily?: number;
  maxRequestsMonthly?: number;
  maxTokensDaily?: number;
  maxTokensMonthly?: number;
  maxCreditsDaily?: number;
  maxCreditsMonthly?: number;
  agentId?: string;
  modelId?: string;
  agent?: AiAgent;
  model?: AiModel;
};

type UsageTotal = {
  agentKey: string;
  modelName: string;
  status: string;
  _count: { _all: number };
  _sum: { totalTokens?: number; credits?: number; estimatedCost?: number };
};

const emptyQuota = {
  scope: "organization",
  enabled: true,
  rebillingEnabled: false,
  markupMultiplier: 1,
  monthlyPrice: "",
  maxRequestsDaily: "",
  maxRequestsMonthly: "",
  maxTokensDaily: "",
  maxTokensMonthly: "",
  maxCreditsDaily: "",
  maxCreditsMonthly: "",
  agentId: "",
  modelId: "",
};

function numberOrUndefined(value: string | number | undefined) {
  if (value === "" || value === undefined || value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function AdminAI() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [entitlements, setEntitlements] = useState<AiEntitlement[]>([]);
  const [usageTotals, setUsageTotals] = useState<UsageTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quotaForm, setQuotaForm] = useState<any>(emptyQuota);

  const activeModels = useMemo(() => models.filter((model) => model.status === "active"), [models]);
  const totals = useMemo(() => {
    return usageTotals.reduce(
      (acc, item) => {
        acc.requests += item._count?._all || 0;
        acc.tokens += item._sum?.totalTokens || 0;
        acc.credits += item._sum?.credits || 0;
        acc.cost += item._sum?.estimatedCost || 0;
        return acc;
      },
      { requests: 0, tokens: 0, credits: 0, cost: 0 }
    );
  }, [usageTotals]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modelsRes, agentsRes, entitlementsRes, usageRes] = await Promise.all([
        apiFetch("/api/ai/models"),
        apiFetch("/api/ai/agents"),
        apiFetch("/api/ai/entitlements"),
        apiFetch("/api/ai/usage?days=30"),
      ]);
      const [modelsData, agentsData, entitlementsData, usageData] = await Promise.all([
        modelsRes.json(),
        agentsRes.json(),
        entitlementsRes.json(),
        usageRes.json(),
      ]);
      setModels(modelsData.models || []);
      setAgents(agentsData.agents || []);
      setEntitlements(entitlementsData.entitlements || []);
      setUsageTotals(usageData.totals || []);
    } catch (error) {
      setMessage("Nao foi possivel carregar a central de IA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const syncModels = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await apiFetch("/api/ai/models/sync", { method: "POST" });
      if (!response.ok) throw new Error("sync failed");
      await loadData();
      setMessage("Modelos sincronizados com o AI Core.");
    } catch {
      setMessage("Falha ao sincronizar modelos. Verifique LiteLLM/Ollama.");
    } finally {
      setSyncing(false);
    }
  };

  const patchModel = async (id: string, data: Partial<AiModel>) => {
    setSaving(id);
    try {
      const response = await apiFetch(`/api/ai/models/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("model update failed");
      await loadData();
    } finally {
      setSaving(null);
    }
  };

  const patchAgent = async (agent: AiAgent) => {
    setSaving(agent.id);
    try {
      const response = await apiFetch(`/api/ai/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
          modelId: agent.modelId || "",
          fallbackModelId: agent.fallbackModelId || "",
          temperature: Number(agent.temperature),
          maxTokens: Number(agent.maxTokens),
          status: agent.status,
        }),
      });
      if (!response.ok) throw new Error("agent update failed");
      await loadData();
      setMessage("Agente atualizado.");
    } catch {
      setMessage("Falha ao atualizar agente.");
    } finally {
      setSaving(null);
    }
  };

  const saveQuota = async () => {
    setSaving("quota");
    setMessage(null);
    const payload = {
      ...quotaForm,
      monthlyPrice: numberOrUndefined(quotaForm.monthlyPrice),
      markupMultiplier: numberOrUndefined(quotaForm.markupMultiplier) ?? 1,
      maxRequestsDaily: numberOrUndefined(quotaForm.maxRequestsDaily),
      maxRequestsMonthly: numberOrUndefined(quotaForm.maxRequestsMonthly),
      maxTokensDaily: numberOrUndefined(quotaForm.maxTokensDaily),
      maxTokensMonthly: numberOrUndefined(quotaForm.maxTokensMonthly),
      maxCreditsDaily: numberOrUndefined(quotaForm.maxCreditsDaily),
      maxCreditsMonthly: numberOrUndefined(quotaForm.maxCreditsMonthly),
    };
    try {
      const response = await apiFetch("/api/ai/entitlements", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("quota failed");
      setQuotaForm(emptyQuota);
      await loadData();
      setMessage("Cota criada e ja aplicada nas chamadas de IA.");
    } catch {
      setMessage("Falha ao salvar cota.");
    } finally {
      setSaving(null);
    }
  };

  const toggleQuota = async (quota: AiEntitlement) => {
    setSaving(quota.id);
    try {
      await apiFetch(`/api/ai/entitlements/${quota.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !quota.enabled }),
      });
      await loadData();
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-gray-500">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Carregando AI Core...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">AI Core & Modelos</h1>
          <p className="text-sm text-gray-500">Modelos, agentes, cotas, rebilling e consumo da IA da Nexus.</p>
        </div>
        <button
          onClick={syncModels}
          disabled={syncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
        >
          {syncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
          Sincronizar AI Core
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={Cpu} label="Modelos ativos" value={activeModels.length.toString()} />
        <Metric icon={Bot} label="Agentes" value={agents.length.toString()} />
        <Metric icon={Zap} label="Creditos 30d" value={totals.credits.toLocaleString("pt-BR")} />
        <Metric icon={Activity} label="Requests 30d" value={totals.requests.toLocaleString("pt-BR")} />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <Brain size={20} className="text-blue-600" />
          <h2 className="font-bold text-gray-950">Modelos visiveis no painel</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {models.map((model) => (
            <div key={model.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-gray-950">{model.displayName || model.name}</p>
                  {model.isDefault && <Badge tone="blue">Padrao</Badge>}
                  {model.isSelfHosted && <Badge tone="gray">Desativado</Badge>}
                </div>
                <p className="mt-1 text-xs text-gray-500">{model.modelId}</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-800">{model.provider}</p>
                <p className="text-xs text-gray-500">{model.runtime}</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-800">{model.contextWindow.toLocaleString("pt-BR")} ctx</p>
                <p className="text-xs text-gray-500">{model.creditCost} credito/base</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={model.status === "active" ? "emerald" : "gray"}>{model.status}</Badge>
                <Badge tone={model.healthStatus === "healthy" ? "emerald" : "amber"}>{model.healthStatus}</Badge>
              </div>
              <div className="flex gap-2 lg:justify-end">
                <button
                  onClick={() => patchModel(model.id, { status: model.status === "active" ? "disabled" : "active" })}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                  title={model.status === "active" ? "Desativar modelo" : "Ativar modelo"}
                >
                  {model.status === "active" ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => patchModel(model.id, { isDefault: true })}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                  title="Definir como padrao"
                >
                  {saving === model.id ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <SlidersHorizontal size={20} className="text-blue-600" />
            <h2 className="font-bold text-gray-950">Agentes e roteamento de modelos</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {agents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                models={models}
                saving={saving === agent.id}
                onChange={(next) => setAgents((current) => current.map((item) => item.id === next.id ? next : item))}
                onSave={patchAgent}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <ShieldCheck size={20} className="text-blue-600" />
            <h2 className="font-bold text-gray-950">Nova cota / plano de IA</h2>
          </div>
          <div className="space-y-4 p-5">
            <label className="block text-xs font-bold uppercase text-gray-500">Escopo</label>
            <select
              value={quotaForm.scope}
              onChange={(event) => setQuotaForm({ ...quotaForm, scope: event.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="organization">Organizacao</option>
              <option value="agent">Agente</option>
              <option value="model">Modelo</option>
            </select>

            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="Agente" value={quotaForm.agentId} onChange={(agentId) => setQuotaForm({ ...quotaForm, agentId })}>
                <option value="">Todos</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </SelectField>
              <SelectField label="Modelo" value={quotaForm.modelId} onChange={(modelId) => setQuotaForm({ ...quotaForm, modelId })}>
                <option value="">Todos</option>
                {models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
              </SelectField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Requests/dia" value={quotaForm.maxRequestsDaily} onChange={(value) => setQuotaForm({ ...quotaForm, maxRequestsDaily: value })} />
              <InputField label="Requests/mes" value={quotaForm.maxRequestsMonthly} onChange={(value) => setQuotaForm({ ...quotaForm, maxRequestsMonthly: value })} />
              <InputField label="Tokens/dia" value={quotaForm.maxTokensDaily} onChange={(value) => setQuotaForm({ ...quotaForm, maxTokensDaily: value })} />
              <InputField label="Tokens/mes" value={quotaForm.maxTokensMonthly} onChange={(value) => setQuotaForm({ ...quotaForm, maxTokensMonthly: value })} />
              <InputField label="Creditos/dia" value={quotaForm.maxCreditsDaily} onChange={(value) => setQuotaForm({ ...quotaForm, maxCreditsDaily: value })} />
              <InputField label="Creditos/mes" value={quotaForm.maxCreditsMonthly} onChange={(value) => setQuotaForm({ ...quotaForm, maxCreditsMonthly: value })} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Preco mensal" value={quotaForm.monthlyPrice} onChange={(value) => setQuotaForm({ ...quotaForm, monthlyPrice: value })} />
              <InputField label="Markup" value={quotaForm.markupMultiplier} onChange={(value) => setQuotaForm({ ...quotaForm, markupMultiplier: value })} />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={quotaForm.rebillingEnabled}
                onChange={(event) => setQuotaForm({ ...quotaForm, rebillingEnabled: event.target.checked })}
              />
              Habilitar rebilling deste pacote
            </label>

            <button
              onClick={saveQuota}
              disabled={saving === "quota"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving === "quota" ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salvar cota
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <Gauge size={20} className="text-blue-600" />
            <h2 className="font-bold text-gray-950">Cotas ativas</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {entitlements.length === 0 && <p className="p-5 text-sm text-gray-500">Nenhuma cota customizada criada.</p>}
            {entitlements.map((quota) => (
              <div key={quota.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-gray-900">{quota.agent?.name || quota.model?.displayName || "Cota geral"}</p>
                    <Badge tone={quota.enabled ? "emerald" : "gray"}>{quota.enabled ? "ativa" : "inativa"}</Badge>
                    {quota.rebillingEnabled && <Badge tone="blue">rebilling</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {quota.scope} · {quota.maxRequestsMonthly || "sem"} req/mes · {quota.maxCreditsMonthly || "sem"} creditos/mes
                  </p>
                </div>
                <button
                  onClick={() => toggleQuota(quota)}
                  className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                  title="Ativar ou pausar cota"
                >
                  {saving === quota.id ? <Loader2 className="animate-spin" size={20} /> : quota.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <Activity size={20} className="text-blue-600" />
            <h2 className="font-bold text-gray-950">Consumo por agente/modelo</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {usageTotals.length === 0 && <p className="p-5 text-sm text-gray-500">Sem consumo registrado nos ultimos 30 dias.</p>}
            {usageTotals.map((item) => (
              <div key={`${item.agentKey}-${item.modelName}-${item.status}`} className="grid gap-3 px-5 py-4 md:grid-cols-4 md:items-center">
                <div>
                  <p className="font-bold text-gray-900">{item.agentKey}</p>
                  <p className="text-xs text-gray-500">{item.modelName}</p>
                </div>
                <Badge tone={item.status === "success" ? "emerald" : item.status === "blocked" ? "amber" : "gray"}>{item.status}</Badge>
                <p className="text-sm font-semibold text-gray-700">{(item._sum?.totalTokens || 0).toLocaleString("pt-BR")} tokens</p>
                <p className="text-sm font-semibold text-gray-700">{item._count?._all || 0} requests</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-gray-950">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function Badge({ tone, children }: { tone: "blue" | "emerald" | "amber" | "gray"; children: ReactNode }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
  };
  return <span className={`rounded-full border px-2 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

function AgentRow({
  agent,
  models,
  saving,
  onChange,
  onSave,
}: {
  agent: AiAgent;
  models: AiModel[];
  saving: boolean;
  onChange: (agent: AiAgent) => void;
  onSave: (agent: AiAgent) => void;
}) {
  return (
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_0.8fr_0.8fr_0.5fr_auto] lg:items-end">
      <div>
        <label className="text-xs font-bold uppercase text-gray-500">{agent.key}</label>
        <input
          value={agent.name}
          onChange={(event) => onChange({ ...agent, name: event.target.value })}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
        />
      </div>
      <SelectField label="Modelo principal" value={agent.modelId || ""} onChange={(modelId) => onChange({ ...agent, modelId })}>
        <option value="">Padrao global</option>
        {models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
      </SelectField>
      <SelectField label="Fallback" value={agent.fallbackModelId || ""} onChange={(fallbackModelId) => onChange({ ...agent, fallbackModelId })}>
        <option value="">Sem fallback</option>
        {models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
      </SelectField>
      <InputField label="Max tokens" value={agent.maxTokens} onChange={(maxTokens) => onChange({ ...agent, maxTokens: Number(maxTokens) })} />
      <button
        onClick={() => onSave(agent)}
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        Salvar
      </button>
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string | number; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-gray-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
      >
        {children}
      </select>
    </label>
  );
}
