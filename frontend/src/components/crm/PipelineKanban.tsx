import { AnimatePresence } from "motion/react";
import {
  Plus, DollarSign, TrendingUp, MessageSquare, Target, Send, CheckCircle2
} from "lucide-react";
import OpportunityCard from "./OpportunityCard";

interface PipelineKanbanProps {
  opportunities: any[];
  onOpportunityClick: (id: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  stages: { id: string; name: string; color: string; order: number }[];
}

const defaultIcons: Record<string, any> = {
  MessageSquare, Target, Send, CheckCircle2,
};

export default function PipelineKanban({ opportunities, onOpportunityClick, onDrop, stages }: PipelineKanbanProps) {
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const getOppsByStage = (stageId: string) =>
    opportunities.filter(o => o.stageId === stageId);

  const calculateColumnTotal = (stageId: string) =>
    getOppsByStage(stageId).reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div className="flex gap-6 min-h-[calc(100vh-250px)]">
      {stages.map((stage) => {
        const colOpps = getOppsByStage(stage.id);
        const colValue = calculateColumnTotal(stage.id);

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-[320px] flex flex-col gap-4"
            onDragOver={handleDragOver}
            onDrop={(e) => onDrop(e, stage.id)}
          >
            <div className="flex flex-col gap-3 pb-2 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-6 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="font-bold text-sm text-[var(--nexus-text-primary)] tracking-tight">
                    {stage.name}
                  </h3>
                </div>
                <span className="text-[10px] font-black bg-white border border-[var(--nexus-card-border)] text-[var(--nexus-text-secondary)] px-2 py-1 rounded-md shadow-sm">
                  {colOpps.length}
                </span>
              </div>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1 text-[var(--nexus-text-muted)]">
                  <DollarSign size={12} />
                  <span className="text-xs font-bold">
                    {colValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[var(--nexus-success)]">
                  <TrendingUp size={12} />
                  <span className="text-[10px] font-bold">2.4%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 py-2">
              <AnimatePresence mode="popLayout">
                {colOpps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onClick={() => onOpportunityClick(opp.id)}
                    color={stage.color}
                  />
                ))}
              </AnimatePresence>

              {colOpps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-2xl opacity-40">
                  <div className="p-3 bg-gray-50 rounded-full mb-3">
                    <Plus size={20} className="text-gray-400" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Arraste para cá</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
