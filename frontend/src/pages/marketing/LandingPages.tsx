import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Sparkles, ExternalLink, BarChart3, Globe, Trash2, Copy,
  Eye, Edit, Loader2, Monitor, CheckCircle, XCircle, Search, AlertTriangle
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch, readJsonResponse } from "../../lib/api";

interface LandingPageItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  views: number;
  submissions: number;
  conversionRate: number;
  metaTitle?: string;
  headline?: string;
  heroImage?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function LandingPages() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { loadPages(); }, []);

  const loadPages = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/landing-pages");
      if (res.ok) {
        const data = await readJsonResponse(res);
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error("Failed to load landing pages", error);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/landing-pages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPages(prev => prev.filter(p => p.id !== id));
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Failed to delete landing page", error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await apiFetch(`/api/landing-pages/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const dup = await readJsonResponse(res);
        setPages(prev => [{ ...dup, views: 0, submissions: 0, conversionRate: 0 }, ...prev]);
      }
    } catch (error) {
      console.error("Failed to duplicate landing page", error);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await apiFetch(`/api/landing-pages/${id}/publish`, { method: "POST" });
      if (res.ok) {
        setPages(prev => prev.map(p => p.id === id ? { ...p, status: "published", publishedAt: new Date().toISOString() } : p));
      }
    } catch (error) {
      console.error("Failed to publish landing page", error);
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const res = await apiFetch(`/api/landing-pages/${id}/unpublish`, { method: "POST" });
      if (res.ok) {
        setPages(prev => prev.map(p => p.id === id ? { ...p, status: "draft", publishedAt: undefined } : p));
      }
    } catch (error) {
      console.error("Failed to unpublish landing page", error);
    }
  };

  const filtered = pages.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: pages.length,
    published: pages.filter(p => p.status === "published").length,
    totalViews: pages.reduce((acc, p) => acc + p.views, 0),
    totalLeads: pages.reduce((acc, p) => acc + p.submissions, 0),
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Landing Pages</h1>
          <p className="text-sm text-gray-500 mt-1">Crie e gerencie páginas de captura com IA</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/landing-pages/new")} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Sparkles size="14" /> Criar com IA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Publicadas", value: stats.published, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Visualizações", value: stats.totalViews, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Leads", value: stats.totalLeads, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 border border-gray-100`}>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs font-medium text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-sm">
            <Search size="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Buscar páginas..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size="24" className="animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Monitor size="48" className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium text-sm">{search ? "Nenhuma página encontrada" : "Nenhuma landing page ainda"}</p>
            {!search && (
              <button onClick={() => navigate("/landing-pages/new")} className="mt-4 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all inline-flex items-center gap-2">
                <Plus size="14" /> Criar primeira página
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(page => {
              const isPublished = page.status === "published";
              const publicUrl = `${window.location.origin}/lp/${page.slug}`;

              return (
                <motion.div key={page.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                    <Monitor size="18" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{page.name}</h3>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPublished ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {isPublished ? "Publicado" : "Rascunho"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">/{page.slug}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-5 text-xs text-gray-400">
                    <div className="flex items-center gap-1"><BarChart3 size="12" /> {page.views} visualizações</div>
                    <div className="flex items-center gap-1"><Globe size="12" /> {page.submissions} leads</div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => navigate(`/landing-pages/${page.id}/edit`)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
                      <Edit size="15" />
                    </button>
                    {isPublished ? (
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Visualizar">
                        <ExternalLink size="15" />
                      </a>
                    ) : (
                      <button onClick={() => handlePublish(page.id)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Publicar">
                        <CheckCircle size="15" />
                      </button>
                    )}
                    <button onClick={() => handleDuplicate(page.id)} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Duplicar">
                      <Copy size="15" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(page.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                      <Trash2 size="15" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <AlertTriangle size="32" className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-center text-gray-900">Excluir página?</h3>
            <p className="text-sm text-gray-500 text-center mt-1 mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">Cancelar</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
