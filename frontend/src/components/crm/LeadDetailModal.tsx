import React, { useEffect, useState } from 'react';
import { X, Phone, Globe, MapPin, Database, Star, Loader2, Send, Trash2, Wand2, MessageCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Lead {
  id: string;
  businessName: string;
  category: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  rating: number;
  reviewsCount: number;
  provider: string;
  scoreOpportunity: number;
  opportunityLevel: string;
  sentToCrm: boolean;
  aiDiagnosis?: string;
  notes?: string;
  cnpj?: string;
  owners?: string;
  managementTeam?: string;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onEnrich?: (leadId: string) => void;
  onResearchManagement?: (leadId: string) => void;
  onDossier?: (leadId: string) => void;
  onGenerateScripts?: (leadId: string) => void;
  onSendToCrm?: (leadId: string) => void;
  onDelete?: (leadId: string) => void;
  analyzingIds?: string[];
  onNotesUpdate?: (leadId: string, notes: string) => void;
}

export default function LeadDetailModal({
  lead,
  isOpen,
  onClose,
  onEnrich,
  onResearchManagement,
  onDossier,
  onGenerateScripts,
  onSendToCrm,
  onDelete,
  analyzingIds = [],
  onNotesUpdate,
}: LeadDetailModalProps) {
  const [notes, setNotes] = useState('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  useEffect(() => {
    setNotes(lead?.notes || '');
  }, [lead?.id, lead?.notes]);

  if (!isOpen || !lead) return null;

  const handleSaveNotes = async () => {
    if (onNotesUpdate && notes !== lead.notes) {
      setIsLoadingNotes(true);
      await onNotesUpdate(lead.id, notes);
      setIsLoadingNotes(false);
    }
  };

  const isAnalyzing = analyzingIds.includes(lead.id);
  const scoreColor = (lead.scoreOpportunity || 0) > 70 ? 'bg-green-600' : (lead.scoreOpportunity || 0) > 40 ? 'bg-orange-600' : 'bg-gray-400';
  const opportunityColor = {
    'prioridade': 'bg-red-100 text-red-700',
    'quente': 'bg-orange-100 text-orange-700',
    'morno': 'bg-amber-100 text-amber-700',
    'frio': 'bg-blue-100 text-blue-700',
  }[lead.opportunityLevel?.toLowerCase() || ''] || 'bg-gray-100 text-gray-700';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-black text-gray-900 truncate">{lead.businessName}</h2>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${opportunityColor}`}>
                {lead.opportunityLevel || 'N/A'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin size={14} className="text-gray-400" />
                {lead.address || `${lead.city}, ${lead.state}`}
              </span>
              <span className="flex items-center gap-1">
                <Globe size={14} className="text-gray-400" />
                {lead.category || 'Categoria não informada'}
              </span>
              {lead.rating && (
                <span className="flex items-center gap-1">
                  ⭐ {lead.rating} ({lead.reviewsCount} avaliações)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body - Grid Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl text-white flex flex-col items-center justify-center ${scoreColor} shadow-lg`}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1">Score de Oportunidade</p>
                <p className="text-4xl font-black">{lead.scoreOpportunity || 0}%</p>
              </div>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col items-center justify-center">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Fonte</p>
                <p className="text-lg font-black text-primary">{lead.provider?.toUpperCase() || 'N/A'}</p>
              </div>
            </div>

            {/* CNPJ & Sócios */}
            {(lead.cnpj || lead.owners || lead.managementTeam) && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database size={16} className="text-blue-600" />
                  <h3 className="font-black text-gray-900 text-sm">Informações da Empresa</h3>
                </div>

                {lead.cnpj && (
                  <div className="pb-4 border-b border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">CNPJ</p>
                    <p className="text-sm font-bold text-gray-900 font-mono">{lead.cnpj}</p>
                  </div>
                )}

                {lead.owners && (
                  <div className="pb-4 border-b border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Sócios Identificados</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.owners.split(',').map((owner, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                          <Star size={11} className="fill-blue-500" />
                          {owner.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {lead.managementTeam && (
                  <div>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Globe size={11} /> Decisores (LinkedIn)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lead.managementTeam.split(',').map((person, idx) => (
                        <span key={idx} className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                          {person.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Diagnóstico IA */}
            {lead.aiDiagnosis && (
              <div className="border border-indigo-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Database size={12} /> Diagnóstico IA Completo
                  </p>
                </div>
                <div className="p-5 bg-indigo-50/50 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium max-h-64 overflow-y-auto">
                  {lead.aiDiagnosis}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Anotações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Adicione anotações sobre ligações, reuniões ou atividades..."
                className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none min-h-32 transition-all resize-none"
              />
              {isLoadingNotes && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Salvando...
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4 space-y-3">
              <h3 className="font-black text-gray-900 text-sm">Canais de Contato</h3>

              {lead.phone ? (
                <>
                  <a
                    href={`tel:${lead.phone}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-xs"
                  >
                    <Phone size={14} />
                    Ligar
                  </a>
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all text-xs"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </a>
                </>
              ) : (
                <p className="text-xs text-gray-500 italic">Sem número telefônico</p>
              )}

              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all text-xs"
                >
                  <Globe size={14} />
                  Visitar Site
                </a>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="font-black text-gray-900 text-sm mb-3">Ações IA</h3>

              <ActionButton
                icon={<Database size={14} />}
                label="Enriquecer"
                onClick={() => onEnrich?.(lead.id)}
                loading={isAnalyzing}
                disabled={Boolean(lead.cnpj && lead.owners)}
                title="Buscar CNPJ e Sócios"
              />

              <ActionButton
                icon={<Globe size={14} />}
                label="Pesquisar Decisores"
                onClick={() => onResearchManagement?.(lead.id)}
                loading={isAnalyzing}
                disabled={Boolean(lead.managementTeam)}
                title="Pesquisar no LinkedIn"
              />

              <ActionButton
                icon={<Database size={14} />}
                label="Gerar Dossiê"
                onClick={() => onDossier?.(lead.id)}
                loading={isAnalyzing}
                disabled={!lead.aiDiagnosis}
                title="Gerar Diagnóstico IA"
              />

              <ActionButton
                icon={<Wand2 size={14} />}
                label="Scripts"
                onClick={() => onGenerateScripts?.(lead.id)}
                loading={isAnalyzing}
                title="Scripts de Abordagem"
              />
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <button
                disabled={lead.sentToCrm || isAnalyzing}
                onClick={() => onSendToCrm?.(lead.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold rounded-xl transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lead.sentToCrm ? (
                  <>
                    <ArrowRight size={14} />
                    Enviado ao CRM
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Enviar para CRM
                  </>
                )}
              </button>

              <button
                onClick={() => onDelete?.(lead.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all text-xs border border-red-100"
              >
                <Trash2 size={14} />
                Deletar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  loading,
  disabled,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      title={title}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
