import { useState } from "react";
import { motion } from "motion/react";
import { Target, X } from "lucide-react";
import { apiFetch } from "../../lib/api";

interface NewOpportunityModalProps {
  onClose: () => void;
  onSuccess: () => void;
  pipelines: { id: string; name: string; stages: { id: string; name: string; order: number }[] }[];
}

export default function NewOpportunityModal({ onClose, onSuccess, pipelines }: NewOpportunityModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    value: "",
    description: "",
    clientId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    pipelineId: pipelines[0]?.id || "",
    stageId: "",
    expectedCloseDate: "",
    assignedToId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedPipeline = pipelines.find(p => p.id === formData.pipelineId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/crm/opportunities", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          value: formData.value ? parseFloat(formData.value) : 0,
          expectedCloseDate: formData.expectedCloseDate || undefined,
        }),
      });
      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--nexus-nav-dark)]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[24px] shadow-[var(--nexus-shadow-floating)] w-full max-w-xl overflow-hidden relative z-10"
      >
        <div className="p-8 border-b border-[var(--nexus-background-soft)] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--nexus-primary-light)]/10 text-[var(--nexus-primary)] rounded-lg">
              <Target size={20} />
            </div>
            <h2 className="text-lg font-bold text-[var(--nexus-text-primary)]">Nova Oportunidade</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--nexus-background-soft)] rounded-full text-[var(--nexus-text-muted)] transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Título</label>
              <input required className="modal-input" placeholder="Ex: Contrato Alpha" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Valor (R$)</label>
              <input type="number" className="modal-input" placeholder="0,00" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Nome do Cliente / Empresa</label>
            <input required className="modal-input" placeholder="Ex: Acme Corp" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Email do Cliente</label>
              <input type="email" className="modal-input" placeholder="contato@empresa.com" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Telefone / WhatsApp</label>
              <input className="modal-input" placeholder="(11) 99999-9999" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Pipeline</label>
            <select className="modal-input" value={formData.pipelineId} onChange={e => setFormData({...formData, pipelineId: e.target.value, stageId: "" })}>
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Etapa Inicial</label>
              <select className="modal-input" value={formData.stageId} onChange={e => setFormData({...formData, stageId: e.target.value})}>
                <option value="">Automática</option>
                {selectedPipeline?.stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Previsão Fechamento</label>
              <input type="date" className="modal-input" value={formData.expectedCloseDate} onChange={e => setFormData({...formData, expectedCloseDate: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Descrição</label>
            <textarea className="modal-input min-h-[80px] resize-none" placeholder="Detalhes da oportunidade..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 text-xs font-bold text-[var(--nexus-text-secondary)] hover:bg-[var(--nexus-background-soft)] rounded-xl transition-all">Cancelar</button>
            <button disabled={submitting} type="submit" className="flex-1 py-3.5 bg-[var(--nexus-primary)] text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
              {submitting ? "Criando..." : "Criar Oportunidade"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
