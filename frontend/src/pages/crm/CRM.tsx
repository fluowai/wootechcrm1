import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, Loader2, Sparkles, Target, TrendingUp,
  LayoutGrid, List, BarChart3, Trophy, MessageSquare, Send,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../../lib/api";
import { WinLeadModal } from "../../components/crm/WinLeadModal";
import { NexusMeetScheduler } from "../../components/crm/NexusMeetScheduler";
import PipelineKanban from "../../components/crm/PipelineKanban";
import OpportunityDetail from "../../components/crm/OpportunityDetail";
import NewOpportunityModal from "../../components/crm/NewOpportunityModal";
import Pagination from "../../components/Pagination";
import type { Pipeline, Opportunity, PipelineStage } from "../../types";

interface GrowthIntel {
  forecast?: {
    weightedForecast: number;
    openValue: number;
    wonValue: number;
    monthlyRecurring: number;
    conversionRate: number;
  };
  benchmark?: {
    criticalClients: number;
  };
  sellerAssistant?: {
    topOpportunities: { id: string; name: string; value: number; recommendedAction: string }[];
    staleLeads: { id: string; name: string; action: string }[];
  };
  playbooks?: { niche: string; pipeline: string; offer: string; proposalAngle: string }[];
  whatsappTemplates?: { name: string; text: string }[];
  customFields?: string[];
  automationRecipes?: string[];
}

export default function CRM() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [winLead, setWinLead] = useState<any | null>(null);
  const [showMeetScheduler, setShowMeetScheduler] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("FUNIL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [growthIntel, setGrowthIntel] = useState<GrowthIntel | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab")?.toLowerCase();
    const tabMap: Record<string, string> = {
      funil: "FUNIL",
      listagem: "LISTAGEM",
      relatorios: "RELATÃ“RIOS",
      metas: "METAS",
      inteligencia: "INTELIGENCIA",
    };
    if (tab && tabMap[tab]) setActiveTab(tabMap[tab]);
  }, [searchParams]);

  const fetchData = async (p = page) => {
    try {
      const [pipelinesRes, oppsRes] = await Promise.all([
        apiFetch("/api/crm/pipelines"),
        apiFetch(`/api/crm/opportunities?page=${p}&pageSize=50`),
      ]);
      const pipelinesData = await pipelinesRes.json();
      const oppsData = await oppsRes.json();
      setPipelines(Array.isArray(pipelinesData) ? pipelinesData : []);
      const oppsArray = oppsData.opportunities || oppsData.data || oppsData;
      setOpportunities(Array.isArray(oppsArray) ? oppsArray : []);
      const totalCount = oppsData.total || oppsData.totalCount || oppsData.count || oppsArray.length;
      if (totalCount) {
        setTotal(totalCount);
        setTotalPages(Math.ceil(totalCount / 50));
      }
      try {
        const intelRes = await apiFetch("/api/crm/growth-intelligence");
        if (intelRes.ok) {
          setGrowthIntel(await intelRes.json());
        }
      } catch (intelErr) {
        console.warn("[CRM] Growth intelligence indisponivel:", intelErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(newPage);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allStagesForView = pipelines.flatMap(p =>
    (p.stages || []).map((s: PipelineStage) => ({ ...s, pipelineId: p.id, pipelineName: p.name }))
  );

  const currentPipeline = pipelines[0];
  const stages = currentPipeline?.stages || [];

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData("opportunityId");
    if (!oppId) return;

    setOpportunities(prev =>
      prev.map(o => o.id === oppId ? { ...o, stageId } : o)
    );

    try {
      await apiFetch(`/api/crm/opportunities/${oppId}`, {
        method: "PATCH",
        body: JSON.stringify({ stageId }),
      });
    } catch (err) {
      fetchData();
    }
  };

  const filteredOpps = opportunities.filter(o =>
    o.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.client?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.client?.corporateName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const wonOpps = filteredOpps.filter(o => o.status === "WON");
  const openOpps = filteredOpps.filter(o => o.status !== "WON");
  const wonValue = wonOpps.reduce((acc, o) => acc + (o.value || 0), 0);
  const openValue = openOpps.reduce((acc, o) => acc + (o.value || 0), 0);
  const totalPipelineValue = filteredOpps.reduce((acc, o) => acc + (o.value || 0), 0);
  const averageTicket = filteredOpps.length ? totalPipelineValue / filteredOpps.length : 0;
  const conversionRate = filteredOpps.length ? Math.round((wonOpps.length / filteredOpps.length) * 100) : 0;
  const monthlyGoal = 100000;
  const goalProgress = Math.min(100, Math.round((wonValue / monthlyGoal) * 100));

  if (loading && opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--nexus-background)] -m-4 md:-m-8">
      {/* 
        PREMIUM DARK TOPBAR
        Inspirada na estética Agendor, com tons Navy/Roxo profundos
      */}
      <div className="bg-[var(--nexus-nav-dark)] text-white p-6 md:px-10 shadow-lg">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--nexus-primary)] rounded-lg shadow-lg shadow-indigo-500/20">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Negócios</h1>
                  <p className="text-[10px] font-medium text-[var(--nexus-text-muted)] uppercase tracking-widest mt-0.5">
                    Pipeline Comercial • {total} Negócios Ativos
                  </p>
                </div>
              </div>
              
              <nav className="flex items-center gap-1">
                {[
                  { id: 'FUNIL', label: 'Funil de Vendas', icon: LayoutGrid },
                  { id: 'LISTAGEM', label: 'Listagem', icon: List },
                  { id: 'RELATÓRIOS', label: 'Relatórios', icon: BarChart3 },
                  { id: 'METAS', label: 'Metas', icon: Trophy },
                  { id: 'INTELIGENCIA', label: 'Inteligencia', icon: Sparkles },
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchParams({ tab: String(tab.id).toLowerCase() });
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeTab === tab.id 
                        ? 'bg-white/10 text-white shadow-inner' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[var(--nexus-primary-light)] transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar negócios..." 
                  className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl w-[300px] focus:ring-2 focus:ring-[var(--nexus-primary)]/50 focus:bg-white/10 focus:border-white/20 outline-none transition-all text-sm placeholder:text-white/30"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-[var(--nexus-primary)] text-white px-5 py-2.5 rounded-xl hover:bg-[var(--nexus-primary-hover)] transition-all text-sm font-bold shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                <Plus size={18} />
                Novo Negócio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 
        KANBAN CONTENT AREA
        Fundo cinza azulado suave, colunas bem espaçadas
      */}
      <div className="flex-1 p-6 md:p-10 overflow-x-auto">
        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'LISTAGEM' && (
            <div className="bg-white border border-[var(--nexus-card-border)] rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--nexus-background-soft)] text-[10px] uppercase tracking-widest text-[var(--nexus-text-muted)]">
                  <tr>
                    <th className="text-left px-6 py-4">Negócio</th>
                    <th className="text-left px-6 py-4">Contato</th>
                    <th className="text-left px-6 py-4">Etapa</th>
                    <th className="text-right px-6 py-4">Valor</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--nexus-card-border)]">
                  {filteredOpps.map((opp) => (
                    <tr key={opp.id} className="hover:bg-[var(--nexus-background-light)] transition-colors">
                      <td className="px-6 py-4 font-bold text-[var(--nexus-text-primary)]">{opp.title}</td>
                      <td className="px-6 py-4 text-[var(--nexus-text-secondary)]">
                        {opp.client?.email || "-"}
                        <div className="text-xs text-[var(--nexus-text-muted)]">{opp.client?.phone || "Sem telefone"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg bg-[var(--nexus-background-soft)] text-[10px] font-black uppercase">
                          {opp.stageObj?.name || opp.stage || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">{opp.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedOppId(opp.id)} className="text-[var(--nexus-primary)] text-xs font-bold hover:underline">Abrir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'RELATÓRIOS' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {[
                ['Pipeline aberto', openValue],
                ['Receita ganha', wonValue],
                ['Ticket médio', averageTicket],
                ['Taxa de ganho', conversionRate]
              ].map(([label, value]) => (
                <div key={label as string} className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                  <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">{label}</p>
                  <p className="text-2xl font-black text-[var(--nexus-text-primary)] mt-3">
                    {label === 'Taxa de ganho' ? `${value}%` : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              ))}
              <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                <h3 className="font-black text-[var(--nexus-text-primary)] mb-5">Conversão por etapa</h3>
                <div className="space-y-4">
                  {stages.map((stage) => {
                    const count = filteredOpps.filter(o => o.stageId === stage.id).length;
                    const percent = filteredOpps.length ? Math.round((count / filteredOpps.length) * 100) : 0;
                    return (
                      <div key={stage.id}>
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span>{stage.name}</span>
                          <span>{count} negócios • {percent}%</span>
                        </div>
                        <div className="h-3 bg-[var(--nexus-background-soft)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: stage.color || "var(--nexus-primary)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'METAS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Meta mensal de vendas</p>
                <div className="flex items-end justify-between gap-4 mt-4">
                  <div>
                    <p className="text-4xl font-black text-[var(--nexus-text-primary)]">{wonValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="text-sm text-[var(--nexus-text-muted)] mt-2">de {monthlyGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <span className="text-2xl font-black text-[var(--nexus-primary)]">{goalProgress}%</span>
                </div>
                <div className="h-4 bg-[var(--nexus-background-soft)] rounded-full overflow-hidden mt-8">
                  <div className="h-full bg-[var(--nexus-primary)] rounded-full" style={{ width: `${goalProgress}%` }} />
                </div>
              </div>
              <div className="bg-white p-8 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">Gap para meta</p>
                <p className="text-3xl font-black text-[var(--nexus-text-primary)] mt-4">{Math.max(0, monthlyGoal - wonValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p className="text-sm text-[var(--nexus-text-muted)] mt-3">Pipeline aberto disponível: {openValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
          )}

          {activeTab === 'INTELIGENCIA' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  ['Forecast ponderado', growthIntel?.forecast?.weightedForecast, 'money'],
                  ['Pipeline aberto', growthIntel?.forecast?.openValue, 'money'],
                  ['Receita ganha', growthIntel?.forecast?.wonValue, 'money'],
                  ['MRR atual', growthIntel?.forecast?.monthlyRecurring, 'money'],
                  ['Conversao', growthIntel?.forecast?.conversionRate, 'percent'],
                  ['Clientes em risco', growthIntel?.benchmark?.criticalClients, 'number']
                ].map(([label, value, type]) => (
                  <div key={label as string} className="bg-white p-5 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                    <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest">{label}</p>
                    <p className="text-xl font-black text-[var(--nexus-text-primary)] mt-3">
                      {type === 'money' ? Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : type === 'percent' ? `${value || 0}%` : value || 0}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles size={18} className="text-[var(--nexus-primary)]" />
                    <h3 className="font-black text-[var(--nexus-text-primary)]">Assistente do vendedor</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(growthIntel?.sellerAssistant?.topOpportunities || []).map((item) => (
                      <button key={item.id} onClick={() => setSelectedOppId(item.id)} className="text-left p-4 rounded-xl border border-[var(--nexus-card-border)] hover:border-[var(--nexus-primary)] transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-[var(--nexus-text-primary)]">{item.name}</p>
                            <p className="text-xs text-[var(--nexus-text-muted)] mt-1">{item.recommendedAction}</p>
                          </div>
                          <span className="text-xs font-black text-[var(--nexus-primary)]">{Number(item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </button>
                    ))}
                    {(growthIntel?.sellerAssistant?.topOpportunities || []).length === 0 && (
                      <div className="md:col-span-2 text-sm text-[var(--nexus-text-muted)]">Sem oportunidades abertas para priorizar agora.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                  <h3 className="font-black text-[var(--nexus-text-primary)] mb-4">Leads sem toque</h3>
                  <div className="space-y-3">
                    {(growthIntel?.sellerAssistant?.staleLeads || []).map((lead) => (
                      <button key={lead.id} onClick={() => setSelectedOppId(lead.id)} className="w-full text-left p-3 rounded-xl bg-[var(--nexus-background-soft)]">
                        <p className="font-bold text-sm text-[var(--nexus-text-primary)]">{lead.name}</p>
                        <p className="text-xs text-[var(--nexus-text-muted)]">{lead.action}</p>
                      </button>
                    ))}
                    {(growthIntel?.sellerAssistant?.staleLeads || []).length === 0 && <p className="text-sm text-[var(--nexus-text-muted)]">Nenhum lead parado ha mais de 3 dias.</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                  <h3 className="font-black text-[var(--nexus-text-primary)] mb-4">Playbooks por nicho</h3>
                  <div className="space-y-4">
                    {(growthIntel?.playbooks || []).map((playbook) => (
                      <div key={playbook.niche} className="p-4 rounded-xl border border-[var(--nexus-card-border)]">
                        <p className="font-black text-[var(--nexus-text-primary)]">{playbook.niche}</p>
                        <p className="text-xs text-[var(--nexus-text-muted)] mt-2">{playbook.pipeline}</p>
                        <p className="text-sm font-semibold text-[var(--nexus-text-secondary)] mt-3">{playbook.offer}</p>
                        <p className="text-xs text-[var(--nexus-primary)] mt-3">{playbook.proposalAngle}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                    <h3 className="font-black text-[var(--nexus-text-primary)] mb-4">Templates de WhatsApp</h3>
                    <div className="space-y-3">
                      {(growthIntel?.whatsappTemplates || []).map((template) => (
                        <div key={template.name} className="p-4 rounded-xl bg-[var(--nexus-background-soft)]">
                          <p className="font-black text-sm text-[var(--nexus-text-primary)]">{template.name}</p>
                          <p className="text-xs text-[var(--nexus-text-secondary)] mt-2">{template.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-[var(--nexus-card-border)] shadow-sm">
                    <h3 className="font-black text-[var(--nexus-text-primary)] mb-4">Automacoes e campos recomendados</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(growthIntel?.customFields || []).map((field: string) => (
                        <span key={field} className="px-3 py-1 rounded-full bg-[var(--nexus-background-soft)] text-xs font-bold text-[var(--nexus-text-secondary)]">{field}</span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {(growthIntel?.automationRecipes || []).map((recipe: string) => (
                        <div key={recipe} className="flex gap-2 text-sm text-[var(--nexus-text-secondary)]">
                          <CheckCircle2 size={15} className="text-[var(--nexus-success)] mt-0.5 flex-shrink-0" />
                          <span>{recipe}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`${activeTab === 'FUNIL' ? '' : 'hidden'}`}>
            {stages.length > 0 ? (
              <PipelineKanban
                opportunities={filteredOpps}
                onOpportunityClick={setSelectedOppId}
                onDrop={handleDrop}
                stages={stages.map(s => ({ ...s, color: s.color || "var(--nexus-primary)" }))}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Target size={48} className="text-gray-300" />
                <p className="text-gray-400 font-medium">Nenhum pipeline configurado ainda.</p>
                <p className="text-sm text-gray-400">Faça o onboarding para criar seu pipeline automaticamente.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${activeTab === 'FUNIL' || activeTab === 'LISTAGEM' ? 'block' : 'hidden'} p-6 md:px-10 border-t border-[var(--nexus-card-border)] bg-white`}>
        <div className="max-w-[1600px] mx-auto">
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={50} onPageChange={handlePageChange} />
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && pipelines.length > 0 && (
          <NewOpportunityModal
            pipelines={pipelines}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => { setIsModalOpen(false); fetchData(); }}
          />
        )}
        {selectedOppId && (
          <OpportunityDetail
            opportunityId={selectedOppId}
            onClose={() => setSelectedOppId(null)}
            onUpdate={fetchData}
            onDelete={() => { setSelectedOppId(null); fetchData(); }}
          />
        )}
        {winLead && (
          <WinLeadModal lead={winLead} onClose={() => setWinLead(null)} onSuccess={() => { setWinLead(null); fetchData(); }} />
        )}
        {showMeetScheduler && (
          <NexusMeetScheduler lead={showMeetScheduler} onClose={() => setShowMeetScheduler(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

