import { PrismaClient } from "@prisma/client";
import { runGovernedAiText } from "../services/aiExecution.js";
import { convertProspectingRunToCrm } from "../services/prospectingCrm.js";
import {
  detectOptOut,
  ensureOptOut,
  getFunnelRuntimeConfig,
  isInsideBusinessHours,
  mergeProspectingAgentMemory,
  normalizeText,
} from "../services/prospectingAutomation.js";
import { OutboundDispatcherService } from "../services/outboundDispatcher.js";
import { logger } from "../utils/logger.js";
import { mutex } from "../utils/concurrency.js";

const DEFAULT_BUFFER_MS = 12000;

// Termos proibidos - NUNCA mencionar
const ABSOLUTELY_FORBIDDEN_TERMS = [
  "agencia",
  "agência",
  "marketing",
  "marketing digital",
  "trafego pago",
  "tráfego pago",
  "anúncio",
  "anuncio",
  "facebook ads",
  "google ads",
  "instagram ads",
  "presença digital",
  "presenca digital",
  "presença online",
  "presenca online",
  "soluções digitais",
  "solucao digital",
  "digital marketing",
  "impulsionamento",
  "boost",
  "promoção paga",
  "promocao paga",
  "midia paga",
  " mídia paga",
  "investimento em mídia",
  "investimento em midia",
  "orçamento para anúncios",
  "orcamento para anuncios",
  "captar clientes",
  "atrair clientes",
  "gerar leads",
  "funil de vendas",
  "diagnóstico",
  "diagnostico",
  "avaliação gratuita",
  "avaliacao gratuita",
  "auditoria digital",
  "análise gratuita",
  "analise gratuita",
];

function asRecord(value: any): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pendingMessages(qualification: any) {
  const messages = Array.isArray(qualification?.pendingInboundMessages)
    ? qualification.pendingInboundMessages
    : [];
  return messages
    .map((item: any) => String(item?.text || "").trim())
    .filter(Boolean);
}

function bufferReady(qualification: any, now = new Date()) {
  const bufferedUntil = qualification?.bufferedUntil ? new Date(qualification.bufferedUntil) : null;
  if (bufferedUntil && !Number.isNaN(bufferedUntil.getTime())) return bufferedUntil <= now;
  return true;
}

// Extrair informações que o lead fornece na mensagem
function extractLeadInfo(text: string): { name?: string; phone?: string; email?: string; role?: string } {
  const result: { name?: string; phone?: string; email?: string; role?: string } = {};

  // Extrair nome (padrões comuns)
  const namePatterns = [
    /(?:meu nome é|me chamo|sou o|sou a|aqui é o|aqui é a|meu nome e)\s+([A-ZÁÉÍÓÚÃÕÇ][a-záéíóúãõç]+(?:\s+[A-ZÁÉÍÓÚÃÕÇ][a-záéíóúãõç]+){0,2})/i,
    /(?:nome[:\s]+)([A-ZÁÉÍÓÚÃÕÇ][a-záéíóúãõç]+(?:\s+[A-ZÁÉÍÓÚÃÕÇ][a-záéíóúãõç]+){0,2})/i,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.name = match[1].trim();
      break;
    }
  }

  // Extrair telefone
  const phonePatterns = [
    /(?:telefone[:\s]+|celular[:\s]+|número[:\s]+|numero[:\s]+|lig(?:ar)?(?:mos)?(?:\s+no)?[:\s]+|whatsapp[:\s]+)?(\(?\d{2}\)?\s*\d{4,5}[\s-]?\d{4})/i,
    /(\d{2}\s*\d{4,5}\s*\d{4})/,
    /(\(?\d{2}\)?\s*9?\s*\d{4}[\s-]?\d{4})/,
  ];
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/\D/g, "");
      if (cleaned.length >= 10) {
        result.phone = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
        break;
      }
    }
  }

  // Extrair email
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    result.email = emailMatch[1];
  }

  // Extrair cargo/função
  const rolePatterns = [
    /(?:sou |meu cargo é |trabalho como |atuo como |minha função é )([\w\s]+?)(?:\.|,|!|\?|$)/i,
    /(?:cargo[:\s]+)([\w\s]+?)(?:\.|,|!|\?|$)/i,
  ];
  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.role = match[1].trim();
      break;
    }
  }

  return result;
}

// Verificar se a resposta contém termos proibidos
function containsForbiddenTerms(text: string): boolean {
  const normalized = normalizeText(text);
  return ABSOLUTELY_FORBIDDEN_TERMS.some((term) => normalized.includes(normalizeText(term)));
}

// Detectar se o lead informou que é o responsável/decisor
function detectIfDecisionMaker(text: string): boolean {
  const normalized = normalizeText(text);
  const decisionTerms = [
    "sou eu",
    "eu cuido",
    "eu sou",
    "sou o dono",
    "sou a dona",
    "sou proprietário",
    "sou proprietaria",
    "sócio",
    "socio",
    "dono da",
    "dono",
    "responsável",
    "responsavel",
    "eu decido",
    "decido",
    "minha empresa",
    "meu negócio",
    "meu negocio",
    "gerente",
    "diretor",
    "ceo",
    "admin",
  ];
  return decisionTerms.some((term) => normalized.includes(term));
}

function detectIntent(text: string, scheduleTriggerPhrases: string[] = []) {
  const normalized = normalizeText(text);
  const handoffTerms = [
    "pode me ligar",
    "me chama",
    "tenho interesse",
    "quero entender",
    "manda valores",
    "me passa valores",
    "sou eu",
    "eu cuido",
    "sou responsavel",
    "sou o responsavel",
    "sou proprietario",
    "sou socio",
    "sou o dono",
    "dono da empresa",
    "minha empresa",
    "agenda",
    "reuniao",
    "call",
    "quero fechar",
    "bora fechar",
    "vamos fechar",
    "fechar contrato",
    "quero contratar",
    "vamos combinar",
    "pode enviar",
    "manda proposta",
    ...scheduleTriggerPhrases,
  ];
  const meetingTerms = ["agenda", "reuniao", "call", "horario", "amanha", "hoje a tarde", "amanhã", ...scheduleTriggerPhrases];
  return {
    wantsHuman: handoffTerms.some((term) => normalized.includes(normalizeText(term))),
    wantsMeeting: meetingTerms.some((term) => normalized.includes(normalizeText(term))),
  };
}

function stripControlTags(text: string) {
  return text
    .replace(/\[HANDOFF\]/gi, "")
    .replace(/\[MEETING\]/gi, "")
    .replace(/\[STOP\]/gi, "")
    .trim();
}

function parseSuggestedMeetingDate(text: string, now = new Date()) {
  const normalized = normalizeText(text);
  const timeMatch = normalized.match(/\b(?:as|para|por volta de)\s*(\d{1,2})(?::|h)?(\d{2})?\b|\b(\d{1,2})(?::(\d{2})|h(\d{2})?)\b/);
  if (!timeMatch) return null;

  const hour = Number(timeMatch[1] || timeMatch[3]);
  const minute = Number(timeMatch[2] || timeMatch[4] || timeMatch[5] || 0);
  if (hour < 7 || hour > 21 || minute < 0 || minute > 59) return null;

  const date = new Date(now);
  date.setSeconds(0, 0);

  const weekdays: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
  };

  if (normalized.includes("amanha")) {
    date.setDate(date.getDate() + 1);
  } else {
    const weekday = Object.entries(weekdays).find(([name]) => normalized.includes(name));
    if (weekday) {
      const target = weekday[1];
      const diff = (target - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + diff);
    }
  }

  date.setHours(hour, minute, 0, 0);
  if (date <= now) date.setDate(date.getDate() + 1);
  return date;
}

export class SdrAgentWorker {
  private prisma: PrismaClient;
  private running = false;
  private processing = false;
  private interval: NodeJS.Timeout | null = null;
  private dispatcher: OutboundDispatcherService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.dispatcher = new OutboundDispatcherService(prisma);
  }

  start(intervalMs = Number(process.env.PROSPECTING_SDR_INTERVAL_MS || 15000)) {
    if (this.running) return;
    this.running = true;
    logger.info("SdrAgentWorker", `iniciado. Intervalo: ${intervalMs}ms.`);
    this.interval = setInterval(() => this.processActiveRuns(), intervalMs);
  }

  stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.info("SdrAgentWorker", "parado.");
  }

  get isProcessing(): boolean { return this.processing; }

  private async processActiveRuns() {
    if (!this.running || this.processing) return;
    this.processing = true;

    await mutex.acquire("sdr-agent-worker", async () => {
      try {
        const now = new Date();
        const runs = await this.prisma.prospectingRun.findMany({
          where: {
            status: "active",
            nextAction: { in: ["lead_replied_buffering", "lead_replied_continue_agent"] },
          },
          include: { funnel: { include: { stages: { orderBy: { order: "asc" } } } }, stage: true },
          orderBy: { updatedAt: "asc" },
          take: Number(process.env.PROSPECTING_SDR_BATCH_SIZE || 5),
        });

        for (const run of runs) {
          const qualification = asRecord(run.qualification);
          if (run.nextAction === "lead_replied_buffering" && !bufferReady(qualification, now)) continue;
          await this.handleAgentResponse(run);
        }
      } catch (error: any) {
        logger.error("SdrAgentWorker", "erro ao processar fila", { error: error?.message || error });
      } finally {
        this.processing = false;
      }
    });
  }

  private async buildAiResponse(run: any, leadMessage: string, intent: { wantsHuman: boolean; wantsMeeting: boolean }, runtimeConfig = getFunnelRuntimeConfig(run.funnel)) {
    if (!run.organizationId) {
      if (intent.wantsHuman) return `[HANDOFF] ${runtimeConfig.handoffMessage}`;
      return "Entendi. Voce e a pessoa que cuida das decisoes comerciais, ou existe alguem melhor para eu falar sobre isso?";
    }

    const memory = asRecord(run.qualification);
    const playbook = asRecord(memory.playbook);
    const agentMemory = asRecord(memory.agentMemory);
    const conversationContext = agentMemory.nextAgentContext || agentMemory.handoffContext || "Sem contexto previo.";
    const history = (Array.isArray(agentMemory.conversationHistory) ? agentMemory.conversationHistory : [])
      .slice(-8)
      .map((item: any) => [
        item.aiMessage ? `[SDR]: ${item.aiMessage}` : null,
        item.leadMessage ? `[Lead]: ${item.leadMessage}` : null,
      ].filter(Boolean).join("\n"))
      .filter(Boolean)
      .join("\n");

    // Extrair informações que o lead forneceu
    const leadInfo = extractLeadInfo(leadMessage);
    const leadInfoText = [
      leadInfo.name ? `Nome informado pelo lead: ${leadInfo.name}` : null,
      leadInfo.phone ? `Telefone informado: ${leadInfo.phone}` : null,
      leadInfo.email ? `Email informado: ${leadInfo.email}` : null,
      leadInfo.role ? `Cargo informado: ${leadInfo.role}` : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = [
      "Voce e um SDR B2B da Nexus/Consultio em uma conversa de WhatsApp.",
      "Objetivo: localizar o decisor comercial (DONO, PROPRIETARIO, SOCIO, RESPONSAVEL COMERCIAL), entender abertura e encaminhar para humano quando houver interesse real.",
      "",
      "⚠️ REGRAS ABSOLUTAS - VIOLAÇÃO IMEDIATA SE QUEBRAR:",
      "- NUNCA mencione que somos agencia, consultoria de marketing, ou que vendemos trafego pago.",
      "- NUNCA fale sobre marketing, marketing digital, presenca digital, presenca online, anuncios, google ads, facebook ads, instagram ads.",
      "- NUNCA fale sobre diagnostico, avaliacao, auditoria ou analise gratuita.",
      "- NUNCA use termos como 'solucoes digitais', 'impulsionamento', 'captacao de clientes', 'gerar leads'.",
      "- NUNCA mencione que fazemos trabalho de agencia.",
      "",
      "O QUE PODE FALAR:",
      "- 'Estrutura comercial' - ajudar empresas a organizar vendas",
      "- 'Entrada de oportunidades' - como novos clientes chegam",
      "- 'Processo comercial' - como vender mais e melhor",
      "- 'Crescimento do negocio' - expandir faturamento",
      "- 'Organizar o comercial' - colocar ordem nas vendas",
      "",
      "PERFIL DO DECISOR QUE PROCURAMOS:",
      `- Quem procurar: ${runtimeConfig.targetRoleLabel}.`,
      `- Evitar: ${Array.isArray(playbook.avoidDepartments) ? playbook.avoidDepartments.join(", ") : "marketing, social media, departamento de marketing"}.`,
      "",
      "COLETA DE DADOS DO LEAD (IMPORTANTE):",
      "- Se o lead informar o NOME dele, salve e confirme: 'Certo [nome], vou registrar aqui'.",
      "- Se o lead informar TELEFONE adicional, salve e confirme: 'Perfeito, anotei o numero'.",
      "- Se o lead informar EMAIL, salve: 'Beleza, anotei seu email'.",
      "- Se o lead informar CARGO ou FUNCAO, registre: 'Entao voce que cuida disso, certo?'.",
      "- Se o lead disser que e o DONO/SOCIO/PROPRIETARIO, confirme imediatamente e pule para qualificacao.",
      "- SEMPRE registre essas informacoes na memoria da conversa.",
      "",
      "Regras obrigatorias:",
      "- Responda apenas com a mensagem final para WhatsApp.",
      "- Use no maximo 3 linhas.",
      "- Faca uma pergunta por vez.",
      "- Nao prometa resultado.",
      "- Nao force reuniao.",
      "- Nao fale como robo.",
      "- Se o lead demonstrar interesse REAL, pedir valores, pedir ligacao, disser que e decisor ou quiser agenda, comece com [HANDOFF].",
      "- Se o lead sugerir data e horario para call, comece com [MEETING].",
      "- Se o lead pedir para parar/remover/cancelar, comece com [STOP].",
      "- Se ainda nao estiver claro quem decide, pergunte quem cuida das decisoes comerciais.",
      "- Se o lead disser 'quero fechar', 'bora fechar', 'vamos fechar', 'quero contratar', 'manda proposta' → HOFF IMEDIATO.",
      "",
      `Posicionamento: ${playbook.positioning || "estrutura comercial e implementacao comercial"}.`,
      "",
      `Contexto:\n${conversationContext}`,
      "",
      leadInfoText ? `Informacoes ja coletadas do lead:\n${leadInfoText}` : "",
      "",
      `Historico:\n${history || "Sem historico recente."}`,
      "",
      `Mensagem recebida agora:\n${leadMessage}`,
    ].join("\n");

    try {
      const result = await runGovernedAiText(this.prisma, {
        system: systemPrompt,
        message: leadMessage,
        model: process.env.AI_CORE_SDR_MODEL || "gpt-4o-mini",
        temperature: 0.35,
        maxTokens: 220,
        organizationId: run.organizationId,
        agentKey: "sdr-agent",
      });

      let response = result.result.response.trim();

      // Verificar se a resposta contém termos proibidos
      if (containsForbiddenTerms(response)) {
        logger.warn("SdrAgentWorker", "Resposta contém termos proibidos, regenerando", {
          response: response.substring(0, 100),
        });
        // Forçar resposta segura
        response = "Entendi. Voce e a pessoa que cuida das decisoes comerciais, ou existe alguem melhor para eu falar sobre isso?";
      }

      return response;
    } catch {
      if (intent.wantsHuman) return `[HANDOFF] ${runtimeConfig.handoffMessage}`;
      return "Entendi. Voce e a pessoa que cuida das decisoes comerciais, ou existe alguem melhor para eu falar sobre isso?";
    }
  }

  private async handleAgentResponse(run: any) {
    const locked = await this.prisma.prospectingRun.updateMany({
      where: {
        id: run.id,
        status: "active",
        nextAction: run.nextAction,
      },
      data: { nextAction: "processing_ai" },
    });
    if (locked.count === 0) return;

    try {
      const qualification = asRecord(run.qualification);
      const runtimeConfig = getFunnelRuntimeConfig(run.funnel);
      const bufferedMessages = pendingMessages(qualification);
      const leadMessage = bufferedMessages.length
        ? bufferedMessages.join("\n")
        : String(qualification.lastLeadMessage || "").trim();
      const intent = detectIntent(leadMessage, runtimeConfig.scheduleTriggerPhrases);
      const optedOut = detectOptOut(leadMessage, runtimeConfig.stopWords);
      const lastConversationId = qualification.lastConversationId || qualification.agentMemory?.conversationHistory?.slice(-1)?.[0]?.conversationId || null;
      const lastMessageId = qualification.lastMessageId || qualification.agentMemory?.conversationHistory?.slice(-1)?.[0]?.messageId || null;

      // Extrair e salvar informações que o lead forneceu
      const leadInfo = extractLeadInfo(leadMessage);
      if (leadInfo.name || leadInfo.phone || leadInfo.email || leadInfo.role) {
        await this.saveLeadInfoToCard(run, leadInfo);
      }

      if (optedOut) {
        await ensureOptOut(this.prisma, {
          organizationId: run.organizationId,
          phone: run.leadPhone,
          reason: leadMessage,
          source: "sdr_agent",
          conversationId: lastConversationId,
          messageId: lastMessageId,
          metadata: { prospectingRunId: run.id },
        });
        await this.prisma.prospectingRun.update({
          where: { id: run.id },
          data: {
            status: "stopped",
            nextAction: "opt_out_received",
            qualification: {
              ...mergeProspectingAgentMemory(qualification, {
                currentStage: run.stage,
                nextStage: run.stage,
                leadMessage,
                intent: "opt_out",
                status: "stopped",
                nextAction: "opt_out_received",
                summary: "Lead pediu para interromper o contato.",
                conversationId: lastConversationId,
                messageId: lastMessageId,
              }),
              pendingInboundMessages: [],
              bufferedUntil: null,
              optOut: true,
            },
          },
        });
        return;
      }

      let aiResponse = await this.buildAiResponse(run, leadMessage, intent, runtimeConfig).catch((error: any) => {
        logger.warn("SdrAgentWorker", "IA indisponivel", { error: error?.message || error });
        return intent.wantsHuman
          ? `[HANDOFF] ${runtimeConfig.handoffMessage}`
          : "Entendi. Voce e a pessoa que cuida das decisoes comerciais, ou existe alguem melhor para eu falar sobre isso?";
      });

      const aiRequestedStop = /\[STOP\]/i.test(aiResponse);
      const aiRequestedMeeting = /\[MEETING\]/i.test(aiResponse);
      const aiRequestedHandoff = /\[HANDOFF\]|\[MEETING\]/i.test(aiResponse);
      aiResponse = stripControlTags(aiResponse);
      if (!aiResponse) aiResponse = runtimeConfig.handoffMessage;
      const shouldHandoff = intent.wantsHuman || intent.wantsMeeting || aiRequestedHandoff;
      const meetingStartDate = (intent.wantsMeeting || aiRequestedMeeting) ? parseSuggestedMeetingDate(leadMessage) : null;

      if (aiRequestedStop) {
        await ensureOptOut(this.prisma, {
          organizationId: run.organizationId,
          phone: run.leadPhone,
          reason: leadMessage,
          source: "sdr_agent_ai",
          conversationId: lastConversationId,
          messageId: lastMessageId,
          metadata: { prospectingRunId: run.id },
        });
        await this.prisma.prospectingRun.update({
          where: { id: run.id },
          data: { status: "stopped", nextAction: "opt_out_received" },
        });
        return;
      }

      if (!isInsideBusinessHours(runtimeConfig.businessHours)) {
        await this.prisma.prospectingRun.update({
          where: { id: run.id },
          data: {
            nextAction: "lead_replied_continue_agent",
            qualification: {
              ...qualification,
              pendingInboundMessages: bufferedMessages.map((text: string) => ({ text, receivedAt: new Date().toISOString() })),
              bufferedUntil: new Date(Date.now() + DEFAULT_BUFFER_MS).toISOString(),
              lastDelayReason: `Fora do horario comercial (${runtimeConfig.businessHours})`,
            },
          },
        });
        return;
      }

      const delayMs = Number(process.env.PROSPECTING_SDR_SEND_DELAY_MS || 5000);
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));

      const dispatch = await this.dispatcher.dispatchText({
        organizationId: run.organizationId,
        userId: null,
        channelId: qualification?.campaign?.channelId || undefined,
        contact: { name: run.leadName, phone: run.leadPhone },
        message: aiResponse,
        ia: false,
        source: "nexus_sdr_agent",
        metadata: { prospectingRunId: run.id, lastConversationId },
      });

      const nextAction = shouldHandoff ? "human_handoff" : "wait_lead_reply";
      const status = shouldHandoff ? "human_handoff" : "active";
      const summary = shouldHandoff
        ? "Lead demonstrou abertura e foi encaminhado para atendimento humano."
        : "SDR IA respondeu e aguarda nova mensagem do lead.";

      const updatedQualification = {
        ...mergeProspectingAgentMemory(qualification, {
          currentStage: run.stage,
          nextStage: run.stage,
          leadMessage,
          aiMessage: aiResponse,
          intent: shouldHandoff ? "human_handoff" : "continue_qualification",
          status,
          nextAction,
          summary,
          conversationId: dispatch.conversationId || lastConversationId,
          messageId: dispatch.messageId,
        }),
        pendingInboundMessages: [],
        bufferedUntil: null,
        lastConversationId: dispatch.conversationId || lastConversationId,
        lastMessageId: dispatch.messageId,
      };

      await this.prisma.prospectingRun.update({
        where: { id: run.id },
        data: {
          status,
          nextAction,
          lastContactAt: new Date(),
          lastAiSummary: summary,
          handedOffAt: shouldHandoff ? new Date() : undefined,
          qualification: updatedQualification,
        },
      });

      // Registrar a conversa no card do lead
      await this.logConversation(run.id, leadMessage, aiResponse, shouldHandoff ? "handoff" : "continuing");

      if (shouldHandoff) {
        await convertProspectingRunToCrm(this.prisma, { ...run, qualification: updatedQualification }, {
          reason: meetingStartDate ? "lead_agendou_call" : intent.wantsMeeting ? "lead_pediu_agenda" : "lead_demonstrou_interesse",
          summary,
          conversationId: dispatch.conversationId || lastConversationId,
          meetingStartDate,
          durationMinutes: qualification?.campaign?.meetingDurationMinutes || runtimeConfig.meetingDurationMinutes,
        }).catch((error: any) => {
          logger.error("SdrAgentWorker", "falha ao converter para CRM", { error: error?.message || error });
        });
      }
    } catch (err: any) {
      logger.error("SdrAgentWorker", "erro critico no handler", { error: err?.message || err });
      await this.prisma.prospectingRun.update({
        where: { id: run.id },
        data: { nextAction: "lead_replied_continue_agent" },
      }).catch(() => {});
    }
  }

  private async saveLeadInfoToCard(run: any, leadInfo: { name?: string; phone?: string; email?: string; role?: string }) {
    try {
      const capturedLeadId = run.capturedLeadId;
      if (!capturedLeadId) return;

      const updateData: any = {};
      const metadataUpdates: any = {};

      if (leadInfo.name) {
        // Atualizar nome se não tem ou se o lead está se identificando
        updateData.leadName = leadInfo.name;
        metadataUpdates.leadRealName = leadInfo.name;
      }

      if (leadInfo.phone) {
        metadataUpdates.additionalPhone = leadInfo.phone;
      }

      if (leadInfo.email) {
        metadataUpdates.leadEmail = leadInfo.email;
      }

      if (leadInfo.role) {
        metadataUpdates.leadRole = leadInfo.role;
      }

      // Atualizar capturedLead
      if (Object.keys(updateData).length > 0) {
        await this.prisma.prospectingRun.update({
          where: { id: run.id },
          data: updateData,
        });
      }

      // Atualizar dados extras na qualification
      const qualification = asRecord(run.qualification);
      const existingCollected = asRecord(qualification.collectedLeadInfo);
      await this.prisma.prospectingRun.update({
        where: { id: run.id },
        data: {
          qualification: {
            ...qualification,
            collectedLeadInfo: {
              ...existingCollected,
              ...metadataUpdates,
              collectedAt: new Date().toISOString(),
            },
          },
        },
      });

      logger.info("SdrAgentWorker", "Dados do lead salvos no card", {
        runId: run.id,
        name: leadInfo.name,
        phone: leadInfo.phone,
        email: leadInfo.email,
        role: leadInfo.role,
      });
    } catch (error: any) {
      logger.warn("SdrAgentWorker", "Erro ao salvar dados do lead", { error: error?.message });
    }
  }

  private async logConversation(runId: string, leadMessage: string, aiMessage: string, status: string) {
    try {
      const run = await this.prisma.prospectingRun.findUnique({
        where: { id: runId },
        select: { qualification: true },
      });

      if (!run) return;

      const qualification = asRecord(run.qualification);
      const conversationLog = Array.isArray(qualification.conversationLog)
        ? qualification.conversationLog
        : [];

      conversationLog.push({
        timestamp: new Date().toISOString(),
        leadMessage,
        aiMessage,
        status,
      });

      // Manter apenas os últimos 50 registros
      const trimmedLog = conversationLog.slice(-50);

      await this.prisma.prospectingRun.update({
        where: { id: runId },
        data: {
          qualification: {
            ...qualification,
            conversationLog: trimmedLog,
          },
        },
      });
    } catch (error: any) {
      logger.warn("SdrAgentWorker", "Erro ao registrar conversa", { error: error?.message });
    }
  }
}
