import { runGovernedAiText } from "./aiExecution.js";
import { PrismaClient } from "@prisma/client";

interface QuizBriefing {
  name: string;
  description?: string;
  quizType: string;
  offer?: string;
  targetAudience?: string;
  goals?: string;
  questionCount?: number;
  scoringType?: string;
  passScore?: number;
  leadCaptureFields?: string[];
  additionalInstructions?: string;
}

interface GeneratedQuestion {
  text: string;
  type: "multiple_choice" | "multiple_select" | "rating" | "text" | "email" | "phone";
  options?: string[];
  points: number;
  required: boolean;
}

interface GeneratedQuiz {
  name: string;
  description: string;
  quizType: string;
  scoringType: string;
  passScore?: number;
  questions: GeneratedQuestion[];
}

export async function generateQuizWithAi(
  prisma: PrismaClient,
  organizationId: string,
  briefing: QuizBriefing,
): Promise<GeneratedQuiz> {
  const questionCount = Math.min(Math.max(briefing.questionCount || 6, 3), 15);

  const systemPrompt = `Você é um estrategista de marketing e vendas especializado em criar quizzes de qualificação de leads.
Gere quizzes no formato JSON válido, SEMPRE em português do Brasil.
As perguntas devem ser relevantes, envolventes e estrategicamente desenhadas para qualificar leads.
Varie os tipos de pergunta (multiple_choice, rating, text) para manter o engajamento.
Inclua uma pergunta de contato (email ou phone) somente se solicitado nos campos de captura.`;

  const userPrompt = `Crie um quiz de qualificação de leads com as seguintes características:

Nome do Quiz: ${briefing.name}
${briefing.description ? `Descrição: ${briefing.description}` : ""}
Tipo: ${briefing.quizType}
${briefing.offer ? `Oferta/Produto: ${briefing.offer}` : ""}
${briefing.targetAudience ? `Público-alvo: ${briefing.targetAudience}` : ""}
${briefing.goals ? `Objetivos: ${briefing.goals}` : ""}
${briefing.additionalInstructions ? `Instruções adicionais: ${briefing.additionalInstructions}` : ""}
Tipo de scoring: ${briefing.scoringType || "points"}
Número de perguntas: ${questionCount}
Campos de captura: ${(briefing.leadCaptureFields || ["name", "email"]).join(", ")}

Regras:
1. A primeira pergunta deve ser leve e engajadora (quebrar o gelo)
2. Alternar entre perguntas de perfil, dor, orçamento e autoridade
3. Incluir perguntas que ajudem a segmentar o lead (porte, cargo, etc.)
4. Para múltipla escolha, forneça 3-5 opções relevantes
5. Para rating, use escala 1-5 ou 1-10
6. A última pergunta deve ser de contato (nome e email) se "name" e "email" estiverem nos campos de captura

Formato de resposta (JSON puro, sem markdown):
{
  "description": "breve descrição do quiz",
  "questions": [
    {
      "text": "texto da pergunta",
      "type": "multiple_choice" | "rating" | "text" | "email" | "phone",
      "options": ["opção 1", "opção 2", "opção 3"],
      "points": 1,
      "required": true
    }
  ]
}`;

  const { result } = await runGovernedAiText(prisma, {
    organizationId,
    agentKey: "content",
    message: userPrompt,
    system: systemPrompt,
    temperature: 0.7,
    maxTokens: 4096,
    metadata: { feature: "quiz_generation", quizName: briefing.name },
  });

  let parsed: any;
  try {
    const cleaned = result.response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Falha ao gerar quiz com IA. Resposta inválida. Tente novamente.");
  }

  if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("IA não gerou perguntas válidas. Tente com um briefing diferente.");
  }

  const validTypes = ["multiple_choice", "multiple_select", "rating", "text", "email", "phone"];
  const questions: GeneratedQuestion[] = parsed.questions.map((q: any, i: number) => ({
    text: q.text || `Pergunta ${i + 1}`,
    type: validTypes.includes(q.type) ? q.type : "multiple_choice",
    options: Array.isArray(q.options) ? q.options : undefined,
    points: typeof q.points === "number" ? q.points : 1,
    required: q.required !== false,
  }));

  const description = parsed.description || briefing.description || `Quiz: ${briefing.name}`;
  const scoringType = parsed.scoringType || briefing.scoringType || "points";

  return {
    name: briefing.name,
    description,
    quizType: briefing.quizType,
    scoringType,
    passScore: briefing.passScore,
    questions,
  };
}
