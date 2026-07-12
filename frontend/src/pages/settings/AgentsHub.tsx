import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart,
  Brain,
  Cpu,
  Heart,
  Layout,
  Loader2,
  Megaphone,
  PenTool,
  Search,
  Shield,
  Sparkles,
  Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ACP_AGENTS } from '../../lib/agentsConfig';
import './AgentsHub.css';

import { apiFetch } from '../../lib/api';
import { PlanGuard } from '../../components/PlanGuard';

type AIAgent = (typeof ACP_AGENTS)[keyof typeof ACP_AGENTS];

type AiModel = {
  id: string;
  displayName: string;
  modelId: string;
  provider: string;
  isSelfHosted: boolean;
};

const AGENT_META: Record<string, { icon: React.ElementType; color: string; soft: string }> = {
  diagnostico: { icon: Search, color: '#2563eb', soft: '#eff6ff' },
  estruturador: { icon: Layout, color: '#0891b2', soft: '#ecfeff' },
  copy_script: { icon: PenTool, color: '#db2777', soft: '#fdf2f8' },
  analista_kpi: { icon: BarChart, color: '#059669', soft: '#ecfdf5' },
  copy_ads: { icon: Megaphone, color: '#ea580c', soft: '#fff7ed' },
  customer_success: { icon: Heart, color: '#7c3aed', soft: '#f5f3ff' },
  juridico: { icon: Shield, color: '#475569', soft: '#f8fafc' }
};

const AGENT_TABS = [
  {
    id: 'todos',
    label: 'Todos',
    eyebrow: 'Visão geral',
    description: 'Acesse todos os agentes de IA da central.',
    agentIds: [] as string[]
  },
  {
    id: 'estrategia',
    label: 'Estratégia',
    eyebrow: 'Diagnóstico',
    description: 'Entenda gargalos, maturidade comercial e estrutura do CRM.',
    agentIds: ['diagnostico', 'estruturador']
  },
  {
    id: 'comunicacao',
    label: 'Comunicação',
    eyebrow: 'Copy',
    description: 'Crie scripts, anúncios e mensagens comerciais consultivas.',
    agentIds: ['copy_script', 'copy_ads']
  },
  {
    id: 'performance',
    label: 'Performance',
    eyebrow: 'Indicadores',
    description: 'Analise KPIs, conversão, produtividade e oportunidades.',
    agentIds: ['analista_kpi']
  },
  {
    id: 'relacao',
    label: 'Relação',
    eyebrow: 'CS e legal',
    description: 'Apoie retenção, expansão e segurança jurídica.',
    agentIds: ['customer_success', 'juridico']
  }
];

const getAgentMeta = (agentId: string) => AGENT_META[agentId] || {
  icon: Sparkles,
  color: '#2563eb',
  soft: '#eff6ff'
};

const AgentsHub: React.FC<{ selectedClientId?: string | null }> = ({ selectedClientId }) => {
  const agents = useMemo(() => Object.values(ACP_AGENTS) as AIAgent[], []);
  const [activeTab, setActiveTab] = useState(AGENT_TABS[0].id);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent>(agents[0]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  React.useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await apiFetch('/api/ai/available-models?capability=chat');
        if (!response.ok) return;
        const data = await response.json();
        const available = data.models || [];
        setModels(available);
        setSelectedModel((current) => current || available[0]?.modelId || '');
      } catch {
        setModels([]);
      }
    };
    loadModels();
  }, []);

  const filteredAgents = useMemo(() => {
    const tab = AGENT_TABS.find((item) => item.id === activeTab);
    if (!tab || tab.id === 'todos') return agents;
    return agents.filter((agent) => tab.agentIds.includes(agent.id));
  }, [activeTab, agents]);

  const activeTabData = AGENT_TABS.find((tab) => tab.id === activeTab) || AGENT_TABS[0];
  const selectedMeta = getAgentMeta(selectedAgent.id);
  const SelectedIcon = selectedMeta.icon;

  const handleAgentClick = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setInput('');
    setResult('');
  };

  const handleTabClick = (tabId: string) => {
    const nextTab = AGENT_TABS.find((tab) => tab.id === tabId) || AGENT_TABS[0];
    const nextAgents = nextTab.id === 'todos'
      ? agents
      : agents.filter((agent) => nextTab.agentIds.includes(agent.id));

    setActiveTab(tabId);
    if (!nextAgents.some((agent) => agent.id === selectedAgent.id)) {
      setSelectedAgent(nextAgents[0] || agents[0]);
      setInput('');
      setResult('');
    }
  };

  const handleExecute = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setResult('');

    try {
      const response = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agentId: selectedAgent.id,
          input,
          prompt: selectedAgent.prompt,
          model: selectedModel,
          clientId: selectedClientId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao processar inteligência');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (error: any) {
      setResult(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlanGuard
      feature="Central de Agentes I.A. de Elite"
      requiredPlan="Pro"
      currentPlan="Pro"
    >
      <div className="agents-hub-container">
        <header className="hub-header">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="method-acp-badge"
            >
              Método A.C.P. - Arquitetura de Crescimento Previsível
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              Central de Agentes IA
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Escolha uma aba, selecione o agente e execute diagnósticos, copy, indicadores e operações sem perder área útil de trabalho.
            </motion.p>
          </div>

          <div className="hub-summary-card">
            <div className="summary-icon">
              <Brain size={22} />
            </div>
            <div>
              <span>{agents.length} agentes</span>
              <strong>Fluxo claro, leve e organizado por abas.</strong>
            </div>
          </div>
        </header>

        <nav className="agent-tabs" aria-label="Categorias de agentes">
          {AGENT_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`agent-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span>{tab.eyebrow}</span>
              <strong>{tab.label}</strong>
            </button>
          ))}
        </nav>

        <section className="tab-context">
          <div>
            <span>{activeTabData.eyebrow}</span>
            <h2>{activeTabData.label}</h2>
          </div>
          <p>{activeTabData.description}</p>
        </section>

        <main className="agents-workspace">
          <section className="agents-list-panel" aria-label="Lista de agentes">
            <div className="panel-title-row">
              <div>
                <span>Biblioteca</span>
                <h2>Agentes disponíveis</h2>
              </div>
              <small>{filteredAgents.length} itens</small>
            </div>

            <div className="agents-list">
              {filteredAgents.map((agent, index) => {
                const meta = getAgentMeta(agent.id);
                const IconComponent = meta.icon;
                const isActive = selectedAgent.id === agent.id;

                return (
                  <motion.button
                    type="button"
                    key={agent.id}
                    className={`agent-list-card ${isActive ? 'active' : ''}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => handleAgentClick(agent)}
                    style={{ '--agent-color': meta.color, '--agent-soft': meta.soft } as React.CSSProperties}
                  >
                    <div className="agent-card-icon">
                      <IconComponent size={22} />
                    </div>
                    <div className="agent-card-copy">
                      <span>{agent.phase}</span>
                      <strong>{agent.name}</strong>
                      <p>{agent.description}</p>
                    </div>
                    <ArrowRight size={18} />
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section className="agent-builder-panel" aria-label="Execução do agente">
            <div className="agent-builder-header">
              <div className="selected-agent-hero" style={{ '--agent-color': selectedMeta.color, '--agent-soft': selectedMeta.soft } as React.CSSProperties}>
                <div className="selected-agent-icon">
                  <SelectedIcon size={30} />
                </div>
                <div>
                  <span>{selectedAgent.phase}</span>
                  <h2>{selectedAgent.name}</h2>
                  <p>{selectedAgent.description}</p>
                </div>
              </div>

              <div className="model-card">
                <div className="model-card-label">
                  <Cpu size={16} />
                  <span>Motor de inteligência</span>
                </div>
                <select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                >
                  {models.length === 0 && <option value="">Modelo padrao do plano</option>}
                  {models.map((model) => (
                    <option key={model.id} value={model.modelId}>
                      {model.displayName} ({model.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="agent-form-grid">
              <div className="agent-input-card">
                <div className="section-kicker">
                  <Sparkles size={16} />
                  <span>Contexto para o agente</span>
                </div>

                <label htmlFor="agent-input">Descreva o cenário ou cole os dados</label>
                <textarea
                  id="agent-input"
                  className="agent-textarea"
                  placeholder="Ex: Somos uma empresa B2B de software, geramos 50 leads por mês, mas a conversão está baixa..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />

                <button
                  className="execute-btn"
                  type="button"
                  onClick={handleExecute}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="spin-icon" />
                      Processando inteligência...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      Executar agente
                    </>
                  )}
                </button>
              </div>

              <aside className="agent-guidance-card">
                <div className="section-kicker">
                  <Shield size={16} />
                  <span>Instrução ativa</span>
                </div>
                <p>{selectedAgent.prompt}</p>
              </aside>
            </div>

            <div className="result-section">
              <div className="section-kicker success">
                <span className="status-dot" />
                <span>Resultado gerado</span>
              </div>

              <div className={`result-container ${result ? 'has-result' : ''}`}>
                {result ? (
                  <div className="markdown-content">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="empty-result">
                    <Sparkles size={24} />
                    <strong>A resposta do agente aparece aqui.</strong>
                    <p>Use a área de contexto acima para enviar informações e gerar a análise.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </PlanGuard>
  );
};

export default AgentsHub;
