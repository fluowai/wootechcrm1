import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Plus,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  RotateCcw,
  ThumbsUp,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

const COLUMNS = [
  { id: "pending", title: "Pending", color: "bg-gray-400" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
  { id: "in_review", title: "In Review", color: "bg-amber-500" },
  { id: "approved", title: "Approved", color: "bg-green-500" },
  { id: "rejected", title: "Rejected", color: "bg-red-500" },
  { id: "delivered", title: "Delivered", color: "bg-emerald-700" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function DeliveryKanban() {
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [addModal, setAddModal] = useState(false);

  const fetchDeliverables = async () => {
    try {
      const res = await apiFetch("/api/delivery/deliverables");
      const data = await res.json();
      setDeliverables(Array.isArray(data) ? data : data.deliverables || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliverables();
  }, []);

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDrop = async (status: string) => {
    if (!draggedId) return;
    setDeliverables((prev) =>
      prev.map((d) => (d.id === draggedId ? { ...d, status } : d))
    );
    try {
      await apiFetch(`/api/delivery/deliverables/${draggedId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      fetchDeliverables();
    }
    setDraggedId(null);
  };

  const handleAction = async (id: string, action: string, comment?: string) => {
    try {
      await apiFetch(`/api/delivery/deliverables/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ comment, status: action }),
      });
      setDetailModal(null);
      fetchDeliverables();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
        Carregando kanban de entregas...
      </div>
    );

  return (
    <div className="flex flex-col gap-8 p-2 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            Delivery Kanban
          </h1>
          <p className="text-gray-500">Gerencie o fluxo de entregas e deliverables.</p>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold text-sm shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Add Deliverable
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar flex-1">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex-shrink-0 w-[280px] flex flex-col gap-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.id)}
          >
            <div className="flex items-center gap-3 px-2">
              <div className={`w-3 h-3 rounded-full ${col.color}`} />
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">
                {col.title}
              </h3>
              <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-black">
                {deliverables.filter((d) => d.status === col.id).length}
              </span>
            </div>
            <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-[24px] bg-gray-50/30">
              {deliverables
                .filter((d) => d.status === col.id)
                .map((d) => (
                  <motion.div
                    key={d.id}
                    layoutId={d.id}
                    draggable
                    onDragStart={() => handleDragStart(d.id)}
                    onClick={() => setDetailModal(d)}
                    className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${
                          PRIORITY_COLORS[d.priority] || PRIORITY_COLORS.medium
                        }`}
                      >
                        {d.priority}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {d.type}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">
                      {d.title}
                    </h4>
                    {d.dueDate && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                        <Clock size={12} />
                        {new Date(d.dueDate).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </motion.div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {detailModal && (
          <DetailModal
            item={detailModal}
            onClose={() => setDetailModal(null)}
            onUpdate={fetchDeliverables}
            onAction={handleAction}
          />
        )}
        {addModal && (
          <AddModal
            onClose={() => setAddModal(false)}
            onSuccess={() => {
              setAddModal(false);
              fetchDeliverables();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailModal({
  item,
  onClose,
  onUpdate,
  onAction,
}: {
  item: any;
  onClose: () => void;
  onUpdate: () => void;
  onAction: (id: string, action: string, comment?: string) => void;
}) {
  const [comment, setComment] = useState("");

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
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg relative z-10"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900">{item.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Type</span>
              <p className="font-bold text-gray-700">{item.type}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Priority</span>
              <p className="font-bold text-gray-700">{item.priority}</p>
            </div>
            {item.version && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Version</span>
                <p className="font-bold text-gray-700">{item.version}</p>
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
              <p className="font-bold text-gray-700">{item.status}</p>
            </div>
          </div>
          {item.description && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Description</span>
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            </div>
          )}
          {item.notes && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Notes</span>
              <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
            </div>
          )}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <textarea
              className="modal-input min-h-[80px] resize-none text-sm"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {item.status === "approved" && (
                <button
                  onClick={() => onAction(item.id, "delivered", comment)}
                  className="flex-1 py-3 bg-emerald-500 text-white font-black text-xs uppercase rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={14} /> Mark as Delivered
                </button>
              )}
              {item.status === "in_review" && (
                <>
                  <button
                    onClick={() => onAction(item.id, "approved", comment)}
                    className="flex-1 py-3 bg-green-500 text-white font-black text-xs uppercase rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                  >
                    <ThumbsUp size={14} /> Approve
                  </button>
                  <button
                    onClick={() => onAction(item.id, "rejected", comment)}
                    className="flex-1 py-3 bg-red-500 text-white font-black text-xs uppercase rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={14} /> Reject
                  </button>
                </>
              )}
              {item.status === "rejected" && (
                <button
                  onClick={() => onAction(item.id, "in_review", comment)}
                  className="flex-1 py-3 bg-amber-500 text-white font-black text-xs uppercase rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} /> Request Changes
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AddModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "document",
    priority: "medium",
    dueDate: "",
    notes: "",
    version: "1.0",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/delivery/deliverables", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      onSuccess();
    } catch (err) {
      console.error(err);
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
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg relative z-10"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900">Add Deliverable</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Title</label>
            <input
              className="modal-input font-bold"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
            <textarea
              className="modal-input min-h-[80px] resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Type</label>
              <select
                className="modal-input font-bold"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="document">Document</option>
                <option value="design">Design</option>
                <option value="code">Code</option>
                <option value="report">Report</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Priority</label>
              <select
                className="modal-input font-bold"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Due Date</label>
              <input
                type="date"
                className="modal-input font-bold"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Version</label>
              <input
                className="modal-input font-bold"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Notes</label>
            <textarea
              className="modal-input min-h-[60px] resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-xs font-black uppercase text-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] py-4 bg-primary text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-blue-100"
            >
              {submitting ? "Saving..." : "Create Deliverable"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
