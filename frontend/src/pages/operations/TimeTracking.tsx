import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Plus,
  X,
  Trash2,
  Edit3,
  DollarSign,
  Calendar,
  Filter,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function TimeTracking() {
  const [entries, setEntries] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const qs = params.toString();
      const [entriesRes, dashRes] = await Promise.all([
        apiFetch(`/api/time-tracking${qs ? `?${qs}` : ""}`),
        apiFetch("/api/time-tracking/dashboard"),
      ]);
      const eData = await entriesRes.json();
      const dData = await dashRes.json();
      setEntries(Array.isArray(eData) ? eData : eData.entries || []);
      setDashboard(dData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro de tempo?")) return;
    try {
      await apiFetch(`/api/time-tracking/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const statCards = [
    {
      label: "Hoje",
      value: dashboard?.todayHours ?? 0,
      unit: "h",
      icon: Clock,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Esta Semana",
      value: dashboard?.weekHours ?? 0,
      unit: "h",
      icon: Calendar,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Este Mês",
      value: dashboard?.monthHours ?? 0,
      unit: "h",
      icon: FileText,
      color: "bg-green-50 text-green-600",
    },
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
        Carregando registros de tempo...
      </div>
    );

  return (
    <div className="flex flex-col gap-8 p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            Time Tracking
          </h1>
          <p className="text-gray-500">Registre e acompanhe horas trabalhadas.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold text-sm shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Add Entry
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass-card flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {s.value} <span className="text-sm font-medium text-gray-400">{s.unit}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-gray-400">até</span>
          <input
            type="date"
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-xs text-red-500 font-bold hover:text-red-600"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Billable</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rate</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-900">{e.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(e.date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-700">{formatDuration(e.duration)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {e.billable ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : (
                      <X size={16} className="text-gray-300" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {e.hourlyRate ? `R$ ${e.hourlyRate.toFixed(2)}/h` : "-"}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {e.totalValue != null ? `R$ ${e.totalValue.toFixed(2)}` : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(e); setModalOpen(true); }} className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">Nenhum registro de tempo</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <EntryModal
            onClose={() => setModalOpen(false)}
            onSuccess={() => { setModalOpen(false); fetchData(); }}
            initialData={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EntryModal({ onClose, onSuccess, initialData }: { onClose: () => void; onSuccess: () => void; initialData?: any }) {
  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    date: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    duration: initialData?.duration || 60,
    billable: initialData?.billable ?? true,
    hourlyRate: initialData?.hourlyRate || 0,
    projectId: initialData?.projectId || "",
    clientId: initialData?.clientId || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = initialData ? `/api/time-tracking/${initialData.id}` : "/api/time-tracking";
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
          <h2 className="text-xl font-black text-gray-900">{initialData ? "Edit Entry" : "New Time Entry"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
            <input className="modal-input font-bold" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
              <input type="date" className="modal-input font-bold" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Duration (minutes)</label>
              <input type="number" className="modal-input font-bold" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Hourly Rate (R$)</label>
              <input type="number" step="0.01" className="modal-input font-bold" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Billable</label>
              <label className="flex items-center gap-3 mt-2 cursor-pointer">
                <input type="checkbox" checked={formData.billable} onChange={(e) => setFormData({ ...formData, billable: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-primary" />
                <span className="text-sm font-bold text-gray-700">{formData.billable ? "Yes" : "No"}</span>
              </label>
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black uppercase text-gray-400">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-[2] py-4 bg-primary text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-blue-100">
              {submitting ? "Saving..." : initialData ? "Update" : "Create Entry"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
