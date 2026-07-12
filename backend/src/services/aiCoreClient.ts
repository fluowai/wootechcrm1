type AiCoreMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiCoreChatInput = {
  system?: string;
  clientId?: string;
  userId?: string;
  agent?: string;
  channel?: string;
  message: string;
  context?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type AiCoreChatResult = {
  response: string;
  usage: {
    model: string;
    provider: string;
    tokens: number;
    tokensIn: number;
    tokensOut: number;
    credits: number;
    latencyMs: number;
  };
  raw?: unknown;
};

function aiCoreBaseUrl() {
  const baseUrl = process.env.AI_CORE_URL ||
    (process.env.GROQ_API_KEY ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1");
  return baseUrl.replace(/\/+$/, "");
}

function aiCoreApiKey() {
  return process.env.AI_CORE_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
}

function defaultModel() {
  return process.env.AI_CORE_DEFAULT_MODEL ||
    process.env.GROQ_MODEL ||
    (process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o-mini");
}

function estimateCredits(tokens: number, hasContext: boolean) {
  const base = hasContext ? 3 : 1;
  const tokenMultiplier = Math.max(1, Math.ceil(tokens / 2000));
  return base * tokenMultiplier;
}

function buildMessages(input: AiCoreChatInput): AiCoreMessage[] {
  const contextBlock = input.context && Object.keys(input.context).length
    ? `\n\nContexto operacional:\n${JSON.stringify(input.context, null, 2)}`
    : "";

  const systemPrompt = [
    "Voce e um agente do Nexus360, uma plataforma SaaS multi-tenant de CRM, vendas e operacao comercial.",
    "Responda em portugues do Brasil, com objetividade, seguranca e foco em acao.",
    input.system ? `Sistema consumidor: ${input.system}.` : "",
    input.clientId ? `Cliente/tenant: ${input.clientId}.` : "",
    input.agent ? `Agente solicitado: ${input.agent}.` : "",
    input.channel ? `Canal: ${input.channel}.` : "",
  ].filter(Boolean).join("\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: `${input.message}${contextBlock}` },
  ];
}

export async function runAiCoreChat(input: AiCoreChatInput): Promise<AiCoreChatResult> {
  const startedAt = Date.now();
  const model = input.model || defaultModel();
  const response = await fetch(`${aiCoreBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiCoreApiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(input),
      temperature: input.temperature ?? 0.4,
      max_tokens: input.maxTokens ?? 2048,
    }),
  });

  const rawText = await response.text();
  let data: any = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { raw: rawText };
  }

  if (!response.ok) {
    const details = data?.error?.message || data?.message || rawText || "AI Core indisponivel";
    throw Object.assign(new Error(details), { status: response.status, details: data });
  }

  const content = data?.choices?.[0]?.message?.content || "";
  const tokensIn = Number(data?.usage?.prompt_tokens || 0);
  const tokensOut = Number(data?.usage?.completion_tokens || 0);
  const tokens = Number(data?.usage?.total_tokens || tokensIn + tokensOut || 0);

  return {
    response: content,
    usage: {
      model,
      provider: "ai-core",
      tokens,
      tokensIn,
      tokensOut,
      credits: estimateCredits(tokens, Boolean(input.context && Object.keys(input.context).length)),
      latencyMs: Date.now() - startedAt,
    },
    raw: data,
  };
}

export async function checkAiCoreHealth() {
  const response = await fetch(`${aiCoreBaseUrl()}/models`, {
    headers: { Authorization: `Bearer ${aiCoreApiKey()}` },
  });
  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    baseUrl: aiCoreBaseUrl(),
    models: data?.data || data,
  };
}
