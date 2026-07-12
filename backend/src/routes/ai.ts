import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getOrgAIKeys } from "../utils/aiKeys.js";
import { AuthRequest } from "../middleware/auth.js";
import { checkAiCoreHealth, runAiCoreChat } from "../services/aiCoreClient.js";
import {
  assertAiUsageAllowed,
  createAiRequestId,
  ensureDefaultAiGovernance,
  listAvailableAiModels,
  listAiModels,
  recordAiUsage,
  syncAiModelsFromCore,
} from "../services/aiGovernance.js";
import { runGovernedAiText } from "../services/aiExecution.js";

export function aiRoutes(prisma: PrismaClient) {
  const router = Router();

  async function runGovernedText(input: {
    orgId: string;
    userId?: string;
    clientId?: string;
    agent: string;
    channel?: string;
    message: string;
    context?: Record<string, unknown>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }) {
    return runGovernedAiText(prisma, {
      organizationId: input.orgId,
      userId: input.userId,
      clientId: input.clientId,
      agentKey: input.agent,
      channel: input.channel,
      message: input.message,
      context: input.context,
      model: input.model,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      system: input.system,
    });
  }

  router.get("/models", async (_req: AuthRequest, res) => {
    try {
      const models = await listAiModels(prisma);
      res.json({ models });
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao listar modelos de IA", details: error?.message });
    }
  });

  router.get("/available-models", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const capability = String(req.query.capability || "chat");
      const models = await listAvailableAiModels(prisma, orgId, capability);
      res.json({ models });
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao listar modelos disponiveis", details: error?.message });
    }
  });

  router.post("/models/sync", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Apenas Super Admin pode sincronizar modelos." });
    }
    try {
      const result = await syncAiModelsFromCore(prisma);
      res.json(result);
    } catch (error: any) {
      res.status(502).json({ error: "Falha ao sincronizar modelos do AI Core", details: error?.message });
    }
  });

  router.patch("/models/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Apenas Super Admin pode editar modelos." });
    }
    try {
      const model = await prisma.aiModel.update({
        where: { id: req.params.id },
        data: {
          displayName: req.body.displayName,
          status: req.body.status,
          contextWindow: req.body.contextWindow,
          inputCostPer1k: req.body.inputCostPer1k,
          outputCostPer1k: req.body.outputCostPer1k,
          creditCost: req.body.creditCost,
          capabilities: req.body.capabilities,
          isDefault: req.body.isDefault,
        },
      });
      if (req.body.isDefault) {
        await prisma.aiModel.updateMany({
          where: { id: { not: model.id } },
          data: { isDefault: false },
        });
      }
      res.json(model);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar modelo", details: error?.message });
    }
  });

  router.get("/agents", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      await ensureDefaultAiGovernance(prisma, orgId);
      const agents = await prisma.aiAgent.findMany({
        where: { organizationId: orgId },
        include: { model: true, fallbackModel: true },
        orderBy: { name: "asc" },
      });
      res.json({ agents });
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao listar agentes", details: error?.message });
    }
  });

  router.post("/agents", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const key = String(req.body.key || req.body.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (!key || !req.body.name) return res.status(400).json({ error: "Nome e chave do agente sao obrigatorios." });
      const agent = await prisma.aiAgent.create({
        data: {
          organizationId: orgId,
          key,
          name: req.body.name,
          description: req.body.description,
          systemPrompt: req.body.systemPrompt,
          modelId: req.body.modelId || null,
          fallbackModelId: req.body.fallbackModelId || null,
          temperature: req.body.temperature ?? 0.4,
          maxTokens: req.body.maxTokens ?? 2048,
          tools: req.body.tools,
          status: req.body.status || "active",
        },
        include: { model: true, fallbackModel: true },
      });
      res.status(201).json(agent);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar agente", details: error?.message });
    }
  });

  router.patch("/agents/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const existing = await prisma.aiAgent.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Agente nao encontrado." });
      const agent = await prisma.aiAgent.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          description: req.body.description,
          systemPrompt: req.body.systemPrompt,
          modelId: req.body.modelId === "" ? null : req.body.modelId,
          fallbackModelId: req.body.fallbackModelId === "" ? null : req.body.fallbackModelId,
          temperature: req.body.temperature,
          maxTokens: req.body.maxTokens,
          tools: req.body.tools,
          status: req.body.status,
        },
        include: { model: true, fallbackModel: true },
      });
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar agente", details: error?.message });
    }
  });

  router.get("/entitlements", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const entitlements = await prisma.aiEntitlement.findMany({
        where: { organizationId: orgId },
        include: { model: true, agent: true },
        orderBy: { updatedAt: "desc" },
      });
      res.json({ entitlements });
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao listar cotas de IA", details: error?.message });
    }
  });

  router.post("/entitlements", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const entitlement = await prisma.aiEntitlement.create({
        data: {
          organizationId: orgId,
          clientId: req.body.clientId || null,
          planId: req.body.planId || null,
          agentId: req.body.agentId || null,
          modelId: req.body.modelId || null,
          scope: req.body.scope || "organization",
          enabled: req.body.enabled ?? true,
          rebillingEnabled: req.body.rebillingEnabled ?? false,
          markupMultiplier: req.body.markupMultiplier ?? 1,
          monthlyPrice: req.body.monthlyPrice,
          maxRequestsDaily: req.body.maxRequestsDaily,
          maxRequestsMonthly: req.body.maxRequestsMonthly,
          maxTokensDaily: req.body.maxTokensDaily,
          maxTokensMonthly: req.body.maxTokensMonthly,
          maxCreditsDaily: req.body.maxCreditsDaily,
          maxCreditsMonthly: req.body.maxCreditsMonthly,
          settings: req.body.settings,
        },
        include: { model: true, agent: true },
      });
      res.status(201).json(entitlement);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao criar cota de IA", details: error?.message });
    }
  });

  router.patch("/entitlements/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const existing = await prisma.aiEntitlement.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Cota nao encontrada." });
      const entitlement = await prisma.aiEntitlement.update({
        where: { id: req.params.id },
        data: {
          clientId: req.body.clientId === "" ? null : req.body.clientId,
          planId: req.body.planId === "" ? null : req.body.planId,
          agentId: req.body.agentId === "" ? null : req.body.agentId,
          modelId: req.body.modelId === "" ? null : req.body.modelId,
          scope: req.body.scope,
          enabled: req.body.enabled,
          rebillingEnabled: req.body.rebillingEnabled,
          markupMultiplier: req.body.markupMultiplier,
          monthlyPrice: req.body.monthlyPrice,
          maxRequestsDaily: req.body.maxRequestsDaily,
          maxRequestsMonthly: req.body.maxRequestsMonthly,
          maxTokensDaily: req.body.maxTokensDaily,
          maxTokensMonthly: req.body.maxTokensMonthly,
          maxCreditsDaily: req.body.maxCreditsDaily,
          maxCreditsMonthly: req.body.maxCreditsMonthly,
          settings: req.body.settings,
        },
        include: { model: true, agent: true },
      });
      res.json(entitlement);
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao atualizar cota de IA", details: error?.message });
    }
  });

  router.get("/usage", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const days = Math.min(90, Math.max(1, Number(req.query.days || 30)));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const [events, totals] = await Promise.all([
        prisma.aiUsageLedger.findMany({
          where: { organizationId: orgId, createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.aiUsageLedger.groupBy({
          by: ["agentKey", "modelName", "status"],
          where: { organizationId: orgId, createdAt: { gte: since } },
          _count: { _all: true },
          _sum: { totalTokens: true, credits: true, estimatedCost: true },
        }),
      ]);
      res.json({ events, totals });
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao consultar uso de IA", details: error?.message });
    }
  });

  router.get("/core/health", async (_req: AuthRequest, res) => {
    try {
      const health = await checkAiCoreHealth();
      res.status(health.ok ? 200 : 502).json(health);
    } catch (error: any) {
      res.status(502).json({ ok: false, error: error?.message || "AI Core indisponivel" });
    }
  });

  router.post("/core/chat", async (req: AuthRequest, res) => {
    const startedAt = Date.now();
    const requestId = createAiRequestId();
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const {
      system = "nexus",
      client_id: clientId,
      user_id: userId,
      agent = "crm",
      channel = "nexus",
      message,
      context,
      model,
      temperature,
      max_tokens: maxTokens,
    } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Mensagem obrigatoria para executar o AI Core." });
    }

    try {
      const allowed = await assertAiUsageAllowed(prisma, {
        organizationId: orgId,
        userId: userId || req.user?.id,
        clientId,
        agentKey: agent,
        modelName: model,
        channel,
      });

      const result = await runAiCoreChat({
        system,
        clientId,
        userId: userId || req.user?.id,
        agent,
        channel,
        message,
        context,
        model: allowed.model.modelId,
        temperature,
        maxTokens: maxTokens || allowed.agent?.maxTokens,
      });

      await recordAiUsage(prisma, {
        requestId,
        organizationId: orgId,
        userId: userId || req.user?.id,
        clientId,
        agentKey: agent,
        channel,
        modelName: result.usage.model,
        provider: result.usage.provider,
        tokensIn: result.usage.tokensIn,
        tokensOut: result.usage.tokensOut,
        totalTokens: result.usage.tokens,
        credits: result.usage.credits,
        durationMs: result.usage.latencyMs,
        status: "success",
      }).catch((error) => console.warn("[AI_USAGE_LEDGER_WARN]", error?.message || error));

      await prisma.aiLog.create({
        data: {
          organizationId: orgId,
          userId: req.user?.id,
          agentType: `ai-core:${agent}`,
          prompt: message.slice(0, 12000),
          response: result.response.slice(0, 12000),
          model: result.usage.model,
          tokensIn: result.usage.tokensIn,
          tokensOut: result.usage.tokensOut,
          durationMs: result.usage.latencyMs,
          success: true,
        },
      }).catch((error) => console.warn("[AI_CORE_LOG_WARN]", error?.message || error));

      res.json({
        success: true,
        requestId,
        response: result.response,
        usage: result.usage,
      });
    } catch (error: any) {
      await recordAiUsage(prisma, {
        requestId,
        organizationId: orgId,
        userId: userId || req.user?.id,
        clientId,
        agentKey: agent,
        channel,
        modelName: model || process.env.AI_CORE_DEFAULT_MODEL || "gpt-4o-mini",
        tokensIn: 0,
        tokensOut: 0,
        totalTokens: 0,
        credits: 0,
        durationMs: Date.now() - startedAt,
        status: error?.code === "AI_QUOTA_EXCEEDED" ? "blocked" : "error",
        errorMessage: error?.message || "AI Core indisponivel",
      }).catch((usageError) => console.warn("[AI_USAGE_LEDGER_WARN]", usageError?.message || usageError));

      await prisma.aiLog.create({
        data: {
          organizationId: orgId,
          userId: req.user?.id,
          agentType: `ai-core:${agent}`,
          prompt: String(message).slice(0, 12000),
          response: "",
          model: model || process.env.AI_CORE_DEFAULT_MODEL || "gpt-4o-mini",
          durationMs: Date.now() - startedAt,
          success: false,
          errorMessage: String(error?.message || error).slice(0, 1000),
        },
      }).catch((logError) => console.warn("[AI_CORE_LOG_WARN]", logError?.message || logError));

      res.status(error?.status || 502).json({
        success: false,
        requestId,
        error: "Falha ao executar AI Core",
        details: error?.message || "AI Core indisponivel",
      });
    }
  });

  // Função para transcrever áudio em tempo real usando Groq Whisper
  router.post("/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm" } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "Áudio não fornecido" });
      }

      // Usamos a chave provida ou configurada no painel
      const orgId = (req as any).user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });
      const { groqKey } = await getOrgAIKeys(prisma, orgId);

      // Converter Base64 para Buffer e depois para Blob (Suportado no Node 18+)
      const buffer = Buffer.from(audioBase64, "base64");
      const blob = new Blob([buffer], { type: mimeType });

      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "pt"); // Forçar português para mais precisão
      formData.append("response_format", "json");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Erro no Groq STT:", err);
        return res.status(response.status).json({ error: "Erro na transcrição" });
      }

      const data = await response.json();
      res.json({ text: data.text });
    } catch (error) {
      console.error("[TRANSCRIBE_ERROR]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Função para gerar o feedback do Supervisor ao fim da reunião
  router.post("/meeting-feedback", async (req, res) => {
    try {
      const { transcript } = req.body;

      if (!transcript) {
        return res.status(400).json({ error: "Transcrição não fornecida" });
      }

      const orgId = (req as any).user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const prompt = `Você é um Supervisor de Vendas e Atendimento Sênior avaliando uma reunião.
Abaixo está a transcrição da reunião.
Sua tarefa é analisar a conversa e fornecer um relatório estruturado em JSON com as seguintes chaves:
- "resumo": Um resumo executivo da reunião (max 3 linhas).
- "pontosFortes": Array de strings com os acertos da equipe.
- "pontosMelhoria": Array de strings com críticas construtivas e falhas no atendimento/venda.
- "proximosPassos": Array de strings com as tarefas combinadas.

Retorne APENAS o JSON válido, sem markdown (\`\`\`json), sem textos antes ou depois.

Transcrição:
"""
${transcript}
"""`;

      const { result } = await runGovernedText({
        orgId,
        userId: (req as any).user?.id,
        agent: "meeting-feedback",
        channel: "meeting",
        message: prompt,
        temperature: 0.3,
        maxTokens: 2048,
      });

      const parsedFeedback = JSON.parse(result.response);
      res.json({ feedback: parsedFeedback });
    } catch (error) {
      console.error("[FEEDBACK_ERROR]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Gerador de Conteúdo para Creative Machine
  router.post("/generate-content", async (req, res) => {
    try {
      const { prompt, type } = req.body;
      const orgId = (req as any).user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });
      if (!prompt) return res.status(400).json({ error: "Prompt obrigatorio." });

      const refinedPrompt = `Como um especialista em marketing 360, crie um conteudo do tipo ${type} baseado no seguinte tema: ${prompt}. Retorne em formato markdown puro. Use um tom profissional e persuasivo em Portugues do Brasil.`;
      const { result } = await runGovernedText({
        orgId,
        userId: (req as any).user?.id,
        agent: "content",
        channel: "creative-machine",
        message: refinedPrompt,
        temperature: 0.7,
        maxTokens: 4096,
      });

      return res.json({ text: result.response });
    } catch (error) {
      console.error("[AI_GEN_ERROR]", error);
      res.status(500).json({ error: "Erro interno ao gerar conteúdo" });
    }
  });

  router.post("/agent", async (req: AuthRequest, res) => {
    try {
      const { prompt, input, model = "gemini-1.5-flash" } = req.body;
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      if (!prompt || !input) {
        return res.status(400).json({ error: "Prompt e entrada sÃ£o obrigatÃ³rios." });
      }

      const governed = await runGovernedText({
        orgId,
        userId: req.user?.id,
        agent: req.body.agent || "general",
        channel: "nexus-agent",
        model,
        message: `${prompt}\n\nEntrada do usuÃ¡rio:\n${input}\n\nResponda em portuguÃªs do Brasil com estrutura clara e acionÃ¡vel.`,
        temperature: 0.6,
        maxTokens: 4096,
      });

      return res.json({ result: governed.result.response });
    } catch (error) {
      console.error("[AI_AGENT_ERROR]", error);
      res.status(500).json({ error: "Erro interno ao executar agente" });
    }
  });

  return router;
}
