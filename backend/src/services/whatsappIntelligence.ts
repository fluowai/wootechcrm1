import { PrismaClient } from "@prisma/client";
import { runGovernedAiText } from "./aiExecution.js";
import { getOrgAIKeys } from "../utils/aiKeys.js";

type ClassificationInput = {
  organizationId: string;
  conversationId: string;
  messageId: string;
  isGroup: boolean;
  senderName?: string | null;
  text?: string | null;
  mediaType?: string | null;
  mimeType?: string | null;
  fileUrl?: string | null;
  leadId?: string | null;
};

type ClassificationResult = {
  category: "familiar" | "cliente" | "cliente_sem_fechamento" | "audio" | "midia" | "conversa";
  labels: string[];
  summary: string;
  transcript?: string | null;
  confidence: number;
};

const TAG_COLORS: Record<string, string> = {
  Familiar: "#A855F7",
  Cliente: "#10B981",
  "Cliente sem fechamento": "#F59E0B",
  Audio: "#0EA5E9",
  Midia: "#64748B",
  WhatsApp: "#22C55E",
};

function cleanLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").slice(0, 40);
}

function uniqueLabels(labels: string[]) {
  return Array.from(new Set(labels.map(cleanLabel).filter(Boolean))).slice(0, 4);
}

function parseJsonObject<T = any>(raw: string): T | null {
  const trimmed = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

async function transcribeAudio(groqKey: string | undefined, fileUrl?: string | null, mimeType?: string | null) {
  if (!groqKey || !fileUrl) return null;

  try {
    const media = await fetch(fileUrl);
    if (!media.ok) return null;
    const buffer = await media.arrayBuffer();
    const blob = new Blob([buffer], { type: mimeType || "audio/ogg" });
    const formData = new FormData();
    formData.append("file", blob, "whatsapp-audio.ogg");
    formData.append("model", "whisper-large-v3");
    formData.append("language", "pt");
    formData.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
    });
    if (!response.ok) return null;
    const data = await response.json() as { text?: string };
    return data.text?.trim() || null;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[WHATSAPP_AUDIO_TRANSCRIBE_FALLBACK]", message);
    return null;
  }
}

function fallbackClassification(input: ClassificationInput, transcript?: string | null): ClassificationResult {
  const text = `${input.text || ""} ${transcript || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mediaType = String(input.mediaType || "").toLowerCase();
  const labels = ["WhatsApp"];

  const familyTerms = ["mae", "pai", "filho", "filha", "familia", "irmao", "irma", "tio", "tia", "avo", "prima", "primo"];
  const lostTerms = ["vou pensar", "nao fechou", "nao fechei", "ainda nao", "depois vejo", "sem fechar", "sem retorno", "proposta antiga", "ja conversamos"];
  const clientTerms = ["orcamento", "proposta", "contrato", "cliente", "servico", "reuniao", "preco", "valor", "pagamento", "boleto", "nota fiscal", "projeto"];

  if (familyTerms.some((term) => text.includes(term))) {
    labels.push("Familiar");
    return { category: "familiar", labels: uniqueLabels(labels), summary: "Conversa com sinal de contexto familiar.", transcript, confidence: 0.58 };
  }
  if (lostTerms.some((term) => text.includes(term))) {
    labels.push("Cliente sem fechamento");
    return { category: "cliente_sem_fechamento", labels: uniqueLabels(labels), summary: "Contato aparenta ja ter conversado antes, mas sem fechamento claro.", transcript, confidence: 0.62 };
  }
  if (clientTerms.some((term) => text.includes(term))) {
    labels.push("Cliente");
    return { category: "cliente", labels: uniqueLabels(labels), summary: "Mensagem com sinais comerciais ou de atendimento a cliente.", transcript, confidence: 0.64 };
  }
  if (mediaType === "audio") {
    labels.push("Audio");
    return { category: "audio", labels: uniqueLabels(labels), summary: transcript ? "Audio transcrito e aguardando contexto comercial." : "Audio recebido sem transcricao disponivel.", transcript, confidence: 0.45 };
  }
  if (["image", "video", "document"].includes(mediaType)) {
    labels.push("Midia");
    return { category: "midia", labels: uniqueLabels(labels), summary: "Midia recebida sem texto suficiente para classificar como cliente.", transcript, confidence: 0.4 };
  }
  return { category: "conversa", labels: uniqueLabels(labels), summary: "Conversa individual ainda sem classificacao comercial forte.", transcript, confidence: 0.42 };
}

async function aiClassification(prisma: PrismaClient, input: ClassificationInput, transcript?: string | null) {
  const text = (input.text || transcript || "").trim();
  if (!text) return null;

  const prompt = `Classifique uma mensagem de WhatsApp para CRM/Kanban.
Retorne somente JSON valido com:
category: "familiar" | "cliente" | "cliente_sem_fechamento" | "audio" | "midia" | "conversa"
labels: array com 1 a 3 etiquetas curtas em portugues
summary: resumo em uma frase
confidence: numero entre 0 e 1

Regras:
- "familiar" quando for familia/amigos/contexto pessoal.
- "cliente" quando houver pedido, atendimento, orcamento, contrato, suporte, compra ou interesse comercial.
- "cliente_sem_fechamento" quando parecer lead/cliente que ja conversou, recebeu proposta ou ainda nao fechou negocio.
- Nao force etiqueta de cliente sem evidencia.

Remetente: ${input.senderName || "desconhecido"}
Tipo: ${input.mediaType || "text"}
Mensagem:
${text}`;

  try {
    const result = await runGovernedAiText(prisma, {
      system: "whatsapp-classifier",
      organizationId: input.organizationId,
      clientId: input.leadId || undefined,
      agentKey: "whatsapp-classifier",
      message: prompt,
      temperature: 0.2,
      maxTokens: 1024,
    });
    const parsed = parseJsonObject<ClassificationResult>(result.result.response);
    if (!parsed) return null;
    return {
      category: parsed.category || "conversa",
      labels: uniqueLabels(Array.isArray(parsed.labels) ? parsed.labels : []),
      summary: String(parsed.summary || "").slice(0, 240),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
      transcript,
    } as ClassificationResult;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[WHATSAPP_AI_CLASSIFY_FALLBACK]", message);
    return null;
  }
}


async function upsertTags(prisma: PrismaClient, organizationId: string, labels: string[], taggableId: string, taggableType: string) {
  for (const label of labels) {
    const tag = await prisma.tag.upsert({
      where: { organizationId_name: { organizationId, name: label } },
      update: { color: TAG_COLORS[label] || undefined },
      create: { organizationId, name: label, color: TAG_COLORS[label] || "#64748B" },
    });
    await prisma.taggable.upsert({
      where: { tagId_taggableId_taggableType: { tagId: tag.id, taggableId, taggableType } },
      update: {},
      create: { tagId: tag.id, taggableId, taggableType },
    });
  }
}

export async function tagWhatsAppEntity(prisma: PrismaClient, organizationId: string, labels: string[], taggableId: string, taggableType: "CONVERSATION" | "CONTACT" | "DEAL") {
  const cleanLabels = uniqueLabels(labels);
  await upsertTags(prisma, organizationId, cleanLabels, taggableId, taggableType);

  if (taggableType === "CONTACT") {
    const lead = await prisma.lead.findFirst({
      where: { id: taggableId, organizationId },
      select: { tags: true },
    });
    if (lead) {
      const existingTags = String(lead.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const mergedTags = uniqueLabels([...existingTags, ...cleanLabels]).join(", ");
      await prisma.lead.update({ where: { id: taggableId }, data: { tags: mergedTags } });
    }
  }
}

export async function classifyAndTagWhatsAppConversation(prisma: PrismaClient, input: ClassificationInput) {
  if (input.isGroup) {
    await tagWhatsAppEntity(prisma, input.organizationId, ["WhatsApp"], input.conversationId, "CONVERSATION");
    return { skipped: true, reason: "group" };
  }

  const transcript = String(input.mediaType || "").toLowerCase() === "audio"
    ? await transcribeAudio(process.env.GROQ_API_KEY, input.fileUrl, input.mimeType)
    : null;
  const classification =
    await aiClassification(prisma, input, transcript) ||
    fallbackClassification(input, transcript);
  const labels = uniqueLabels(classification.labels.length ? classification.labels : ["WhatsApp"]);

  await tagWhatsAppEntity(prisma, input.organizationId, labels, input.conversationId, "CONVERSATION");
  if (input.leadId) {
    await tagWhatsAppEntity(prisma, input.organizationId, labels, input.leadId, "CONTACT");
  }

  const existingMessage = await prisma.message.findUnique({
    where: { id: input.messageId },
    select: { metadata: true },
  });
  const existingMetadata = typeof existingMessage?.metadata === "object" && existingMessage.metadata && !Array.isArray(existingMessage.metadata)
    ? existingMessage.metadata as Record<string, any>
    : {};

  await prisma.message.update({
    where: { id: input.messageId },
    data: {
      metadata: {
        ...existingMetadata,
        aiClassification: classification,
        transcript: transcript || undefined,
      },
    },
  });

  return { skipped: false, classification };
}
