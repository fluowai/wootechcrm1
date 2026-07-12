import { useState, useEffect } from "react";
import {
  ArrowLeft, Plus, Trash2, Save, AlertCircle,
  ToggleLeft, ToggleRight, ArrowUp, ArrowDown, Sparkles, Loader2
} from "lucide-react";
import { apiFetch } from "../../lib/api";

type IcpFieldType = "text" | "email" | "phone" | "number" | "select" | "multi_select" | "boolean" | "textarea";

interface IcpField {
  key: string;
  label: string;
  type: IcpFieldType;
  required: boolean;
  options?: string[];
  order: number;
  weight?: number;
  scoreMap?: Record<string, number>;
}

interface RoutingRule {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: any;
  target: "SDR" | "BDR" | "CLOSER";
  scoreMin?: number;
  scoreMax?: number;
}

interface Funnel {
  id: string;
  name: string;
  isDefault: boolean;
}

interface FormData {
  name: string;
  description: string;
  icpFields: IcpField[];
  routingRules: RoutingRule[];
  allowScheduling: boolean;
  schedulingMessage: string;
  schedulingLeadTime: number;
  createLead: boolean;
  leadPipelineId: string;
  leadStageId: string;
  createFunnelLead: boolean;
  funnelId: string;
}

const FIELD_TYPES: { value: IcpFieldType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "number", label: "Número" },
  { value: "select", label: "Seleção Única" },
  { value: "multi_select", label: "Múltipla Escolha" },
  { value: "boolean", label: "Sim/Não" },
  { value: "textarea", label: "Texto Longo" },
];

const ROUTING_TARGETS = [
  { value: "SDR", label: "SDR" },
  { value: "BDR", label: "BDR" },
  { value: "CLOSER", label: "CLOSER" },
];

const OPERATORS = [
  { value: "eq", label: "Igual" },
  { value: "neq", label: "Diferente" },
  { value: "gt", label: "Maior que" },
  { value: "gte", label: "Maior ou igual" },
  { value: "lt", label: "Menor que" },
  { value: "lte", label: "Menor ou igual" },
  { value: "in", label: "Está em" },
  { value: "contains", label: "Contém" },
];

function generateKey() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

interface Props {
  form: any | null;
  onSave: () => void;
  onCancel: () => void;
}

export function QualificationFormBuilder({ form, onSave, onCancel }: Props) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);

  useEffect(() => {
    apiFetch("/api/prospecting-funnels/funnels")
      .then((res) => res.json())
      .then((data) => setFunnels(Array.isArray(data) ? data : []))
      .catch(() => setFunnels([]));
  }, []);

  const [data, setData] = useState<FormData>(() => {
    if (form) {
      return {
        name: form.name || "",
        description: form.description || "",
        icpFields: (form.icpFields as IcpField[]) || [],
        routingRules: (form.routingRules as RoutingRule[]) || [],
        allowScheduling: form.allowScheduling !== false,
        schedulingMessage: form.schedulingMessage || "",
        schedulingLeadTime: form.schedulingLeadTime || 60,
        createLead: form.createLead !== false,
        leadPipelineId: form.leadPipelineId || "",
        leadStageId: form.leadStageId || "",
        createFunnelLead: form.createFunnelLead === true,
        funnelId: form.funnelId || "",
      };
    }
    return {
      name: "",
      description: "",
      icpFields: [],
      routingRules: [],
      allowScheduling: true,
      schedulingMessage: "",
      schedulingLeadTime: 60,
      createLead: true,
      leadPipelineId: "",
      leadStageId: "",
      createFunnelLead: false,
      funnelId: "",
    };
  });

  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiBrief, setAiBrief] = useState({ niche: "", targetAudience: "", offer: "", ticket: "", objective: "" });
  const [aiNotice, setAiNotice] = useState("");
  const [error, setError] = useState("");

  const addField = () => {
    const newField: IcpField = {
      key: generateKey(),
      label: "",
      type: "text",
      required: false,
      order: data.icpFields.length + 1,
      weight: 10,
    };
    setData({ ...data, icpFields: [...data.icpFields, newField] });
  };

  const updateField = (index: number, partial: Partial<IcpField>) => {
    const fields = [...data.icpFields];
    fields[index] = { ...fields[index], ...partial };
    setData({ ...data, icpFields: fields });
  };

  const removeField = (index: number) => {
    const fields = data.icpFields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i + 1 }));
    setData({ ...data, icpFields: fields });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= data.icpFields.length) return;
    const fields = [...data.icpFields];
    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
    setData({ ...data, icpFields: fields.map((f, i) => ({ ...f, order: i + 1 })) });
  };

  const addRoutingRule = () => {
    setData({
      ...data,
      routingRules: [...data.routingRules, { field: "", operator: "eq", value: "", target: "SDR" }],
    });
  };

  const updateRoutingRule = (index: number, partial: Partial<RoutingRule>) => {
    const rules = [...data.routingRules];
    rules[index] = { ...rules[index], ...partial };
    setData({ ...data, routingRules: rules });
  };

  const removeRoutingRule = (index: number) => {
    setData({ ...data, routingRules: data.routingRules.filter((_, i) => i !== index) });
  };

  const generateWithAi = async () => {
    if (!aiBrief.niche.trim()) { setError("Informe o nicho do publico-alvo para a IA gerar o formulario"); return; }
    if (!aiBrief.offer.trim()) { setError("Informe o que voce vende para esse publico-alvo"); return; }
    setGeneratingAi(true);
    setError("");
    setAiNotice("");
    try {
      const res = await apiFetch("/api/qualification/forms/generate-ai", {
        method: "POST",
        body: JSON.stringify({ ...aiBrief, fieldCount: 6 }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Erro ao gerar formulÃ¡rio com IA");
      const generated = payload.form || {};
      setData((current) => ({
        ...current,
        name: generated.name || current.name,
        description: generated.description || current.description,
        icpFields: Array.isArray(generated.icpFields) ? generated.icpFields : current.icpFields,
        routingRules: Array.isArray(generated.routingRules) ? generated.routingRules : current.routingRules,
        allowScheduling: generated.allowScheduling ?? current.allowScheduling,
        schedulingMessage: generated.schedulingMessage || current.schedulingMessage,
        schedulingLeadTime: generated.schedulingLeadTime || current.schedulingLeadTime,
        createLead: generated.createLead ?? current.createLead,
        createFunnelLead: generated.createFunnelLead ?? current.createFunnelLead,
      }));
      setAiNotice("Rascunho gerado com Groq. Revise os campos, pesos e regras antes de salvar.");
    } catch (err: any) {
      setError(err.message || "Erro ao gerar formulÃ¡rio com IA");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSave = async () => {
    if (!data.name.trim()) { setError("Nome é obrigatório"); return; }
    if (data.icpFields.length === 0) { setError("Adicione pelo menos um campo ICP"); return; }
    setSaving(true);
    setError("");
    try {
      const method = form ? "PUT" : "POST";
      const url = form ? `/api/qualification/forms/${form.id}` : "/api/qualification/forms";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao salvar");
      }
      onSave();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar formulário");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900">
            {form ? "Editar Formulário" : "Novo Formulário de Qualificação"}
          </h1>
          <p className="text-gray-500 text-sm">Configure os campos ICP, regras de roteamento e agendamento.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-purple-100 p-6 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase tracking-widest mb-1">
              <Sparkles size={15} />
              IA Groq
            </div>
            <h2 className="font-black text-gray-900 text-lg">Criar com ajuda da IA</h2>
            <p className="text-sm text-gray-500">Separe quem voce quer atingir da oferta que voce vende para a IA nao confundir o mercado com o produto final.</p>
          </div>
          {aiNotice && (
            <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
              Rascunho pronto
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nicho do publico-alvo</label>
            <input
              type="text"
              value={aiBrief.niche}
              onChange={(e) => setAiBrief({ ...aiBrief, niche: e.target.value })}
              placeholder="Ex: Imobiliarias, Farmacias, Clinicas"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quem responde (opcional)</label>
            <input
              type="text"
              value={aiBrief.targetAudience}
              onChange={(e) => setAiBrief({ ...aiBrief, targetAudience: e.target.value })}
              placeholder="Ex: donos, socios ou gestores comerciais"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">O que voce vende</label>
            <input
              type="text"
              value={aiBrief.offer}
              onChange={(e) => setAiBrief({ ...aiBrief, offer: e.target.value })}
              placeholder="Ex: servicos de marketing e implantacao de CRM para imobiliarias"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ticket medio (opcional)</label>
            <input
              type="text"
              value={aiBrief.ticket}
              onChange={(e) => setAiBrief({ ...aiBrief, ticket: e.target.value })}
              placeholder="Ex: R$ 3.000/mes"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Objetivo opcional</label>
            <input
              type="text"
              value={aiBrief.objective}
              onChange={(e) => setAiBrief({ ...aiBrief, objective: e.target.value })}
              placeholder="Ex: Agendar diagnostico comercial"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generateWithAi}
            disabled={generatingAi}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all disabled:opacity-50"
          >
            {generatingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generatingAi ? "Gerando..." : "Gerar rascunho com IA"}
          </button>
          {aiNotice && <p className="text-sm text-emerald-700 font-medium">{aiNotice}</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-black text-gray-900 text-lg">Informações Básicas</h2>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Nome do Formulário</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Ex: Qualificação de Leads Farmácias"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Descrição (opcional)</label>
          <textarea
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="Descreva o objetivo deste formulário de qualificação..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm min-h-20 resize-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg">Campos ICP</h2>
          <button
            onClick={addField}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-all"
          >
            <Plus size={16} />
            Adicionar Campo
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Defina os campos que o lead preencherá. Cada campo pode ter um peso para cálculo de score.
        </p>

        {data.icpFields.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-medium text-sm">Nenhum campo ICP definido</p>
            <p className="text-xs text-gray-400 mt-1">Adicione campos para começar a construir seu formulário</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.icpFields.map((field, idx) => (
              <div key={field.key} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1">
                    <button onClick={() => moveField(idx, -1)} className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 disabled:opacity-20" disabled={idx === 0}>
                      <ArrowUp size={12} />
                    </button>
                    <button onClick={() => moveField(idx, 1)} className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 disabled:opacity-20" disabled={idx === data.icpFields.length - 1}>
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        placeholder="Nome do campo"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/20 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(idx, { type: e.target.value as IcpFieldType })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/20 mt-1 bg-white"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Peso (score)</label>
                      <input
                        type="number"
                        value={field.weight ?? 10}
                        onChange={(e) => updateField(idx, { weight: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/20 mt-1"
                      />
                    </div>
                    <div className="flex items-end gap-3">
                      <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(idx, { required: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs font-bold text-gray-600">Obrigatório</span>
                      </label>
                      <button
                        onClick={() => removeField(idx)}
                        className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {(field.type === "select" || field.type === "multi_select") && (
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Opções</label>
                        <input
                          type="text"
                          value={field.options?.join(", ") || ""}
                          onChange={(e) => updateField(idx, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                          placeholder="Separadas por vírgula: Pequena, Média, Grande"
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500/20 mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Regras de Roteamento</h2>
            <p className="text-sm text-gray-500">Defina regras para rotear leads qualificados para SDR, BDR ou CLOSER.</p>
          </div>
          <button
            onClick={addRoutingRule}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
          >
            <Plus size={16} />
            Adicionar Regra
          </button>
        </div>

        {data.routingRules.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-medium text-sm">Nenhuma regra de roteamento</p>
            <p className="text-xs text-gray-400 mt-1">Os leads ficarão como pendentes para aprovação manual</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.routingRules.map((rule, idx) => (
              <div key={idx} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Campo</label>
                    <select
                      value={rule.field}
                      onChange={(e) => updateRoutingRule(idx, { field: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mt-1 bg-white"
                    >
                      <option value="">Selecione...</option>
                      {data.icpFields.map((f) => (
                        <option key={f.key} value={f.key}>{f.label || f.key}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Operador</label>
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRoutingRule(idx, { operator: e.target.value as any })}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mt-1 bg-white"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Valor</label>
                    <input
                      type="text"
                      value={String(rule.value ?? "")}
                      onChange={(e) => updateRoutingRule(idx, { value: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Roteado para</label>
                    <select
                      value={rule.target}
                      onChange={(e) => updateRoutingRule(idx, { target: e.target.value as any })}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mt-1 bg-white"
                    >
                      {ROUTING_TARGETS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score min</label>
                      <input
                        type="number"
                        value={rule.scoreMin ?? ""}
                        onChange={(e) => updateRoutingRule(idx, { scoreMin: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mt-1"
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={() => removeRoutingRule(idx)}
                      className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all mb-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-black text-gray-900 text-lg">Configurações</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-bold text-gray-900">Agendamento</p>
              <p className="text-sm text-gray-500">Permitir agendamento de reunião após qualificação</p>
            </div>
            <button
              onClick={() => setData({ ...data, allowScheduling: !data.allowScheduling })}
              className={`p-2 rounded-lg transition-all ${data.allowScheduling ? "text-purple-600 bg-purple-50" : "text-gray-400 bg-gray-100"}`}
            >
              {data.allowScheduling ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          {data.allowScheduling && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mensagem de Agendamento</label>
                <textarea
                  value={data.schedulingMessage}
                  onChange={(e) => setData({ ...data, schedulingMessage: e.target.value })}
                  placeholder="Ex: Seu lead foi qualificado! Agende uma reunião com nosso time comercial."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm min-h-16 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tempo mínimo para agendar (minutos)</label>
                <input
                  type="number"
                  value={data.schedulingLeadTime}
                  onChange={(e) => setData({ ...data, schedulingLeadTime: parseInt(e.target.value) || 60 })}
                  className="w-full max-w-xs px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-bold text-gray-900">Criar Lead no CRM</p>
              <p className="text-sm text-gray-500">Criar automaticamente um lead no pipeline ao qualificar</p>
            </div>
            <button
              onClick={() => setData({ ...data, createLead: !data.createLead })}
              className={`p-2 rounded-lg transition-all ${data.createLead ? "text-purple-600 bg-purple-50" : "text-gray-400 bg-gray-100"}`}
            >
              {data.createLead ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-bold text-gray-900">Enviar ao Funil de Prospecção</p>
              <p className="text-sm text-gray-500">Criar CapturedLead e matricular automaticamente no funil SDR IA</p>
            </div>
            <button
              onClick={() => setData({ ...data, createFunnelLead: !data.createFunnelLead })}
              className={`p-2 rounded-lg transition-all ${data.createFunnelLead ? "text-purple-600 bg-purple-50" : "text-gray-400 bg-gray-100"}`}
            >
              {data.createFunnelLead ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>

          {data.createFunnelLead && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Funil de Prospecção</label>
              <select
                value={data.funnelId}
                onChange={(e) => setData({ ...data, funnelId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm bg-white"
              >
                <option value="">Funil padrão (WhatsApp SDR IA)</option>
                {funnels.filter((f) => !f.isDefault).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 shadow-lg"
        >
          <Save size={18} />
          {saving ? "Salvando..." : form ? "Atualizar Formulário" : "Criar Formulário"}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
