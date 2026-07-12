import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Plus,
  X,
  Trash2,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Clock,
  Calendar,
  Filter,
  Search,
  Edit3,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function ServiceCatalog() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchServices = async () => {
    try {
      const qs = filterCategory ? `?category=${encodeURIComponent(filterCategory)}` : "";
      const res = await apiFetch(`/api/service-catalog${qs}`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : data.services || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [filterCategory]);

  const toggleActive = async (svc: any) => {
    try {
      await apiFetch(`/api/service-catalog/${svc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !svc.isActive }),
      });
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;
    try {
      await apiFetch(`/api/service-catalog/${id}`, { method: "DELETE" });
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [...new Set(services.map((s) => s.type).filter(Boolean))];
  const filtered = services.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
        Carregando catálogo de serviços...
      </div>
    );

  return (
    <div className="flex flex-col gap-8 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            Catálogo de Serviços
          </h1>
          <p className="text-gray-500">Gerencie os serviços e produtos oferecidos.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold text-sm shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Novo Serviço
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-full focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((svc) => (
          <div key={svc.id} className="glass-card flex flex-col gap-4 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                  <Package size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{svc.name}</h3>
                  {svc.type && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {svc.type}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                  svc.isActive !== false
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {svc.isActive !== false ? "Ativo" : "Inativo"}
              </span>
            </div>
            {svc.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{svc.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {svc.setupValue != null && (
                <div className="flex items-center gap-1.5 text-gray-600 font-bold">
                  <DollarSign size={12} className="text-gray-400" />
                  Setup: R$ {svc.setupValue.toLocaleString()}
                </div>
              )}
              {svc.monthlyValue != null && (
                <div className="flex items-center gap-1.5 text-gray-600 font-bold">
                  <DollarSign size={12} className="text-gray-400" />
                  Mensal: R$ {svc.monthlyValue.toLocaleString()}
                </div>
              )}
              {svc.estimatedHours != null && (
                <div className="flex items-center gap-1.5 text-gray-600 font-bold">
                  <Clock size={12} className="text-gray-400" />
                  {svc.estimatedHours}h estimadas
                </div>
              )}
              {svc.deliveryDays != null && (
                <div className="flex items-center gap-1.5 text-gray-600 font-bold">
                  <Calendar size={12} className="text-gray-400" />
                  {svc.deliveryDays} dias
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => toggleActive(svc)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {svc.isActive !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditing(svc); setModalOpen(true); }}
                  className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(svc.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">Nenhum serviço encontrado</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <ServiceModal
            onClose={() => setModalOpen(false)}
            onSuccess={() => { setModalOpen(false); fetchServices(); }}
            initialData={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceModal({ onClose, onSuccess, initialData }: { onClose: () => void; onSuccess: () => void; initialData?: any }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    type: initialData?.type || "",
    setupValue: initialData?.setupValue ?? 0,
    monthlyValue: initialData?.monthlyValue ?? 0,
    estimatedHours: initialData?.estimatedHours ?? 0,
    deliveryDays: initialData?.deliveryDays ?? 0,
    isActive: initialData?.isActive ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = initialData ? `/api/service-catalog/${initialData.id}` : "/api/service-catalog";
      const method = initialData ? "PATCH" : "POST";
      await apiFetch(url, { method, body: JSON.stringify(formData) });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg relative z-10">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900">{initialData ? "Editar Serviço" : "Novo Serviço"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Nome</label>
            <input className="modal-input font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição</label>
            <textarea className="modal-input min-h-[80px] resize-none" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tipo / Categoria</label>
            <select className="modal-input font-bold" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
              <option value="">Selecione...</option>
              <option value="consultancy">Consultancy</option>
              <option value="development">Development</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
              <option value="support">Support</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Setup (R$)</label>
              <input type="number" className="modal-input font-bold" value={formData.setupValue} onChange={(e) => setFormData({ ...formData, setupValue: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Mensal (R$)</label>
              <input type="number" className="modal-input font-bold" value={formData.monthlyValue} onChange={(e) => setFormData({ ...formData, monthlyValue: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Horas Estimadas</label>
              <input type="number" className="modal-input font-bold" value={formData.estimatedHours} onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Dias Entrega</label>
              <input type="number" className="modal-input font-bold" value={formData.deliveryDays} onChange={(e) => setFormData({ ...formData, deliveryDays: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-primary" />
            <span className="text-sm font-bold text-gray-700">Serviço Ativo</span>
          </label>
          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black uppercase text-gray-400">Cancelar</button>
            <button type="submit" disabled={submitting} className="flex-[2] py-4 bg-primary text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-blue-100">
              {submitting ? "Salvando..." : initialData ? "Salvar" : "Criar Serviço"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
