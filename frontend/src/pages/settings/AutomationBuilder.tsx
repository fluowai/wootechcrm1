import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Plus,
  Trash2,
  Play,
  ToggleLeft,
  ToggleRight,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

const TRIGGER_TYPES = [
  { value: "lead_status", label: "Lead Status Change" },
  { value: "proposal_accepted", label: "Proposal Accepted" },
  { value: "task_overdue", label: "Task Overdue" },
  { value: "invoice_paid", label: "Invoice Paid" },
  { value: "schedule", label: "Schedule (Cron)" },
];

export default function AutomationBuilder() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [execResult, setExecResult] = useState<any>(null);

  const fetchRules = async () => {
    try {
      const res = await apiFetch("/api/automation");
      const data = await res.json();
      setRules(Array.isArray(data) ? data : data.rules || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleActive = async (rule: any) => {
    try {
      await apiFetch(`/api/automation/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra de automação?")) return;
    try {
      await apiFetch(`/api/automation/${id}`, { method: "DELETE" });
      fetchRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunNow = async (id: string) => {
    setExecResult({ id, loading: true });
    try {
      const res = await apiFetch(`/api/automation/${id}/execute`, {
        method: "POST",
      });
      const data = await res.json();
      setExecResult({ id, loading: false, data });
      setTimeout(() => setExecResult(null), 5000);
    } catch (err) {
      setExecResult({ id, loading: false, error: "Erro ao executar" });
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
        Carregando automações...
      </div>
    );

  return (
    <div className="flex flex-col gap-8 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            Automation Builder
          </h1>
          <p className="text-gray-500">Regras de automação e triggers do sistema.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold text-sm shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Nova Regra
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4 flex-1">
              <div
                className={`p-3 rounded-xl ${
                  rule.isActive
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                <Zap size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-900">{rule.name}</h3>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      rule.isActive
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {rule.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
                {rule.description && (
                  <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                )}
                <span className="text-xs font-bold text-primary bg-blue-50 px-2 py-0.5 rounded mt-2 inline-block">
                  {rule.triggerType}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {execResult?.id === rule.id && execResult?.loading && (
                <Loader2 size={16} className="animate-spin text-primary" />
              )}
              {execResult?.id === rule.id && execResult?.data && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Executado
                </span>
              )}
              {execResult?.id === rule.id && execResult?.error && (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} /> {execResult.error}
                </span>
              )}
              <button
                onClick={() => handleRunNow(rule.id)}
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Executar Agora"
              >
                <Play size={16} />
              </button>
              <button
                onClick={() => toggleActive(rule)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title={rule.isActive ? "Desativar" : "Ativar"}
              >
                {rule.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
              <button
                onClick={() => {
                  setEditing(rule);
                  setModalOpen(true);
                }}
                className="p-2 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Zap size={16} />
              </button>
              <button
                onClick={() => handleDelete(rule.id)}
                className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Zap size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">Nenhuma regra de automação configurada</p>
            <p className="text-sm mt-1">Crie a primeira regra para automatizar processos.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <AutomationModal
            onClose={() => setModalOpen(false)}
            onSuccess={() => {
              setModalOpen(false);
              fetchRules();
            }}
            initialData={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AutomationModal({
  onClose,
  onSuccess,
  initialData,
}: {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    triggerType: initialData?.triggerType || "lead_status",
    triggerConfig: initialData?.triggerConfig
      ? JSON.stringify(initialData.triggerConfig, null, 2)
      : "{}",
    conditions: initialData?.conditions
      ? JSON.stringify(initialData.conditions, null, 2)
      : "[]",
    actions: initialData?.actions
      ? JSON.stringify(initialData.actions, null, 2)
      : "[]",
    isActive: initialData?.isActive ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...formData,
        triggerConfig: JSON.parse(formData.triggerConfig),
        conditions: JSON.parse(formData.conditions),
        actions: JSON.parse(formData.actions),
      };
      const url = initialData ? `/api/automation/${initialData.id}` : "/api/automation";
      const method = initialData ? "PATCH" : "POST";
      await apiFetch(url, { method, body: JSON.stringify(body) });
      onSuccess();
    } catch (err) {
      alert("Erro ao salvar regra. Verifique o JSON.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {initialData ? "Editar Regra" : "Nova Regra de Automação"}
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
              Configure os triggers e ações
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5 custom-scrollbar">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Nome da Regra
            </label>
            <input
              className="modal-input font-bold"
              placeholder="Ex: Notificar lead qualificado"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Descrição
            </label>
            <textarea
              className="modal-input min-h-[60px] resize-none"
              placeholder="Descreva o objetivo da automação"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Trigger Type
              </label>
              <select
                className="modal-input font-bold"
                value={formData.triggerType}
                onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Ativo
              </label>
              <label className="flex items-center gap-3 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-gray-300 text-primary"
                />
                <span className="text-sm font-medium text-gray-700">
                  {formData.isActive ? "Ativo" : "Inativo"}
                </span>
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Trigger Config (JSON)
            </label>
            <textarea
              className="modal-input font-mono text-xs min-h-[80px] resize-none"
              value={formData.triggerConfig}
              onChange={(e) => setFormData({ ...formData, triggerConfig: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Conditions (JSON)
            </label>
            <textarea
              className="modal-input font-mono text-xs min-h-[80px] resize-none"
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Actions (JSON)
            </label>
            <textarea
              className="modal-input font-mono text-xs min-h-[80px] resize-none"
              value={formData.actions}
              onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
            />
          </div>
          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] py-4 bg-primary text-white text-xs font-black uppercase rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-600 transition-all"
            >
              {submitting ? "Salvando..." : initialData ? "Salvar Alterações" : "Criar Regra"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
