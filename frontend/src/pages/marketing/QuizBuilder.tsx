import { useState, useEffect } from "react";
import {
  HelpCircle, Plus, Trash2, CheckCircle, XCircle, Copy, Send,
  Sparkles, Settings, Globe, BarChart3, Eye, Save, ArrowLeft,
  ChevronDown, ChevronUp, GripVertical, AlertCircle, ExternalLink,
  Bot, RefreshCw, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";
import QuizExperience from "../../components/QuizExperience";

interface Question {
  id?: string;
  text: string;
  type: "multiple_choice" | "multiple_select" | "rating" | "text" | "email" | "phone";
  options?: string[];
  points: number;
  required: boolean;
}

interface Quiz {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  isActive: boolean;
  quizType?: string;
  scoringType?: string;
  passScore?: number;
  aiGenerated?: boolean;
  tracking?: any;
  leadCapture?: any;
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;
  questions: Question[];
  _count?: { submissions: number };
  publishedAt?: string;
  createdAt: string;
}

interface Submission {
  id: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  qualified?: boolean;
  createdAt: string;
}

type Tab = "builder" | "settings" | "submissions";

export default function QuizBuilder() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("builder");
  const [editing, setEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subStats, setSubStats] = useState<any>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quizType, setQuizType] = useState("qualification");
  const [scoringType, setScoringType] = useState("points");
  const [passScore, setPassScore] = useState(70);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Briefing for AI
  const [briefing, setBriefing] = useState({
    name: "",
    description: "",
    quizType: "qualification",
    offer: "",
    targetAudience: "",
    goals: "",
    questionCount: 6,
    scoringType: "points",
    passScore: 70,
    leadCaptureFields: ["name", "email"],
  });
  const [generating, setGenerating] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);

  // Tracking settings
  const [gaId, setGaId] = useState("");
  const [pixelId, setPixelId] = useState("");

  // SEO
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaImage, setMetaImage] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchQuizzes(); }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/quizzes");
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchSubmissions = async (quizId: string) => {
    try {
      const res = await apiFetch(`/api/quizzes/${quizId}/submissions`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setSubStats(data.stats || null);
    } catch (e) { console.error(e); }
  };

  const selectQuiz = (quiz: Quiz) => {
    setSelected(quiz);
    setName(quiz.name);
    setDescription(quiz.description || "");
    setQuizType(quiz.quizType || "qualification");
    setScoringType(quiz.scoringType || "points");
    setPassScore(quiz.passScore || 70);
    setQuestions(quiz.questions || []);
    const tracking = quiz.tracking || {};
    setGaId(tracking.gaId || "");
    setPixelId(tracking.pixelId || "");
    setMetaTitle(quiz.metaTitle || quiz.name);
    setMetaDescription(quiz.metaDescription || "");
    setMetaImage(quiz.metaImage || "");
    setEditing(true);
    setTab("builder");
    fetchSubmissions(quiz.id);
  };

  const newQuiz = () => {
    setSelected(null);
    setName("");
    setDescription("");
    setQuizType("qualification");
    setScoringType("points");
    setPassScore(70);
    setQuestions([]);
    setGaId("");
    setPixelId("");
    setMetaTitle("");
    setMetaDescription("");
    setMetaImage("");
    setBriefing({
      name: "", description: "", quizType: "qualification",
      offer: "", targetAudience: "", goals: "", questionCount: 6,
      scoringType: "points", passScore: 70, leadCaptureFields: ["name", "email"],
    });
    setEditing(true);
    setShowBriefing(true);
    setTab("builder");
    setError("");
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      text: "Nova pergunta",
      type: "multiple_choice",
      options: ["Opção 1", "Opção 2", "Opção 3"],
      points: 1,
      required: true,
    }]);
  };

  const removeQuestion = (i: number) => {
    setQuestions(questions.filter((_, idx) => idx !== i));
  };

  const updateQuestion = (i: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[i] as any)[field] = value;
    setQuestions(updated);
  };

  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setQuestions(updated);
  };

  const generateWithAI = async () => {
    if (!briefing.name) { setError("Preencha o nome do quiz"); return; }
    setGenerating(true);
    setError("");
    try {
      const res = await apiFetch("/api/quizzes/generate", {
        method: "POST",
        body: JSON.stringify(briefing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName(data.name || briefing.name);
      setDescription(data.description || "");
      setQuizType(data.quizType || briefing.quizType);
      setScoringType(data.scoringType || briefing.scoringType);
      setPassScore(data.passScore || briefing.passScore);
      setQuestions(data.questions || []);
      if (!metaTitle) setMetaTitle(data.name || briefing.name);
      setShowBriefing(false);
    } catch (e: any) {
      setError(e.message || "Erro ao gerar quiz");
    }
    setGenerating(false);
  };

  const saveQuiz = async () => {
    if (!name) { setError("Nome é obrigatório"); return; }
    if (questions.length === 0) { setError("Adicione pelo menos uma pergunta"); return; }
    setSaving(true);
    setError("");

    const payload = {
      name,
      description,
      quizType,
      scoringType,
      passScore,
      tracking: { gaId, pixelId },
      leadCapture: { fields: ["name", "email"] },
      metaTitle: metaTitle || name,
      metaDescription,
      metaImage,
    };

    try {
      let quiz;
      if (selected) {
        const res = await apiFetch(`/api/quizzes/${selected.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        quiz = data.quiz;
      } else {
        const res = await apiFetch("/api/quizzes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        quiz = data.quiz;
      }

      // Save questions
      await apiFetch(`/api/quizzes/${quiz.id}/questions`, {
        method: "POST",
        body: JSON.stringify({ questions }),
      });

      await fetchQuizzes();
      setSelected(quiz);
    } catch (e: any) {
      setError(e.message || "Erro ao salvar");
    }
    setSaving(false);
  };

  const publishQuiz = async () => {
    if (!selected) return;
    try {
      await saveQuiz();
      const res = await apiFetch(`/api/quizzes/${selected.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchQuizzes();
      if (data.quiz) setSelected(data.quiz);
      if (data.publicUrl) {
        navigator.clipboard?.writeText(data.publicUrl);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao publicar");
    }
  };

  const duplicateQuiz = async (quiz: Quiz) => {
    try {
      const res = await apiFetch("/api/quizzes", {
        method: "POST",
        body: JSON.stringify({
          name: quiz.name + " (Cópia)",
          description: quiz.description,
          quizType: quiz.quizType,
          scoringType: quiz.scoringType,
          passScore: quiz.passScore,
          tracking: quiz.tracking,
          leadCapture: quiz.leadCapture,
        }),
      });
      const data = await res.json();
      if (data.quiz) {
        await apiFetch(`/api/quizzes/${data.quiz.id}/questions`, {
          method: "POST",
          body: JSON.stringify({ questions: quiz.questions }),
        });
      }
      fetchQuizzes();
    } catch (e) { console.error(e); }
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm("Tem certeza?")) return;
    try {
      await apiFetch(`/api/quizzes/${id}`, { method: "DELETE" });
      if (selected?.id === id) { setSelected(null); setEditing(false); }
      fetchQuizzes();
    } catch (e) { console.error(e); }
  };

  const toggleActive = async (quiz: Quiz) => {
    try {
      await apiFetch(`/api/quizzes/${quiz.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !quiz.isActive }),
      });
      fetchQuizzes();
    } catch (e) { console.error(e); }
  };

  const publicUrl = selected?.status === "published"
    ? `${window.location.origin}/quiz/${selected.slug}`
    : null;

  const questionTypes = [
    { value: "multiple_choice", label: "Múltipla Escolha" },
    { value: "multiple_select", label: "Seleção Múltipla" },
    { value: "rating", label: "Avaliação (1-5)" },
    { value: "text", label: "Texto" },
    { value: "email", label: "E-mail" },
    { value: "phone", label: "Telefone" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz / Lead Qualifier</h1>
          <p className="text-gray-500 mt-1">Crie quizzes com IA e publique para qualificar leads</p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={newQuiz}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold text-sm"
            >
              <Plus size={16} />
              Novo Quiz
            </button>
          )}
          {editing && (
            <button onClick={() => { setEditing(false); setSelected(null); }}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          )}
        </div>
      </div>

      {!editing ? (
        /* ==================== LIST VIEW ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                <div className="h-12 bg-gray-100 rounded-xl mb-4" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))
          ) : quizzes.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum quiz criado</h3>
              <p className="text-gray-500 mb-4">Crie seu primeiro quiz com IA ou manualmente</p>
              <button onClick={newQuiz}
                className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-all font-bold"
              >
                Criar Quiz
              </button>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} onClick={() => selectQuiz(quiz)}
                className={`bg-white rounded-2xl border overflow-hidden transition-all cursor-pointer hover:shadow-md ${quiz.status === "published" ? "border-green-200" : "border-gray-100"}`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${quiz.isActive ? "bg-green-100" : "bg-gray-100"}`}>
                      <HelpCircle className={`w-6 h-6 ${quiz.isActive ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${quiz.status === "published" ? "bg-green-100 text-green-700" : quiz.status === "approved" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                        {quiz.status === "published" ? "Publicado" : quiz.status === "approved" ? "Aprovado" : "Rascunho"}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{quiz.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{quiz.description || "Sem descrição"}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{quiz.questions?.length || 0} perguntas</span>
                    <span>{quiz._count?.submissions || 0} respostas</span>
                    {quiz.aiGenerated && (
                      <span className="flex items-center gap-1 text-purple-600">
                        <Sparkles size={12} /> IA
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-6 py-3 bg-gray-50 flex items-center gap-2 border-t border-gray-100">
                  {quiz.status === "published" && quiz.isActive && (
                    <a href={`/quiz/${quiz.slug}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <ExternalLink size={12} /> URL Pública
                    </a>
                  )}
                  <div className="ml-auto flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); duplicateQuiz(quiz); }}
                      className="p-1.5 hover:bg-gray-200 rounded-lg" title="Duplicar">
                      <Copy size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleActive(quiz); }}
                      className="p-1.5 hover:bg-gray-200 rounded-lg" title={quiz.isActive ? "Desativar" : "Ativar"}>
                      {quiz.isActive ? <CheckCircle size={14} className="text-green-600" /> : <XCircle size={14} className="text-gray-400" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteQuiz(quiz.id); }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ==================== EDITOR VIEW ==================== */
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm">{selected ? "Editar Quiz" : "Novo Quiz"}</h2>
                {publicUrl && (
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary font-bold mt-1 hover:underline"
                  >
                    <ExternalLink size={12} /> {publicUrl}
                  </a>
                )}
              </div>
              <div className="flex flex-col">
                {[
                  { key: "builder" as Tab, label: "Perguntas", icon: FileText },
                  { key: "settings" as Tab, label: "Configurações", icon: Settings },
                  { key: "submissions" as Tab, label: "Respostas", icon: BarChart3 },
                ].map((t) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all ${tab === t.key ? "bg-primary/5 text-primary border-r-2 border-primary" : "text-gray-500 hover:bg-gray-50"}`}
                  >
                    <t.icon size={16} />
                    {t.label}
                    {t.key === "submissions" && selected && (
                      <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">{submissions.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-100 space-y-2">
                <button onClick={saveQuiz} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-blue-600 transition-all font-bold text-sm disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                {selected && (
                  <button onClick={publishQuiz}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold text-sm"
                  >
                    <Globe size={16} />
                    {selected.status === "published" ? "Republicar" : "Aprovar & Publicar"}
                  </button>
                )}
                {questions.length > 0 && (
                  <button onClick={() => setShowPreview(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm"
                  >
                    <Eye size={16} />
                    Visualizar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* TAB: BUILDER */}
            {tab === "builder" && (
              <>
                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">Informações Básicas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome do Quiz</label>
                      <input value={name} onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        placeholder="Ex: Diagnóstico Marketing Digital" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
                      <select value={quizType} onChange={e => setQuizType(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-white">
                        <option value="qualification">Qualificação de Lead</option>
                        <option value="assessment">Avaliação</option>
                        <option value="recommendation">Recomendação</option>
                        <option value="diagnostic">Diagnóstico</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descrição</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
                      placeholder="Breve descrição do objetivo do quiz" />
                  </div>
                </div>

                {/* AI Generation */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-purple-600" size={20} />
                      <h3 className="font-bold text-gray-900">Gerar com IA</h3>
                    </div>
                    <button onClick={() => setShowBriefing(!showBriefing)}
                      className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:underline">
                      {showBriefing ? "Recolher" : "Abrir briefing"}
                      {showBriefing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showBriefing && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome do Quiz *</label>
                            <input value={briefing.name} onChange={e => setBriefing({ ...briefing, name: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
                              placeholder="Ex: Diagnóstico de Marketing Digital" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Oferta / Produto</label>
                            <input value={briefing.offer} onChange={e => setBriefing({ ...briefing, offer: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
                              placeholder="Ex: Consultoria de SEO" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Público-alvo</label>
                            <input value={briefing.targetAudience} onChange={e => setBriefing({ ...briefing, targetAudience: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
                              placeholder="Ex: Empresas de e-commerce" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Objetivos</label>
                            <textarea value={briefing.goals} onChange={e => setBriefing({ ...briefing, goals: e.target.value })} rows={2}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm resize-none"
                              placeholder="Ex: Identificar nível de maturidade digital, segmentar por porte, qualificar por orçamento" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nº de Perguntas</label>
                            <input type="number" value={briefing.questionCount} onChange={e => setBriefing({ ...briefing, questionCount: parseInt(e.target.value) || 6 })}
                              min={3} max={15}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Score Mínimo (%)</label>
                            <input type="number" value={briefing.passScore} onChange={e => setBriefing({ ...briefing, passScore: parseInt(e.target.value) || 0 })}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none text-sm" />
                          </div>
                        </div>
                        <button onClick={generateWithAI} disabled={generating || !briefing.name}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-bold text-sm disabled:opacity-50"
                        >
                          {generating ? <RefreshCw size={16} className="animate-spin" /> : <Bot size={16} />}
                          {generating ? "Gerando..." : "Gerar Perguntas com IA"}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!showBriefing && questions.length === 0 && (
                    <button onClick={() => setShowBriefing(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all font-bold text-sm"
                    >
                      <Sparkles size={16} />
                      Gerar perguntas com IA
                    </button>
                  )}
                </div>

                {/* Questions Editor */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Perguntas ({questions.length})</h3>
                    <button onClick={addQuestion}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all text-sm font-bold"
                    >
                      <Plus size={14} />
                      Adicionar
                    </button>
                  </div>

                  {questions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <FileText size={40} className="mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Nenhuma pergunta ainda</p>
                      <p className="text-sm">Use a IA para gerar ou adicione manualmente</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs">{i + 1}</span>
                            <input value={q.text} onChange={e => updateQuestion(i, "text", e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder="Texto da pergunta" />
                            <div className="flex gap-1">
                              <button onClick={() => moveQuestion(i, i - 1)} disabled={i === 0}
                                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ChevronUp size={16} /></button>
                              <button onClick={() => moveQuestion(i, i + 1)} disabled={i === questions.length - 1}
                                className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ChevronDown size={16} /></button>
                              <button onClick={() => removeQuestion(i)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <select value={q.type} onChange={e => updateQuestion(i, "type", e.target.value)}
                              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white outline-none">
                              {questionTypes.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                              <input type="number" value={q.points} onChange={e => updateQuestion(i, "points", parseInt(e.target.value) || 1)}
                                className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-center outline-none" min={1} />
                              Pontos
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-medium">
                              <input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, "required", e.target.checked)}
                                className="rounded" />
                              Obrigatória
                            </label>
                          </div>
                          {(q.type === "multiple_choice" || q.type === "multiple_select") && (
                            <div className="space-y-1.5 pl-10">
                              {(q.options || ["", ""]).map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-400 w-5">{String.fromCharCode(65 + oi)}</span>
                                  <input value={opt} onChange={e => {
                                    const opts = [...(q.options || [])];
                                    opts[oi] = e.target.value;
                                    updateQuestion(i, "options", opts);
                                  }}
                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder={`Opção ${oi + 1}`} />
                                  <button onClick={() => {
                                    const opts = (q.options || []).filter((_, idx) => idx !== oi);
                                    updateQuestion(i, "options", opts);
                                  }}
                                    className="p-1 hover:bg-red-50 rounded text-red-400"><XCircle size={14} /></button>
                                </div>
                              ))}
                              <button onClick={() => {
                                const opts = [...(q.options || []), ""];
                                updateQuestion(i, "options", opts);
                              }}
                                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                                <Plus size={12} /> Adicionar opção
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB: SETTINGS */}
            {tab === "settings" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">Scoring</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de Scoring</label>
                      <select value={scoringType} onChange={e => setScoringType(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm bg-white">
                        <option value="points">Pontos (soma simples)</option>
                        <option value="percentage">Percentual</option>
                        <option value="binary">Binário (Aprovado/Reprovado)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Score Mínimo para Aprovação (%)</label>
                      <input type="number" value={passScore} onChange={e => setPassScore(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">Captura de Leads</h3>
                  <p className="text-sm text-gray-500">Os campos de contato serão coletados durante o quiz.</p>
                  <div className="flex gap-3">
                    {["name", "email", "phone"].map(f => (
                      <label key={f} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded" />
                        {f === "name" ? "Nome" : f === "email" ? "E-mail" : "Telefone"}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">Tracking & Pixel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Google Analytics (GA4 ID)</label>
                      <input value={gaId} onChange={e => setGaId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        placeholder="Ex: G-XXXXXXXXXX" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meta Pixel ID</label>
                      <input value={pixelId} onChange={e => setPixelId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        placeholder="Ex: 1234567890" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">SEO / Compartilhamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meta Title</label>
                      <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meta Description</label>
                      <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Imagem OG (URL)</label>
                      <input value={metaImage} onChange={e => setMetaImage(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        placeholder="https://..." />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SUBMISSIONS */}
            {tab === "submissions" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {subStats && (
                  <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{subStats.total}</p>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">{subStats.qualified}</p>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Qualificados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{subStats.avgScore}%</p>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Média</p>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contato</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            Nenhuma resposta ainda
                          </td>
                        </tr>
                      ) : (
                        submissions.map(sub => (
                          <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                              {new Date(sub.createdAt).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-6 py-4 font-medium text-sm">{sub.contactName || "-"}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {sub.contactEmail && <div>{sub.contactEmail}</div>}
                              {sub.contactPhone && <div className="text-xs">{sub.contactPhone}</div>}
                            </td>
                            <td className="px-6 py-4">
                              {sub.percentage !== null && sub.percentage !== undefined ? (
                                <span className={`font-bold text-sm ${sub.qualified ? "text-emerald-600" : "text-red-500"}`}>
                                  {sub.percentage}%
                                </span>
                              ) : "-"}
                            </td>
                            <td className="px-6 py-4">
                              {sub.qualified === true ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">Qualificado</span>
                              ) : sub.qualified === false ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">Não Qualif.</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">Pendente</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <QuizExperience
          quizName={name || "Quiz"}
          questions={questions.map((q, i) => ({
            id: `q-${i}`,
            text: q.text,
            type: q.type as any,
            options: q.options,
            required: q.required,
          }))}
          onComplete={(answers) => {
            console.log("Quiz completed:", answers);
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
