import { PrismaClient } from "@prisma/client";
import { runAiCoreChat } from "./aiCoreClient.js";
import {
  assertAiUsageAllowed,
  createAiRequestId,
  recordAiUsage,
} from "./aiGovernance.js";

type GovernedTextInput = {
  organizationId: string;
  userId?: string;
  clientId?: string;
  agentKey: string;
  channel?: string;
  message: string;
  context?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
  metadata?: Record<string, unknown>;
};

export async function runGovernedAiText(prisma: PrismaClient, input: GovernedTextInput) {
  const requestId = createAiRequestId();
  const startedAt = Date.now();
  const channel = input.channel || "nexus";
  const allowed = await assertAiUsageAllowed(prisma, {
    organizationId: input.organizationId,
    userId: input.userId,
    clientId: input.clientId,
    agentKey: input.agentKey,
    modelName: input.model,
    channel,
  });

  try {
    const result = await runAiCoreChat({
      system: input.system || allowed.agent?.systemPrompt || input.agentKey,
      clientId: input.clientId || input.organizationId,
      userId: input.userId,
      agent: input.agentKey,
      channel,
      message: input.message,
      context: input.context,
      model: allowed.model.modelId,
      temperature: input.temperature ?? allowed.agent?.temperature,
      maxTokens: input.maxTokens || allowed.agent?.maxTokens,
    });

    await recordAiUsage(prisma, {
      requestId,
      organizationId: input.organizationId,
      userId: input.userId,
      clientId: input.clientId,
      agentKey: input.agentKey,
      channel,
      modelName: result.usage.model,
      provider: allowed.model.provider || result.usage.provider,
      tokensIn: result.usage.tokensIn,
      tokensOut: result.usage.tokensOut,
      totalTokens: result.usage.tokens,
      credits: Math.max(allowed.model.creditCost || 1, result.usage.credits || 1),
      durationMs: result.usage.latencyMs,
      status: "success",
      metadata: {
        ...input.metadata,
        requestedModel: input.model,
        resolvedModel: allowed.model.modelId,
      },
    }).catch((error) => console.warn("[AI_USAGE_LEDGER_WARN]", error?.message || error));

    return { requestId, result, model: allowed.model, agent: allowed.agent };
  } catch (error: any) {
    await recordAiUsage(prisma, {
      requestId,
      organizationId: input.organizationId,
      userId: input.userId,
      clientId: input.clientId,
      agentKey: input.agentKey,
      channel,
      modelName: input.model || allowed.model.modelId,
      provider: allowed.model.provider || "ai-core",
      tokensIn: 0,
      tokensOut: 0,
      totalTokens: 0,
      credits: 0,
      durationMs: Date.now() - startedAt,
      status: error?.code === "AI_QUOTA_EXCEEDED" ? "blocked" : "error",
      errorMessage: error?.message || "AI Core indisponivel",
      metadata: input.metadata,
    }).catch((usageError) => console.warn("[AI_USAGE_LEDGER_WARN]", usageError?.message || usageError));

    throw error;
  }
}
