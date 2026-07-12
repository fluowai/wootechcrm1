import { PrismaClient } from "@prisma/client";
import { runGovernedAiText } from "./aiExecution.js";

export const creativeAI = {
  generateScript: async (prisma: PrismaClient, theme: string, type: 'carousel' | 'single', orgId: string, userId?: string) => {
    const prompt = `
      Você é o codinome "Mano", o Diretor de Criação e Copywriter mais bem pago do mercado jurídico e de infoprodutos.
      Seu objetivo é criar um carrossel de 5 a 7 slides (ou um post único de impacto) sobre: "${theme}".

      ESTILO DE ESCRITA:
      - Estilo ChatGPT: Texto fluido, inteligente, que educa e vende ao mesmo tempo.
      - Nada de clichês. Use analogias poderosas.
      - Cada slide deve ter uma copy robusta, não apenas uma frase curta.

      ESTRUTURA JSON EXATA (RETORNE APENAS O JSON):
      {
        "slides": [
          { 
            "headline": "Título chamativo", 
            "copy": "Texto longo e persuasivo para o corpo do slide (mínimo 30 palavras)", 
            "cta": "O que o usuário deve fazer",
            "visualConcept": "Descrição em português para o designer do que deve ter na imagem",
            "imagePrompt": "Prompt em inglês para gerador de imagem (DALL-E/Midjourney style)"
          }
        ],
        "overallStrategy": "Breve explicação do porquê esse carrossel vai converter"
      }

      FOCO: Alta conversão, autoridade e elegância.
    `;

    try {
      const result = await runGovernedAiText(prisma, {
        system: "creative-director",
        organizationId: orgId,
        userId,
        agentKey: "creative-director",
        message: prompt,
        temperature: 0.8,
        maxTokens: 4096,
      });

      return JSON.parse(result.result.response || "{}");
    } catch (error) {
      console.error("[CREATIVE_AI_ERROR]", error);
      throw new Error("Erro na geração criativa.");
    }
  }
};
