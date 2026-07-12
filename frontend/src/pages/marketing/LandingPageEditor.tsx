import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft, Save, Eye, Globe, Copy, Trash2, Loader2, Sparkles,
  Monitor, Smartphone, Tablet, X, Check, ChevronDown, Plus, GripVertical,
  AlertTriangle, ExternalLink, Settings, Palette, BarChart3
} from "lucide-react";
import { apiFetch, readJsonResponse } from "../../lib/api";

interface Section {
  type: string;
  props: Record<string, any>;
}

interface PageData {
  id: string;
  name: string;
  slug: string;
  status: string;
  sections: Section[];
  theme: any;
  tracking: any;
  metaTitle: string;
  metaDescription: string;
  views: number;
  submissions: number;
  createdAt: string;
  publishedAt?: string;
}

const SECTION_LABELS: Record<string, string> = {
  HeroBlock: "Hero",
  ProblemBlock: "Problema",
  SolutionBlock: "Solução",
  BenefitsBlock: "Benefícios",
  HowItWorksBlock: "Como funciona",
  SocialProofBlock: "Provas sociais",
  FAQBlock: "FAQ",
  CTABlock: "CTA Final",
  FormBlock: "Formulário",
};

const SECTION_DEFAULTS: Record<string, Record<string, any>> = {
  HeroBlock: { headline: "", subheadline: "", ctaText: "Quero saber mais", ctaUrl: "#form", imageUrl: "", alignment: "center", visible: true },
  ProblemBlock: { title: "", description: "", visible: true },
  SolutionBlock: { title: "", description: "", visible: true },
  BenefitsBlock: { title: "Benefícios", items: [], visible: true },
  HowItWorksBlock: { title: "Como funciona", steps: [], visible: true },
  SocialProofBlock: { title: "Quem já confia", testimonials: [], visible: true },
  FAQBlock: { title: "Perguntas frequentes", items: [], visible: true },
  CTABlock: { headline: "", subheadline: "", ctaText: "Quero contratar", ctaUrl: "#form", visible: true },
  FormBlock: { title: "Solicite um contato", description: "", buttonText: "Enviar", fields: ["nome", "telefone", "email", "mensagem"], visible: true },
};

const SECTION_TYPES = Object.keys(SECTION_DEFAULTS);

export default function LandingPageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [tracking, setTracking] = useState({ gaId: "", pixelId: "" });
  const [theme, setTheme] = useState({ primaryColor: "#3B82F6", secondaryColor: "#1E40AF" });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/landing-pages/${id}`)
      .then(res => res.ok ? readJsonResponse(res) : Promise.reject("Failed to load"))
      .then(data => {
        setPage(data);
        setMetaTitle(data.metaTitle || "");
        setMetaDescription(data.metaDescription || "");
        setTracking(data.tracking || { gaId: "", pixelId: "" });
        setTheme(data.theme || { primaryColor: "#3B82F6", secondaryColor: "#1E40AF" });
      })
      .catch(() => navigate("/landing-pages"))
      .finally(() => setLoading(false));
  }, [id]);

  const updateSection = useCallback((index: number, props: Record<string, any>) => {
    setPage(prev => {
      if (!prev) return prev;
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], props };
      return { ...prev, sections };
    });
  }, []);

  const addSection = useCallback((type: string) => {
    setPage(prev => {
      if (!prev) return prev;
      const sections = [...prev.sections, { type, props: { ...SECTION_DEFAULTS[type] } }];
      return { ...prev, sections };
    });
    setShowAddSection(false);
    setActiveSection(page?.sections.length || 0);
  }, [page?.sections.length]);

  const removeSection = useCallback((index: number) => {
    setPage(prev => {
      if (!prev) return prev;
      const sections = prev.sections.filter((_, i) => i !== index);
      return { ...prev, sections };
    });
    if (activeSection === index) setActiveSection(null);
  }, [activeSection]);

  const moveSection = useCallback((from: number, to: number) => {
    setPage(prev => {
      if (!prev) return prev;
      const sections = [...prev.sections];
      const [removed] = sections.splice(from, 1);
      sections.splice(to, 0, removed);
      return { ...prev, sections };
    });
  }, []);

  const savePage = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/landing-pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: page.sections,
          theme,
          tracking,
          metaTitle,
          metaDescription,
        }),
      });
      if (res.ok) {
        const updated = await readJsonResponse(res);
        setPage(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const publishPage = async () => {
    if (!page) return;
    setPublishing(true);
    try {
      const res = await apiFetch(`/api/landing-pages/${page.id}/publish`, { method: "POST" });
      if (res.ok) {
        const updated = await readJsonResponse(res);
        setPage(updated);
      }
    } finally {
      setPublishing(false);
    }
  };

  const duplicatePage = async () => {
    if (!page) return;
    try {
      const res = await apiFetch(`/api/landing-pages/${page.id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const dup = await readJsonResponse(res);
        navigate(`/landing-pages/${dup.id}/edit`);
      }
    } catch (error) {
      console.error("Failed to duplicate landing page", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size="24" className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size="48" className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Página não encontrada</p>
        <button onClick={() => navigate("/landing-pages")} className="mt-4 text-sm text-blue-600 font-semibold">Voltar</button>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/lp/${page.slug}`;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/landing-pages")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size="20" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900">{page.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${page.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {page.status === "published" ? "Publicado" : "Rascunho"}
              </span>
              <span className="text-[11px] text-gray-400">Slug: /lp/{page.slug}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowTracking(!showTracking)} className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all flex items-center gap-1.5">
            <BarChart3 size="14" /> Tracking
          </button>
          <button onClick={duplicatePage} className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all flex items-center gap-1.5">
            <Copy size="14" /> Duplicar
          </button>
          <button onClick={savePage} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20">
            {saving ? <Loader2 size="14" className="animate-spin" /> : <Save size="14" />} Salvar
          </button>
          {page.status !== "published" ? (
            <button onClick={publishPage} disabled={publishing} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-lg shadow-green-600/20">
              {publishing ? <Loader2 size="14" className="animate-spin" /> : <Globe size="14" />} Publicar
            </button>
          ) : (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-1.5">
              <ExternalLink size="14" /> Visualizar
            </a>
          )}
        </div>
      </div>

      {showTracking && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Configuração de Tracking</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Google Analytics (GA4 ID)</label>
              <input className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="G-XXXXXXXXXX" value={tracking.gaId} onChange={e => setTracking(prev => ({ ...prev, gaId: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Meta Pixel ID</label>
              <input className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="1234567890" value={tracking.pixelId} onChange={e => setTracking(prev => ({ ...prev, pixelId: e.target.value }))} />
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">SEO</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-400">Meta Title</label>
                <input className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Título SEO" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400">Meta Description</label>
                <textarea className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[60px]" value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="Descrição SEO" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tema</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" value={theme.primaryColor} onChange={e => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))} />
                <div>
                  <div className="text-[10px] font-semibold text-gray-400">Primária</div>
                  <div className="text-xs font-mono text-gray-600">{theme.primaryColor}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" value={theme.secondaryColor} onChange={e => setTheme(prev => ({ ...prev, secondaryColor: e.target.value }))} />
                <div>
                  <div className="text-[10px] font-semibold text-gray-400">Secundária</div>
                  <div className="text-xs font-mono text-gray-600">{theme.secondaryColor}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Seções</h3>
            <div className="space-y-1">
              {page.sections.map((section, i) => (
                <div key={i}>
                  <button
                    onClick={() => setActiveSection(activeSection === i ? null : i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${activeSection === i ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${section.props.visible !== false ? "bg-green-400" : "bg-gray-300"}`} />
                    <span>{SECTION_LABELS[section.type] || section.type}</span>
                    <span className="ml-auto text-[10px] text-gray-400">{i + 1}</span>
                  </button>
                  {activeSection === i && (
                    <div className="ml-4 mt-1 space-1">
                      <div className="flex gap-1">
                        {i > 0 && <button onClick={() => moveSection(i, i - 1)} className="text-[10px] px-2 py-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">↑</button>}
                        {i < page.sections.length - 1 && <button onClick={() => moveSection(i, i + 1)} className="text-[10px] px-2 py-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">↓</button>}
                        <button onClick={() => updateSection(i, { ...section.props, visible: section.props.visible === false ? true : false })} className="text-[10px] px-2 py-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                          {section.props.visible === false ? "Mostrar" : "Ocultar"}
                        </button>
                        <button onClick={() => removeSection(i)} className="text-[10px] px-2 py-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 ml-auto">Remover</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="relative mt-3">
              <button onClick={() => setShowAddSection(!showAddSection)} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all flex items-center justify-center gap-1.5">
                <Plus size="14" /> Adicionar seção
              </button>
              {showAddSection && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {SECTION_TYPES.map(type => (
                    <button key={type} onClick={() => addSection(type)} className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      {SECTION_LABELS[type] || type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Preview</span>
              </div>
              <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                {(["desktop", "tablet", "mobile"] as const).map(device => (
                  <button key={device} onClick={() => setPreviewMode(device)} className={`p-1.5 rounded-md transition-all ${previewMode === device ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600"}`}>
                    {device === "desktop" ? <Monitor size="14" /> : device === "tablet" ? <Tablet size="14" /> : <Smartphone size="14" />}
                  </button>
                ))}
              </div>
            </div>

            <div className={`overflow-auto bg-gray-100 ${previewMode === "mobile" ? "max-w-[375px] mx-auto my-4 rounded-2xl shadow-lg" : previewMode === "tablet" ? "max-w-[768px] mx-auto my-4 rounded-2xl shadow-lg" : ""}`}>
              <div className="bg-white min-h-[400px]">
                {page.sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Sparkles size="40" className="mb-3" />
                    <p className="text-sm">Nenhuma seção ainda</p>
                    <p className="text-xs mt-1">Clique em "Adicionar seção" para começar</p>
                  </div>
                ) : (
                  page.sections.map((section, i) => {
                    if (section.props.visible === false) return null;
                    return <SectionPreview key={i} section={section} index={i} />;
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionPreview({ section, index }: { section: Section; index: number }) {
  const p = section.props;
  const primary = "#3B82F6";

  switch (section.type) {
    case "HeroBlock":
      return (
        <div style={{ padding: "80px 24px", textAlign: p.alignment || "center", background: `linear-gradient(135deg, #f0f7ff, #e8f0fe)` }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 800, lineHeight: 1.15, color: "#1e293b" }}>{p.headline || "Sua headline aqui"}</h1>
            {p.subheadline && <p style={{ fontSize: "1.1rem", color: "#64748b", marginTop: "12px" }}>{p.subheadline}</p>}
            {p.ctaText && (
              <div style={{ marginTop: "28px" }}>
                <span style={{ display: "inline-block", padding: "14px 32px", backgroundColor: primary, color: "#fff", borderRadius: "12px", fontWeight: 700, fontSize: "0.95rem" }}>{p.ctaText}</span>
              </div>
            )}
            {p.imageUrl && <img src={p.imageUrl} alt="" style={{ marginTop: "40px", maxWidth: "100%", borderRadius: "12px" }} />}
          </div>
        </div>
      );

    case "BenefitsBlock":
      return (
        <div style={{ padding: "64px 24px" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "32px", color: "#1e293b" }}>{p.title || "Benefícios"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
              {(p.items || []).map((item: any, i: number) => (
                <div key={i} style={{ padding: "24px", backgroundColor: "#f8fafc", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: `${primary}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", color: primary, fontSize: "18px" }}>✓</div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "4px" }}>{item.title}</h3>
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "HowItWorksBlock":
      return (
        <div style={{ padding: "64px 24px", backgroundColor: "#f8fafc" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "40px", color: "#1e293b" }}>{p.title || "Como funciona"}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {(p.steps || []).map((step: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: `${primary}15`, color: primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", flexShrink: 0 }}>{step.step || i + 1}</div>
                  <div><h3 style={{ fontWeight: 600, fontSize: "1rem" }}>{step.title}</h3><p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "2px" }}>{step.description}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "SocialProofBlock":
      return (
        <div style={{ padding: "64px 24px" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "32px" }}>{p.title || "Quem já confia"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              {(p.testimonials || []).map((t: any, i: number) => (
                <div key={i} style={{ padding: "24px", border: "1px solid #f1f5f9", borderRadius: "16px" }}>
                  <p style={{ fontStyle: "italic", color: "#475569", fontSize: "0.9rem" }}>"{t.text}"</p>
                  <div style={{ marginTop: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    {t.photoUrl && <img src={t.photoUrl} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />}
                    <div><strong style={{ fontSize: "0.85rem" }}>{t.name}</strong>{t.role && <span style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8" }}>{t.role}</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "FAQBlock":
      return (
        <div style={{ padding: "64px 24px", backgroundColor: "#f8fafc" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "32px" }}>{p.title || "FAQ"}</h2>
            {(p.items || []).map((item: any, i: number) => (
              <div key={i} style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 0" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", justifyContent: "space-between" }}>{item.question}</div>
                <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "8px" }}>{item.answer}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "CTABlock":
      return (
        <div style={{ padding: "80px 24px", background: `linear-gradient(135deg, ${primary}, #1E40AF)`, color: "#fff", textAlign: "center" }}>
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff" }}>{p.headline || "CTA Final"}</h2>
            {p.subheadline && <p style={{ fontSize: "1rem", opacity: 0.9, marginTop: "12px" }}>{p.subheadline}</p>}
            {p.ctaText && <div style={{ marginTop: "28px" }}><span style={{ display: "inline-block", padding: "14px 32px", backgroundColor: "#fff", color: primary, borderRadius: "12px", fontWeight: 700 }}>{p.ctaText}</span></div>}
          </div>
        </div>
      );

    case "FormBlock":
      return (
        <div id="form" style={{ padding: "64px 24px" }}>
          <div style={{ maxWidth: "480px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "8px" }}>{p.title || "Formulário"}</h2>
            {p.description && <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.9rem", marginBottom: "24px" }}>{p.description}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(p.fields || []).map((f: string, i: number) => (
                <div key={i} style={{ padding: "12px 16px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", color: "#94a3b8", fontSize: "0.85rem" }}>{f}</div>
              ))}
              <div style={{ padding: "14px 24px", backgroundColor: primary, color: "#fff", borderRadius: "12px", fontWeight: 700, fontSize: "0.9rem", textAlign: "center" }}>{p.buttonText || "Enviar"}</div>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{section.type} — Seção {index + 1}</p>
        </div>
      );
  }
}
