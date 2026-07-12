import { PrismaClient } from "@prisma/client";

export async function getOrgAIKeys(prisma: PrismaClient, orgId: string) {
  if (!orgId) {
    return {
      groqKey: process.env.GROQ_API_KEY,
      geminiKey: process.env.GEMINI_API_KEY,
      openaiKey: process.env.OPENAI_API_KEY,
      chatgptKey: process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY,
      serperKey: process.env.SERPER_API_KEY,
      togetherKey: process.env.TOGETHER_API_KEY,
    };
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      groqKey: true,
      geminiKey: true,
      serperApiKey: true,
      settings: true,
      aiProvider: true
    }
  });
  const settings = typeof org?.settings === "object" && org?.settings && !Array.isArray(org.settings)
    ? org.settings as Record<string, any>
    : {};

  return {
    groqKey: org?.groqKey || process.env.GROQ_API_KEY,
    geminiKey: org?.geminiKey || process.env.GEMINI_API_KEY,
    openaiKey: settings.openaiKey || process.env.OPENAI_API_KEY,
    chatgptKey: settings.chatgptKey || process.env.CHATGPT_API_KEY || settings.openaiKey || process.env.OPENAI_API_KEY,
    serperKey: org?.serperApiKey || process.env.SERPER_API_KEY,
    togetherKey: settings.togetherKey || process.env.TOGETHER_API_KEY,
    aiProvider: org?.aiProvider || "gemini"
  };
}
