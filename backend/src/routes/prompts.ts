import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { runGovernedAiText } from "../services/aiExecution.js";

export function promptRoutes(prisma: PrismaClient) {
  const router = Router();

  // Rota para Gerar o Prompt Master usando IA
  router.post("/generate", async (req: any, res: any) => {
    const { 
      projectName, 
      promptType, 
      niche, 
      targetAudience, 
      objective, 
      tone, 
      structure, 
      designStyle, 
      colors, 
      advancedFeatures 
    } = req.body;

    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const systemPrompt = `Você é um arquiteto de software e estrategista de marketing digital. Sua missão é criar um PROMPT MASTER em Markdown para ferramentas de desenvolvimento com IA (Cursor, Lovable, Bolt).
      O prompt deve ser extremamente detalhado e técnico.`;

      const userPrompt = `
      Crie um PROMPT MASTER para o projeto: ${projectName}
      Tipo: ${promptType}
      Nicho: ${niche}
      Objetivo: ${objective}
      Público: ${targetAudience}
      Tom de Voz: ${tone}
      Estrutura Necessária: ${Array.isArray(structure) ? structure.join(', ') : structure}
      Estilo Visual: ${designStyle} (Cores: ${colors})
      Recursos Técnicos: ${Array.isArray(advancedFeatures) ? advancedFeatures.join(', ') : advancedFeatures}

      O resultado deve ser um documento Markdown estruturado com: Contexto, Objetivo, UX/UI, Stack Técnica, Funcionalidades Detalhadas, Banco de Dados, Segurança e Critérios de Aceite.
      `;

      const result = await runGovernedAiText(prisma, {
        system: systemPrompt,
        message: userPrompt,
        model: process.env.AI_CORE_PROMPT_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 4096,
        organizationId: orgId,
        userId: req.user?.id,
        agentKey: "prompt-generator",
      });

      const generatedPrompt = result.result.response;

      const savedPrompt = await prisma.generatedPrompt.create({
        data: {
          organizationId: orgId,
          userId: req.user!.id,
          projectName: projectName || "Projeto Sem Nome",
          promptType: promptType || "Personalizado",
          inputData: req.body || {},
          generatedContent: generatedPrompt,
          modelProvider: "ai-core",
          modelName: result.result.usage.model,
        }
      });

      res.json({ success: true, prompt: generatedPrompt, id: savedPrompt.id });
    } catch (error) {
      console.error("[PROMPT_GEN_ERROR]", error);
      res.status(500).json({ error: "Falha ao gerar prompt mestre", details: String(error) });
    }
  });

  // Listar Histórico
  router.get("/history", async (req: any, res: any) => {
    try {
      const history = await prisma.generatedPrompt.findMany({
        where: { organizationId: req.user?.orgId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Falha ao buscar histórico" });
    }
  });

  router.post("/suggest-context", async (req: any, res: any) => {
    const { niche } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const prompt = `Você é um estrategista de negócios experiente. O usuário informou o nicho: "${niche}".
      Com base nisso, devolva um JSON estritamente no seguinte formato:
      {
        "icp": "uma descrição detalhada do cliente ideal (ICP) e suas dores",
        "services": ["Serviço 1", "Serviço 2", "Serviço 3", "Serviço 4", "Serviço 5"]
      }
      Sugira pelo menos 6 serviços comuns e relevantes para este nicho específico.`;

      const result = await runGovernedAiText(prisma, {
        message: prompt,
        model: process.env.AI_CORE_SUGGEST_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 2048,
        organizationId: orgId,
        userId: req.user?.id,
        agentKey: "suggest-context",
      });

      const suggestion = JSON.parse(result.result.response);
      res.json(suggestion);
    } catch (error) {
      console.error("[SUGGEST_ERROR]", error);
      res.status(500).json({ error: "Falha ao sugerir contexto" });
    }
  });

  return router;
}
