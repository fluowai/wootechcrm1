import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Calendar,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  FolderTree,
  Grid2X2,
  Hash,
  Layers3,
  List,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

const CATEGORY_ICONS: Record<string, any> = {
  "IA ACP": Zap,
  "Comercial": TrendingUp,
  "Marketing": Sparkles,
  "Operacao": Layers3,
  "Financeiro": FileText,
  "Produto": Grid2X2,
  "Onboarding": Calendar,
};

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags !== "string" || !tags.trim()) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
}

function formatDate(value?: string) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function normalizeCategoryName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function extractAcpPhase(tags: string[], title: string): string | null {
  const phaseMatch = title.match(/Fase (\d+)/i);
  if (phaseMatch) return phaseMatch[0];
  const phaseTag = tags.find(t => /^fase\s*\d+/i.test(t));
  return phaseTag || null;
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterBy, setFilterBy] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchTerm) params.set("search", searchTerm);
      const qs = params.toString();
      const [artRes, catRes] = await Promise.all([
        apiFetch(`/api/knowledge-base${qs ? `?${qs}` : ""}`),
        apiFetch("/api/knowledge-base/categories/list"),
      ]);
      const artData = await artRes.json();
      const catData = await catRes.json();
      const rawArticles = Array.isArray(artData) ? artData : artData.articles || [];
      const rawCategories = Array.isArray(catData) ? catData : catData.categories || [];
      setArticles(rawArticles);
      setCategories(rawCategories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, searchTerm]);

  const categoryItems = useMemo(() => {
    const apiCounts = new Map<string, number>();
    categories.forEach((cat: any) => {
      const name = typeof cat === "string" ? cat : cat.category || cat.name;
      if (!name) return;
      apiCounts.set(normalizeCategoryName(name), cat._count?.id || cat.count || 0);
    });

    const uniqueNames = new Set<string>();
    articles.forEach(a => {
      if (a.category) uniqueNames.add(a.category);
    });

    return Array.from(uniqueNames).map(name => {
      const icon = CATEGORY_ICONS[name] || BookOpen;
      return {
        name,
        icon,
        count: apiCounts.get(normalizeCategoryName(name)) || articles.filter(a => a.category === name).length,
      };
    }).sort((a, b) => b.count - a.count);
  }, [categories, articles]);

  const normalizedArticles = useMemo(() => {
    const visible = articles.filter((article) => {
      const matchesSearch =
        !searchTerm ||
        article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || normalizeCategoryName(article.category || "") === normalizeCategoryName(selectedCategory);
      const matchesFavorite = filterBy !== "favorites" || (article.views || 0) >= 100;
      return matchesSearch && matchesCategory && matchesFavorite;
    });

    return [...visible].sort((a, b) => {
      if (sortBy === "popular") return (b.views || 0) - (a.views || 0);
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
  }, [articles, filterBy, searchTerm, selectedCategory, sortBy]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este artigo?")) return;
    try {
      await apiFetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
      fetchArticles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcpSeed = async () => {
    if (!confirm("Semear base de conhecimento com os 16 artigos do Método ACP v2.0?")) return;
    setSeeding(true);
    try {
      const res = await apiFetch("/api/knowledge-base/acp-seed", { method: "POST" });
      const data = await res.json();
      alert(`${data.created} artigos ACP criados (${data.total} disponíveis).`);
      fetchArticles();
    } catch (err) {
      console.error(err);
      alert("Erro ao semear artigos ACP.");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[#64748B]">
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#5B5CF0] border-t-transparent" />
          <span className="text-sm font-semibold">Carregando base de conhecimento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[40px] font-bold leading-tight tracking-normal text-[#0F172A]">Base de Conhecimento</h1>
          <p className="mt-2 text-[18px] font-medium text-[#64748B]">Documentação, processos, playbooks e o método ACP v2.0 completo.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAcpSeed}
            disabled={seeding}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-[#5B5CF0] bg-white px-5 text-[14px] font-bold text-[#5B5CF0] transition-all duration-200 hover:bg-[#F4F5FF] disabled:opacity-50"
          >
            <Zap size={18} />
            {seeding ? "Semear ACP..." : "Semear ACP"}
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#5B5CF0] px-6 text-[16px] font-bold text-white shadow-lg shadow-[#5B5CF0]/20 transition-all duration-200 hover:bg-[#4F46E5] active:scale-[0.98]"
          >
            <Plus size={20} />
            Novo Artigo
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={24} />
        <input
          className="h-16 w-full rounded-xl border border-[#E2E8F0] bg-white pl-16 pr-24 text-[18px] text-[#0F172A] shadow-sm outline-none transition-all duration-200 placeholder:text-[#94A3B8] focus:border-[#5B5CF0] focus:ring-4 focus:ring-[#5B5CF0]/10"
          placeholder="Buscar artigos, processos, documentações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-lg bg-[#F8FAFC] px-3 py-1.5 text-[13px] font-bold text-[#64748B] md:inline-flex">
          Ctrl K
        </span>
      </div>

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 px-1 text-[14px] font-bold uppercase tracking-[1px] text-[#0F172A]">
            <FolderTree size={18} className="text-[#5B5CF0]" />
            Categorias
          </div>
          <div className="flex flex-col gap-2">
            <CategoryButton
              active={!selectedCategory}
              icon={BookOpen}
              label="Todas Categorias"
              count={articles.length}
              onClick={() => setSelectedCategory("")}
            />
            {categoryItems.map((category) => (
              <CategoryButton
                key={category.name}
                active={normalizeCategoryName(selectedCategory) === normalizeCategoryName(category.name)}
                icon={category.icon}
                label={category.name}
                count={category.count}
                onClick={() => setSelectedCategory(category.name)}
              />
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <FilterSelect value={selectedCategory || "all"} onChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                <option value="all">Todas as categorias</option>
                {categoryItems.map((category) => (
                  <option key={category.name} value={category.name}>{category.name}</option>
                ))}
              </FilterSelect>
              <FilterSelect value={sortBy} onChange={setSortBy}>
                <option value="recent">Mais recentes</option>
                <option value="popular">Mais acessados</option>
              </FilterSelect>
              <FilterSelect value={filterBy} onChange={setFilterBy}>
                <option value="all">Todos</option>
                <option value="favorites">Mais acessados (100+)</option>
              </FilterSelect>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-12 w-12 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#5B5CF0] transition-all duration-200 hover:bg-[#F4F5FF]">
                <List size={20} className="mx-auto" />
              </button>
              <button className="h-12 w-12 rounded-xl border border-[#E2E8F0] bg-white text-[#94A3B8] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
                <Grid2X2 size={20} className="mx-auto" />
              </button>
            </div>
          </div>

          {normalizedArticles.length === 0 ? (
            <EmptyState onCreate={() => { setEditing(null); setModalOpen(true); }} articlesCount={articles.length} />
          ) : (
            <div className="flex flex-col gap-4">
              {normalizedArticles.map((article) => {
                const tags = parseTags(article.tags);
                const acpPhase = extractAcpPhase(tags, article.title);
                return (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    acpPhase={acpPhase}
                    onView={() => setSelectedArticle(article)}
                    onEdit={() => {
                      setEditing(article);
                      setModalOpen(true);
                    }}
                    onDelete={() => handleDelete(article.id)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F4F5FF] text-[#5B5CF0]">
            <BookOpen size={27} />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-[#0F172A]">Não encontrou o que estava procurando?</h3>
            <p className="text-[16px] font-medium text-[#64748B]">Sugira um novo artigo para nossa base de conhecimento.</p>
          </div>
        </div>
        <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#C7D2FE] px-6 text-[16px] font-bold text-[#5B5CF0] transition-all duration-200 hover:bg-[#F4F5FF]">
          Sugerir artigo
          <ArrowRight size={17} />
        </button>
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <ArticleViewModal
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
            onEdit={() => {
              setEditing(selectedArticle);
              setModalOpen(true);
              setSelectedArticle(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ArticleModal
            onClose={() => setModalOpen(false)}
            onSuccess={() => { setModalOpen(false); fetchArticles(); }}
            initialData={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryButton({ active, icon: Icon, label, count, onClick }: { active: boolean; icon: any; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex h-[60px] items-center gap-3 rounded-xl border px-4 text-left transition-all duration-200 ${
        active
          ? "border-[#E0E7FF] bg-[#F4F5FF] text-[#5B5CF0]"
          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#C7D2FE] hover:bg-[#F8FAFC] hover:text-[#5B5CF0]"
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-white" : "bg-[#F8FAFC] group-hover:bg-white"}`}>
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1 text-[16px] font-bold">{label}</span>
      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[13px] font-bold text-[#64748B]">{count}</span>
      <ChevronRight size={18} className="text-[#94A3B8]" />
    </button>
  );
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 min-w-[180px] rounded-xl border border-[#E2E8F0] bg-white px-4 text-[15px] font-semibold text-[#64748B] outline-none transition-all duration-200 hover:border-[#C7D2FE] focus:border-[#5B5CF0] focus:ring-4 focus:ring-[#5B5CF0]/10"
    >
      {children}
    </select>
  );
}

function ArticleCard({ article, acpPhase, onView, onEdit, onDelete }: { article: any; acpPhase: string | null; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const tags = parseTags(article.tags);
  const summary = article.content?.replace(/\s+/g, " ").slice(0, 120) || "Documentação interna da operação Nexus360.";

  return (
    <motion.article
      layout
      onClick={onView}
      className="group flex cursor-pointer flex-col gap-5 rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all duration-200 hover:border-[#C7D2FE] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] lg:flex-row lg:items-center"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F4F5FF] text-[#5B5CF0]">
        <FileText size={28} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[19px] font-bold text-[#0F172A]">{article.title}</h3>
          {acpPhase && (
            <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-bold text-[#5B5CF0]">
              {acpPhase}
            </span>
          )}
          {!article.isPublished && (
            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[12px] font-bold text-[#64748B]">Rascunho</span>
          )}
        </div>
        <p className="mt-2 text-[16px] font-medium leading-7 text-[#64748B]">{summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#F8FAFC] px-3 py-1.5 text-[13px] font-bold text-[#5B5CF0]">{article.category || "Geral"}</span>
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[13px] font-bold text-[#5B5CF0]">
              <Hash size={12} />
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 lg:min-w-[340px]">
        <div className="text-right text-[15px] font-medium text-[#64748B]">
          <div className="flex items-center justify-end gap-1">
            <Clock3 size={16} />
            {formatDate(article.updatedAt || article.createdAt)}
          </div>
          <div className="mt-1">por {article.author || "Time de Produto"}</div>
          <div className="mt-1 flex items-center justify-end gap-1">
            <Eye size={16} />
            {article.views || 0} acessos
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-100 transition-opacity duration-200 lg:opacity-70 lg:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <button className="h-11 w-11 rounded-lg text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
            <Bookmark size={19} className="mx-auto" />
          </button>
          <button onClick={onEdit} className="h-11 w-11 rounded-lg text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
            <Edit3 size={19} className="mx-auto" />
          </button>
          <button onClick={onDelete} className="h-11 w-11 rounded-lg text-[#64748B] transition-all duration-200 hover:bg-red-50 hover:text-red-500">
            <Trash2 size={19} className="mx-auto" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({ onCreate, articlesCount }: { onCreate: () => void; articlesCount: number }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 text-center">
      <div className="relative mb-5">
        <div className="h-24 w-24 rounded-3xl bg-white shadow-sm" />
        <div className="absolute inset-0 flex items-center justify-center text-[#5B5CF0]">
          <BookOpen size={42} />
        </div>
        <Star className="absolute -right-3 -top-3 text-[#7C6CFF]" size={22} />
      </div>
      <h3 className="text-[20px] font-bold text-[#0F172A]">
        {articlesCount > 0 ? "Nenhum artigo corresponde aos filtros." : "Nenhum artigo encontrado."}
      </h3>
      <p className="mt-2 max-w-md text-[15px] font-medium leading-6 text-[#64748B]">
        {articlesCount > 0
          ? "Tente ajustar os filtros ou termos de busca."
          : "Clique em \"Semear ACP\" para popular com o método completo ou crie manualmente."}
      </p>
      <button
        onClick={onCreate}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#5B5CF0] px-5 text-[14px] font-bold text-white shadow-lg shadow-[#5B5CF0]/20 transition-all duration-200 hover:bg-[#4F46E5]"
      >
        <Plus size={17} />
        Criar Artigo
      </button>
    </div>
  );
}

function ArticleViewModal({ article, onClose, onEdit }: { article: any; onClose: () => void; onEdit: () => void }) {
  const tags = useMemo(() => parseTags(article.tags), [article.tags]);
  const acpPhase = useMemo(() => {
    const match = article.title?.match(/Fase \d+/i);
    return match ? match[0] : null;
  }, [article.title]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#E2E8F0] px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#0F172A]">{article.title}</h2>
              {acpPhase && (
                <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[12px] font-bold text-[#5B5CF0] shrink-0">
                  {acpPhase}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px] text-[#64748B]">
              {article.category && <span>{article.category}</span>}
              <span>{article.views || 0} acessos</span>
              <span>{formatDate(article.updatedAt || article.createdAt)}</span>
              {!article.isPublished && <span className="text-[#F59E0B]">Rascunho</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button onClick={onEdit} className="h-9 w-9 rounded-xl text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
              <Edit3 size={18} className="mx-auto" />
            </button>
            <button onClick={onClose} className="h-9 w-9 rounded-xl text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
              <X size={20} className="mx-auto" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[13px] font-bold text-[#5B5CF0]">
                  <Hash size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="prose prose-lg max-w-none text-[16px] leading-8 text-[#334155]">
            {article.content?.split("\n").map((line: string, i: number) => {
              if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold text-[#0F172A] mt-8 mb-4">{line.slice(2)}</h1>;
              if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold text-[#0F172A] mt-6 mb-3">{line.slice(3)}</h2>;
              if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-bold text-[#0F172A] mt-5 mb-2">{line.slice(4)}</h3>;
              if (line.startsWith("- **")) {
                const boldMatch = line.match(/- \*\*(.+?)\*\*(.*)/);
                if (boldMatch) return <p key={i} className="ml-4 mb-1"><strong>{boldMatch[1]}</strong>{boldMatch[2]}</p>;
              }
              if (line.startsWith("- ")) return <li key={i} className="ml-6 mb-1 list-disc">{line.slice(2)}</li>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="mb-3">{line}</p>;
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4">
          <span className="text-[13px] text-[#64748B]">Artigo #{article.id.slice(0, 8)}</span>
          <button onClick={onClose} className="rounded-xl bg-[#0F172A] px-6 py-2.5 text-[14px] font-bold text-white transition-all duration-200 hover:bg-[#1E293B]">
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ArticleModal({ onClose, onSuccess, initialData }: { onClose: () => void; onSuccess: () => void; initialData?: any }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    content: initialData?.content || "",
    category: initialData?.category || "",
    tags: initialData?.tags ? parseTags(initialData.tags).join(", ") : "",
    isPublished: initialData?.isPublished ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...formData,
        tags: formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      };
      const url = initialData ? `/api/knowledge-base/${initialData.id}` : "/api/knowledge-base";
      const method = initialData ? "PATCH" : "POST";
      await apiFetch(url, { method, body: JSON.stringify(body) });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5">
          <h2 className="text-xl font-bold text-[#0F172A]">{initialData ? "Editar Artigo" : "Novo Artigo"}</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-xl text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]"><X size={20} className="mx-auto" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#64748B]">Título</label>
            <input className="modal-input font-semibold" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#64748B]">Categoria</label>
              <input className="modal-input font-semibold" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Ex: IA ACP, Comercial" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#64748B]">Tags</label>
              <input className="modal-input" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="ACP, Fase 1, Diagnóstico" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#64748B]">Conteúdo</label>
            <textarea className="modal-input min-h-[250px] resize-none text-sm leading-6" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E2E8F0] p-3">
            <input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })} className="h-5 w-5 rounded border-[#CBD5E1] text-[#5B5CF0]" />
            <span className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
              {formData.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
              Publicado
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl text-sm font-bold text-[#64748B] transition-all duration-200 hover:bg-[#F8FAFC]">Cancelar</button>
            <button type="submit" disabled={submitting} className="h-12 flex-[2] rounded-xl bg-[#5B5CF0] text-sm font-bold text-white shadow-lg shadow-[#5B5CF0]/20 transition-all duration-200 hover:bg-[#4F46E5] disabled:opacity-60">
              {submitting ? "Salvando..." : initialData ? "Salvar" : "Criar Artigo"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
