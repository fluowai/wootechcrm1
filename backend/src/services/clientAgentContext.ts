import { PrismaClient } from "@prisma/client";

function asRecord(value: any): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function appendLimited<T>(items: T[] | undefined, item: T, limit = 50) {
  return [...(Array.isArray(items) ? items : []), item].slice(-limit);
}

export const MARKETING_AGENCY_AGENT_FLOW = [
  { id: "atlas", name: "Atlas", phase: "Fase 1", role: "Diagnostico Comercial", autonomy: "semi_autonomo" },
  { id: "hera", name: "Hera", phase: "Fase 2", role: "Construcao de ICP", autonomy: "semi_autonomo" },
  { id: "prometeu", name: "Prometeu", phase: "Fase 3", role: "Arquitetura de Oferta", autonomy: "semi_autonomo" },
  { id: "mercurio", name: "Mercurio", phase: "Fase 4", role: "Funil de Aquisicao e Midia", autonomy: "semi_autonomo" },
  { id: "apolo", name: "Apolo", phase: "Fase 5", role: "Funil de Autoridade e Conteudo", autonomy: "autonomo" },
  { id: "iris", name: "Iris", phase: "Fase 6", role: "Mensagens e Criativos", autonomy: "semi_autonomo" },
  { id: "cadmo", name: "Cadmo", phase: "Fase 7", role: "Lead Scoring e Qualificacao", autonomy: "autonomo" },
  { id: "orfeu", name: "Orfeu", phase: "Fase 8", role: "Roteiros e Objecoes", autonomy: "semi_autonomo" },
  { id: "hermes", name: "Hermes", phase: "Fase 9", role: "CRM e Higiene de Dados", autonomy: "autonomo" },
  { id: "demeter", name: "Demeter", phase: "Fase 10", role: "Nurture e Reativacao", autonomy: "semi_autonomo" },
  { id: "cronos", name: "Cronos", phase: "Fase 11", role: "KPI e Unit Economics", autonomy: "semi_autonomo" },
  { id: "atena", name: "Atena", phase: "Fase 12", role: "Inteligencia Competitiva", autonomy: "semi_autonomo" },
  { id: "hestia", name: "Hestia", phase: "Fase 13", role: "Retencao e Sinais de Churn", autonomy: "semi_autonomo" },
  { id: "zeus", name: "Zeus", phase: "Fase 14", role: "Planejamento Trimestral", autonomy: "semi_autonomo" },
];

export function buildClientOperatingContext(client: any, seed: Record<string, any> = {}) {
  const now = new Date().toISOString();
  return {
    version: 1,
    mode: "agency_operating_system",
    humanRole: "orchestrator",
    objective: "Permitir que agentes executem estrategia, aquisicao, conteudo, CRM, metricas e retencao com minima dependencia humana.",
    client: {
      id: client.id,
      corporateName: client.corporateName,
      tradeName: client.tradeName || null,
      cnpj: client.cnpj || null,
      segment: client.segment || null,
      status: client.status || "prospect",
      city: client.city || null,
      state: client.state || null,
      website: client.website || null,
      responsibleName: client.responsibleName || null,
      responsibleRole: client.responsibleRole || null,
      source: client.source || null,
      sourceDetail: client.sourceDetail || null,
      notes: client.notes || null,
      tags: client.tags || null,
    },
    agentFlow: MARKETING_AGENCY_AGENT_FLOW,
    orchestrationRules: {
      agentsUsePreviousOutputs: true,
      neverDiscardHumanBriefing: true,
      askHumanOnlyFor: [
        "aprovacao de verba",
        "decisao juridica sensivel",
        "promessa comercial fora do escopo",
        "mudanca de posicionamento da marca",
        "publicacao ou envio que exija aprovacao final",
      ],
      defaultNextStep: "executar proxima fase com base no contexto acumulado",
    },
    briefing: {
      icp: seed.icp || null,
      offer: seed.offer || null,
      positioning: seed.positioning || null,
      toneOfVoice: seed.toneOfVoice || null,
      competitors: seed.competitors || [],
      channels: seed.channels || [],
      goals: seed.goals || [],
      constraints: seed.constraints || [],
    },
    agentOutputs: {},
    executionHistory: [],
    nextAgentContext: "Cliente cadastrado no CRM. Aguardando analise ICP/ACP ou execucao dos agentes.",
    createdAt: now,
    lastUpdatedAt: now,
  };
}

export async function ensureClientAgentContext(prisma: PrismaClient, client: any, seed: Record<string, any> = {}) {
  const existing = await prisma.clientAIContext.findUnique({ where: { clientId: client.id } });
  if (existing) return existing;

  return prisma.clientAIContext.create({
    data: {
      clientId: client.id,
      context: buildClientOperatingContext(client, seed) as any,
    },
  });
}

export async function upsertClientAgentContext(prisma: PrismaClient, input: {
  organizationId: string;
  clientId: string;
  event: string;
  agentId?: string | null;
  agentName?: string | null;
  input?: string | null;
  output?: string | null;
  dossier?: string | null;
  chainResults?: Record<string, any> | null;
  briefing?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}) {
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, organizationId: input.organizationId },
  });
  if (!client) throw Object.assign(new Error("Cliente invalido para esta organizacao"), { status: 404 });

  const existing = await ensureClientAgentContext(prisma, client, input.briefing || {});
  const current = asRecord(existing.context);
  const now = new Date().toISOString();
  const agentOutputs = asRecord(current.agentOutputs);
  const briefing = { ...asRecord(current.briefing), ...asRecord(input.briefing) };

  if (input.agentId) {
    agentOutputs[input.agentId] = {
      agentId: input.agentId,
      agentName: input.agentName || input.agentId,
      input: input.input || null,
      output: input.output || null,
      metadata: input.metadata || null,
      updatedAt: now,
    };
  }

  if (input.chainResults) {
    for (const [agentId, result] of Object.entries(input.chainResults)) {
      const record = asRecord(result);
      agentOutputs[agentId] = {
        agentId,
        agentName: record.agentName || agentId,
        output: record.output || null,
        metadata: { chainExecution: true },
        updatedAt: now,
      };
    }
  }

  const eventRecord = {
    at: now,
    event: input.event,
    agentId: input.agentId || null,
    agentName: input.agentName || null,
    metadata: input.metadata || null,
  };

  const nextAgentContext = [
    `Cliente CRM: ${client.tradeName || client.corporateName}`,
    client.segment ? `Segmento: ${client.segment}` : null,
    input.dossier ? `Dossie: ${input.dossier.slice(0, 2500)}` : null,
    input.output ? `Ultimo output (${input.agentName || input.agentId || "agente"}): ${input.output.slice(0, 2500)}` : null,
    input.chainResults ? "Cadeia ACP executada. Proximos agentes devem usar agentOutputs e briefing como fonte principal." : null,
  ].filter(Boolean).join("\n\n");

  const context = {
    ...current,
    client: {
      ...asRecord(current.client),
      id: client.id,
      corporateName: client.corporateName,
      tradeName: client.tradeName || null,
      cnpj: client.cnpj || null,
      segment: client.segment || null,
      status: client.status,
      website: client.website || null,
    },
    briefing,
    agentOutputs,
    dossier: input.dossier || current.dossier || null,
    executionHistory: appendLimited(current.executionHistory, eventRecord, 100),
    nextAgentContext: nextAgentContext || current.nextAgentContext || "Contexto atualizado.",
    lastUpdatedAt: now,
  };

  const saved = await prisma.clientAIContext.update({
    where: { clientId: client.id },
    data: { context: context as any },
  });

  if (input.agentId && input.output) {
    await prisma.aIGeneration.create({
      data: {
        clientId: client.id,
        agentType: input.agentId,
        prompt: input.input || input.event,
        response: input.output,
      },
    }).catch(() => null);
  }

  return saved;
}
