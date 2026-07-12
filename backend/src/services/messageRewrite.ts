import { PrismaClient } from "@prisma/client";
import { runGovernedAiText } from "./aiExecution.js";

type RewriteResult = {
  text: string;
  applied: boolean;
  provider: string | null;
  reason?: string;
};

export class MessageRewriteService {
  constructor(private prisma: PrismaClient) {}

  async rewriteWhatsAppMessage(organizationId: string, text: string): Promise<RewriteResult> {
    const original = String(text || "").trim();
    if (!original) {
      return { text: original, applied: false, provider: null, reason: "empty_message" };
    }

    const systemPrompt = [
      "Reescreva o texto abaixo melhorando clareza, fluidez e impacto, mantendo exatamente o mesmo sentido e intencao original.",
      "",
      "INSTRUCOES OBRIGATORIAS:",
      "- Preserve completamente o significado original.",
      "- Mantenha a formatacao do WhatsApp quando existir.",
      "- Negrito deve continuar com um asterisco antes e depois.",
      "- Italico deve continuar com underscore antes e depois.",
      "- Nao use HTML, Markdown extra ou comentarios.",
      "- Responda apenas com o texto final.",
      "",
      `Texto para reescrever:\n${original}`,
    ].join("\n");

    try {
      const result = await runGovernedAiText(this.prisma, {
        system: systemPrompt,
        message: original,
        model: process.env.AI_CORE_REWRITE_MODEL || "gpt-4o-mini",
        temperature: 0.35,
        maxTokens: 500,
        organizationId,
        agentKey: "message-rewrite",
      });

      const rewritten = result.result.response.trim();
      if (!rewritten) {
        return { text: original, applied: false, provider: "ai-core", reason: "empty_ai_response" };
      }

      return { text: rewritten, applied: rewritten !== original, provider: "ai-core" };
    } catch (error: any) {
      return {
        text: original,
        applied: false,
        provider: "ai-core",
        reason: error?.message || "rewrite_failed",
      };
    }
  }
}
