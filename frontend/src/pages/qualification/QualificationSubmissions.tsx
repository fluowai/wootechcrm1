import { useState, useEffect } from "react";
import {
  Loader2, Search, Filter, CheckCircle, XCircle,
  Calendar, Clock, UserCheck, Mail, Phone, FileText, Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";

interface Submission {
  id: string;
  formId: string;
  leadId: string | null;
  leadName: string;
  leadEmail: string;
  leadPhone: string | null;
  leadNotes: string | null;
  answers: Record<string, any>;
  score: number;
  maxScore: number;
  scorePercent: number;
  status: string;
  routedTo: string | null;
  routedToUserId: string | null;
  routedAt: string | null;
  routeReason: string | null;
  scheduledTo: string | null;
  calendarEventId: string | null;
  createdAt: string;
  form: { name: string };
}

interface Funnel {
  id: string;
  name: string;
  isDefault: boolean;
}

interface Props {
  forms: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendente", color: "text-yellow-600", bg: "bg-yellow-50" },
  approved: { label: "Aprovado", color: "text-emerald-600", bg: "bg-emerald-50" },
  rejected: { label: "Rejeitado", color: "text-red-600", bg: "bg-red-50" },
  scheduled: { label: "Agendado", color: "text-blue-600", bg: "bg-blue-50" },
  converted: { label: "Convertido", color: "text-purple-600", bg: "bg-purple-50" },
};

const ROUTE_CONFIG: Record<string, { label: string; color: string }> = {
  SDR: { label: "SDR", color: "text-blue-600 bg-blue-50" },
  BDR: { label: "BDR", color: "text-indigo-600 bg-indigo-50" },
  CLOSER: { label: "CLOSER", color: "text-purple-600 bg-purple-50" },
};

export function QualificationSubmissions({ forms }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", formId: "", routedTo: "", search: "" });
  const [selected, setSelected] = useState<Submission | null>(null);
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; submission: Submission | null; date: string; notes: string }>({
    open: false, submission: null, date: "", notes: "",
  });
  const [funnelModal, setFunnelModal] = useState<{ open: boolean; submission: Submission | null; funnelId: string }>({
    open: false, submission: null, funnelId: "",
  });
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [funnelSending, setFunnelSending] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.formId) params.set("formId", filters.formId);
      if (filters.routedTo) params.set("routedTo", filters.routedTo);
      const res = await apiFetch(`/api/qualification/submissions?${params.toString()}`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.formId, filters.routedTo]);

  useEffect(() => {
    apiFetch("/api/prospecting-funnels/funnels")
      .then((res) => res.json())
      .then((data) => setFunnels(Array.isArray(data) ? data : []))
      .catch(() => setFunnels([]));
  }, []);

  const handleApprove = async (sub: Submission) => {
    try {
      await apiFetch(`/api/qualification/submissions/${sub.id}/approve`, { method: "POST", body: JSON.stringify({}) });
      fetchSubmissions();
    } catch (err) {
      console.error("Erro ao aprovar submissão", err);
    }
  };

  const handleReject = async (sub: Submission) => {
    const reason = prompt("Motivo da rejeição:");
    try {
      await apiFetch(`/api/qualification/submissions/${sub.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      fetchSubmissions();
    } catch (err) {
      console.error("Erro ao rejeitar submissão", err);
    }
  };

  const handleFunnelEnroll = async () => {
    if (!funnelModal.submission) return;
    setFunnelSending(true);
    try {
      await apiFetch(`/api/qualification/submissions/${funnelModal.submission.id}/enroll-funnel`, {
        method: "POST",
        body: JSON.stringify({ funnelId: funnelModal.funnelId || undefined }),
      });
      setFunnelModal({ open: false, submission: null, funnelId: "" });
      fetchSubmissions();
    } catch (err) {
      console.error("Erro ao enviar ao funil", err);
    } finally {
      setFunnelSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleModal.submission || !scheduleModal.date) return;
    try {
      await apiFetch(`/api/qualification/submissions/${scheduleModal.submission.id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledTo: scheduleModal.date, notes: scheduleModal.notes }),
      });
      setScheduleModal({ open: false, submission: null, date: "", notes: "" });
      fetchSubmissions();
    } catch (err) {
      console.error("Erro ao agendar", err);
    }
  };

  const filtered = submissions.filter((s) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return s.leadName.toLowerCase().includes(q) || s.leadEmail.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-500 min-w-[80px]">
          <Filter size={14} />
          Filtros
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-white outline-none"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
          <option value="scheduled">Agendado</option>
          <option value="converted">Convertido</option>
        </select>
        <select
          value={filters.formId}
          onChange={(e) => setFilters({ ...filters, formId: e.target.value })}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-white outline-none"
        >
          <option value="">Todos os formulários</option>
          {forms.map((f: any) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          value={filters.routedTo}
          onChange={(e) => setFilters({ ...filters, routedTo: e.target.value })}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-white outline-none"
        >
          <option value="">Todos os times</option>
          <option value="SDR">SDR</option>
          <option value="BDR">BDR</option>
          <option value="CLOSER">CLOSER</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 bg-white border border-gray-200 rounded-2xl">
          <FileText size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma submissão encontrada</p>
          <p className="text-gray-400 text-sm mt-1">As submissões aparecerão aqui quando leads preencherem o formulário</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => {
            const sc = STATUS_CONFIG[sub.status] || { label: sub.status, color: "text-gray-600", bg: "bg-gray-100" };
            const rc = sub.routedTo ? ROUTE_CONFIG[sub.routedTo] : null;
            return (
              <motion.div
                key={sub.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => setSelected(selected?.id === sub.id ? null : sub)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-gray-900">{sub.leadName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                      {rc && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${rc.color}`}>
                          {rc.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail size={11} className="text-gray-400" /> {sub.leadEmail}
                      </span>
                      {sub.leadPhone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} className="text-gray-400" /> {sub.leadPhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileText size={11} className="text-gray-400" /> {sub.form.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-gray-400" /> {new Date(sub.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className={`px-3 py-1.5 rounded-lg text-center ${
                      sub.scorePercent >= 70 ? "bg-green-50 text-green-600" :
                      sub.scorePercent >= 40 ? "bg-orange-50 text-orange-600" :
                      "bg-gray-50 text-gray-400"
                    }`}>
                      <span className="text-sm font-black">{sub.scorePercent}%</span>
                      <span className="block text-[8px] font-bold uppercase tracking-widest">Score</span>
                    </div>
                  </div>
                </div>

                {selected?.id === sub.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-4 pt-4 border-t border-gray-100 space-y-4"
                  >
                    {sub.routeReason && (
                      <div className="p-3 bg-indigo-50 rounded-xl text-xs font-medium text-indigo-700">
                        <UserCheck size={12} className="inline mr-1" />
                        {sub.routeReason}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(sub.answers).filter(([key]) => key !== "__tracking").map(([key, value]) => (
                        <div key={key} className="p-2 bg-gray-50 rounded-lg">
                          <span className="text-[9px] font-bold text-gray-500 uppercase block">{key}</span>
                          <span className="text-sm font-medium text-gray-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>

                    {sub.answers.__tracking && typeof sub.answers.__tracking === "object" && (
                      <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700">
                        <span className="font-black uppercase tracking-wider block mb-1">Rastreamento</span>
                        {Object.entries(sub.answers.__tracking as Record<string, any>)
                          .filter(([, value]) => Boolean(value))
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" | ")}
                      </div>
                    )}

                    {sub.status === "approved" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setScheduleModal({ open: true, submission: sub, date: "", notes: "" }); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                        >
                          <Calendar size={14} />
                          Agendar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFunnelModal({ open: true, submission: sub, funnelId: "" }); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all"
                        >
                          <Send size={14} />
                          Funil SDR IA
                        </button>
                      </div>
                    )}

                    {sub.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(sub); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all"
                        >
                          <CheckCircle size={14} />
                          Aprovar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(sub); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
                        >
                          <XCircle size={14} />
                          Rejeitar
                        </button>
                      </div>
                    )}

                    {sub.scheduledTo && (
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
                        <Calendar size={14} />
                        Agendado para {new Date(sub.scheduledTo).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      <AnimatePresence>
        {scheduleModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setScheduleModal({ open: false, submission: null, date: "", notes: "" }); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6"
            >
              <h3 className="font-black text-gray-900 text-lg mb-4">Agendar Reunião</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Data e Hora</label>
                  <input
                    type="datetime-local"
                    value={scheduleModal.date}
                    onChange={(e) => setScheduleModal({ ...scheduleModal, date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Observações (opcional)</label>
                  <textarea
                    value={scheduleModal.notes}
                    onChange={(e) => setScheduleModal({ ...scheduleModal, notes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm min-h-20 resize-none"
                    placeholder="Notas para o agendamento..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSchedule}
                    disabled={!scheduleModal.date}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm disabled:opacity-50"
                  >
                    Confirmar Agendamento
                  </button>
                  <button
                    onClick={() => setScheduleModal({ open: false, submission: null, date: "", notes: "" })}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Funnel Modal */}
      <AnimatePresence>
        {funnelModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setFunnelModal({ open: false, submission: null, funnelId: "" }); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6"
            >
              <h3 className="font-black text-gray-900 text-lg mb-1">Enviar para Funil SDR IA</h3>
              <p className="text-sm text-gray-500 mb-4">O lead será matriculado no funil de prospecção automatizada.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Funil de Prospecção</label>
                  <select
                    value={funnelModal.funnelId}
                    onChange={(e) => setFunnelModal({ ...funnelModal, funnelId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm bg-white"
                  >
                    <option value="">Funil padrão (WhatsApp SDR IA)</option>
                    {funnels.filter((f) => !f.isDefault).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleFunnelEnroll}
                    disabled={funnelSending}
                    className="flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-sm disabled:opacity-50"
                  >
                    {funnelSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {funnelSending ? "Enviando..." : "Enviar para Funil"}
                  </button>
                  <button
                    onClick={() => setFunnelModal({ open: false, submission: null, funnelId: "" })}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
