import { PrismaClient } from "@prisma/client";

type AgencyBootstrapInput = {
  organizationId: string;
  userId?: string | null;
  businessName: string;
  businessType?: string | null;
  targetAudience?: string | null;
  services: string[];
  deliveryProcess?: string | null;
};

type WhatsappTaskInput = {
  organizationId: string;
  conversationId: string;
  messageId: string;
  leadId?: string | null;
  text?: string | null;
  mediaType?: string | null;
  fileUrl?: string | null;
  senderName?: string | null;
};

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "servico";
}

function cleanServiceName(value: unknown) {
  return String(value || "")
    .replace(/^[-*•\d.)\s]+/, "")
    .trim();
}

export function parseServices(input: unknown): string[] {
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map(cleanServiceName).filter(Boolean))).slice(0, 24);
  }
  return Array.from(new Set(String(input || "")
    .split(/\r?\n|,|;/)
    .map(cleanServiceName)
    .filter(Boolean))).slice(0, 24);
}

function defaultMarketingServices() {
  return [
    "Gestao de trafego pago",
    "Criacao de landing pages",
    "Prospeccao ativa BDR",
    "Qualificacao SDR",
    "Fechamento closer",
    "Criativos e copies",
    "Gestao de WhatsApp e follow-up",
    "Customer Success e relatorios",
  ];
}

function agentForService(service: string) {
  const normalized = normalizeKey(service);
  if (/trafego|ads|meta|google|bm|campanha/.test(normalized)) return "traffic-manager";
  if (/landing|pagina|site|captura/.test(normalized)) return "landing-builder";
  if (/prospec|bdr|lista|lead/.test(normalized)) return "bdr";
  if (/sdr|qualifica|whatsapp|follow/.test(normalized)) return "sdr";
  if (/closer|fech|proposta|contrato|venda/.test(normalized)) return "closer";
  if (/criativo|copy|conteudo|design|post|social/.test(normalized)) return "creative";
  if (/cs|sucesso|relatorio|retenc|onboarding/.test(normalized)) return "cs";
  return "ops";
}

const CORE_AGENTS = [
  {
    key: "cto",
    name: "CTO Autonomo",
    description: "Supervisiona todos os agentes, arquitetura operacional, filas, qualidade, WhatsApp e execucao.",
    prompt: "Voce e o CTO da operacao autonoma. Coordene agentes, revise riscos, destrave execucoes e mantenha rastreabilidade.",
    role: "CTO",
  },
  {
    key: "bdr",
    name: "BDR Autonomo",
    description: "Cria listas, pesquisa mercado, prepara abordagens e abre oportunidades.",
    prompt: "Voce e um BDR. Transforme objetivos em listas, fontes de leads e primeiras abordagens.",
    role: "BDR",
  },
  {
    key: "sdr",
    name: "SDR Autonomo",
    description: "Qualifica conversas de WhatsApp, identifica decisor, dor, timing e encaminha oportunidades.",
    prompt: "Voce e um SDR consultivo. Qualifique com perguntas curtas, registre fatos e acione closer quando houver interesse.",
    role: "SDR",
  },
  {
    key: "closer",
    name: "Closer Autonomo",
    description: "Prepara fechamento, proposta, objeções e proximos passos.",
    prompt: "Voce e um closer consultivo. Organize contexto, proposta, objeções e plano de fechamento.",
    role: "CLOSER",
  },
  {
    key: "traffic-manager",
    name: "Gestor de Trafego Autonomo",
    description: "Gerencia BM, campanhas, tracking, verba, analise e otimizacoes.",
    prompt: "Voce gerencia trafego pago. Com BM/token valido, crie campanhas, revise metricas e gere melhorias.",
    role: "TRAFFIC",
  },
  {
    key: "landing-builder",
    name: "Builder de Landing Pages",
    description: "Cria paginas de captura, copy, formulario, UTM e publicacao.",
    prompt: "Voce cria landing pages orientadas a conversao, com formulario, copy clara e tracking.",
    role: "LANDING",
  },
  {
    key: "creative",
    name: "Criativo e Copy Autonomo",
    description: "Cria copies, criativos, posts, anuncios e materiais comerciais.",
    prompt: "Voce cria assets e textos de campanha com clareza, prova e CTA.",
    role: "CREATIVE",
  },
  {
    key: "cs",
    name: "CS Autonomo",
    description: "Cuida de onboarding, relatorios, retencao, renovacao e risco de churn.",
    prompt: "Voce monitora sucesso do cliente, entregas, expectativas, riscos e oportunidades de expansao.",
    role: "CS",
  },
  {
    key: "ops",
    name: "Ops Autonomo",
    description: "Transforma mensagens, audios e demandas em tarefas, entregaveis e rotinas.",
    prompt: "Voce e o operador da agencia. Organize demandas em tarefas executaveis, prazos e responsaveis.",
    role: "OPS",
  },
];

export async function bootstrapAgencyOperatingSystem(prisma: PrismaClient, input: AgencyBootstrapInput) {
  const services = input.services.length ? input.services : defaultMarketingServices();

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { settings: true },
  });
  const currentSettings = org?.settings && typeof org.settings === "object" && !Array.isArray(org.settings)
    ? org.settings as Record<string, any>
    : {};

  const cto = await prisma.aiAgent.upsert({
    where: { organizationId_key: { organizationId: input.organizationId, key: "cto" } },
    update: {
      name: "CTO Autonomo",
      description: CORE_AGENTS[0].description,
      systemPrompt: CORE_AGENTS[0].prompt,
      status: "active",
      tools: {
        role: "CTO",
        supervisesAllAgents: true,
        autonomy: "full_after_credentials",
        humanOnly: ["connect_ad_accounts", "validate_tokens"],
      },
    },
    create: {
      organizationId: input.organizationId,
      key: "cto",
      name: "CTO Autonomo",
      description: CORE_AGENTS[0].description,
      systemPrompt: CORE_AGENTS[0].prompt,
      status: "active",
      tools: {
        role: "CTO",
        supervisesAllAgents: true,
        autonomy: "full_after_credentials",
        humanOnly: ["connect_ad_accounts", "validate_tokens"],
      },
    },
  });

  const agents = [cto];
  for (const agent of CORE_AGENTS.slice(1)) {
    agents.push(await prisma.aiAgent.upsert({
      where: { organizationId_key: { organizationId: input.organizationId, key: agent.key } },
      update: {
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.prompt,
        status: "active",
        tools: {
          role: agent.role,
          reportsTo: "cto",
          reportsToId: cto.id,
          autonomy: "full_after_credentials",
          humanOnly: ["connect_ad_accounts", "validate_tokens"],
        },
      },
      create: {
        organizationId: input.organizationId,
        key: agent.key,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.prompt,
        status: "active",
        tools: {
          role: agent.role,
          reportsTo: "cto",
          reportsToId: cto.id,
          autonomy: "full_after_credentials",
          humanOnly: ["connect_ad_accounts", "validate_tokens"],
        },
      },
    }));
  }

  const serviceRecords = [];
  for (const serviceName of services) {
    const ownerAgent = agentForService(serviceName);
    const existing = await prisma.serviceCatalog.findFirst({
      where: { organizationId: input.organizationId, name: serviceName },
    });
    const payload = {
      description: `Servico operacionalizado por agente autonomo (${ownerAgent}) e supervisionado pelo CTO.`,
      category: "marketing",
      type: ownerAgent,
      estimatedHours: ownerAgent === "traffic-manager" ? 8 : ownerAgent === "landing-builder" ? 6 : 4,
      deliveryDays: ownerAgent === "traffic-manager" ? 7 : ownerAgent === "landing-builder" ? 3 : 2,
      requiresApproval: false,
      isActive: true,
    };
    serviceRecords.push(existing
      ? await prisma.serviceCatalog.update({ where: { id: existing.id }, data: payload })
      : await prisma.serviceCatalog.create({
          data: {
            organizationId: input.organizationId,
            name: serviceName,
            setupValue: 0,
            monthlyValue: 0,
            commissionValue: 0,
            ...payload,
          },
        }));
  }

  const automationName = "Nexus Autonomo - WhatsApp vira tarefa";
  const existingAutomation = await prisma.automation.findFirst({
    where: { organizationId: input.organizationId, name: automationName },
  });
  const automation = existingAutomation || await prisma.automation.create({
    data: {
      organizationId: input.organizationId,
      name: automationName,
      description: "Mensagens e audios de clientes no WhatsApp sao analisados e viram tarefas executaveis para os agentes.",
      triggerType: "whatsapp.message.received",
      triggerConfig: { source: "agency_operating_system" },
      actions: [
        { type: "create_task", params: { title: "Analisar nova demanda do WhatsApp", priority: "alta", daysAfter: 0 } },
      ],
    },
  });

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      name: input.businessName || undefined,
      businessType: input.businessType || "Agencia de Marketing",
      businessDescription: [
        `Empresa: ${input.businessName}`,
        `Tipo: ${input.businessType || "Agencia de Marketing"}`,
        input.targetAudience ? `Publico: ${input.targetAudience}` : null,
        input.deliveryProcess ? `Entrega: ${input.deliveryProcess}` : null,
        `Servicos: ${services.join(", ")}`,
      ].filter(Boolean).join("\n"),
      settings: {
        ...currentSettings,
        agencyOperatingSystem: {
          enabled: true,
          ctoAgentId: cto.id,
          services,
          humanOnly: ["connect_ad_accounts", "validate_tokens"],
          bootstrappedAt: new Date().toISOString(),
        },
      },
    },
  });

  await prisma.aiLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId || null,
      agentType: "agency-operating-system",
      prompt: `Bootstrap agencia: ${input.businessName}`,
      response: `Criados/atualizados ${agents.length} agentes, ${serviceRecords.length} servicos e automacao WhatsApp.`,
      model: "deterministic-agency-os-v1",
      success: true,
    },
  }).catch(() => null);

  return { cto, agents, services: serviceRecords, automation };
}

function serviceMatchesText(service: any, text: string) {
  const haystack = `${service.name} ${service.description || ""} ${service.type || ""}`.toLowerCase();
  return haystack
    .split(/\s+/)
    .filter((word: string) => word.length >= 5)
    .some((word: string) => text.includes(word));
}

function inferPriority(text: string, mediaType?: string | null) {
  if (/urgente|agora|hoje|pra ontem|problema|erro|reclam|parou|nao funciona/.test(text)) return "alta";
  if (mediaType === "audio") return "alta";
  return "media";
}

function inferTitle(text: string, mediaType?: string | null) {
  if (mediaType === "audio" && !text.trim()) return "Audio de cliente recebido: transcrever e executar demanda";
  if (/landing|pagina|site|captura/.test(text)) return "Criar ou ajustar landing page solicitada pelo cliente";
  if (/campanha|anuncio|ads|trafego|bm|meta|google/.test(text)) return "Executar demanda de campanha/trafego";
  if (/post|criativo|copy|arte|conteudo|reels|carrossel/.test(text)) return "Executar demanda de criativo/conteudo";
  if (/relatorio|resultado|metric|numero|leads|vendas/.test(text)) return "Preparar analise ou relatorio para cliente";
  if (/proposta|contrato|fechar|orcamento/.test(text)) return "Preparar demanda comercial/closer";
  return "Executar demanda recebida pelo WhatsApp";
}

function shouldCreateOperationalTask(text: string, mediaType?: string | null) {
  if (mediaType === "audio") return true;
  return /preciso|faz|fazer|cria|criar|ajust|alter|subir|public|campanha|landing|pagina|post|criativo|copy|relatorio|proposta|contrato|orcamento|reuniao|agenda|lead|cliente|whatsapp|tráfego|trafego|ads|bm|meta|google/.test(text);
}

export async function processWhatsappOperationalMessage(prisma: PrismaClient, input: WhatsappTaskInput) {
  const text = String(input.text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!shouldCreateOperationalTask(text, input.mediaType)) return null;

  const [conversation, services] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: input.conversationId, inbox: { organizationId: input.organizationId } },
      include: { lead: true },
    }),
    prisma.serviceCatalog.findMany({
      where: { organizationId: input.organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!conversation) return null;

  const matchedService = services.find((service) => serviceMatchesText(service, text));
  const ownerAgent = matchedService?.type || agentForService(text);
  const agent = await prisma.aiAgent.findUnique({
    where: { organizationId_key: { organizationId: input.organizationId, key: ownerAgent } },
  }).catch(() => null);

  const task = await prisma.task.create({
    data: {
      organizationId: input.organizationId,
      leadId: input.leadId || conversation.leadId || null,
      title: inferTitle(text, input.mediaType),
      description: [
        `Origem: WhatsApp`,
        `Conversa: ${input.conversationId}`,
        `Mensagem: ${input.messageId}`,
        input.senderName ? `Remetente: ${input.senderName}` : null,
        matchedService ? `Servico identificado: ${matchedService.name}` : null,
        agent ? `Agente responsavel: ${agent.name}` : `Agente sugerido: ${ownerAgent}`,
        input.mediaType === "audio" ? `Audio: ${input.fileUrl || "sem URL informada"}` : null,
        input.text ? `Conteudo: ${input.text}` : "Conteudo textual ausente. Tratar como audio/documento e extrair a demanda.",
      ].filter(Boolean).join("\n"),
      status: "pendente",
      priority: inferPriority(text, input.mediaType),
      dueDate: new Date(Date.now() + (inferPriority(text, input.mediaType) === "alta" ? 24 : 72) * 60 * 60 * 1000),
    },
  });

  const lead = conversation.leadId
    ? await prisma.lead.findFirst({ where: { id: conversation.leadId, organizationId: input.organizationId }, select: { clientId: true } })
    : null;
  let queueItem = null;
  if (lead?.clientId) {
    queueItem = await prisma.agentQueueItem.create({
      data: {
        organizationId: input.organizationId,
        clientId: lead.clientId,
        agentId: ownerAgent,
        agentName: agent?.name || ownerAgent,
        phase: "whatsapp_intake",
        category: "demanda_cliente",
        autonomy: "autonomous",
        actionType: "execute_client_request",
        title: task.title,
        description: task.description || "",
        input: { conversationId: input.conversationId, messageId: input.messageId, taskId: task.id },
        output: { next: "Executar demanda do cliente e atualizar tarefa" },
        priority: task.priority === "alta" ? 95 : 70,
        scheduledAt: new Date(),
        metadata: { source: "whatsapp_operational_intake", serviceId: matchedService?.id || null },
      },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderType: "AI",
      type: "text",
      isPrivate: true,
      content: `Nexus criou tarefa ${task.title}${agent ? ` para ${agent.name}` : ""}.`,
      metadata: { source: "agency_operating_system", taskId: task.id, queueItemId: queueItem?.id || null },
    },
  }).catch(() => null);

  await prisma.aiLog.create({
    data: {
      organizationId: input.organizationId,
      agentType: "whatsapp-operational-intake",
      prompt: input.text || input.mediaType || "whatsapp",
      response: `Tarefa criada: ${task.id}${queueItem ? ` | fila: ${queueItem.id}` : ""}`,
      model: "deterministic-whatsapp-intake-v1",
      success: true,
    },
  }).catch(() => null);

  return { task, queueItem, matchedService, agent };
}
