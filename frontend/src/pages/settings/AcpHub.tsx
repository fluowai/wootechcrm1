import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search, Target, Layout, Zap, Feather, PenTool, BarChart,
  MessageSquare, Database, Sprout, TrendingUp, Heart, Calendar,
  ArrowRight, Loader2, Sparkles, Shield, Cpu, Brain, Lock, X,
  ChevronDown, ChevronRight, Clock, CheckCircle, AlertTriangle,
  Globe, Camera, FileText, Image, ThumbsUp, PlayCircle, Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ACP_AGENTS_CONFIG, ACP_CATEGORIES, AcpAgentId } from '../../lib/acpConfig';
import { apiFetch } from '../../lib/api';

const AGENT_ICONS: Record<string, React.ElementType> = {
  Search, Target, Layout, Zap, Feather, PenTool, BarChart,
  MessageSquare, Database, Sprout, TrendingUp, Heart, Calendar
};

const AUTONOMY_CONFIG = {
  1: { label: 'Autônomo', color: '#059669', bg: '#ecfdf5' },
  2: { label: 'Semi-Autônomo', color: '#ca8a04', bg: '#fefce8' },
  3: { label: 'Consultivo', color: '#dc2626', bg: '#fef2f2' }
};

const AcpHub: React.FC<{ selectedClientId?: string | null }> = ({ selectedClientId }) => {
  const agents = useMemo(() => Object.values(ACP_AGENTS_CONFIG), []);
  const [activeTab, setActiveTab] = useState('todos');
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const [input, setInput] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [history, setHistory] = useState<{ agent: string; input: string; output: string; date: Date }[]>([]);
  const [missingKey, setMissingKey] = useState(false);

  // Scan state
  const [scanCompany, setScanCompany] = useState('');
  const [scanWebsite, setScanWebsite] = useState('');
  const [scanInstagram, setScanInstagram] = useState('');
  const [scanCnpj, setScanCnpj] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Chain state
  const [chainLoading, setChainLoading] = useState(false);
  const [chainResults, setChainResults] = useState<Record<string, { agentName: string; output: string }> | null>(null);
  const [chainProgress, setChainProgress] = useState('');

  // Plan state
  const [planLoading, setPlanLoading] = useState(false);
  const [executionPlan, setExecutionPlan] = useState('');
  const [planImages, setPlanImages] = useState<string[]>([]);
  const [showPlan, setShowPlan] = useState(false);

  useEffect(() => {
    apiFetch('/api/org/settings').then(r => r.ok && r.json()).then(data => {
      if (data && !data.groqKey) setMissingKey(true);
    }).catch(() => {});
  }, []);

  const filteredAgents = useMemo(() => {
    if (activeTab === 'todos') return agents;
    return agents.filter(a => a.category === activeTab);
  }, [activeTab, agents]);

  const activeCategory = ACP_CATEGORIES.find(c => c.id === activeTab) || ACP_CATEGORIES[0];

  const getIcon = (iconName: string) => AGENT_ICONS[iconName] || Sparkles;
  const getAutonomy = (level: number) => AUTONOMY_CONFIG[level as keyof typeof AUTONOMY_CONFIG] || AUTONOMY_CONFIG[2];

  const handleAgentClick = (agent: typeof agents[0]) => {
    setSelectedAgent(agent);
    setInput('');
    setResult('');
  };

  const handleExecute = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult('');

    try {
      const augmentedInput = scanResult?.dossier
        ? `## Dossiê Digital do Cliente\n${scanResult.dossier.slice(0, 4000)}\n\n## Minha Análise\n${input}`
        : input;

      const response = await apiFetch('/api/acp/execute', {
        method: 'POST',
        body: JSON.stringify({
          agentId: selectedAgent.id,
          input: augmentedInput,
          clientName: clientName || scanCompany || undefined,
          clientId: selectedClientId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao executar agente');
      }

      const data = await response.json();
      setResult(data.result);

      setHistory(prev => [{
        agent: selectedAgent.name,
        input,
        output: data.result,
        date: new Date()
      }, ...prev].slice(0, 20));

    } catch (error: any) {
      setResult(`**Erro:** ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [input, clientName, selectedAgent, selectedClientId]);

  const handleScan = useCallback(async () => {
    if (!scanCompany.trim()) return;
    setScanLoading(true);
    setScanResult(null);
    setChainResults(null);
    setExecutionPlan('');
    setPlanImages([]);
    setShowPlan(false);

    try {
      const response = await apiFetch('/api/acp/scan', {
        method: 'POST',
        body: JSON.stringify({
          companyName: scanCompany,
          website: scanWebsite || undefined,
          instagram: scanInstagram || undefined,
          cnpj: scanCnpj || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Falha ao escanear');
      }

      const data = await response.json();
      setScanResult(data);
      setResult('');
      setClientName(scanCompany);
    } catch (error: any) {
      setScanResult({ dossier: `**Erro no scan:** ${error.message}` });
    } finally {
      setScanLoading(false);
    }
  }, [scanCompany, scanWebsite, scanInstagram, scanCnpj]);

  const handleChain = useCallback(async () => {
    if (!scanResult?.dossier) return;
    setChainLoading(true);
    setChainResults(null);
    setChainProgress('Iniciando cadeia de agentes...');

    try {
      const response = await apiFetch('/api/acp/chain', {
        method: 'POST',
        body: JSON.stringify({
          dossier: scanResult.dossier,
          clientName: scanCompany,
          additionalContext: input || undefined,
          clientId: selectedClientId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Falha na cadeia');
      }

      const data = await response.json();
      setChainResults(data.results);
      setChainProgress(`Concluído em ${new Date(data.completedAt).toLocaleString('pt-BR')}`);
      setResult('');
    } catch (error: any) {
      setChainProgress(`**Erro:** ${error.message}`);
    } finally {
      setChainLoading(false);
    }
  }, [scanResult, scanCompany, input, selectedClientId]);

  const handleGeneratePlan = useCallback(async () => {
    if (!chainResults) return;
    setPlanLoading(true);
    setExecutionPlan('');

    try {
      const response = await apiFetch('/api/acp/plan', {
        method: 'POST',
        body: JSON.stringify({
          dossier: scanResult?.dossier || '',
          chainResults,
          clientName: scanCompany,
          clientId: selectedClientId,
          generateImages: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Falha ao gerar plano');
      }

      const data = await response.json();
      setExecutionPlan(data.executionPlan);
      setPlanImages(data.images || []);
      setShowPlan(true);
    } catch (error: any) {
      setExecutionPlan(`**Erro:** ${error.message}`);
      setShowPlan(true);
    } finally {
      setPlanLoading(false);
    }
  }, [chainResults, scanResult, scanCompany, selectedClientId]);

  return (
    <div className="acp-hub-container">
      <style>{`
        .acp-hub-container {
          font-family: system-ui, -apple-system, sans-serif;
        }
        .acp-hub-container * { box-sizing: border-box; }
        .acp-hub-container .acp-header {
          margin-bottom: 24px;
        }
        .acp-hub-container .acp-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: linear-gradient(135deg, #1e40af, #7c3aed);
          color: white;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .acp-hub-container h1 {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .acp-hub-container .acp-subtitle {
          color: #64748b;
          font-size: 14px;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }
        .acp-hub-container .acp-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .acp-hub-container .acp-stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 12px 20px;
        }
        .acp-hub-container .acp-stat-card .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
        }
        .acp-hub-container .acp-stat-card div span {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        .acp-hub-container .acp-stat-card div small {
          font-size: 12px;
          color: #64748b;
        }
        .acp-hub-container .acp-key-warning {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 16px;
          margin-bottom: 20px;
          color: #92400e;
          font-size: 13px;
          font-weight: 500;
          flex-wrap: wrap;
        }
        .acp-hub-container .acp-key-btn {
          margin-left: auto;
          padding: 8px 18px;
          background: #f59e0b;
          color: white;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .acp-hub-container .acp-key-btn:hover {
          background: #d97706;
        }
        .acp-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 4px;
          flex-wrap: wrap;
        }
        .acp-tab {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 10px 18px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .acp-tab:hover { border-color: #94a3b8; }
        .acp-tab.active {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .acp-tab span {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .acp-tab strong {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        .acp-tab.active strong { color: #2563eb; }
        .acp-tab-context {
          margin-bottom: 20px;
        }
        .acp-tab-context h2 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .acp-tab-context p {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }
        .acp-workspace {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
          min-height: 500px;
        }
        @media (max-width: 900px) {
          .acp-workspace { grid-template-columns: 1fr; }
        }
        .acp-agent-list {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 16px;
          max-height: 600px;
          overflow-y: auto;
        }
        .acp-agent-list-header {
          margin-bottom: 12px;
        }
        .acp-agent-list-header h3 {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .acp-agent-list-header small {
          font-size: 12px;
          color: #94a3b8;
        }
        .acp-agent-card {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
          margin-bottom: 4px;
        }
        .acp-agent-card:hover { background: #f8fafc; }
        .acp-agent-card.active {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .acp-agent-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .acp-agent-card-info { flex: 1; min-width: 0; }
        .acp-agent-card-info strong {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        .acp-agent-card-info span {
          display: block;
          font-size: 11px;
          color: #64748b;
        }
        .acp-agent-card-info p {
          font-size: 11px;
          color: #94a3b8;
          margin: 2px 0 0 0;
          line-height: 1.3;
        }
        .acp-agent-card .phase-tag {
          font-size: 9px;
          font-weight: 700;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .acp-main-panel {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
        }
        .acp-agent-hero {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        .acp-agent-hero-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .acp-agent-hero-info h2 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 2px 0;
        }
        .acp-agent-hero-info p {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }
        .acp-agent-hero-info .acp-meta {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .acp-agent-hero-info .acp-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          padding: 2px 10px;
          border-radius: 6px;
          font-weight: 600;
        }
        .acp-form-area {
          padding: 20px 24px;
        }
        .acp-form-area label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .acp-form-area .acp-input-row {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .acp-form-area .acp-input-row input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
          transition: border 0.2s;
        }
        .acp-form-area .acp-input-row input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .acp-textarea {
          width: 100%;
          min-height: 120px;
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          font-family: inherit;
          transition: border 0.2s;
        }
        .acp-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .acp-execute-btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
        }
        .acp-execute-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .acp-execute-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .acp-result-area {
          border-top: 1px solid #e2e8f0;
          padding: 20px 24px;
        }
        .acp-result-area .result-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }
        .acp-result-area .result-header span {
          font-size: 12px;
          font-weight: 700;
          color: #059669;
          text-transform: uppercase;
        }
        .acp-result-area .result-header .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #059669;
        }
        .acp-markdown {
          font-size: 14px;
          line-height: 1.7;
          color: #1e293b;
        }
        .acp-markdown h1, .acp-markdown h2, .acp-markdown h3 {
          margin-top: 20px;
          margin-bottom: 8px;
          font-weight: 700;
          color: #0f172a;
        }
        .acp-markdown h1 { font-size: 20px; }
        .acp-markdown h2 { font-size: 17px; }
        .acp-markdown h3 { font-size: 15px; }
        .acp-markdown p { margin: 0 0 12px 0; }
        .acp-markdown ul, .acp-markdown ol { padding-left: 20px; margin: 0 0 12px 0; }
        .acp-markdown li { margin-bottom: 4px; }
        .acp-markdown strong { font-weight: 700; }
        .acp-markdown code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }
        .acp-empty {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }
        .acp-history {
          border-top: 1px solid #e2e8f0;
        }
        .acp-history-toggle {
          width: 100%;
          padding: 12px 24px;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
        }
        .acp-history-toggle:hover { background: #f8fafc; }
        .acp-history-item {
          padding: 12px 24px;
          border-top: 1px solid #f1f5f9;
        }
        .acp-history-item small {
          font-size: 11px;
          color: #94a3b8;
        }
        .acp-history-item strong {
          font-size: 13px;
          color: #0f172a;
        }
        .acp-history-item p {
          font-size: 12px;
          color: #64748b;
          margin: 4px 0 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      {missingKey && (
        <div className="acp-key-warning">
          <AlertTriangle size={18} />
          <span>Chave da API GROQ não configurada. Os agentes não funcionarão até que você configure sua chave.</span>
          <a href="/ai-settings" className="acp-key-btn">Configurar Agora</a>
        </div>
      )}

      <div className="acp-header">
        <div className="acp-badge">
          <Brain size={14} />
          <span>ACP v2.0 — Arquitetura de Crescimento Previsível</span>
        </div>
        <h1>Orquestrador ACP</h1>
        <p className="acp-subtitle">
          Equipe de 14 agentes especializados para diagnosticar, estruturar e escalar seu negócio.
          Cada agente executa uma função específica do playbook comercial completo.
        </p>

        <div className="acp-stats">
          <div className="acp-stat-card">
            <div className="stat-icon"><Brain size={20} /></div>
            <div>
              <span>{agents.length}</span>
              <small>Agentes Especializados</small>
            </div>
          </div>
          <div className="acp-stat-card">
            <div className="stat-icon" style={{ background: '#fefce8', color: '#ca8a04' }}><Shield size={20} /></div>
            <div>
              <span>Nível 1-3</span>
              <small>Autonomia por Agente</small>
            </div>
          </div>
          <div className="acp-stat-card">
            <div className="stat-icon" style={{ background: '#f0fdfa', color: '#059669' }}><CheckCircle size={20} /></div>
            <div>
              <span>9 Camadas</span>
              <small>Método ACP Completo</small>
            </div>
          </div>
        </div>

        <div className="acp-tabs">
          {ACP_CATEGORIES.map(tab => (
            <button
              key={tab.id}
              className={`acp-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.id === 'todos' ? 'Visão Geral' : tab.label}</span>
              <strong>{tab.label}</strong>
            </button>
          ))}
        </div>

        <div className="acp-tab-context">
          <h2>{activeCategory.label}</h2>
          <p>{activeCategory.description}</p>
        </div>
      </div>

      {/* Scanner Digital */}
      <div className="acp-scan-panel">
        <style>{`
          .acp-scan-panel {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 20px 24px;
            margin-bottom: 20px;
          }
          .acp-scan-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          .acp-scan-header h3 {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .acp-scan-header .scan-badge {
            padding: 4px 12px;
            background: #1e40af;
            color: white;
            border-radius: 100px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .acp-scan-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 12px;
          }
          @media (max-width: 600px) {
            .acp-scan-grid { grid-template-columns: 1fr; }
          }
          .acp-scan-grid input {
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 13px;
            outline: none;
            transition: border 0.2s;
          }
          .acp-scan-grid input:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
          }
          .acp-scan-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .acp-scan-btn {
            padding: 10px 24px;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
          }
          .acp-scan-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
          .acp-scan-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
          .acp-scan-btn.secondary {
            background: #f1f5f9;
            color: #475569;
          }
          .acp-scan-btn.secondary:hover { background: #e2e8f0; }
          .acp-dossier-preview {
            margin-top: 16px;
            padding: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            max-height: 300px;
            overflow-y: auto;
          }
          .acp-chain-progress {
            margin-top: 12px;
            padding: 12px 16px;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 10px;
            font-size: 13px;
            color: #1e40af;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .acp-images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
            margin-top: 16px;
          }
          .acp-images-grid img {
            width: 100%;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
        `}</style>

        <div className="acp-scan-header">
          <Globe size={20} color="#1e40af" />
          <h3>Scanner de Presença Digital</h3>
          <span className="scan-badge">Novo</span>
        </div>

        <div className="acp-scan-grid">
          <input placeholder="Nome da empresa *" value={scanCompany} onChange={e => setScanCompany(e.target.value)} />
          <input placeholder="Site (ex: empresa.com.br)" value={scanWebsite} onChange={e => setScanWebsite(e.target.value)} />
          <input placeholder="Instagram (ex: @empresa)" value={scanInstagram} onChange={e => setScanInstagram(e.target.value)} />
          <input placeholder="CNPJ (opcional)" value={scanCnpj} onChange={e => setScanCnpj(e.target.value)} />
        </div>

        <div className="acp-scan-actions">
          <button className="acp-scan-btn" style={{ background: '#1e40af' }} onClick={handleScan} disabled={scanLoading || !scanCompany.trim()}>
            {scanLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Escaneando...</> : <><Camera size={16} /> Escanear Presença Digital</>}
          </button>
          {scanResult?.dossier && !scanResult?.dossier?.startsWith('**Erro') && (
            <>
              <button className="acp-scan-btn" style={{ background: '#059669' }} onClick={handleChain} disabled={chainLoading}>
                {chainLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Executando...</> : <><PlayCircle size={16} /> Executar Cadeia (14 Agentes)</>}
              </button>
              {chainResults && Object.keys(chainResults).length > 0 && (
                <button className="acp-scan-btn" style={{ background: '#7c3aed' }} onClick={handleGeneratePlan} disabled={planLoading}>
                  {planLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</> : <><ThumbsUp size={16} /> Aprovar & Gerar Plano de Execução</>}
                </button>
              )}
            </>
          )}
        </div>

        {chainProgress && (
          <div className="acp-chain-progress">
            <Cpu size={16} />
            <span>{chainProgress}</span>
          </div>
        )}

        {scanResult?.dossier && (
          <div className="acp-dossier-preview">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <FileText size={14} color="#475569" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Dossiê Digital — {scanResult.companyName}
              </span>
            </div>
            <div className="acp-markdown" style={{ fontSize: 13 }}>
              <ReactMarkdown>{scanResult.dossier}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Gallery */}
        {planImages.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Image size={14} color="#7c3aed" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Artes Geradas ({planImages.length})
              </span>
            </div>
            <div className="acp-images-grid">
              {planImages.map((img, i) => (
                <img key={i} src={img} alt={`Arte ${i + 1}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="acp-workspace">
        <div className="acp-agent-list">
          <div className="acp-agent-list-header">
            <h3>Agentes</h3>
            <small>{filteredAgents.length} disponíveis</small>
          </div>

          {filteredAgents.map((agent, i) => {
            const Icon = getIcon(agent.icon);
            const isActive = selectedAgent.id === agent.id;
            return (
              <motion.button
                key={agent.id}
                className={`acp-agent-card ${isActive ? 'active' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleAgentClick(agent)}
              >
                <div className="acp-agent-card-icon" style={{ background: agent.soft, color: agent.color }}>
                  <Icon size={18} />
                </div>
                <div className="acp-agent-card-info">
                  <strong>{agent.name}</strong>
                  <span>{agent.title}</span>
                  <p>{agent.description}</p>
                </div>
                <span className="phase-tag">{agent.phase}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="acp-main-panel">
          <div className="acp-agent-hero">
            <div className="acp-agent-hero-icon" style={{ background: selectedAgent.soft, color: selectedAgent.color }}>
              {React.createElement(getIcon(selectedAgent.icon), { size: 24 })}
            </div>
            <div className="acp-agent-hero-info">
              <h2>{selectedAgent.name}</h2>
              <p>{selectedAgent.title}</p>
              <div className="acp-meta">
                <span style={{ background: selectedAgent.soft, color: selectedAgent.color }}>
                  {selectedAgent.phase}
                </span>
                <span style={{ background: getAutonomy(selectedAgent.autonomy).bg, color: getAutonomy(selectedAgent.autonomy).color }}>
                  {getAutonomy(selectedAgent.autonomy).label}
                </span>
              </div>
            </div>
          </div>

          <div className="acp-form-area">
            <div className="acp-input-row">
              <input
                placeholder="Nome do cliente (opcional)"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            </div>

            {scanResult?.dossier && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <FileText size={14} color="#059669" />
                <span style={{ fontSize: 12, color: '#065f46' }}>
                  Dossiê de {scanResult.companyName} disponível como contexto
                </span>
              </div>
            )}

            <label>Contexto para o agente</label>
            <textarea
              className="acp-textarea"
              placeholder={selectedAgent.placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
            />

            <button
              className="acp-execute-btn"
              style={{
                background: selectedAgent.color,
                boxShadow: `0 4px 14px ${selectedAgent.color}33`
              }}
              onClick={handleExecute}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <><Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> Processando...</>
              ) : (
                <><Zap size={18} /> Executar {selectedAgent.name}</>
              )}
            </button>
          </div>

          <div className="acp-result-area">
            <div className="result-header">
              <span className="dot" />
              <span>
                {showPlan ? 'Plano de Execução' : chainResults ? 'Resultados da Cadeia (14 Agentes)' : 'Resultado'}
              </span>
            </div>

            {showPlan && executionPlan ? (
              <div className="acp-markdown">
                <ReactMarkdown>{executionPlan}</ReactMarkdown>
              </div>
            ) : chainResults ? (
              <div>
                {Object.entries(chainResults).map(([agentId, data]) => (
                  <details key={agentId} style={{ marginBottom: 8, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                    <summary style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: '#f8fafc', color: '#0f172a' }}>
                      {data.agentName}
                    </summary>
                    <div style={{ padding: '12px 14px' }}>
                      <div className="acp-markdown" style={{ fontSize: 13 }}>
                        <ReactMarkdown>{data.output}</ReactMarkdown>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            ) : result ? (
              <div className="acp-markdown">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="acp-empty">
                <Sparkles size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <strong>Use o scanner digital acima para gerar um dossiê e executar a cadeia completa de agentes.</strong>
                <p style={{ fontSize: 13, marginTop: 4 }}>Ou selecione um agente ao lado, forneça contexto e clique em executar.</p>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="acp-history">
              <button className="acp-history-toggle" onClick={() => setExpandedHistory(!expandedHistory)}>
                <span>📋 Histórico de execuções ({history.length})</span>
                {expandedHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {expandedHistory && history.map((item, i) => (
                <div key={i} className="acp-history-item">
                  <small>{item.date.toLocaleString('pt-BR')}</small>
                  <strong> — {item.agent}</strong>
                  <p>{item.input.substring(0, 100)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcpHub;
