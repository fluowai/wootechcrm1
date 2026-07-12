import { motion } from "motion/react";
import {
  MoreVertical, Mail, Phone, DollarSign, Clock, Sparkles,
  Plus, Star, Database
} from "lucide-react";

interface OpportunityCardProps {
  opportunity: any;
  onClick: () => void;
  color: string;
}

export default function OpportunityCard({ opportunity, onClick, color }: OpportunityCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={(e: any) => {
        e.dataTransfer.setData("opportunityId", opportunity.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className="bg-white p-5 rounded-[var(--nexus-radius-card)] border border-[var(--nexus-card-border)] shadow-[var(--nexus-shadow-card)] hover:shadow-[var(--nexus-shadow-floating)] hover:border-[var(--nexus-primary)]/30 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: color }}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-[var(--nexus-text-primary)] leading-snug group-hover:text-[var(--nexus-primary)] transition-colors line-clamp-2">
              {opportunity.title}
            </h4>
            {opportunity.client?.tradeName && (
              <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-black rounded uppercase tracking-wider mt-1.5">
                {opportunity.client.tradeName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {opportunity.score !== undefined && opportunity.score > 0 && (
              <div className={`flex flex-col items-end px-2 py-0.5 rounded-lg border ${
                opportunity.score > 70 ? "bg-green-50 text-green-600 border-green-100" :
                opportunity.score > 40 ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-gray-50 text-gray-400 border-gray-100"
              }`}>
                <span className="text-[10px] font-black leading-none">{opportunity.score}%</span>
                <span className="text-[6px] font-black uppercase tracking-wider mt-0.5">Score</span>
              </div>
            )}
            <div className="p-1 text-[var(--nexus-text-muted)] hover:text-[var(--nexus-primary)] rounded-lg hover:bg-[var(--nexus-background-soft)] transition-all flex-shrink-0">
              <MoreVertical size={14} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {opportunity.client?.email && (
            <div className="flex items-center gap-2 text-[var(--nexus-text-secondary)]">
              <Mail size={12} className="opacity-60 text-indigo-500 flex-shrink-0" />
              <span className="text-[11px] font-medium truncate">{opportunity.client.email}</span>
            </div>
          )}
          {opportunity.client?.phone && (
            <div className="flex items-center gap-2 text-[var(--nexus-text-secondary)]">
              <Phone size={12} className="opacity-60 text-green-500 flex-shrink-0" />
              <span className="text-[11px] font-medium">{opportunity.client.phone}</span>
            </div>
          )}

          {opportunity.client?.cnpj && (
            <div className="flex items-center gap-1.5 mt-1 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg w-fit">
              <Database size={10} className="text-orange-500 flex-shrink-0" />
              <span className="text-[10px] font-bold text-gray-700 tracking-wider">{opportunity.client.cnpj}</span>
            </div>
          )}

          {opportunity.description && (
            <p className="text-[10px] text-gray-400 line-clamp-2 mt-1">{opportunity.description}</p>
          )}
        </div>

        <div className="pt-3 border-t border-[var(--nexus-card-border)] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[var(--nexus-text-muted)] uppercase tracking-wider">Valor</span>
            <span className="text-sm font-bold text-[var(--nexus-text-primary)]">
              {opportunity.value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div className="flex items-center -space-x-2">
            <div className="w-6 h-6 rounded-full bg-[var(--nexus-primary-light)] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm">
              {opportunity.title.substring(0, 1)}
            </div>
            <div className="w-6 h-6 rounded-full bg-[var(--nexus-background-soft)] border-2 border-white flex items-center justify-center text-[8px] font-bold text-[var(--nexus-text-muted)] shadow-sm">
              <Plus size={8} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--nexus-background-soft)] rounded text-[9px] font-black text-[var(--nexus-text-secondary)] uppercase tracking-tight">
            <Clock size={10} />
            {opportunity.expectedCloseDate
              ? new Date(opportunity.expectedCloseDate).toLocaleDateString("pt-BR")
              : "Sem prazo"}
          </div>
          {opportunity.value && opportunity.value > 10000 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--nexus-success-soft)] rounded text-[9px] font-black text-[var(--nexus-success-dark)] uppercase tracking-tight">
              <Sparkles size={10} />
              VIP
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
