import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { checkAiCoreHealth } from "./aiCoreClient.js";

type AiScopeInput = {
  organizationId: string;
  userId?: string;
  clientId?: string;
  agentKey: string;
  modelName?: string;
  channel?: string;
};

type AiUsageInput = AiScopeInput & {
  requestId: string;
  modelName: string;
  provider?: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  credits: number;
  durationMs: number;
  status: "success" | "error" | "blocked";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

const DEFAULT_MODELS = [
  {
    name: "gpt-4o-mini",
    displayName: "OpenAI GPT-4o mini",
    provider: "openai",
    runtime: "litellm",
    modelId: "gpt-4o-mini",
    contextWindow: 128000,
    creditCost: 3,
    capabilities: { chat: true, reasoning: true, external: true },
    isDefault: true,
    isSelfHosted: false,
  },
  {
    name: "gemini-flash",
    displayName: "Google Gemini Flash",
    provider: "gemini",
    runtime: "litellm",
    modelId: "gemini-flash",
    contextWindow: 1000000,
    creditCost: 2,
    capabilities: { chat: true, content: true, external: true },
    isSelfHosted: false,
  },
  {
    name: "groq-llama",
    displayName: "Groq Llama 3.3 70B",
    provider: "groq",
    runtime: "litellm",
    modelId: "llama-3.3-70b-versatile",
    contextWindow: 32768,
    creditCost: 2,
    capabilities: { chat: true, fast: true, external: true },
    isSelfHosted: false,
  },
];

const DEFAULT_AGENTS = [
  { key: "crm", name: "CRM Copilot", description: "Follow-up, resumo de oportunidades e apoio comercial." },
  { key: "sdr", name: "SDR Agent", description: "Prospecção, abordagem inicial e qualificação de leads." },
  { key: "content", name: "Content AI", description: "Copy, posts, emails e peças de marketing." },
  { key: "proposal", name: "Proposal AI", description: "Propostas, escopos e argumentos de fechamento." },
  { key: "support", name: "Support AI", description: "Atendimento, FAQ e base de conhecimento." },
  { key: "reviews", name: "Reviews AI", description: "Respostas a avaliações e reputação." },
];

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function normalizeModelPayload(raw: any) {
  const id = raw?.id || raw?.model_name || raw?.name || raw;
  return String(id || "").trim();
}

function isSelfHostedModelId(modelId: string) {
  const normalized = modelId.toLowerCase();
  return (
    normalized.includes("ollama/") ||
    normalized.includes("local") ||
    ["qwen-local", "llama-local", "gemma-local"].includes(normalized)
  );
}

function estimatedCost(model: any, tokensIn: number, tokensOut: number) {
  const input = (tokensIn / 1000) * Number(model?.inputCostPer1k || 0);
  const output = (tokensOut / 1000) * Number(model?.outputCostPer1k || 0);
  return Number((input + output).toFixed(6));
}

function planAiSettings(planFeatures: Prisma.JsonValue | null | undefined) {
  const features = typeof planFeatures === "object" && planFeatures && !Array.isArray(planFeatures)
    ? planFeatures as Record<string, any>
    : {};
  const ai = typeof features.ai === "object" && features.ai && !Array.isArray(features.ai)
    ? features.ai as Record<string, any>
    : {};

  return {
    enabled: ai.enabled !== false,
    allowedModels: Array.isArray(ai.allowedModels) ? ai.allowedModels.map(String) : undefined,
    allowExternalProviders: ai.allowExternalProviders !== false,
    capabilities: Array.isArray(ai.capabilities) ? ai.capabilities.map(String) : undefined,
  };
}

function modelHasCapability(model: any, capability?: string) {
  if (!capability || capability === "chat") return true;
  const capabilities = typeof model?.capabilities === "object" && model.capabilities && !Array.isArray(model.capabilities)
    ? model.capabilities as Record<string, any>
    : {};
  return capabilities[capability] === true;
}

function modelAllowedByPlan(model: any, aiSettings: ReturnType<typeof planAiSettings>, capability?: string) {
  if (!aiSettings.enabled) return false;
  if (!modelHasCapability(model, capability)) return false;
  if (!aiSettings.allowExternalProviders && !model.isSelfHosted) return false;
  if (aiSettings.allowedModels?.length) {
    return aiSettings.allowedModels.includes(model.modelId) ||
      aiSettings.allowedModels.includes(model.name) ||
      aiSettings.allowedModels.includes(model.id);
  }
  return true;
}

export function createAiRequestId() {
  return randomUUID();
}

export async function ensureDefaultAiGovernance(prisma: PrismaClient, organizationId?: string) {
  const existingDefault = await prisma.aiModel.findFirst({ where: { isDefault: true } });
  for (const model of DEFAULT_MODELS) {
    await prisma.aiModel.upsert({
      where: { modelId: model.modelId },
      update: {
        name: model.name,
        displayName: model.displayName,
        provider: model.provider,
        runtime: model.runtime,
        contextWindow: model.contextWindow,
        creditCost: model.creditCost,
        capabilities: model.capabilities,
        isDefault: model.isDefault || (!existingDefault && model.modelId === "gpt-4o-mini"),
        isSelfHosted: false,
      },
      create: {
        ...model,
        status: "active",
        healthStatus: "unknown",
        isSelfHosted: false,
      },
    });
  }

  await prisma.aiModel.updateMany({
    where: {
      OR: [
        { isSelfHosted: true },
        { provider: "local" },
        { runtime: "ollama" },
        { modelId: { in: ["qwen-local", "llama-local", "gemma-local"] } },
      ],
    },
    data: {
      status: "inactive",
      isDefault: false,
      isSelfHosted: true,
      healthStatus: "disabled",
    },
  });

  if (organizationId) {
    const defaultModel = await prisma.aiModel.findFirst({
      where: { status: "active", isSelfHosted: false },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    if (defaultModel) {
      await prisma.aiAgent.updateMany({
        where: {
          organizationId,
          OR: [
            { model: { isSelfHosted: true } },
            { model: { provider: "local" } },
            { model: { runtime: "ollama" } },
            { model: { modelId: { in: ["qwen-local", "llama-local", "gemma-local"] } } },
          ],
        },
        data: { modelId: defaultModel.id },
      });
    }
    for (const agent of DEFAULT_AGENTS) {
      await prisma.aiAgent.upsert({
        where: { organizationId_key: { organizationId, key: agent.key } },
        update: {},
        create: {
          organizationId,
          key: agent.key,
          name: agent.name,
          description: agent.description,
          modelId: defaultModel?.id,
          status: "active",
        },
      });
    }
  }
}

export async function syncAiModelsFromCore(prisma: PrismaClient) {
  await ensureDefaultAiGovernance(prisma);
  const health = await checkAiCoreHealth().catch((error: any) => ({
    ok: false,
    error: error?.message || "AI Core indisponivel",
    models: [],
  }));

  const models = Array.isArray((health as any).models)
    ? (health as any).models
    : Array.isArray((health as any).models?.data)
      ? (health as any).models.data
      : [];

  const synced = [];
  for (const raw of models) {
    const modelId = normalizeModelPayload(raw);
    if (!modelId) continue;
    if (isSelfHostedModelId(modelId)) continue;
    const model = await prisma.aiModel.upsert({
      where: { modelId },
      update: {
        name: modelId,
        displayName: modelId,
        provider: "external",
        runtime: "litellm",
        healthStatus: (health as any).ok ? "healthy" : "unknown",
        lastHealthAt: new Date(),
      },
      create: {
        name: modelId,
        displayName: modelId,
        provider: "external",
        runtime: "litellm",
        modelId,
        status: "active",
        healthStatus: (health as any).ok ? "healthy" : "unknown",
        lastHealthAt: new Date(),
        isSelfHosted: false,
      },
    });
    synced.push(model);
  }

  if (!models.length) {
    await prisma.aiModel.updateMany({
      where: { isSelfHosted: true },
      data: { healthStatus: (health as any).ok ? "healthy" : "unknown", lastHealthAt: new Date() },
    });
  }

  return { health, synced };
}

export async function listAiModels(prisma: PrismaClient) {
  await ensureDefaultAiGovernance(prisma);
  return prisma.aiModel.findMany({
    where: { isSelfHosted: false },
    orderBy: [{ isDefault: "desc" }, { provider: "asc" }, { displayName: "asc" }],
  });
}

export async function listAvailableAiModels(prisma: PrismaClient, organizationId: string, capability = "chat") {
  await ensureDefaultAiGovernance(prisma, organizationId);
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { planObj: true },
  });
  const aiSettings = planAiSettings(org?.planObj?.features);
  const models = await prisma.aiModel.findMany({
    where: { status: "active", isSelfHosted: false },
    orderBy: [{ isDefault: "desc" }, { provider: "asc" }, { displayName: "asc" }],
  });

  return models.filter((model) => modelAllowedByPlan(model, aiSettings, capability));
}

export async function resolveAiExecution(prisma: PrismaClient, input: AiScopeInput) {
  await ensureDefaultAiGovernance(prisma, input.organizationId);
  const agent = await prisma.aiAgent.findUnique({
    where: { organizationId_key: { organizationId: input.organizationId, key: input.agentKey } },
    include: { model: true, fallbackModel: true },
  });

  const requestedModel = input.modelName
    ? await prisma.aiModel.findFirst({
        where: {
          isSelfHosted: false,
          OR: [{ modelId: input.modelName }, { name: input.modelName }, { id: input.modelName }],
        },
      })
    : null;

  const model = requestedModel || agent?.model || await prisma.aiModel.findFirst({
    where: { status: "active", isSelfHosted: false },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (!model) {
    throw Object.assign(new Error("Nenhum modelo de IA ativo encontrado."), { status: 503, code: "AI_MODEL_NOT_FOUND" });
  }
  if (model.status !== "active") {
    throw Object.assign(new Error("Modelo de IA desativado."), { status: 403, code: "AI_MODEL_DISABLED" });
  }

  return { agent, model };
}

async function loadPolicy(prisma: PrismaClient, input: AiScopeInput, modelId?: string, agentId?: string) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    include: { planObj: true },
  });
  const entitlements = await prisma.aiEntitlement.findMany({
    where: {
      organizationId: input.organizationId,
      enabled: true,
      OR: [
        { scope: "organization" },
        ...(input.clientId ? [{ clientId: input.clientId }] : []),
        ...(agentId ? [{ agentId }] : []),
        ...(modelId ? [{ modelId }] : []),
      ],
    },
  });

  const planMonthly = org?.planObj?.maxAIRequests || 10;
  const basePolicy = {
    maxRequestsDaily: undefined as number | undefined,
    maxRequestsMonthly: planMonthly,
    maxTokensDaily: undefined as number | undefined,
    maxTokensMonthly: undefined as number | undefined,
    maxCreditsDaily: undefined as number | undefined,
    maxCreditsMonthly: planMonthly,
  };

  return entitlements.reduce((policy, entitlement) => ({
    maxRequestsDaily: entitlement.maxRequestsDaily ?? policy.maxRequestsDaily,
    maxRequestsMonthly: entitlement.maxRequestsMonthly ?? policy.maxRequestsMonthly,
    maxTokensDaily: entitlement.maxTokensDaily ?? policy.maxTokensDaily,
    maxTokensMonthly: entitlement.maxTokensMonthly ?? policy.maxTokensMonthly,
    maxCreditsDaily: entitlement.maxCreditsDaily ?? policy.maxCreditsDaily,
    maxCreditsMonthly: entitlement.maxCreditsMonthly ?? policy.maxCreditsMonthly,
  }), basePolicy);
}

async function usageAggregate(prisma: PrismaClient, input: AiScopeInput, from: Date) {
  const where = {
    organizationId: input.organizationId,
    ...(input.clientId ? { clientId: input.clientId } : {}),
    ...(input.agentKey ? { agentKey: input.agentKey } : {}),
    ...(input.modelName ? { modelName: input.modelName } : {}),
    createdAt: { gte: from },
    status: "success",
  };
  const [requests, aggregate] = await Promise.all([
    prisma.aiUsageLedger.count({ where }),
    prisma.aiUsageLedger.aggregate({
      where,
      _sum: { totalTokens: true, credits: true },
    }),
  ]);
  return {
    requests,
    tokens: aggregate._sum.totalTokens || 0,
    credits: aggregate._sum.credits || 0,
  };
}

export async function assertAiUsageAllowed(prisma: PrismaClient, input: AiScopeInput) {
  const resolved = await resolveAiExecution(prisma, input);
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    include: { planObj: true },
  });
  const aiSettings = planAiSettings(org?.planObj?.features);
  if (!modelAllowedByPlan(resolved.model, aiSettings, "chat")) {
    throw Object.assign(
      new Error("Modelo de IA nao esta disponivel no plano contratado."),
      { status: 403, code: "AI_MODEL_NOT_ALLOWED", model: resolved.model.modelId }
    );
  }

  const policy = await loadPolicy(prisma, input, resolved.model.id, resolved.agent?.id);
  const scopedInput = { ...input, modelName: resolved.model.modelId };
  const [daily, monthly] = await Promise.all([
    usageAggregate(prisma, scopedInput, startOfDay()),
    usageAggregate(prisma, scopedInput, startOfMonth()),
  ]);

  const checks = [
    { label: "requests diarios", current: daily.requests, limit: policy.maxRequestsDaily },
    { label: "requests mensais", current: monthly.requests, limit: policy.maxRequestsMonthly },
    { label: "tokens diarios", current: daily.tokens, limit: policy.maxTokensDaily },
    { label: "tokens mensais", current: monthly.tokens, limit: policy.maxTokensMonthly },
    { label: "creditos diarios", current: daily.credits, limit: policy.maxCreditsDaily },
    { label: "creditos mensais", current: monthly.credits, limit: policy.maxCreditsMonthly },
  ];

  const exceeded = checks.find((check) => typeof check.limit === "number" && check.current >= Number(check.limit));
  if (exceeded) {
    throw Object.assign(
      new Error(`Limite de IA excedido: ${exceeded.label} (${exceeded.current}/${exceeded.limit}).`),
      { status: 402, code: "AI_QUOTA_EXCEEDED", policy, daily, monthly }
    );
  }

  return { ...resolved, policy, usage: { daily, monthly } };
}

export async function recordAiUsage(prisma: PrismaClient, input: AiUsageInput) {
  const model = await prisma.aiModel.findFirst({
    where: { OR: [{ modelId: input.modelName }, { name: input.modelName }] },
  });
  const agent = await prisma.aiAgent.findUnique({
    where: { organizationId_key: { organizationId: input.organizationId, key: input.agentKey } },
  }).catch(() => null);
  const cost = estimatedCost(model, input.tokensIn, input.tokensOut);

  const ledger = await prisma.aiUsageLedger.create({
    data: {
      requestId: input.requestId,
      organizationId: input.organizationId,
      userId: input.userId,
      clientId: input.clientId,
      agentId: agent?.id,
      agentKey: input.agentKey,
      modelId: model?.id,
      modelName: input.modelName,
      provider: input.provider || "ai-core",
      channel: input.channel || "nexus",
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      totalTokens: input.totalTokens,
      credits: input.credits,
      estimatedCost: cost,
      durationMs: input.durationMs,
      status: input.status,
      errorMessage: input.errorMessage?.slice(0, 1000),
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  await prisma.usageEvent.create({
    data: {
      organizationId: input.organizationId,
      feature: "ai.credits",
      quantity: Math.max(1, input.credits || 1),
      metadata: {
        requestId: input.requestId,
        agent: input.agentKey,
        model: input.modelName,
        tokens: input.totalTokens,
        status: input.status,
      },
    },
  }).catch((error) => console.warn("[AI_USAGE_EVENT_WARN]", error?.message || error));

  return ledger;
}
