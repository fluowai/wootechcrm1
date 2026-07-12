import { useState, useEffect } from "react";
import { FileText, Plus, Settings, Eye, BarChart3, RefreshCw, Loader2, Copy, ExternalLink, Check } from "lucide-react";
import { apiFetch, getApiBaseUrl } from "../../lib/api";
import { QualificationFormBuilder } from "./QualificationFormBuilder";
import { QualificationSubmissions } from "./QualificationSubmissions";

export default function QualificationForms() {
  const [tab, setTab] = useState<"forms" | "submissions">("forms");
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  const buildPublicUrl = (form: any) => {
    if (form.publicUrl) return form.publicUrl;
    const base = getApiBaseUrl() || window.location.origin;
    const url = new URL(`/qualification/${form.id}`, base);
    url.searchParams.set("utm_source", "nexus");
    url.searchParams.set("utm_medium", "qualification_form");
    url.searchParams.set("utm_campaign", `qualificacao_${form.id.slice(0, 8)}`);
    return url.toString();
  };

  const copyPublicUrl = async (form: any) => {
    const url = buildPublicUrl(form);
    await navigator.clipboard?.writeText(url);
    setCopiedFormId(form.id);
    setTimeout(() => setCopiedFormId(null), 1800);
  };

  const fetchForms = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/qualification/forms");
      const data = await res.json();
      setForms(data.forms || []);
    } catch {
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "forms") fetchForms();
  }, [tab]);

  if (showBuilder || editingForm) {
    return (
      <QualificationFormBuilder
        form={editingForm}
        onSave={() => { setShowBuilder(false); setEditingForm(null); fetchForms(); }}
        onCancel={() => { setShowBuilder(false); setEditingForm(null); }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase tracking-widest mb-1">
            <Settings size={14} />
            <span>Qualificação</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Formulários de Qualificação</h1>
          <p className="text-gray-500 text-sm">Crie formulários baseados em ICP, roteie para SDR/BDR/CLOSER e agende reuniões.</p>
        </div>
        <div className="flex gap-3">
          {tab === "forms" && (
            <button
              onClick={() => setShowBuilder(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all text-sm font-semibold shadow-sm"
            >
              <Plus size={18} />
              Novo Formulário
            </button>
          )}
          <button onClick={fetchForms} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("forms")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "forms" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <FileText size={16} />
          Formulários
        </button>
        <button
          onClick={() => setTab("submissions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "submissions" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <BarChart3 size={16} />
          Submissões
        </button>
      </div>

      {tab === "submissions" ? (
        <QualificationSubmissions forms={forms} />
      ) : (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 bg-white border border-gray-200 rounded-2xl">
              <Eye size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum formulário de qualificação criado</p>
              <p className="text-gray-400 text-sm mt-1">Crie seu primeiro formulário baseado em ICP</p>
              <button
                onClick={() => setShowBuilder(true)}
                className="mt-4 flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all text-sm font-semibold"
              >
                <Plus size={18} />
                Criar Formulário
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((form: any) => {
                const publicUrl = buildPublicUrl(form);
                return (
                <div key={form.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${form.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {form.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{form.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{form.description || "Sem descrição"}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                    <span>{form._count?.submissions || 0} submissões</span>
                    <span>{Array.isArray(form.icpFields) ? form.icpFields.length : 0} campos</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-xl mb-4">
                    <span className="flex-1 min-w-0 truncate text-[11px] font-semibold text-gray-500">{publicUrl}</span>
                    <button
                      onClick={() => copyPublicUrl(form)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-white rounded-lg transition-all"
                      title="Copiar link rastreavel"
                    >
                      {copiedFormId === form.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-white rounded-lg transition-all"
                      title="Abrir formulario publico"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingForm(form)}
                      className="flex-1 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl transition-all"
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Excluir formulário?")) {
                          await apiFetch(`/api/qualification/forms/${form.id}`, { method: "DELETE" });
                          fetchForms();
                        }
                      }}
                      className="text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-all"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
