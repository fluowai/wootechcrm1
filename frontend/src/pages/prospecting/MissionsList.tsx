import React, { useState, useEffect } from 'react';
import { Calendar, Target, MapPin, Clock, Repeat, AlertCircle, Play, Pause, XCircle, ChevronDown, ChevronRight, Loader2, ExternalLink, CheckCircle2, Users, MessageSquare, Star, X, Phone, Globe, Database, Search } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Mission {
  id: string;
  name: string;
  niche: string;
  city: string;
  state: string;
  leadQuantity: number;
  executionDate: string;
  executionTime: string;
  recurrence: string;
  minScore: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  missionResult?: {
    capturedLeadIds: string[];
    prospectLeadIds: string[];
    completedAt: string;
    totalLeads: number;
  } | null;
  _count: {
    leads: number;
    messages: number;
    appointments: number;
  };
}

interface ProspectLead {
  id: string;
  companyName: string;
  category: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  status: string;
  captureDate: string;
  altPhone?: string | null;
  validation?: {
    cnpj?: string;
    owners?: string;
    managementTeam?: string;
    scoreOpportunity?: number;
    opportunityLevel?: string;
    aiDiagnosis?: string;
  } | null;
  dossier?: {
    diagnosis?: string;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  agendada: { label: 'Agendada', color: 'text-blue-600', bg: 'bg-blue-100' },
  em_execucao: { label: 'Em Execução', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  pausada: { label: 'Pausada', color: 'text-amber-600', bg: 'bg-amber-100' },
  concluida: { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-100' },
  erro: { label: 'Erro', color: 'text-red-600', bg: 'bg-red-100' },
  cancelada: { label: 'Cancelada', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const leadStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  captado: { label: 'Captado', color: 'text-blue-600', bg: 'bg-blue-100' },
  validado: { label: 'Validado', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  aprovado_para_contato: { label: 'Aprovado', color: 'text-green-600', bg: 'bg-green-100' },
  descartado: { label: 'Descartado', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const recurrenceLabels: Record<string, string> = {
  unica: 'Uma vez',
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
};

export default function MissionsList() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [leadsModal, setLeadsModal] = useState<{ open: boolean; mission: Mission | null; leads: ProspectLead[]; loading: boolean }>({
    open: false, mission: null, leads: [], loading: false
  });

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/nexus-prospect/missions');
      const data = await res.json();
      if (data.success) {
        setMissions(data.data);
      }
    } catch (err) {
      console.error('Failed to load missions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/nexus-prospect/missions/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        fetchMissions();
      }
    } catch (err) {
      console.error(`Failed to ${action} mission`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta missão?')) return;
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/nexus-prospect/missions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMissions();
      }
    } catch (err) {
      console.error('Failed to delete mission', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewLeads = async (mission: Mission) => {
    setLeadsModal({ open: true, mission, leads: [], loading: true });
    try {
      const res = await apiFetch(`/api/nexus-prospect/missions/${mission.id}/leads`);
      const data = await res.json();
      if (data.success) {
        setLeadsModal(prev => ({ ...prev, leads: data.data, loading: false }));
      } else {
        setLeadsModal(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error('Failed to load mission leads', err);
      setLeadsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const getStatusConfig = (status: string) => statusConfig[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100' };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getMissionProgress = (mission: Mission) => {
    const total = Math.max(Number(mission.leadQuantity) || 0, 0);
    const captured = Math.max(
      Number(mission.missionResult?.totalLeads ?? mission._count?.leads) || 0, 0
    );
    if (!total) return mission.status === 'concluida' ? 100 : 0;
    return Math.min(100, Math.round((captured / total) * 100));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Calendar className="text-primary" size={28} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mineração Ativa</h1>
          </div>
          <p className="text-gray-500 font-medium text-sm ml-[52px]">
            Gerencie suas minerações autônomas de captação e validação de leads prontos.
          </p>
        </div>
        <button
          onClick={() => navigate('/prospecting/capture')}
          className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm flex items-center gap-2"
        >
          <Target size={16} />
          Nova Captação
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : missions.length === 0 ? (
        <div className="bg-white rounded-[32px] p-16 text-center border border-dashed border-gray-200 shadow-sm">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="text-gray-300" size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma missão agendada</h2>
          <p className="text-gray-500 mb-6">Você ainda não criou nenhuma missão de captação automática.</p>
          <button
            onClick={() => navigate('/prospecting/capture')}
            className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
          >
            Criar Primeira Missão
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {missions.map((mission) => {
            const sc = getStatusConfig(mission.status);
            const isExpanded = expandedId === mission.id;
            const progress = getMissionProgress(mission);

            return (
              <div
                key={mission.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-black text-gray-900 truncate text-lg">{mission.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${sc.bg} ${sc.color} shrink-0`}>
                          {sc.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Target size={13} className="text-gray-400" />
                          {mission.niche}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-gray-400" />
                          {mission.city}, {mission.state}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400" />
                          {formatDate(mission.executionDate)} às {mission.executionTime}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Repeat size={13} className="text-gray-400" />
                          {recurrenceLabels[mission.recurrence] || mission.recurrence}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                      className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-400 hover:text-gray-600 shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-50">
                    <button
                      onClick={() => handleViewLeads(mission)}
                      className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-all"
                    >
                      <Users size={14} className="text-primary" />
                      <span>{mission.missionResult?.totalLeads ?? mission._count.leads} leads</span>
                    </button>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <MessageSquare size={14} className="text-emerald-500" />
                      <span>{mission._count.messages} mensagens</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Star size={14} className="text-amber-500" />
                      <span>Score mín: {mission.minScore}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <Target size={14} className="text-indigo-500" />
                      <span>Qtd: {mission.leadQuantity}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Progresso da missao</p>
                        <p className="text-xs font-bold text-gray-600">{mission.missionResult?.totalLeads ?? mission._count?.leads ?? 0} de {mission.leadQuantity || 0} leads captados</p>
                      </div>
                      <span className="rounded-xl bg-white px-3 py-1 text-sm font-black text-primary shadow-sm">{progress}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          mission.status === 'erro' ? 'bg-red-500' :
                          mission.status === 'pausada' ? 'bg-amber-500' :
                          mission.status === 'concluida' ? 'bg-green-500' :
                          'bg-primary'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                    {mission.status === 'agendada' && (
                      <ActionButton
                        icon={<Play size={14} />}
                        label="Iniciar"
                        onClick={() => handleAction(mission.id, 'run')}
                        loading={actionLoading === mission.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      />
                    )}
                    {mission.status === 'em_execucao' && (
                      <ActionButton
                        icon={<Pause size={14} />}
                        label="Pausar"
                        onClick={() => handleAction(mission.id, 'pause')}
                        loading={actionLoading === mission.id}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      />
                    )}
                    {(mission.status === 'pausada' || mission.status === 'erro') && (
                      <ActionButton
                        icon={<Play size={14} />}
                        label="Retomar"
                        onClick={() => handleAction(mission.id, 'resume')}
                        loading={actionLoading === mission.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      />
                    )}
                    {(mission.status === 'agendada' || mission.status === 'pausada') && (
                      <ActionButton
                        icon={<XCircle size={14} />}
                        label="Cancelar"
                        onClick={() => handleAction(mission.id, 'cancel')}
                        loading={actionLoading === mission.id}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      />
                    )}
                    <button
                      onClick={() => handleDelete(mission.id)}
                      disabled={actionLoading === mission.id}
                      className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <InfoBox label="Criada em" value={formatDate(mission.createdAt)} />
                      <InfoBox label="Atualizada em" value={formatDate(mission.updatedAt)} />
                      <InfoBox label="Recorrência" value={recurrenceLabels[mission.recurrence] || mission.recurrence} />
                      <InfoBox label="Score Mínimo" value={`${mission.minScore}%`} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Leads Modal */}
      <AnimatePresence>
        {leadsModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLeadsModal({ open: false, mission: null, leads: [], loading: false });
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8 border border-gray-100"
            >
              <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-black text-gray-900 truncate">
                      Leads da Missão
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary shrink-0">
                      {leadsModal.leads.length}
                    </span>
                  </div>
                  {leadsModal.mission && (
                    <p className="text-sm font-medium text-gray-500">
                      {leadsModal.mission.name} — {leadsModal.mission.city}, {leadsModal.mission.state}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setLeadsModal({ open: false, mission: null, leads: [], loading: false })}
                  className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 max-h-[70vh]">
                {leadsModal.loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                  </div>
                ) : leadsModal.leads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                    <Search size={40} className="text-gray-200 mb-2" />
                    <p className="text-gray-500 font-bold text-sm">Nenhum lead captado nesta missão.</p>
                    <p className="text-xs text-gray-400">Os leads aparecerão aqui após a execução da missão.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {leadsModal.leads.map((lead) => {
                      const lsc = leadStatusConfig[lead.status] || { label: lead.status, color: 'text-gray-600', bg: 'bg-gray-100' };
                      const score = lead.validation?.scoreOpportunity || 0;
                      return (
                        <div
                          key={lead.id}
                          className="bg-white p-4 rounded-2xl border border-gray-50 hover:shadow-lg hover:shadow-gray-200/40 transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-gray-900 truncate">{lead.companyName}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${lsc.bg} ${lsc.color} shrink-0`}>
                                  {lsc.label}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-gray-400">
                                {lead.category && (
                                  <span className="flex items-center gap-1">
                                    <Target size={11} className="text-gray-300" /> {lead.category}
                                  </span>
                                )}
                                {(lead.city || lead.state) && (
                                  <span className="flex items-center gap-1">
                                    <MapPin size={11} className="text-gray-300" /> {lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}
                                  </span>
                                )}
                                {lead.captureDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={11} className="text-gray-300" /> {formatDate(lead.captureDate)}
                                  </span>
                                )}
                              </div>

                              {(lead.validation?.cnpj || lead.validation?.owners || lead.validation?.managementTeam) && (
                                <div className="mt-3 p-3 bg-gray-50/50 border border-gray-100 rounded-xl space-y-2">
                                  {lead.validation?.cnpj && (
                                    <div className="flex items-center gap-2">
                                      <Database size={11} className="text-orange-500" />
                                      <span className="text-[10px] font-bold text-gray-600 font-mono">{lead.validation.cnpj}</span>
                                    </div>
                                  )}
                                  {lead.validation?.owners && (
                                    <div className="flex flex-wrap gap-1">
                                      {lead.validation.owners.split(',').map((owner, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-blue-100/50 text-blue-700 text-[9px] font-bold rounded-md border border-blue-200/50">
                                          {owner.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {lead.validation?.managementTeam && (
                                    <div className="flex flex-wrap gap-1">
                                      {lead.validation.managementTeam.split(',').map((person, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md border border-emerald-100">
                                          {person.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {score > 0 && (
                                <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${
                                  score > 70 ? 'bg-green-50 text-green-600' :
                                  score > 40 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'
                                }`}>
                                  <span className="text-[10px] font-black leading-none">{score}%</span>
                                  <span className="text-[7px] font-bold uppercase tracking-widest mt-0.5">Score</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
                            {lead.phone && (
                              <div className="flex items-center gap-1">
                                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors">
                                  <Phone size={11} /> Ligar
                                </a>
                                <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-colors">
                                  <Phone size={11} className="rotate-90" /> WhatsApp
                                </a>
                              </div>
                            )}
                            {lead.altPhone && lead.altPhone !== lead.phone && (
                              <div className="flex items-center gap-1">
                                <a href={`tel:${lead.altPhone}`} className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-100 transition-colors" title="Número alternativo identificado em fontes de dados">
                                  <Phone size={11} /> Ligar Alt
                                </a>
                                <a href={`https://wa.me/${lead.altPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors">
                                  <Phone size={11} className="rotate-90" /> WhatsApp Alt
                                </a>
                              </div>
                            )}
                            {lead.website && (
                              <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors">
                                <Globe size={11} /> Site
                              </a>
                            )}
                            {lead.dossier?.diagnosis && (
                              <span className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold">
                                <Database size={11} /> Com dossiê
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  onClick={() => setLeadsModal({ open: false, mission: null, leads: [], loading: false })}
                  className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all text-xs"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ icon, label, onClick, loading, className }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading: boolean;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xs font-bold text-gray-800">{value}</p>
    </div>
  );
}
