import { PrismaClient } from "@prisma/client";
import { MARKETING_AGENCY_AGENT_FLOW } from "./clientAgentContext.js";

type QueueSeed = {
  clientId: string;
  organizationId: string;
  requestedById?: string | null;
  source?: string;
};

const AGENT_ACTIONS: Record<string, { actionType: string; category: string; priority: number }> = {
  atlas: { actionType: "create_strategy_project", category: "estrategia", priority: 90 },
  hera: { actionType: "create_icp_tasks", category: "estrategia", priority: 88 },
  prometeu: { actionType: "create_offer_tasks", category: "estrategia", priority: 86 },
  mercurio: { actionType: "create_campaign_plan", category: "aquisicao", priority: 82 },
  apolo: { actionType: "create_content_calendar", category: "autoridade", priority: 78 },
  iris: { actionType: "create_creative_tasks", category: "aquisicao", priority: 76 },
  cadmo: { actionType: "create_lead_scoring_tasks", category: "operacao", priority: 72 },
  orfeu: { actionType: "create_sales_scripts_tasks", category: "operacao", priority: 70 },
  hermes: { actionType: "create_crm_setup_tasks", category: "operacao", priority: 68 },
  demeter: { actionType: "create_nurture_tasks", category: "operacao", priority: 64 },
  cronos: { actionType: "create_kpi_routine", category: "gestao", priority: 60 },
  atena: { actionType: "create_competitive_tasks", category: "estrategia", priority: 58 },
  hestia: { actionType: "create_retention_routine", category: "operacao", priority: 56 },
  zeus: { actionType: "create_quarterly_project", category: "gestao", priority: 54 },
  execution_plan: { actionType: "create_execution_project", category: "gestao", priority: 95 },
};

function asRecord(value: any): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asText(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function dueDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function pickTaskLines(output: string, fallback: string[], limit = 8) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\d.)\s]+/, "").trim())
    .filter((line) => line.length >= 12 && line.length <= 140)
    .filter((line) => !/^resumo|^cliente|^fase|^output/i.test(line));

  const unique = Array.from(new Set(lines)).slice(0, limit);
  return unique.length ? unique : fallback;
}

function queueTitle(agentName: string, actionType: string) {
  const labels: Record<string, string> = {
    create_strategy_project: "Criar projeto estrategico",
    create_icp_tasks: "Operacionalizar ICP",
    create_offer_tasks: "Operacionalizar oferta",
    create_campaign_plan: "Criar campanha de aquisicao",
    create_content_calendar: "Criar calendario de conteudo",
    create_creative_tasks: "Criar tarefas de criativos",
    create_lead_scoring_tasks: "Criar rotina de lead scoring",
    create_sales_scripts_tasks: "Criar scripts comerciais",
    create_crm_setup_tasks: "Configurar CRM operacional",
    create_nurture_tasks: "Criar nurture e reativacao",
    create_kpi_routine: "Criar rotina de KPIs",
    create_competitive_tasks: "Criar inteligencia competitiva",
    create_retention_routine: "Criar rotina de retencao",
    create_quarterly_project: "Criar planejamento trimestral",
    create_execution_project: "Criar projeto de execucao ACP",
  };
  return `${labels[actionType] || "Executar acao"} - ${agentName}`;
}

export async function enqueueAgentQueueForClient(prisma: PrismaClient, seed: QueueSeed) {
  const client = await prisma.client.findFirst({
    where: { id: seed.clientId, organizationId: seed.organizationId },
    include: { aiContext: true },
  });
  if (!client) throw Object.assign(new Error("Cliente invalido para esta organizacao"), { status: 404 });

  const context = asRecord(client.aiContext?.context);
  const agentOutputs = asRecord(context.agentOutputs);
  const created = [];

  for (const [agentId, outputRecord] of Object.entries(agentOutputs)) {
    const flowAgent = MARKETING_AGENCY_AGENT_FLOW.find((agent) => agent.id === agentId);
    const action = AGENT_ACTIONS[agentId];
    if (!action) continue;

    const output = asRecord(outputRecord).output || asText(outputRecord);
    if (!output) continue;

    const alreadyExists = await prisma.agentQueueItem.findFirst({
      where: {
        organizationId: seed.organizationId,
        clientId: seed.clientId,
        agentId,
        actionType: action.actionType,
        status: { in: ["queued", "running", "completed", "needs_approval"] },
      },
      select: { id: true },
    });
    if (alreadyExists) continue;

    const item = await prisma.agentQueueItem.create({
      data: {
        organizationId: seed.organizationId,
        clientId: seed.clientId,
        agentId,
        agentName: asRecord(outputRecord).agentName || flowAgent?.name || agentId,
        phase: flowAgent?.phase || null,
        category: action.category,
        autonomy: flowAgent?.autonomy || "semi_autonomo",
        actionType: action.actionType,
        title: queueTitle(asRecord(outputRecord).agentName || flowAgent?.name || agentId, action.actionType),
        description: output.slice(0, 4000),
        input: { client: context.client || null, briefing: context.briefing || null },
        output: { text: output },
        priority: action.priority,
        scheduledAt: new Date(),
        metadata: { source: seed.source || "client_agent_context", requestedById: seed.requestedById || null },
      },
    });
    created.push(item);
  }

  return { clientId: seed.clientId, created: created.length, items: created };
}

async function ensureAgentProject(prisma: PrismaClient, item: any, name: string, description: string) {
  const existing = await prisma.project.findFirst({
    where: {
      organizationId: item.organizationId,
      clientId: item.clientId,
      title: name,
    },
  });
  if (existing) return existing;
  return prisma.project.create({
    data: {
      organizationId: item.organizationId,
      clientId: item.clientId,
      title: name,
      description,
      status: "planejamento",
      deadline: dueDate(90),
    },
  });
}

async function createTasks(prisma: PrismaClient, item: any, titles: string[], projectId?: string | null) {
  const tasks = [];
  for (const [index, title] of titles.entries()) {
    const task = await prisma.task.create({
      data: {
        organizationId: item.organizationId,
        projectId: projectId || null,
        title,
        description: `${item.agentName}\n\n${item.description || ""}`.slice(0, 4000),
        priority: index < 2 ? "alta" : "media",
        status: "pendente",
        dueDate: dueDate(3 + index * 2),
      },
    });
    tasks.push(task);
  }
  return tasks;
}

async function createDemand(prisma: PrismaClient, item: any, title: string, description: string, aiResult?: any) {
  return prisma.demand.create({
    data: {
      clientId: item.clientId,
      title,
      description,
      priority: item.priority >= 80 ? "high" : "medium",
      status: "pending",
      aiAgentType: item.agentId,
      aiResult,
      dueDate: dueDate(7),
    },
  });
}

export async function executeAgentQueueItem(prisma: PrismaClient, itemId: string, organizationId: string) {
  const item = await prisma.agentQueueItem.findFirst({
    where: { id: itemId, organizationId },
    include: { client: true },
  });
  if (!item) throw Object.assign(new Error("Item da fila nao encontrado"), { status: 404 });
  if (!["queued", "failed"].includes(item.status)) return item;

  const outputText = asRecord(item.output).text || item.description || "";
  await prisma.agentQueueItem.update({
    where: { id: item.id },
    data: { status: "running", startedAt: new Date(), attempts: { increment: 1 }, lockedAt: new Date(), error: null },
  });

  try {
    const fallbackTasks = [
      `Revisar output do agente ${item.agentName}`,
      `Transformar recomendacoes de ${item.agentName} em rotina operacional`,
      `Validar entregaveis gerados por ${item.agentName}`,
    ];
    const taskTitles = pickTaskLines(outputText, fallbackTasks);
    const result: Record<string, any> = {};

    if (["create_strategy_project", "create_quarterly_project", "create_execution_project"].includes(item.actionType)) {
      const project = await ensureAgentProject(
        prisma,
        item,
        item.actionType === "create_execution_project" ? `ACP Execucao - ${item.client.tradeName || item.client.corporateName}` : item.title,
        outputText.slice(0, 4000)
      );
      const tasks = await createTasks(prisma, item, taskTitles, project.id);
      result.projectId = project.id;
      result.taskIds = tasks.map((task) => task.id);
    } else if (item.actionType === "create_campaign_plan") {
      const campaign = await prisma.campaign.create({
        data: {
          organizationId: item.organizationId,
          name: `ACP Aquisicao - ${item.client.tradeName || item.client.corporateName}`,
          description: outputText.slice(0, 4000),
          type: "aquisicao",
          status: "planejamento",
          startDate: new Date(),
          endDate: dueDate(30),
          budget: 0,
          utmSource: "acp",
          utmMedium: "agent_queue",
          utmCampaign: item.client.tradeName || item.client.corporateName,
        },
      });
      const tasks = await createTasks(prisma, item, taskTitles);
      result.campaignId = campaign.id;
      result.taskIds = tasks.map((task) => task.id);
    } else if (item.actionType === "create_creative_tasks") {
      const creatives = [];
      for (const title of taskTitles.slice(0, 5)) {
        const creative = await prisma.creative.create({
          data: {
            organizationId: item.organizationId,
            title,
            type: "copy",
            copyText: outputText.slice(0, 4000),
            status: "pending",
          },
        });
        creatives.push(creative);
      }
      result.creativeIds = creatives.map((creative) => creative.id);
    } else if (["create_content_calendar", "create_nurture_tasks", "create_retention_routine"].includes(item.actionType)) {
      const demand = await createDemand(prisma, item, item.title, outputText.slice(0, 4000), { queueItemId: item.id, agentId: item.agentId });
      const tasks = await createTasks(prisma, item, taskTitles);
      result.demandId = demand.id;
      result.taskIds = tasks.map((task) => task.id);
    } else {
      const tasks = await createTasks(prisma, item, taskTitles);
      result.taskIds = tasks.map((task) => task.id);
    }

    const completed = await prisma.agentQueueItem.update({
      where: { id: item.id },
      data: {
        status: "completed",
        result,
        completedAt: new Date(),
        lockedAt: null,
      },
    });
    return completed;
  } catch (error: any) {
    return prisma.agentQueueItem.update({
      where: { id: item.id },
      data: {
        status: item.attempts + 1 >= item.maxAttempts ? "failed" : "queued",
        failedAt: new Date(),
        lockedAt: null,
        error: error?.message || "Falha ao executar item da fila",
      },
    });
  }
}

export async function processAgentQueue(prisma: PrismaClient, organizationId: string, limit = 10, clientId?: string | null) {
  const items = await prisma.agentQueueItem.findMany({
    where: {
      organizationId,
      ...(clientId ? { clientId } : {}),
      status: "queued",
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: limit,
  });

  const results = [];
  for (const item of items) {
    if (item.dependsOnId) {
      const dependency = await prisma.agentQueueItem.findFirst({
        where: { id: item.dependsOnId, organizationId },
        select: { status: true },
      });
      if (dependency && dependency.status !== "completed") continue;
    }
    results.push(await executeAgentQueueItem(prisma, item.id, organizationId));
  }

  return { processed: results.length, items: results };
}
