import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles, CheckCircle2, Loader2, AlertCircle, ArrowLeft,
  Building2, Layers, ListChecks, BookOpen, MessageSquare,
  Target, Zap, AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";

interface AiDiagnosis {
  recommendedTemplate: string;
  templateLabel: string;
  pipelineName: string;
  summary: string;
  stages: { name: string; order: number; probability: number; isDefault: boolean; color?: string }[];
  customFields: { name: string; key: string; type: string; options?: string[]; model: string }[];
  tasks: { title: string; description?: string; daysAfterStage?: number; stageName?: string }[];
  scripts: { name: string; text: string; stage?: string }[];
  playbook: { title: string; content: string }[];
}

export default function OnboardingPreview() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<AiDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await apiFetch("/api/onboarding/status");
      const data = await res.json();
      setStatus(data);
      if (data.response?.aiDiagnosis) {
        setDiagnosis(data.response.aiDiagnosis as AiDiagnosis);
      }
      if (data.completed) setApplied(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const res = await apiFetch("/api/onboarding/analyze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao analisar");
      setDiagnosis(data.diagnosis);
    } catch (err: any) {
      setError(err.message || "Erro ao gerar diagnóstico");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const res = await apiFetch("/api/onboarding/apply", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao aplicar");
      setApplied(true);
    } catch (err: any) {
      setError(err.message || "Erro ao aplicar configurações");
    } finally {
      setApplying(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("nexus_onboarding_done", "true");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center gap-3 text-2xl font-black tracking-tighter italic mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 not-italic">N</div>
          NEXUS<span className="text-primary">360</span>
        </div>

        {!diagnosis && !analyzing && !applied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center space-y-8"
          >
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mx-auto border border-primary/20">
              <Sparkles size={48} />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-black">Diagnóstico com IA</h1>
              <p className="text-gray-400 text-lg">
                Vamos analisar suas respostas e configurar automaticamente o ambiente comercial ideal
                para sua operação.
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-3 bg-primary text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all disabled:opacity-50 shadow-2xl shadow-blue-500/40"
            >
              {analyzing ? (
                <><Loader2 size={22} className="animate-spin" /> Analisando...</>
              ) : (
                <><Zap size={22} /> Gerar Diagnóstico</>
              )}
            </button>
            <button
              onClick={() => navigate("/onboarding")}
              className="block mx-auto text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Voltar ao questionário
            </button>
          </motion.div>
        )}

        {(analyzing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-xl mx-auto text-center space-y-8 py-20"
          >
            <Loader2 className="animate-spin text-primary mx-auto" size={48} />
            <div className="space-y-3">
              <h2 className="text-3xl font-black">IA pensando...</h2>
              <p className="text-gray-400">Analisando seu modelo de negócio e montando a configuração ideal.</p>
            </div>
            <div className="flex justify-center gap-3">
              {["Analisando", "Pipeline", "Campos", "Tarefas"].map((step, i) => (
                <div key={step} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${i <= 2 ? "bg-primary animate-pulse" : "bg-gray-600"}`} />
                  <span className="text-xs text-gray-400">{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {error && (
          <div className="max-w-xl mx-auto bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-start gap-4">
            <AlertCircle className="text-red-400 shrink-0 mt-1" size={20} />
            <div>
              <p className="font-bold text-red-300">Erro ao processar</p>
              <p className="text-sm text-red-200/80 mt-1">{error}</p>
              <button onClick={handleAnalyze} className="mt-3 text-sm text-red-300 underline">Tentar novamente</button>
            </div>
          </div>
        )}

        {diagnosis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black">Diagnóstico Completo</h1>
                <p className="text-gray-400 mt-2">{diagnosis.summary}</p>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20">
                <Target size={16} />
                <span className="font-bold text-sm">{diagnosis.templateLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DiagnosisCard
                icon={<Building2 size={20} />}
                title="Pipeline Recomendado"
                color="blue"
              >
                <p className="text-lg font-bold mb-4">{diagnosis.pipelineName}</p>
                <div className="space-y-2">
                  {diagnosis.stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ backgroundColor: stage.color + "20", color: stage.color }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{stage.name}</p>
                        <p className="text-[10px] text-gray-500">{stage.probability}% conversão</p>
                      </div>
                      {stage.isDefault && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Padrão</span>
                      )}
                    </div>
                  ))}
                </div>
              </DiagnosisCard>

              <DiagnosisCard
                icon={<Layers size={20} />}
                title="Campos Personalizados"
                color="purple"
              >
                <div className="space-y-2">
                  {diagnosis.customFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                      <div className={`w-2 h-2 rounded-full ${
                        field.type === "TEXT" ? "bg-blue-400" : field.type === "SELECT" ? "bg-green-400" : field.type === "BOOLEAN" ? "bg-yellow-400" : "bg-gray-400"
                      }`} />
                      <div className="flex-1">
                        <p className="font-bold text-sm">{field.name}</p>
                        <p className="text-[10px] text-gray-500">{field.type} • {field.model}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DiagnosisCard>

              <DiagnosisCard
                icon={<ListChecks size={20} />}
                title="Tarefas Automáticas"
                color="green"
              >
                <div className="space-y-2">
                  {diagnosis.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                      <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-sm">{task.title}</p>
                        {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                        {task.stageName && (
                          <p className="text-[10px] text-primary mt-1">Quando estiver em: {task.stageName}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </DiagnosisCard>

              <DiagnosisCard
                icon={<BookOpen size={20} />}
                title="Playbook Comercial"
                color="orange"
              >
                <div className="space-y-3">
                  {diagnosis.playbook.map((item, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="font-bold text-sm text-primary">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed">{item.content}</p>
                    </div>
                  ))}
                </div>
              </DiagnosisCard>
            </div>

            {diagnosis.scripts && diagnosis.scripts.length > 0 && (
              <DiagnosisCard
                icon={<MessageSquare size={20} />}
                title="Scripts de Abordagem"
                color="pink"
              >
                <div className="space-y-3">
                  {diagnosis.scripts.map((script, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-sm">{script.name}</span>
                        {script.stage && (
                          <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">{script.stage}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 whitespace-pre-wrap">{script.text}</p>
                    </div>
                  ))}
                </div>
              </DiagnosisCard>
            )}

            {!applied ? (
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={() => navigate("/onboarding")}
                  className="flex items-center gap-2 p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 text-gray-400"
                >
                  <ArrowLeft size={20} />
                  Editar Respostas
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white py-5 rounded-2xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20"
                >
                  {applying ? (
                    <><Loader2 size={20} className="animate-spin" /> Aplicando...</>
                  ) : (
                    <><Zap size={20} /> Aplicar Configuração</>
                  )}
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8 py-10"
              >
                <div className="w-24 h-24 bg-green-500/10 text-green-400 rounded-[32px] flex items-center justify-center mx-auto border border-green-500/20">
                  <CheckCircle2 size={48} />
                </div>
                <div className="space-y-3">
                  <h2 className="text-4xl font-black">Ambiente Configurado!</h2>
                  <p className="text-gray-400 max-w-lg mx-auto">
                    Pipelines, campos personalizados e processos comerciais foram criados automaticamente pela IA.
                  </p>
                </div>
                <button
                  onClick={handleFinish}
                  className="bg-white text-gray-900 px-12 py-6 rounded-[32px] font-black text-xl hover:bg-gray-100 transition-all shadow-2xl"
                >
                  ACESSAR PLATAFORMA
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DiagnosisCard({
  icon, title, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" },
    green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" },
    orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
    pink: { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400" },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`${c.bg} ${c.border} backdrop-blur-xl rounded-[32px] p-6 border`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`${c.text}`}>{icon}</div>
        <h3 className="font-black text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}
