import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  FileText,
  GitBranch,
  Inbox,
  ListChecks,
  Loader2,
  MessageCircle,
  PhoneForwarded,
  PlugZap,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
  X,
  Zap
} from 'lucide-react';
import { apiFetch, readJsonResponse } from '../../lib/api';

interface FunnelStage {
  id: string;
  name: string;
  order: number;
  agentName: string;
  goal: string;
  prompt?: string;
  maxMessages: number;
  isHumanHandoff: boolean;
}

interface FunnelPlaybook {
  segment: string;
  targetRoles: string[];
  avoidDepartments: string[];
  positioning: string;
  firstTouchMessage: string;
  gatekeeperFallbackMessage: string;
  qualificationQuestion: string;
  followUpMessages: string[];
  followUpAfterMinutes: number;
  maxFollowUps: number;
  scheduleTriggerPhrases: string[];
  meetingDurationMinutes: number;
  handoffMessage: string;
  forbiddenFirstMessageTerms: string[];
}

interface Funnel {
  id: string;
  name: string;
  description?: string;
  campaignName?: string;
  agentName?: string;
  senderCompanyName?: string;
  firstStagePrompt?: string;
  playbook?: FunnelPlaybook;
  status: string;
  channel: string;
  isDefault: boolean;
  stages: FunnelStage[];
  _count?: { runs: number };
}

interface Run {
  id: string;
  status: string;
  leadName: string;
  leadPhone?: string;
  score: number;
  firstMessage?: string;
  nextAction?: string;
  createdAt: string;
  qualification?: any;
  funnel?: { id?: string; name: string };
  stage?: { name: string; agentName: string };
}

interface ProspectingAgent {
  id: string;
  name: string;
  role: string;
  stage: string;
  tone: string;
}

interface Connection {
  id: string;
  identifier: string;
  isActive: boolean;
  config?: any;
  inbox?: { id?: string; name: string };
}

interface Conversation {
  id: string;
  subject?: string;
  contactId?: string;
  metadata?: any;
  messages?: Message[];
  _count?: { messages: number };
}

interface Message {
  id: string;
  senderType: string;
  content?: string;
  type: string;
  metadata?: any;
  createdAt: string;
}

interface DispatchAttempt {
  id: string;
  runId: string;
  channelId?: string;
  phone?: string;
  displayPhone?: string;
  message: string;
  status: string;
  reason?: string;
  bridgeMessageId?: string;
  metadata?: any;
  sentAt?: string;
  createdAt: string;
}

type Tab = 'operation' | 'playbooks' | 'leads' | 'queue' | 'messages' | 'agents' | 'rules';

const statusLabels: Record<string, string> = {
  queued: 'Na fila',
  sent: 'Enviado',
  active: 'Em contato',
  qualified: 'Qualificado',
  nurturing: 'Nutricao',
  human_handoff: 'Handoff',
  lost: 'Perdido',
  stopped: 'Pausado'
};

const attemptStatusLabels: Record<string, string> = {
  queued: 'Na fila',
  sent: 'Enviado',
  failed: 'Falhou',
  blocked: 'Bloqueado',
  skipped: 'Adiado'
};

const DEFAULT_FIRST_STAGE_PROMPT = 'Primeira etapa: falar como humano e localizar o decisor antes de qualquer explicacao. Procurar socio, proprietario, administrador ou alguem da area comercial. Nunca dizer que somos agencia. Nunca abrir falando de marketing, presenca digital, solucao digital, tecnologia, clientes, diagnostico ou avaliacao. A primeira mensagem deve apenas perguntar quem e o responsavel pelo comercial.';
const DEFAULT_PLAYBOOK: FunnelPlaybook = {
  segment: 'empresas locais',
  targetRoles: ['socio', 'proprietario', 'responsavel comercial'],
  avoidDepartments: ['marketing', 'social media', 'agencia'],
  positioning: 'estrutura comercial e implementacao comercial',
  firstTouchMessage: 'Oi, tudo bem? Aqui e o {agentName} da {senderCompanyName}. Poderia me ajudar a falar com {targetRoleLabel} da {businessName}?',
  gatekeeperFallbackMessage: 'Sem problema. Quem costuma cuidar dessa parte comercial por ai?',
  qualificationQuestion: 'Perfeito. Hoje quem acompanha a entrada de novos clientes e oportunidades comerciais?',
  followUpMessages: [
    'Oi, tudo bem? Conseguiu ver minha mensagem anterior?',
    'Passando uma ultima vez por aqui. Existe alguem melhor para eu falar sobre a parte comercial?'
  ],
  followUpAfterMinutes: 1440,
  maxFollowUps: 2,
  scheduleTriggerPhrases: ['agenda', 'reuniao', 'call', 'pode me ligar', 'tenho interesse', 'quero entender'],
  meetingDurationMinutes: 30,
  handoffMessage: 'Perfeito, vou passar para uma pessoa do nosso time continuar com voce por aqui.',
  forbiddenFirstMessageTerms: ['marketing', 'presenca digital', 'diagnostico', 'avaliacao', 'trafego pago']
};

const FUNNEL_TEMPLATES = [
  {
    id: 'real-estate',
    label: 'Imobiliarias',
    data: {
      name: 'Funil imobiliarias',
      campaignName: 'Prospeccao imobiliarias',
      description: 'Localizar proprietario, socio ou responsavel comercial antes de qualquer oferta.',
      segment: 'imobiliarias',
      targetRoles: 'proprietario, socio, diretor comercial, gerente comercial',
      positioning: 'estrutura comercial para captar e atender oportunidades imobiliarias',
      firstTouchMessage: 'Oi, tudo bem? Aqui e o {agentName} da {senderCompanyName}. Poderia me ajudar a falar com o proprietario ou responsavel comercial da {businessName}?',
      qualificationQuestion: 'Perfeito. Hoje quem acompanha a entrada de novos interessados e oportunidades de venda ou locacao?',
      followUpMessages: [
        'Oi, tudo bem? Conseguiu ver minha mensagem sobre o responsavel comercial?',
        'Ultima tentativa por aqui. Existe alguem melhor para eu falar sobre a area comercial da imobiliaria?'
      ]
    }
  },
  {
    id: 'lawyers',
    label: 'Advogados',
    data: {
      name: 'Funil advogados',
      campaignName: 'Prospeccao advocacia',
      description: 'Chegar ao socio ou responsavel por novas demandas sem abordar marketing.',
      segment: 'escritorios de advocacia',
      targetRoles: 'socio, socio administrador, responsavel comercial, gestor do escritorio',
      positioning: 'estrutura comercial para organizar entrada e triagem de novas demandas',
      firstTouchMessage: 'Oi, tudo bem? Aqui e o {agentName} da {senderCompanyName}. Poderia me ajudar a falar com o socio ou responsavel pelas novas demandas do {businessName}?',
      qualificationQuestion: 'Perfeito. Hoje quem acompanha a entrada de novas demandas e o primeiro atendimento do escritorio?',
      followUpMessages: [
        'Oi, tudo bem? Conseguiu ver minha mensagem sobre o responsavel pelas novas demandas?',
        'Passando uma ultima vez. Tem algum socio ou responsavel mais indicado para eu falar?'
      ]
    }
  }
] as const;

const today = new Date().toISOString().slice(0, 10);
const controlClass = 'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 outline-none focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100';

const formatConnection = (connection?: Connection) => {
  if (!connection) return 'Selecione';
  return connection.config?.label || connection.config?.pushName || connection.inbox?.name || connection.identifier;
};

const formatCampaign = (run: Run) => run.qualification?.campaign?.name || run.funnel?.name || 'Operacao ativa';
const toLines = (value: string) => value.split(/\n|,|;/).map(item => item.trim()).filter(Boolean);
const listText = (items?: string[]) => (items?.length ? items : []).join('\n');
const playbookFor = (funnel?: Funnel | null): FunnelPlaybook => ({ ...DEFAULT_PLAYBOOK, ...(funnel?.playbook || {}) });
const targetLabel = (playbook?: FunnelPlaybook) => (playbook?.targetRoles?.length ? playbook.targetRoles.join(', ') : DEFAULT_PLAYBOOK.targetRoles.join(', '));

function createFunnelForm() {
  return {
    name: '',
    campaignName: '',
    agentName: 'Paulo',
    senderCompanyName: 'Consultio',
    description: '',
    segment: DEFAULT_PLAYBOOK.segment,
    targetRolesText: listText(DEFAULT_PLAYBOOK.targetRoles),
    avoidDepartmentsText: listText(DEFAULT_PLAYBOOK.avoidDepartments),
    positioning: DEFAULT_PLAYBOOK.positioning,
    firstStagePrompt: DEFAULT_FIRST_STAGE_PROMPT,
    firstTouchMessage: DEFAULT_PLAYBOOK.firstTouchMessage,
    gatekeeperFallbackMessage: DEFAULT_PLAYBOOK.gatekeeperFallbackMessage,
    qualificationQuestion: DEFAULT_PLAYBOOK.qualificationQuestion,
    followUpMessagesText: listText(DEFAULT_PLAYBOOK.followUpMessages),
    followUpAfterMinutes: DEFAULT_PLAYBOOK.followUpAfterMinutes,
    maxFollowUps: DEFAULT_PLAYBOOK.maxFollowUps,
    scheduleTriggerPhrasesText: listText(DEFAULT_PLAYBOOK.scheduleTriggerPhrases),
    meetingDurationMinutes: DEFAULT_PLAYBOOK.meetingDurationMinutes,
    handoffMessage: DEFAULT_PLAYBOOK.handoffMessage,
    forbiddenTermsText: listText(DEFAULT_PLAYBOOK.forbiddenFirstMessageTerms)
  };
}

export default function ProspectingFunnels() {
  const [activeTab, setActiveTab] = useState<Tab>('operation');
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [agents, setAgents] = useState<ProspectingAgent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [attempts, setAttempts] = useState<DispatchAttempt[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastRunIds, setLastRunIds] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savingFunnel, setSavingFunnel] = useState(false);

  const [operation, setOperation] = useState({
    funnelId: 'default',
    niche: '',
    city: '',
    state: '',
    leadQuantity: 25,
    provider: 'serper',
    agentId: 'sdr_first_touch',
    channelId: '',
    executionDate: today,
    executionTime: '09:00',
    dailyMessageLimit: 50,
    messageIntervalMinutes: 15
  });

  const [form, setForm] = useState(createFunnelForm);

  const defaultFunnel = useMemo(() => funnels.find(funnel => funnel.isDefault) || funnels[0], [funnels]);
  const selectedFunnel = funnels.find(funnel => funnel.id === operation.funnelId) || defaultFunnel;
  const selectedPlaybook = playbookFor(selectedFunnel);
  const selectedAgent = agents.find(agent => agent.id === operation.agentId) || agents[0];
  const selectedConnection = connections.find(connection => connection.id === operation.channelId);
  const queuedRuns = runs.filter(run => run.status === 'queued').length;
  const sentRuns = runs.filter(run => run.status === 'sent' || run.status === 'active').length;
  const decisionRuns = runs.filter(run => run.status === 'qualified' || run.status === 'human_handoff').length;
  const averageScore = runs.length ? Math.round(runs.reduce((total, run) => total + (run.score || 0), 0) / runs.length) : 0;
  const failedAttempts = attempts.filter(attempt => ['failed', 'blocked'].includes(attempt.status)).length;

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!defaultFunnel) return;
    setOperation(current => ({
      ...current,
      funnelId: current.funnelId === 'default' ? defaultFunnel.id : current.funnelId
    }));
  }, [defaultFunnel]);

  useEffect(() => {
    if (!selectedFunnel?.playbook?.segment) return;
    setOperation(current => current.niche.trim() ? current : { ...current, niche: selectedFunnel.playbook?.segment || current.niche });
  }, [selectedFunnel?.id]);

  const fetchAll = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [funnelsRes, runsRes, agentsRes, connectionsRes, conversationsRes, attemptsRes] = await Promise.all([
        apiFetch('/api/prospecting-funnels/funnels'),
        apiFetch('/api/prospecting-funnels/runs'),
        apiFetch('/api/prospecting-funnels/agents'),
        apiFetch('/api/whatsapp/connections'),
        apiFetch('/api/whatsapp/conversations?prospecting=1&kind=direct'),
        apiFetch('/api/whatsapp/prospecting/dispatch-attempts?limit=150')
      ]);

      const [funnelsData, runsData, agentsData, connectionsData, conversationsData, attemptsData] = await Promise.all([
        readApiArray<Funnel>(funnelsRes, 'Nao foi possivel carregar os funis.'),
        readApiArray<Run>(runsRes, 'Nao foi possivel carregar os leads do funil.'),
        readApiArray<ProspectingAgent>(agentsRes, 'Nao foi possivel carregar os agentes.'),
        readApiArray<Connection>(connectionsRes, 'Nao foi possivel carregar as instancias.'),
        readApiArray<Conversation>(conversationsRes, 'Nao foi possivel carregar as mensagens.'),
        readApiArray<DispatchAttempt>(attemptsRes, 'Nao foi possivel carregar a fila de disparos.')
      ]);

      setFunnels(funnelsData);
      setRuns(runsData);
      setAgents(agentsData);
      setConnections(connectionsData);
      setConversations(conversationsData);
      setAttempts(attemptsData);
      setOperation(current => ({
        ...current,
        agentId: current.agentId || agentsData[0]?.id || 'sdr_first_touch',
        channelId: current.channelId || connectionsData.find(conn => conn.config?.status === 'connected' && conn.isActive)?.id || ''
      }));
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar a operacao.');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultFunnel = async () => {
    setBusy(true);
    try {
      await apiFetch('/api/prospecting-funnels/funnels/default', { method: 'POST' });
      await fetchAll();
    } finally {
      setBusy(false);
    }
  };

  const createFunnel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    setSavingFunnel(true);
    try {
      const playbook = {
        segment: form.segment.trim(),
        targetRoles: toLines(form.targetRolesText),
        avoidDepartments: toLines(form.avoidDepartmentsText),
        positioning: form.positioning.trim(),
        firstTouchMessage: form.firstTouchMessage.trim(),
        gatekeeperFallbackMessage: form.gatekeeperFallbackMessage.trim(),
        qualificationQuestion: form.qualificationQuestion.trim(),
        followUpMessages: toLines(form.followUpMessagesText),
        followUpAfterMinutes: Number(form.followUpAfterMinutes || DEFAULT_PLAYBOOK.followUpAfterMinutes),
        maxFollowUps: Number(form.maxFollowUps || DEFAULT_PLAYBOOK.maxFollowUps),
        scheduleTriggerPhrases: toLines(form.scheduleTriggerPhrasesText),
        meetingDurationMinutes: Number(form.meetingDurationMinutes || DEFAULT_PLAYBOOK.meetingDurationMinutes),
        handoffMessage: form.handoffMessage.trim(),
        forbiddenFirstMessageTerms: toLines(form.forbiddenTermsText)
      };
      const res = await apiFetch('/api/prospecting-funnels/funnels', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          campaignName: (form.campaignName || form.name).trim(),
          agentName: (form.agentName || 'Paulo').trim(),
          senderCompanyName: (form.senderCompanyName || 'Consultio').trim(),
          description: form.description.trim() || 'Funil de abordagem por WhatsApp para localizar decisor antes de qualificar.',
          firstStagePrompt: form.firstStagePrompt.trim(),
          playbook
        })
      });
      const created = await readJsonResponse<Funnel>(res, 'Nao foi possivel criar o funil.');
      setOperation(current => ({ ...current, funnelId: created.id }));
      setShowCreateForm(false);
      setForm(createFunnelForm());
      await fetchAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel criar o funil.');
    } finally {
      setSavingFunnel(false);
    }
  };

  const prepareCampaign = async () => {
    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await apiFetch('/api/prospecting-funnels/campaigns/prepare', {
        method: 'POST',
        body: JSON.stringify({
          funnelId: operation.funnelId || defaultFunnel?.id || 'default',
          name: `${operation.niche} - ${operation.city}/${operation.state}`,
          niche: operation.niche,
          city: operation.city,
          state: operation.state,
          provider: operation.provider,
          leadQuantity: operation.leadQuantity,
          channelId: operation.channelId || undefined,
          agentId: operation.agentId,
          executionDate: operation.executionDate,
          executionTime: operation.executionTime,
          dailyMessageLimit: operation.dailyMessageLimit,
          messageIntervalMinutes: operation.messageIntervalMinutes
        })
      });

      const data = await readJsonResponse<any>(res, 'Nao foi possivel preparar a campanha.');
      setLastRunIds(Array.isArray(data.runIds) ? data.runIds : []);
      setSuccessMessage(`${data.enrolled || 0} leads preparados no funil. Captados: ${data.capture?.totalImported || 0}.`);
      await fetchAll();
      setActiveTab('leads');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel preparar a campanha.');
    } finally {
      setBusy(false);
    }
  };

  const dispatchCampaign = async () => {
    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await apiFetch('/api/whatsapp/prospecting/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          channelId: operation.channelId || undefined,
          runIds: lastRunIds.length ? lastRunIds : undefined,
          limit: operation.leadQuantity,
          maxDailyMessages: operation.dailyMessageLimit
        })
      });
      const data = await readJsonResponse<any>(res, 'Nao foi possivel disparar a fila.');
      setSuccessMessage(`${data.sent?.length || 0} mensagens enviadas. Falhas/bloqueios: ${data.failed?.length || 0}.`);
      await fetchAll();
      setActiveTab('messages');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel disparar a fila.');
    } finally {
      setBusy(false);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const res = await apiFetch(`/api/whatsapp/conversations/${conversation.id}/messages`);
    const data = await readApiArray<Message>(res, 'Nao foi possivel abrir a conversa.');
    setMessages(data);
  };

  const sendReply = async () => {
    if (!selectedConversation || !reply.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/whatsapp/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: reply.trim() })
      });
      setReply('');
      await openConversation(selectedConversation);
      await fetchAll();
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: typeof FUNNEL_TEMPLATES[number]) => {
    const data = template.data;
    setForm(current => ({
      ...current,
      name: data.name,
      campaignName: data.campaignName,
      description: data.description,
      segment: data.segment,
      targetRolesText: data.targetRoles,
      positioning: data.positioning,
      firstTouchMessage: data.firstTouchMessage,
      qualificationQuestion: data.qualificationQuestion,
      followUpMessagesText: data.followUpMessages.join('\n')
    }));
  };

  const canPrepare = operation.niche.trim() && operation.city.trim() && operation.state.trim();

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
              <MessageCircle size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-950">Funil de prospeccao</h1>
              <p className="text-sm font-medium text-gray-500">Nicho, leads, agente, instancia, agenda e mensagens no mesmo fluxo.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={fetchAll} disabled={loading || busy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Atualizar
            </button>
            <button onClick={() => setShowCreateForm(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-black text-gray-700 hover:bg-gray-50">
              <Plus size={15} />
              Novo funil
            </button>
            <button onClick={createDefaultFunnel} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
              <Sparkles size={15} />
              Padrao
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <TopField className="lg:col-span-2" label="Funil">
            <select value={operation.funnelId} onChange={(event) => setOperation(current => ({ ...current, funnelId: event.target.value }))} className={controlClass}>
              {funnels.length === 0 && <option value="default">Padrao</option>}
              {funnels.map(funnel => <option key={funnel.id} value={funnel.id}>{funnel.name}</option>)}
            </select>
          </TopField>
          <TopField className="lg:col-span-2" label="Nicho">
            <input value={operation.niche} onChange={(event) => setOperation(current => ({ ...current, niche: event.target.value }))} placeholder="Ex: clinicas odontologicas" className={controlClass} />
          </TopField>
          <TopField className="lg:col-span-1" label="Cidade">
            <input value={operation.city} onChange={(event) => setOperation(current => ({ ...current, city: event.target.value }))} placeholder="Sao Paulo" className={controlClass} />
          </TopField>
          <TopField className="lg:col-span-1" label="UF">
            <input value={operation.state} maxLength={2} onChange={(event) => setOperation(current => ({ ...current, state: event.target.value.toUpperCase() }))} placeholder="SP" className={controlClass} />
          </TopField>
          <TopField className="lg:col-span-1" label="Qtd.">
            <input type="number" min={1} max={100} value={operation.leadQuantity} onChange={(event) => setOperation(current => ({ ...current, leadQuantity: Number(event.target.value) }))} className={controlClass} />
          </TopField>
          <TopField className="lg:col-span-2" label="Agente">
            <select value={operation.agentId} onChange={(event) => setOperation(current => ({ ...current, agentId: event.target.value }))} className={controlClass}>
              {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </TopField>
          <TopField className="lg:col-span-2" label="Instancia">
            <select value={operation.channelId} onChange={(event) => setOperation(current => ({ ...current, channelId: event.target.value }))} className={controlClass}>
              <option value="">Selecionar</option>
              {connections.map(connection => <option key={connection.id} value={connection.id}>{formatConnection(connection)}</option>)}
            </select>
          </TopField>
          <TopField className="lg:col-span-1" label="Busca">
            <select value={operation.provider} onChange={(event) => setOperation(current => ({ ...current, provider: event.target.value }))} className={controlClass}>
              <option value="serper">Serper</option>
              <option value="serpapi">SerpAPI</option>
              <option value="outscraper">Outscraper</option>
            </select>
          </TopField>
          <TopField className="lg:col-span-2" label="Data">
            <input type="date" value={operation.executionDate} onChange={(event) => setOperation(current => ({ ...current, executionDate: event.target.value }))} className={controlClass} />
          </TopField>
          <TopField className="lg:col-span-1" label="Hora">
            <input type="time" value={operation.executionTime} onChange={(event) => setOperation(current => ({ ...current, executionTime: event.target.value }))} className={controlClass} />
          </TopField>
          <TopField className="lg:col-span-1" label="Limite/dia">
            <input type="number" min={1} value={operation.dailyMessageLimit} onChange={(event) => setOperation(current => ({ ...current, dailyMessageLimit: Number(event.target.value) }))} className={controlClass} />
          </TopField>
          <TopField className="lg:col-span-1" label="Intervalo">
            <input type="number" min={1} value={operation.messageIntervalMinutes} onChange={(event) => setOperation(current => ({ ...current, messageIntervalMinutes: Number(event.target.value) }))} className={controlClass} />
          </TopField>
          <div className="flex items-end gap-2 lg:col-span-7">
            <button onClick={prepareCampaign} disabled={busy || !canPrepare} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-xs font-black text-white hover:bg-black disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Captar e preparar
            </button>
            <button onClick={dispatchCampaign} disabled={busy || !operation.channelId} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Disparar fila
            </button>
          </div>
        </div>
      </header>

      {(errorMessage || successMessage) && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${errorMessage ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {errorMessage || successMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Metric icon={Database} label="Na fila" value={queuedRuns} tone="emerald" />
        <Metric icon={MessageCircle} label="Em conversa" value={sentRuns} tone="blue" />
        <Metric icon={PhoneForwarded} label="Decisores/Handoff" value={decisionRuns} tone="violet" />
        <Metric icon={Zap} label="Score medio" value={`${averageScore}%`} tone="amber" />
        <Metric icon={ShieldCheck} label="Falhas/bloqueios" value={failedAttempts} tone="rose" />
      </section>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
        <TabButton active={activeTab === 'operation'} icon={GitBranch} label="Operacao" onClick={() => setActiveTab('operation')} />
        <TabButton active={activeTab === 'playbooks'} icon={ClipboardList} label="Playbooks" onClick={() => setActiveTab('playbooks')} />
        <TabButton active={activeTab === 'leads'} icon={Users} label="Leads" onClick={() => setActiveTab('leads')} />
        <TabButton active={activeTab === 'queue'} icon={Inbox} label="Fila" onClick={() => setActiveTab('queue')} />
        <TabButton active={activeTab === 'messages'} icon={Inbox} label="Mensagens" onClick={() => setActiveTab('messages')} />
        <TabButton active={activeTab === 'agents'} icon={Bot} label="Agentes" onClick={() => setActiveTab('agents')} />
        <TabButton active={activeTab === 'rules'} icon={ShieldCheck} label="Regras" onClick={() => setActiveTab('rules')} />
      </nav>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4">
          <form onSubmit={createFunnel} className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <h2 className="text-xl font-black text-gray-900">Criar funil WhatsApp</h2>
                <p className="mt-1 text-xs font-medium text-gray-500">Configure segmento, abordagem, mensagens, follow-ups e agenda automatica.</p>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="mb-5 flex flex-wrap gap-2">
                {FUNNEL_TEMPLATES.map(template => (
                  <button key={template.id} type="button" onClick={() => applyTemplate(template)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-black text-gray-600 hover:bg-gray-50">
                    <Sparkles size={14} />
                    {template.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormInput label="Nome do funil" value={form.name} onChange={(value) => setForm(current => ({ ...current, name: value }))} placeholder="Ex: Funil imobiliarias" />
                <FormInput label="Campanha" value={form.campaignName} onChange={(value) => setForm(current => ({ ...current, campaignName: value }))} placeholder="Ex: SP capital" />
                <FormInput label="Segmento" value={form.segment} onChange={(value) => setForm(current => ({ ...current, segment: value }))} placeholder="Ex: imobiliarias" />
                <FormInput label="Nome do agente" value={form.agentName} onChange={(value) => setForm(current => ({ ...current, agentName: value }))} placeholder="Paulo" />
                <FormInput label="Empresa" value={form.senderCompanyName} onChange={(value) => setForm(current => ({ ...current, senderCompanyName: value }))} placeholder="Consultio" />
                <FormInput label="Descricao" value={form.description} onChange={(value) => setForm(current => ({ ...current, description: value }))} placeholder="Localizar decisor antes da abordagem" />

                <FormTextarea className="md:col-span-1" label="Quem procurar" value={form.targetRolesText} onChange={(value) => setForm(current => ({ ...current, targetRolesText: value }))} />
                <FormTextarea className="md:col-span-1" label="Evitar setor" value={form.avoidDepartmentsText} onChange={(value) => setForm(current => ({ ...current, avoidDepartmentsText: value }))} />
                <FormTextarea className="md:col-span-1" label="Como abordar" value={form.positioning} onChange={(value) => setForm(current => ({ ...current, positioning: value }))} />

                <FormTextarea className="md:col-span-3" label="Primeira mensagem" value={form.firstTouchMessage} onChange={(value) => setForm(current => ({ ...current, firstTouchMessage: value }))} minHeight="min-h-20" />
                <FormTextarea className="md:col-span-1" label="Se barrarem" value={form.gatekeeperFallbackMessage} onChange={(value) => setForm(current => ({ ...current, gatekeeperFallbackMessage: value }))} />
                <FormTextarea className="md:col-span-2" label="Pergunta de qualificacao" value={form.qualificationQuestion} onChange={(value) => setForm(current => ({ ...current, qualificationQuestion: value }))} />

                <FormTextarea className="md:col-span-2" label="Follow-ups automaticos" value={form.followUpMessagesText} onChange={(value) => setForm(current => ({ ...current, followUpMessagesText: value }))} />
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400">Cadencia</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min={5} value={form.followUpAfterMinutes} onChange={(event) => setForm(current => ({ ...current, followUpAfterMinutes: Number(event.target.value) }))} className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" />
                    <input type="number" min={1} value={form.maxFollowUps} onChange={(event) => setForm(current => ({ ...current, maxFollowUps: Number(event.target.value) }))} className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" />
                  </div>
                  <span className="block text-[10px] font-bold text-gray-400">minutos ate follow-up / maximo</span>
                </label>

                <FormTextarea className="md:col-span-1" label="Gatilhos de agenda" value={form.scheduleTriggerPhrasesText} onChange={(value) => setForm(current => ({ ...current, scheduleTriggerPhrasesText: value }))} />
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400">Duracao call</span>
                  <input type="number" min={15} value={form.meetingDurationMinutes} onChange={(event) => setForm(current => ({ ...current, meetingDurationMinutes: Number(event.target.value) }))} className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" />
                </label>
                <FormTextarea className="md:col-span-1" label="Mensagem de handoff" value={form.handoffMessage} onChange={(value) => setForm(current => ({ ...current, handoffMessage: value }))} />

                <FormTextarea className="md:col-span-1" label="Termos proibidos" value={form.forbiddenTermsText} onChange={(value) => setForm(current => ({ ...current, forbiddenTermsText: value }))} />
                <FormTextarea className="md:col-span-2" label="Instrucao do agente" value={form.firstStagePrompt} onChange={(value) => setForm(current => ({ ...current, firstStagePrompt: value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 p-5">
              <button type="button" onClick={() => setShowCreateForm(false)} className="h-11 rounded-lg bg-gray-100 px-5 text-sm font-bold text-gray-700 hover:bg-gray-200">Cancelar</button>
              <button disabled={savingFunnel || !form.name.trim()} className="flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                {savingFunnel ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex h-80 items-center justify-center">
          <Loader2 className="animate-spin text-emerald-600" size={34} />
        </div>
      ) : (
        <>
          {activeTab === 'operation' && <OperationBoard runs={runs} selectedAgent={selectedAgent} selectedConnection={selectedConnection} selectedFunnel={selectedFunnel} />}
          {activeTab === 'playbooks' && <PlaybooksPanel funnels={funnels} onCreate={() => setShowCreateForm(true)} />}
          {activeTab === 'leads' && <LeadsTable runs={runs} />}
          {activeTab === 'queue' && <QueuePanel attempts={attempts} />}
          {activeTab === 'messages' && (
            <MessagesPanel
              conversations={conversations}
              selectedConversation={selectedConversation}
              messages={messages}
              reply={reply}
              sending={sending}
              onReplyChange={setReply}
              onOpenConversation={openConversation}
              onSendReply={sendReply}
            />
          )}
          {activeTab === 'agents' && (
            <AgentsPanel agents={agents} selectedId={operation.agentId} onSelect={(agentId) => setOperation(current => ({ ...current, agentId }))} />
          )}
          {activeTab === 'rules' && <RulesPanel />}
        </>
      )}
    </div>
  );
}

function PlaybooksPanel({ funnels, onCreate }: { funnels: Funnel[]; onCreate: () => void }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-gray-100 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 font-black text-gray-950"><ClipboardList size={18} className="text-emerald-600" /> Playbooks de prospeccao</h2>
          <p className="mt-1 text-sm font-medium text-gray-500">Cada funil define segmento, alvo, mensagens, follow-ups e gatilhos de agenda.</p>
        </div>
        <button onClick={onCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-xs font-black text-white hover:bg-black">
          <Plus size={15} />
          Novo funil
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {funnels.map(funnel => {
          const playbook = playbookFor(funnel);
          return (
            <article key={funnel.id} className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">{playbook.segment || 'Segmento'}</p>
                  <h3 className="mt-1 text-lg font-black text-gray-950">{funnel.name}</h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-gray-500">{funnel.description || 'Funil consultivo para localizar decisor antes de qualificar.'}</p>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{funnel._count?.runs || 0} leads</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <MiniInfo icon={Target} label="Alvo" value={targetLabel(playbook)} />
                <MiniInfo icon={ShieldCheck} label="Evitar" value={(playbook.avoidDepartments || []).join(', ') || 'marketing'} />
                <MiniInfo icon={Clock} label="Follow-up" value={`${playbook.maxFollowUps || 0}x / ${playbook.followUpAfterMinutes || 0} min`} />
              </div>

              <div className="mt-4 space-y-3">
                <MessagePreview icon={MessageCircle} label="Primeira mensagem" text={playbook.firstTouchMessage} />
                <MessagePreview icon={ListChecks} label="Qualificacao" text={playbook.qualificationQuestion} />
                <MessagePreview icon={Calendar} label="Agenda/handoff" text={playbook.handoffMessage} />
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="mb-2 text-[10px] font-black uppercase text-gray-400">Follow-ups</p>
                <div className="space-y-2">
                  {(playbook.followUpMessages || []).map((message, index) => (
                    <p key={`${funnel.id}-${index}`} className="text-xs font-medium leading-relaxed text-gray-600">{index + 1}. {message}</p>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {funnels.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
          <FileText className="mx-auto mb-3 text-gray-300" size={38} />
          <p className="font-black text-gray-800">Nenhum funil criado ainda.</p>
        </div>
      )}
    </section>
  );
}

function OperationBoard({ runs, selectedAgent, selectedConnection, selectedFunnel }: { runs: Run[]; selectedAgent?: ProspectingAgent; selectedConnection?: Connection; selectedFunnel?: Funnel }) {
  const playbook = playbookFor(selectedFunnel);
  const columns = [
    { id: 'captured', title: 'Leads Google', icon: Database, runs: runs.filter(run => run.status === 'queued') },
    { id: 'contact', title: 'Primeiro contato', icon: MessageCircle, runs: runs.filter(run => ['sent', 'active'].includes(run.status)) },
    { id: 'decision', title: 'Decisor', icon: UserCheck, runs: runs.filter(run => ['qualified', 'human_handoff'].includes(run.status)) },
    { id: 'paused', title: 'Pausados', icon: ShieldCheck, runs: runs.filter(run => ['stopped', 'lost'].includes(run.status)) }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <InfoRow icon={Building2} label="Segmento" value={playbook.segment || selectedFunnel?.name || 'Funil selecionado'} />
        <InfoRow icon={Target} label="Alvo" value={targetLabel(playbook)} />
        <InfoRow icon={Bot} label="Agente" value={selectedAgent?.name || 'SDR Primeiro Contato'} />
        <InfoRow icon={PlugZap} label="Instancia" value={formatConnection(selectedConnection)} />
        <InfoRow icon={Calendar} label="Agenda" value={`${playbook.meetingDurationMinutes || 30} min quando houver horario claro`} />
        <InfoRow icon={ShieldCheck} label="Trava" value={`Evitar: ${(playbook.avoidDepartments || []).join(', ') || 'marketing'}`} />
      </aside>
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        {columns.map(column => {
          const Icon = column.icon;
          return (
            <div key={column.id} className="rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <h2 className="flex items-center gap-2 text-sm font-black text-gray-900">
                  <Icon size={16} className="text-emerald-600" />
                  {column.title}
                </h2>
                <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-500">{column.runs.length}</span>
              </div>
              <div className="max-h-[620px] space-y-2 overflow-y-auto p-3">
                {column.runs.slice(0, 20).map(run => <RunCard key={run.id} run={run} />)}
                {column.runs.length === 0 && <p className="py-8 text-center text-xs font-bold text-gray-400">Sem itens</p>}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function LeadsTable({ runs }: { runs: Run[] }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-black text-gray-900">Leads no funil</h2>
        <span className="text-xs font-black text-gray-400">{runs.length} registros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[10px] font-black uppercase text-gray-400">
              <th className="py-3 pr-4">Lead</th>
              <th className="py-3 pr-4">Campanha</th>
              <th className="py-3 pr-4">Agente</th>
              <th className="py-3 pr-4">Score</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Mensagem inicial</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr key={run.id} className="align-top border-b border-gray-50">
                <td className="py-4 pr-4">
                  <p className="font-black text-gray-900">{run.leadName}</p>
                  <p className="text-xs text-gray-400">{run.leadPhone || 'Sem WhatsApp'}</p>
                </td>
                <td className="py-4 pr-4 text-xs font-bold text-gray-600">{formatCampaign(run)}</td>
                <td className="py-4 pr-4">
                  <p className="font-bold text-gray-800">{run.qualification?.campaign?.agentName || run.stage?.agentName || '-'}</p>
                  <p className="text-xs font-bold text-emerald-700">{run.stage?.name || '-'}</p>
                </td>
                <td className="py-4 pr-4"><span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-black text-gray-700">{run.score}%</span></td>
                <td className="py-4 pr-4"><span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{statusLabels[run.status] || run.status}</span></td>
                <td className="max-w-md py-4 pr-4 text-xs leading-relaxed text-gray-500">{run.firstMessage || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && <div className="py-12 text-center text-sm font-bold text-gray-500">Nenhum lead enviado ao funil ainda.</div>}
      </div>
    </section>
  );
}

function QueuePanel({ attempts }: { attempts: DispatchAttempt[] }) {
  const toneFor = (status: string) => {
    if (status === 'sent') return 'bg-emerald-50 text-emerald-700';
    if (status === 'failed' || status === 'blocked') return 'bg-red-50 text-red-700';
    if (status === 'skipped') return 'bg-amber-50 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-black text-gray-900">Fila e tentativas WhatsMeow</h2>
        <span className="text-xs font-black text-gray-400">{attempts.length} eventos recentes</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[10px] font-black uppercase text-gray-400">
              <th className="py-3 pr-4">Quando</th>
              <th className="py-3 pr-4">Telefone</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Mensagem</th>
              <th className="py-3 pr-4">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map(attempt => (
              <tr key={attempt.id} className="align-top border-b border-gray-50">
                <td className="whitespace-nowrap py-4 pr-4 text-xs font-bold text-gray-500">{new Date(attempt.sentAt || attempt.createdAt).toLocaleString('pt-BR')}</td>
                <td className="py-4 pr-4">
                  <p className="font-black text-gray-900">{attempt.displayPhone || attempt.phone || '-'}</p>
                  <p className="text-[10px] font-bold text-gray-400">{attempt.bridgeMessageId || attempt.channelId || '-'}</p>
                </td>
                <td className="py-4 pr-4">
                  <span className={`rounded-lg px-2 py-1 text-xs font-black ${toneFor(attempt.status)}`}>{attemptStatusLabels[attempt.status] || attempt.status}</span>
                </td>
                <td className="max-w-lg py-4 pr-4 text-xs leading-relaxed text-gray-600">{attempt.message || '-'}</td>
                <td className="max-w-sm py-4 pr-4 text-xs font-bold text-gray-500">{attempt.reason || attempt.metadata?.kind || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {attempts.length === 0 && <div className="py-12 text-center text-sm font-bold text-gray-500">Nenhuma tentativa registrada ainda.</div>}
      </div>
    </section>
  );
}

function MessagesPanel(props: {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  reply: string;
  sending: boolean;
  onReplyChange: (value: string) => void;
  onOpenConversation: (conversation: Conversation) => void;
  onSendReply: () => void;
}) {
  return (
    <div className="grid min-h-[650px] grid-cols-1 gap-5 xl:grid-cols-[390px_1fr]">
      <section className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <h2 className="text-sm font-black uppercase text-gray-400">Mensagens da prospeccao</h2>
        </div>
        <div className="max-h-[700px] overflow-y-auto">
          {props.conversations.map(conversation => (
            <button key={conversation.id} onClick={() => props.onOpenConversation(conversation)} className={`flex w-full items-center gap-3 border-b border-gray-50 p-4 text-left hover:bg-emerald-50/40 ${props.selectedConversation?.id === conversation.id ? 'bg-emerald-50' : ''}`}>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><MessageCircle size={20} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-gray-950">{conversation.metadata?.displayName || conversation.subject || 'Contato WhatsApp'}</p>
                <p className="truncate text-xs font-medium text-gray-500">{conversation.messages?.[0]?.content || 'Sem mensagem'}</p>
                <p className="mt-1 truncate text-[10px] font-bold text-gray-400">{conversation.metadata?.displayPhone || conversation.contactId}</p>
              </div>
              <span className="text-[10px] font-bold text-gray-400">{conversation._count?.messages || 0}</span>
            </button>
          ))}
          {props.conversations.length === 0 && <p className="p-6 text-center text-sm font-bold text-gray-400">Nenhuma conversa de prospeccao sincronizada.</p>}
        </div>
      </section>

      <section className="flex overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        {props.selectedConversation ? (
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div>
                <p className="font-black text-gray-950">{props.selectedConversation.metadata?.displayName || props.selectedConversation.subject}</p>
                <p className="text-xs font-bold text-gray-400">{props.selectedConversation.metadata?.displayPhone || props.selectedConversation.contactId}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-700"><Bot size={12} /> Funil IA</span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/60 p-5">
              {props.messages.map(message => {
                const fromMe = message.senderType === 'USER' || message.metadata?.fromMe;
                return (
                  <div key={message.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[72%] rounded-lg px-4 py-3 shadow-sm ${fromMe ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800'}`}>
                      <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{message.content || message.metadata?.fileName || '-'}</p>
                      <p className="mt-2 text-[10px] font-bold opacity-60">{new Date(message.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 border-t border-gray-100 p-4">
              <textarea value={props.reply} onChange={(event) => props.onReplyChange(event.target.value)} placeholder="Responder pelo WhatsApp conectado..." className="min-h-[48px] flex-1 resize-none rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100" />
              <button onClick={props.onSendReply} disabled={props.sending || !props.reply.trim()} className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white disabled:opacity-50">
                {props.sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-gray-400">
            <CheckCircle2 size={42} />
            <p className="text-sm font-black">Selecione uma conversa</p>
          </div>
        )}
      </section>
    </div>
  );
}

function AgentsPanel({ agents, selectedId, onSelect }: { agents: ProspectingAgent[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {agents.map(agent => (
        <button key={agent.id} onClick={() => onSelect(agent.id)} className={`rounded-lg border p-4 text-left shadow-sm transition-all ${selectedId === agent.id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-white hover:border-emerald-100'}`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm"><Bot size={20} /></div>
            {selectedId === agent.id && <CheckCircle2 size={18} className="text-emerald-700" />}
          </div>
          <p className="text-[10px] font-black uppercase text-gray-400">{agent.stage}</p>
          <h3 className="mt-1 font-black text-gray-950">{agent.name}</h3>
          <p className="mt-2 text-xs font-medium leading-relaxed text-gray-500">{agent.role}</p>
          <span className="mt-3 inline-flex rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black uppercase text-gray-500">{agent.tone}</span>
        </button>
      ))}
    </section>
  );
}

function RulesPanel() {
  const rules = [
    'Nunca dizer que somos agencia no primeiro contato.',
    'Nunca abrir falando de marketing, presenca digital, solucao digital, diagnostico, tecnologia, clientes ou avaliacao.',
    'A primeira mensagem deve localizar socio, proprietario, administrador ou responsavel comercial.',
    'Uma pergunta por mensagem, tom humano e direto.',
    'Respeitar opt-out e palavras de parada.',
    'Transferir para humano apenas quando houver abertura clara ou decisor localizado.'
  ];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-black text-gray-950"><ShieldCheck size={18} className="text-emerald-600" /> Regras de abordagem</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {rules.map(rule => <div key={rule} className="rounded-lg bg-gray-50 px-3 py-3 text-sm font-bold text-gray-600">{rule}</div>)}
        </div>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase text-emerald-700">Mensagem segura</p>
        <p className="mt-3 text-lg font-black leading-snug text-emerald-950">Oi, tudo bem? Poderia me ajudar a falar com o socio, proprietario ou responsavel pelo comercial da empresa?</p>
      </div>
    </section>
  );
}

function RunCard({ run }: { run: Run }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-gray-900">{run.leadName}</p>
          <p className="truncate text-[11px] font-bold text-gray-400">{run.leadPhone || 'Sem WhatsApp'}</p>
        </div>
        <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-gray-600">{run.score}%</span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-500">{run.firstMessage || '-'}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{statusLabels[run.status] || run.status}</span>
        <span className="text-[10px] font-bold text-gray-400">{run.qualification?.campaign?.agentName || run.stage?.agentName || '-'}</span>
      </div>
    </div>
  );
}

function TopField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`space-y-1.5 ${className || ''}`}>
      <span className="text-[10px] font-black uppercase text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function FormInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] font-black uppercase text-gray-400">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" />
    </label>
  );
}

function FormTextarea({ label, value, onChange, className, minHeight = 'min-h-24' }: { label: string; value: string; onChange: (value: string) => void; className?: string; minHeight?: string }) {
  return (
    <label className={`space-y-1.5 ${className || ''}`}>
      <span className="text-[10px] font-black uppercase text-gray-400">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className={`${minHeight} w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-100`} />
    </label>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
      <Icon size={18} className="mt-0.5 text-emerald-600" />
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
        <p className="text-sm font-bold text-gray-700">{value}</p>
      </div>
    </div>
  );
}

function MiniInfo({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
        <Icon size={13} className="text-emerald-600" />
        {label}
      </div>
      <p className="line-clamp-2 text-xs font-bold leading-relaxed text-gray-700">{value}</p>
    </div>
  );
}

function MessagePreview({ icon: Icon, label, text }: { icon: any; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
        <Icon size={13} className="text-emerald-600" />
        {label}
      </div>
      <p className="text-sm font-medium leading-relaxed text-gray-700">{text || '-'}</p>
    </div>
  );
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black ${active ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
      <Icon size={15} />
      {label}
    </button>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: React.ReactNode; tone: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700'
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
}

async function readApiArray<T>(response: Response, fallbackMessage: string): Promise<T[]> {
  if (!response.ok) {
    try {
      const data = await readJsonResponse<{ error?: string; message?: string }>(response, fallbackMessage);
      throw new Error(data.message || data.error || fallbackMessage);
    } catch (error) {
      if (error instanceof Error && error.message !== fallbackMessage) throw error;
      throw new Error(fallbackMessage);
    }
  }

  return readJsonResponse<T[]>(response, fallbackMessage);
}
