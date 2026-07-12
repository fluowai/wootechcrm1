import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import {
  displayWhatsAppJid,
  normalizeWhatsAppJid,
  normalizeWhatsAppMentions,
  normalizeWhatsAppPhone,
  pickWhatsAppDisplayName,
  mapWhatsAppMediaType,
  isWhatsAppGroupJid,
  isWhatsAppNewsletterJid,
  cleanWhatsAppMessageText
} from "../utils/whatsapp.js";
import { auditFromRequest } from "../utils/auditLogger.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";
import { classifyAndTagWhatsAppConversation, tagWhatsAppEntity } from "../services/whatsappIntelligence.js";
import { processWhatsappOperationalMessage } from "../services/agencyOperatingSystem.js";
import {
  createDispatchAttempt,
  detectOptOut,
  ensureOptOut,
  getFunnelRuntimeConfig,
  isOptedOut,
  mergeProspectingAgentMemory,
  updateDispatchAttempt,
} from "../services/prospectingAutomation.js";
import {
  bridgeBaseUrl,
  bridgeSecret,
  callBridge,
  callBridgeGet,
  instanceIdentifier,
  normalizeInstanceName,
  whatsappProvider,
} from "../services/whatsappBridge.js";

async function ensureWhatsAppInbox(prisma: PrismaClient, organizationId: string, name = "WhatsApp") {
  const existing = await prisma.inbox.findFirst({ where: { organizationId, name } });
  if (existing) return existing;
  return prisma.inbox.create({ data: { organizationId, name } });
}

function isUnsafeProspectingFirstMessage(message?: string | null, forbiddenTerms: string[] = []) {
  const normalized = String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return [
    "marketing",
    "presenca digital",
    "presenca online",
    "solucoes digitais",
    "solucao digital",
    "tecnologia",
    "atrair mais clientes",
    "captacao de novos clientes",
    "grande potencial",
    "diagnostico",
    "avaliacao",
    "[seu nome]",
    ...forbiddenTerms
  ].some(term => normalized.includes(String(term || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
}

function safeProspectingFirstMessage(runtimeConfig?: ReturnType<typeof getFunnelRuntimeConfig>) {
  const target = runtimeConfig?.targetRoleLabel || "socio, proprietario ou responsavel comercial";
  return `Oi, tudo bem? Poderia me ajudar a falar com ${target} da empresa?`;
}

function parseBusinessHours(value?: string | null) {
  const match = String(value || "08:00-19:00").match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return { startMinutes: 8 * 60, endMinutes: 19 * 60 };
  return {
    startMinutes: Number(match[1]) * 60 + Number(match[2]),
    endMinutes: Number(match[3]) * 60 + Number(match[4]),
  };
}

function isInsideBusinessHours(value?: string | null, now = new Date()) {
  const { startMinutes, endMinutes } = parseBusinessHours(value);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= startMinutes && minutes <= endMinutes;
}

function dayStart(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function recordOutboundProspectingMessage(prisma: PrismaClient, input: {
  channel: any;
  organizationId: string;
  toJid: string;
  content: string;
  run: any;
  userId?: string;
  bridgeMessageId?: string | null;
}) {
  const phone = normalizeWhatsAppPhone(input.toJid);
  let conversation = await prisma.conversation.findFirst({
    where: { channelId: input.channel.id, contactId: input.toJid },
  });

  const metadata = {
    externalChatId: input.toJid,
    isGroup: false,
    phone: phone.e164,
    displayPhone: phone.display,
    displayName: input.run.leadName || phone.display,
    prospectingRunId: input.run.id,
    provider: whatsappProvider(),
  };

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        subject: input.run.leadName || phone.display,
        inboxId: input.channel.inboxId,
        channelId: input.channel.id,
        contactId: input.toJid,
        status: "open",
        priority: "medium",
        lastMessageAt: new Date(),
      } as any,
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: input.userId,
      senderType: "USER",
      content: input.content,
      type: "text",
      metadata: {
        source: "nexus_prospecting",
        bridgeMessageId: input.bridgeMessageId || null,
        fromMe: true,
        displayName: "Voce",
        displayPhone: phone.display,
        prospectingRunId: input.run.id,
        conversation: metadata,
      },
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), subject: input.run.leadName || conversation.subject },
  });

  return message;
}

function cleanParticipantForDisplay(participant: any) {
  const phone = normalizeWhatsAppPhone(participant?.jid || participant?.phoneNumber || participant?.rawJid);
  const name = String(participant?.name || participant?.pushName || participant?.displayName || "").trim();
  return {
    ...participant,
    displayName: name && !name.includes("@") ? name : phone.display,
    displayPhone: phone.display,
  };
}

function cleanMentionForDisplay(mention: any, payload: any) {
  const text = normalizeWhatsAppMentions(`@${mention?.rawJid || mention?.jid || mention?.phone || ""}`, [mention], payload);
  const label = String(text || "").replace(/^@/, "");
  const phone = normalizeWhatsAppPhone(mention?.jid || mention?.rawJid || mention?.phone);
  return {
    ...mention,
    displayName: label || phone.display,
    displayPhone: phone.display,
  };
}

async function logWhatsappWebhook(prisma: PrismaClient, input: {
  organizationId?: string | null;
  channelId?: string | null;
  eventType: string;
  status?: string;
  payload?: any;
  result?: any;
  errorMessage?: string | null;
}) {
  return prisma.whatsappWebhookLog.create({
    data: {
      organizationId: input.organizationId || null,
      channelId: input.channelId || null,
      eventType: input.eventType,
      status: input.status || "received",
      payload: input.payload,
      result: input.result,
      errorMessage: input.errorMessage || null,
    },
  }).catch(() => null);
}

async function logWhatsappConnection(prisma: PrismaClient, input: {
  organizationId: string;
  channelId?: string | null;
  event: string;
  status?: string | null;
  message?: string | null;
  metadata?: any;
}) {
  return prisma.whatsappConnectionLog.create({
    data: {
      organizationId: input.organizationId,
      channelId: input.channelId || null,
      event: input.event,
      status: input.status || null,
      message: input.message || null,
      metadata: input.metadata,
    },
  }).catch(() => null);
}

async function upsertWhatsappContactIdentity(prisma: PrismaClient, input: {
  organizationId: string;
  channelId: string;
  conversationId: string;
  jid: string;
  rawJid?: string | null;
  displayName?: string | null;
  pushName?: string | null;
  profilePictureUrl?: string | null;
  isGroup?: boolean;
  metadata?: any;
}) {
  const phone = input.isGroup ? null : normalizeWhatsAppPhone(input.jid);
  const data = {
    channelId: input.channelId,
    conversationId: input.conversationId,
    rawJid: input.rawJid || input.jid,
    phone: phone?.digits || null,
    displayPhone: phone?.display || null,
    pushName: input.pushName || null,
    displayName: input.displayName || phone?.display || "Contato WhatsApp",
    profilePictureUrl: input.profilePictureUrl || null,
    isGroup: Boolean(input.isGroup),
    metadata: input.metadata,
    lastSeenAt: new Date(),
  };

  return prisma.whatsappContactIdentity.upsert({
    where: { organizationId_jid: { organizationId: input.organizationId, jid: input.jid } },
    update: data,
    create: {
      organizationId: input.organizationId,
      jid: input.jid,
      ...data,
    },
  }).catch(() => null);
}

async function syncGroupParticipants(prisma: PrismaClient, input: {
  organizationId: string;
  channelId: string;
  conversationId: string;
  groupJid: string;
  participants: any[];
}) {
  for (const participant of input.participants || []) {
    const jid = normalizeWhatsAppJid(participant.jid || participant.phoneNumber || participant.rawJid);
    if (!jid) continue;
    const phone = normalizeWhatsAppPhone(jid);
    await prisma.whatsappGroupParticipant.upsert({
      where: {
        organizationId_groupJid_jid: {
          organizationId: input.organizationId,
          groupJid: input.groupJid,
          jid,
        },
      },
      update: {
        channelId: input.channelId,
        conversationId: input.conversationId,
        rawJid: participant.rawJid || participant.jid || null,
        phone: phone.digits || null,
        displayPhone: phone.display || participant.displayPhone || null,
        name: participant.name || null,
        pushName: participant.pushName || null,
        displayName: participant.displayName || participant.name || participant.pushName || phone.display || null,
        pictureUrl: participant.pictureUrl || null,
        isAdmin: Boolean(participant.isAdmin),
        isSuperAdmin: Boolean(participant.isSuperAdmin),
        metadata: participant,
        lastSeenAt: new Date(),
      },
      create: {
        organizationId: input.organizationId,
        channelId: input.channelId,
        conversationId: input.conversationId,
        groupJid: input.groupJid,
        jid,
        rawJid: participant.rawJid || participant.jid || null,
        phone: phone.digits || null,
        displayPhone: phone.display || participant.displayPhone || null,
        name: participant.name || null,
        pushName: participant.pushName || null,
        displayName: participant.displayName || participant.name || participant.pushName || phone.display || null,
        pictureUrl: participant.pictureUrl || null,
        isAdmin: Boolean(participant.isAdmin),
        isSuperAdmin: Boolean(participant.isSuperAdmin),
        metadata: participant,
        lastSeenAt: new Date(),
      },
    }).catch(() => null);
  }
}

async function saveWhatsappMentions(prisma: PrismaClient, organizationId: string, messageId: string, mentions: any[]) {
  for (const mention of mentions || []) {
    const jid = normalizeWhatsAppJid(mention.jid || mention.rawJid || mention.phone);
    const phone = normalizeWhatsAppPhone(jid || mention.phone);
    await prisma.whatsappMention.create({
      data: {
        organizationId,
        messageId,
        mentionedJid: jid || String(mention.jid || mention.rawJid || ""),
        rawJid: mention.rawJid || null,
        phone: phone.digits || null,
        displayPhone: mention.displayPhone || phone.display || null,
        displayName: mention.displayName || null,
        label: mention.displayName || mention.displayPhone || phone.display || null,
        metadata: mention,
      },
    }).catch(() => null);
  }
}

async function findProspectingRunByJid(prisma: PrismaClient, organizationId: string, jid: string) {
  const phone = normalizeWhatsAppJid(jid).split("@")[0];
  if (!phone) return null;

  const runs = await prisma.prospectingRun.findMany({
    where: {
      organizationId,
      channel: "WHATSAPP",
      status: { in: ["queued", "active", "sent"] },
    },
    include: { funnel: { include: { stages: { orderBy: { order: "asc" } } } }, stage: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return runs.find((run) => normalizeWhatsAppPhone(run.leadPhone).digits === phone) || null;
}

async function ensureDirectWhatsAppLead(prisma: PrismaClient, payload: any, conversation: any, displayName: string) {
  if (payload.fromMe || payload.isGroup || isWhatsAppGroupJid(payload.chatJid)) return conversation.leadId || null;

  const phone = normalizeWhatsAppPhone(payload.chatJid);
  if (!phone.digits) return conversation.leadId || null;
  if (conversation.leadId) return conversation.leadId;

  const existing = await prisma.lead.findFirst({
    where: {
      organizationId: payload.organizationId || payload.orgId,
      OR: [
        { whatsapp: phone.e164 },
        { whatsapp: phone.digits },
        { phone: phone.e164 },
        { phone: phone.digits },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { leadId: existing.id },
    });
    return existing.id;
  }

  const lead = await prisma.lead.create({
    data: {
      name: displayName || phone.e164,
      email: `whatsapp-${phone.digits}@nexus360.local`,
      phone: phone.e164,
      whatsapp: phone.e164,
      status: "novo",
      source: "WhatsApp",
      channel: "WHATSAPP",
      tags: "WhatsApp",
      notes: "Lead criado automaticamente a partir de conversa individual do WhatsApp.",
      organizationId: payload.organizationId || payload.orgId,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { leadId: lead.id },
  });
  emitAutomationEvent("lead.created", { organizationId: lead.organizationId, leadId: lead.id, lead });
  return lead.id;
}

async function upsertInboundWhatsAppMessage(prisma: PrismaClient, payload: any) {
  const organizationId = payload.organizationId || payload.orgId;
  const channelId = payload.channelId;
  const chatJid = normalizeWhatsAppJid(payload.chatJid);
  if (isWhatsAppNewsletterJid(chatJid)) {
    return { ignored: true, reason: "newsletter" };
  }
  if (!organizationId || !channelId || !chatJid) {
    throw new Error("organizationId, channelId e chatJid sao obrigatorios");
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, inbox: { organizationId } },
    include: { inbox: true },
  });
  if (!channel) throw new Error("Canal WhatsApp nao encontrado");

  const isGroup = !!payload.isGroup || isWhatsAppGroupJid(chatJid);
  const displayName = pickWhatsAppDisplayName(payload);
  const mediaType = mapWhatsAppMediaType(payload.message?.type, payload.message?.mimeType);
  const prospectingRun = await findProspectingRunByJid(prisma, organizationId, chatJid);
  const messageContent = cleanWhatsAppMessageText(
    normalizeWhatsAppMentions(payload.message?.content, payload.mentionedJids || [], payload),
    mediaType
  );
  const messageCaption = cleanWhatsAppMessageText(
    normalizeWhatsAppMentions(payload.message?.caption, payload.mentionedJids || [], payload),
    mediaType
  );
  const chatPhone = isGroup ? null : normalizeWhatsAppPhone(chatJid);
  const senderPhone = payload.senderJid ? normalizeWhatsAppPhone(payload.senderJid) : null;
  const participants = (payload.participants || payload.group?.participants || []).map(cleanParticipantForDisplay);
  const mentionedJids = (payload.mentionedJids || []).map((mention: any) => cleanMentionForDisplay(mention, payload));

  let conversation = await prisma.conversation.findFirst({
    where: { channelId, contactId: chatJid },
  });

  const conversationMetadata = {
    externalChatId: chatJid,
    isGroup,
    phone: chatPhone?.e164 || null,
    displayPhone: chatPhone?.display || null,
    senderPhone: senderPhone?.e164 || null,
    senderDisplayPhone: senderPhone?.display || null,
    pushName: payload.pushName || payload.senderPushName || null,
    displayName,
    profilePictureUrl: payload.profilePictureUrl || payload.group?.pictureUrl || null,
    group: payload.group ? { ...payload.group, displayName: payload.group.name || displayName } : null,
    participants,
    mentionedJids,
    prospectingRunId: prospectingRun?.id || null,
    provider: whatsappProvider(),
  };

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        subject: displayName,
        inboxId: channel.inboxId,
        channelId,
        contactId: chatJid,
        status: "open",
        priority: prospectingRun ? "high" : "medium",
        lastMessageAt: payload.message?.timestamp ? new Date(payload.message.timestamp) : new Date(),
      } as any,
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        subject: displayName,
        status: conversation.status === "closed" ? "open" : conversation.status,
        lastMessageAt: payload.message?.timestamp ? new Date(payload.message.timestamp) : new Date(),
      } as any,
    });
  }

  await upsertWhatsappContactIdentity(prisma, {
    organizationId,
    channelId,
    conversationId: conversation.id,
    jid: chatJid,
    rawJid: payload.chatJid,
    displayName,
    pushName: payload.pushName || payload.senderPushName || null,
    profilePictureUrl: conversationMetadata.profilePictureUrl,
    isGroup,
    metadata: conversationMetadata,
  });
  if (isGroup) {
    await syncGroupParticipants(prisma, {
      organizationId,
      channelId,
      conversationId: conversation.id,
      groupJid: chatJid,
      participants,
    });
  }

  const messageId = payload.message?.id || payload.messageId;
  if (messageId) {
    const recent = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const exists = recent.some((msg) => (msg.metadata as any)?.externalMessageId === messageId);
    if (exists) return { conversation, duplicate: true };
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: payload.fromMe ? "USER" : "CONTACT",
      content: messageContent || messageCaption || null,
      type: mediaType,
      fileUrl: payload.message?.fileUrl || null,
      metadata: {
        externalMessageId: messageId,
        chatJid,
        senderJid: payload.senderJid,
        rawSenderJid: payload.rawSenderJid || null,
        pushName: payload.pushName || payload.senderPushName || null,
        displayName: payload.fromMe ? "Voce" : displayName,
        displayPhone: senderPhone?.display || chatPhone?.display || null,
        fromMe: !!payload.fromMe,
        mimeType: payload.message?.mimeType || null,
        fileName: payload.message?.fileName || null,
        fileSize: payload.message?.fileSize || null,
        mediaSha256: payload.message?.mediaSha256 || null,
        rawType: payload.message?.type || null,
        mentionedJids,
        prospectingRunId: prospectingRun?.id || null,
        conversation: conversationMetadata,
      },
      createdAt: payload.message?.timestamp ? new Date(payload.message.timestamp) : new Date(),
    },
  });
  await saveWhatsappMentions(prisma, organizationId, message.id, mentionedJids);

  const intelligence = await classifyAndTagWhatsAppConversation(prisma, {
    organizationId,
    conversationId: conversation.id,
    messageId: message.id,
    isGroup: !!payload.isGroup || isWhatsAppGroupJid(chatJid),
    senderName: payload.pushName || payload.senderPushName || null,
    text: messageContent || messageCaption,
    mediaType,
    mimeType: payload.message?.mimeType || null,
    fileUrl: payload.message?.fileUrl || null,
    leadId: conversation.leadId || null,
  }).catch((error: any) => {
    console.warn("[WHATSAPP_INTELLIGENCE_SKIPPED]", error?.message || error);
    return null;
  });
  const category = (intelligence as any)?.classification?.category;
  const labels = (intelligence as any)?.classification?.labels || ["WhatsApp"];
  const transcript = (intelligence as any)?.classification?.transcript || null;
  const operationalText = [messageContent || messageCaption, transcript]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n\nTranscricao do audio:\n");
  const shouldCreateLead = !payload.fromMe
    && !payload.isGroup
    && !isWhatsAppGroupJid(chatJid)
    && ["cliente", "cliente_sem_fechamento"].includes(category);
  const leadId = shouldCreateLead
    ? await ensureDirectWhatsAppLead(prisma, { ...payload, organizationId, chatJid }, conversation, displayName)
    : conversation.leadId || null;
  if (leadId) {
    await tagWhatsAppEntity(prisma, organizationId, labels, leadId, "CONTACT");
  }

  if (!payload.fromMe) {
    await processWhatsappOperationalMessage(prisma, {
      organizationId,
      conversationId: conversation.id,
      messageId: message.id,
      leadId,
      text: operationalText,
      mediaType,
      fileUrl: payload.message?.fileUrl || null,
      senderName: payload.pushName || payload.senderPushName || displayName,
    }).catch((error: any) => {
      console.warn("[WHATSAPP_OPERATIONAL_INTAKE_SKIPPED]", error?.message || error);
      return null;
    });
    emitAutomationEvent("whatsapp.message.received", {
      organizationId,
      conversationId: conversation.id,
      messageId: message.id,
      leadId,
      text: operationalText,
      mediaType,
    });
  }

  if (prospectingRun && !payload.fromMe) {
    const runtimeConfig = getFunnelRuntimeConfig((prospectingRun as any).funnel);
    const optedOut = detectOptOut(messageContent || messageCaption, runtimeConfig.stopWords);
    const currentOrder = (prospectingRun as any).stage?.order ?? 0;
    const nextStage = (prospectingRun as any).funnel?.stages?.find((stage: any) => stage.order > currentOrder) || (prospectingRun as any).stage;
    const inboundText = messageContent || messageCaption || "";
    const previousQualification = (prospectingRun.qualification as any) || {};
    const pendingInboundMessages = [
      ...(
        Array.isArray(previousQualification.pendingInboundMessages)
          ? previousQualification.pendingInboundMessages
          : []
      ),
      {
        text: inboundText,
        messageId: message.id,
        conversationId: conversation.id,
        receivedAt: new Date().toISOString(),
      },
    ].filter((item) => String(item.text || "").trim()).slice(-8);
    const nextAction = optedOut ? "stop_contact" : "lead_replied_buffering";
    const summary = optedOut
      ? "Lead pediu para interromper o contato."
      : "Lead respondeu no WhatsApp. Proxima fase deve usar todo o historico e continuar com uma pergunta objetiva.";
    if (optedOut) {
      await ensureOptOut(prisma, {
        organizationId,
        phone: payload.senderJid || chatJid,
        reason: messageContent || messageCaption || "opt-out recebido",
        source: "whatsapp_inbound",
        conversationId: conversation.id,
        messageId: message.id,
        metadata: { prospectingRunId: prospectingRun.id },
      });
    }
    await prisma.prospectingRun.update({
      where: { id: prospectingRun.id },
      data: {
        status: optedOut ? "stopped" : "active",
        stageId: optedOut ? (prospectingRun as any).stageId : nextStage?.id,
        lastContactAt: new Date(),
        nextAction,
        lastAiSummary: summary,
        qualification: {
          ...mergeProspectingAgentMemory(previousQualification, {
            currentStage: (prospectingRun as any).stage,
            nextStage: optedOut ? (prospectingRun as any).stage : nextStage,
            leadMessage: inboundText,
            intent: optedOut ? "opt_out" : "respondeu_whatsapp",
            status: optedOut ? "stopped" : "active",
            nextAction,
            summary,
            conversationId: conversation.id,
            messageId: message.id,
          }),
          lastConversationId: conversation.id,
          lastMessageId: message.id,
          pendingInboundMessages: optedOut ? [] : pendingInboundMessages,
          bufferedUntil: optedOut ? null : new Date(Date.now() + Number(process.env.PROSPECTING_INBOUND_BUFFER_MS || 12000)).toISOString(),
          optOut: optedOut,
        },
      },
    });
  }

  return { conversation, message };
}

export function whatsappRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/connections", async (req: AuthRequest, res, next) => {
    try {
      const channels = await prisma.channel.findMany({
        where: { provider: whatsappProvider(), inbox: { organizationId: req.user!.orgId } },
        include: { inbox: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(channels);
    } catch (error) { next(error); }
  });

  router.post("/connections", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const label = normalizeInstanceName(req.body.label || req.body.name || req.body.inboxName);
      if (!label) return res.status(400).json({ error: "Nome da instancia obrigatorio" });

      const normalized = req.body.phone || req.body.identifier
        ? normalizeWhatsAppPhone(req.body.phone || req.body.identifier)
        : null;
      const identifier = normalized?.digits ? normalized.e164 : instanceIdentifier(label);

      const inbox = await ensureWhatsAppInbox(prisma, orgId, req.body.inboxName || label);
      const existing = await prisma.channel.findFirst({
        where: { provider: whatsappProvider(), identifier, inbox: { organizationId: orgId } },
      });
      if (existing) return res.json(existing);

      const channel = await prisma.channel.create({
        data: {
          type: "WHATSAPP",
          provider: whatsappProvider(),
          identifier,
          inboxId: inbox.id,
          config: {
            status: "created",
            instanceOnly: !normalized?.digits,
            phone: normalized?.digits ? normalized.e164 : null,
            jid: normalized?.digits ? normalized.jid : null,
            qrCode: null,
            pushName: null,
            profilePictureUrl: null,
            label,
            bridgeUrl: bridgeBaseUrl(),
          },
        },
      });

      auditFromRequest(req, "CREATE", "WhatsAppConnection", channel.id);
      res.status(201).json(channel);
    } catch (error) { next(error); }
  });

  router.patch("/connections/:id", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: whatsappProvider(), inbox: { organizationId: req.user!.orgId } },
        include: { inbox: true },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      const normalized = req.body.phone || req.body.identifier
        ? normalizeWhatsAppPhone(req.body.phone || req.body.identifier)
        : null;
      const config = {
        ...((channel.config as any) || {}),
        ...(req.body.label !== undefined ? { label: req.body.label } : {}),
        ...(normalized?.digits ? { phone: normalized.e164, jid: normalized.jid } : {}),
      };

      if (req.body.inboxName && req.body.inboxName !== channel.inbox.name) {
        await prisma.inbox.update({ where: { id: channel.inboxId }, data: { name: String(req.body.inboxName) } });
      }

      const updated = await prisma.channel.update({
        where: { id: channel.id },
        data: {
          ...(normalized?.digits ? { identifier: normalized.e164 } : {}),
          ...(req.body.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {}),
          config,
        },
        include: { inbox: { select: { id: true, name: true } } },
      });

      res.json(updated);
    } catch (error) { next(error); }
  });

  router.post("/connections/:id/status", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: whatsappProvider(), inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      const result = await callBridgeGet(`/sessions/${channel.id}/status`);
      res.json(result);
    } catch (error) { next(error); }
  });

  router.get("/connections/:id/logs", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: whatsappProvider(), inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      const logs = await prisma.whatsappConnectionLog.findMany({
        where: { organizationId: req.user!.orgId, channelId: channel.id },
        orderBy: { createdAt: "desc" },
        take: Number(req.query.limit || 100),
      });
      res.json(logs);
    } catch (error) { next(error); }
  });

  router.post("/connections/:id/connect", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: whatsappProvider(), inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      await prisma.channel.update({
        where: { id: channel.id },
        data: {
          isActive: true,
          config: {
            ...((channel.config as any) || {}),
            status: "connecting",
            qrCode: null,
            qrPng: null,
            lastConnectRequestedAt: new Date().toISOString(),
          },
        },
      });

      const channelConfig = (channel.config as any) || {};
      const result = await callBridge(`/sessions/${channel.id}/connect`, {
        organizationId: req.user!.orgId,
        channelId: channel.id,
        phone: channelConfig.phone || (String(channel.identifier || "").startsWith("instance:") ? "" : channel.identifier),
        connectedJid: channelConfig.connectedJid || "",
      }).catch(async (error: any) => {
        await prisma.channel.update({
          where: { id: channel.id },
          data: {
            config: {
              ...((channel.config as any) || {}),
              status: "error",
              qrCode: null,
              qrPng: null,
              lastConnectError: error?.message || "Erro ao gerar QR Code",
              lastConnectErrorAt: new Date().toISOString(),
            },
          },
        });
        return { ok: false, status: "error", error: error?.message || "Erro ao gerar QR Code" };
      });
      res.json(result);
    } catch (error) { next(error); }
  });

  router.post("/connections/:id/disconnect", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: whatsappProvider(), inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      const result = await callBridge(`/sessions/${channel.id}/disconnect`, { channelId: channel.id });
      await prisma.channel.update({
        where: { id: channel.id },
        data: { config: { ...((channel.config as any) || {}), status: "disconnected", qrCode: null } },
      });
      res.json(result);
    } catch (error) { next(error); }
  });

  router.delete("/connections/:id", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: whatsappProvider(), inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      await callBridge(`/sessions/${channel.id}/delete`, { channelId: channel.id }).catch(() => null);
      const config = {
        ...((channel.config as any) || {}),
        status: "deleted",
        qrCode: null,
        qrPng: null,
        deletedAt: new Date().toISOString(),
      };
      await prisma.channel.update({ where: { id: channel.id }, data: { isActive: false, config } });
      auditFromRequest(req, "DELETE", "WhatsAppConnection", channel.id);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });

  router.get("/conversations", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const kind = String(req.query.kind || "all");
      const onlyProspecting = String(req.query.prospecting || "") === "1";
      const conversations = await prisma.conversation.findMany({
        where: {
          inbox: { organizationId: orgId },
          channel: { provider: whatsappProvider() },
          ...(req.query.channelId ? { channelId: String(req.query.channelId) } : {}),
          ...(req.query.status ? { status: String(req.query.status) } : {}),
          ...(kind === "groups" ? { contactId: { endsWith: "@g.us" } } : {}),
          ...(kind === "direct" ? { contactId: { endsWith: "@s.whatsapp.net" } } : {}),
          NOT: [{ contactId: { contains: "@newsletter" } }],
        },
        include: {
          channel: { select: { id: true, identifier: true, config: true } },
          messages: { take: 1, orderBy: { createdAt: "desc" } },
          _count: { select: { messages: true } },
        },
        orderBy: { lastMessageAt: "desc" },
      });
      const mapped = conversations.map((conversation) => {
        const latestMessage = conversation.messages?.[0];
        const messageMetadata = latestMessage?.metadata as any;
        return {
          ...conversation,
          metadata: messageMetadata?.conversation || {
            externalChatId: conversation.contactId,
            isGroup: isWhatsAppGroupJid(conversation.contactId),
            phone: isWhatsAppGroupJid(conversation.contactId) ? null : normalizeWhatsAppPhone(conversation.contactId).e164,
            displayPhone: displayWhatsAppJid(conversation.contactId),
            pushName: null,
            displayName: conversation.subject,
            profilePictureUrl: null,
            group: null,
            participants: [],
            provider: whatsappProvider(),
          },
        };
      });

      res.json(onlyProspecting
        ? mapped.filter((conversation: any) => Boolean(conversation.metadata?.prospectingRunId || conversation.messages?.[0]?.metadata?.prospectingRunId))
        : mapped);
    } catch (error) { next(error); }
  });

  router.get("/conversations/:id/messages", async (req: AuthRequest, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId }, channel: { provider: whatsappProvider() } },
        select: { id: true },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa nao encontrada" });
      const messages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" } });
      res.json(messages);
    } catch (error) { next(error); }
  });

  /**
   * POST /conversations/start-sdr
   * Cria (ou recupera) uma conversa interna para o lead e registra
   * o script SDR como primeira mensagem — sem abrir link externo.
   */
  router.post("/conversations/start-sdr", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { phone, businessName, script, capturedLeadId } = req.body;

      if (!phone) return res.status(400).json({ error: "Telefone obrigatorio" });

      // Normaliza o telefone para JID do WhatsApp
      const normalized = normalizeWhatsAppPhone(phone);
      const contactJid = normalized.jid || `${normalized.digits}@s.whatsapp.net`;

      // Busca o canal WhatsApp ativo da organização
      const channel = await prisma.channel.findFirst({
        where: {
          provider: whatsappProvider(),
          isActive: true,
          inbox: { organizationId: orgId },
        },
        include: { inbox: true },
        orderBy: { createdAt: "desc" },
      });

      if (!channel) {
        return res.status(400).json({
          error: "Nenhuma conexão WhatsApp ativa. Conecte um número em Comunicação > WhatsApp antes de iniciar a abordagem.",
        });
      }

      // Cria ou recupera a conversa existente para este contato
      let conversation = await prisma.conversation.findFirst({
        where: { channelId: channel.id, contactId: contactJid },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            subject: businessName || contactJid,
            inboxId: channel.inboxId,
            channelId: channel.id,
            contactId: contactJid,
            status: "open",
            priority: "high",
            lastMessageAt: new Date(),
            metadata: capturedLeadId ? { capturedLeadId, source: "sdr_approach" } : { source: "sdr_approach" },
          } as any,
        });
      } else {
        // Reabre se estava fechada
        if (conversation.status === "closed") {
          conversation = await prisma.conversation.update({
            where: { id: conversation.id },
            data: { status: "open", lastMessageAt: new Date() },
          });
        }
      }

      // Registra o script como mensagem interna (tipo USER = enviada pelo SDR)
      const firstMessage = script || `Olá! Aqui é o SDR entrando em contato com ${businessName || "vocês"}.`;

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          senderType: "USER",
          content: firstMessage,
          type: "text",
          metadata: {
            source: "nexus_sdr_approach",
            capturedLeadId: capturedLeadId || null,
            fromMe: true,
            displayName: "Você (SDR)",
            sdrInitiated: true,
          },
          createdAt: new Date(),
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // Tenta enviar pelo WhatsApp Bridge (não bloqueia se falhar)
      callBridge(`/sessions/${channel.id}/send`, {
        channelId: channel.id,
        to: contactJid,
        message: firstMessage,
      }).then(async (bridge: any) => {
        // Atualiza a mensagem com o ID do bridge se conseguir enviar
        await prisma.message.update({
          where: { id: message.id },
          data: { metadata: { source: "nexus_sdr_approach", capturedLeadId: capturedLeadId || null, fromMe: true, displayName: "Você (SDR)", sdrInitiated: true, bridgeMessageId: bridge?.messageId || null } },
        }).catch(() => {});
      }).catch(() => {
        // Silencia: a mensagem já está registrada internamente mesmo sem WhatsApp conectado
      });

      res.status(201).json({
        conversationId: conversation.id,
        messageId: message.id,
        redirectUrl: `/comunicacao/whatsapp?tab=messages&conversationId=${conversation.id}`,
      });
    } catch (error) { next(error); }
  });

  router.get("/prospecting/dispatch-attempts", async (req: AuthRequest, res, next) => {
    try {
      const attempts = await prisma.prospectingDispatchAttempt.findMany({
        where: {
          organizationId: req.user!.orgId,
          ...(req.query.runId ? { runId: String(req.query.runId) } : {}),
          ...(req.query.status ? { status: String(req.query.status) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: Number(req.query.limit || 100),
      });
      res.json(attempts);
    } catch (error) { next(error); }
  });

  router.get("/prospecting/opt-outs", async (req: AuthRequest, res, next) => {
    try {
      const records = await prisma.prospectingOptOutContact.findMany({
        where: { organizationId: req.user!.orgId },
        orderBy: { createdAt: "desc" },
        take: Number(req.query.limit || 100),
      });
      res.json(records);
    } catch (error) { next(error); }
  });

  router.post("/prospecting/opt-outs", async (req: AuthRequest, res, next) => {
    try {
      if (!req.body.phone) return res.status(400).json({ error: "Telefone obrigatorio" });
      const record = await ensureOptOut(prisma, {
        organizationId: req.user!.orgId,
        phone: req.body.phone,
        reason: req.body.reason || "Opt-out manual",
        source: "manual",
        metadata: { userId: req.user!.id },
      });
      res.status(201).json(record);
    } catch (error) { next(error); }
  });

  router.post("/conversations/:id/messages", async (req: AuthRequest, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId }, channel: { provider: whatsappProvider() } },
        include: { channel: true },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa nao encontrada" });
      if (!req.body.content) return res.status(400).json({ error: "Mensagem obrigatoria" });

      const result = await callBridge(`/sessions/${conversation.channelId}/send`, {
        channelId: conversation.channelId,
        to: conversation.contactId,
        message: req.body.content,
      });

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          senderType: "USER",
          content: req.body.content,
          type: "text",
          metadata: { source: "nexus_web", bridgeMessageId: result.messageId || null, fromMe: true },
        },
      });
      await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
      res.json(message);
    } catch (error) { next(error); }
  });

  router.post("/send", async (req: AuthRequest, res, next) => {
    try {
      const { channelId, to, message } = req.body;
      if (!channelId) return res.status(400).json({ error: "channelId obrigatorio" });
      if (!to) return res.status(400).json({ error: "Destinatario (to) obrigatorio" });
      if (!message) return res.status(400).json({ error: "Mensagem obrigatoria" });

      const channel = await prisma.channel.findFirst({
        where: { id: channelId, provider: whatsappProvider(), inbox: { organizationId: req.user!.orgId } },
        include: { inbox: true },
      });
      if (!channel) return res.status(404).json({ error: "Canal WhatsApp nao encontrado" });

      const bridge = await callBridge(`/sessions/${channel.id}/send`, {
        channelId: channel.id,
        to,
        message,
      });

      let conversation = await prisma.conversation.findFirst({
        where: { channelId: channel.id, contactId: to },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            subject: to,
            inboxId: channel.inboxId,
            channelId: channel.id,
            contactId: to,
            status: "open",
            priority: "medium",
            lastMessageAt: new Date(),
          } as any,
        });
      }

      const msg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          senderType: "USER",
          content: message,
          type: "text",
          metadata: { source: "nexus_web", bridgeMessageId: bridge.messageId || null, fromMe: true },
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      res.json(msg);
    } catch (error) { next(error); }
  });

  router.post("/prospecting/dispatch", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const selectedChannelId = req.body.channelId ? String(req.body.channelId) : null;
      const channel = await prisma.channel.findFirst({
        where: {
          provider: whatsappProvider(),
          isActive: true,
          inbox: { organizationId: orgId },
          ...(selectedChannelId ? { id: selectedChannelId } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      if (!channel) return res.status(400).json({ error: selectedChannelId ? "Instancia WhatsApp selecionada indisponivel" : "Conecte um WhatsApp antes de disparar o funil IA" });

      const runIds = Array.isArray(req.body.runIds) ? req.body.runIds : [];
      const runs = await prisma.prospectingRun.findMany({
        where: {
          organizationId: orgId,
          channel: "WHATSAPP",
          status: { in: ["queued", "active"] },
          ...(runIds.length ? { id: { in: runIds } } : {}),
        },
        include: { funnel: { include: { stages: { orderBy: { order: "asc" } } } }, stage: true },
        take: Number(req.body.limit || 25),
        orderBy: { createdAt: "asc" },
      });

      const sent = [];
      const failed = [];
      const maxDailyMessages = Number(req.body.maxDailyMessages || (channel.config as any)?.maxDailyMessages || 50);
      const alreadySentToday = await prisma.prospectingRun.count({
        where: {
          organizationId: orgId,
          channel: "WHATSAPP",
          status: { in: ["sent", "active", "human_handoff", "qualified"] },
          lastContactAt: { gte: dayStart() },
        },
      });
      for (const run of runs) {
        const safetyRules = (run.funnel?.safetyRules as any) || {};
        const runtimeConfig = getFunnelRuntimeConfig(run.funnel);
        const messageLimit = Number(req.body.maxDailyMessages || (channel.config as any)?.maxDailyMessages || runtimeConfig.maxDailyMessagesPerOrganization || maxDailyMessages);
        const firstMessage = isUnsafeProspectingFirstMessage(run.firstMessage, runtimeConfig.forbiddenFirstMessageTerms)
          ? safeProspectingFirstMessage(runtimeConfig)
          : run.firstMessage;
        const attempt = await createDispatchAttempt(prisma, {
          organizationId: orgId,
          run,
          channelId: channel.id,
          message: firstMessage || "",
          status: "queued",
          metadata: { safetyRules, runtimeConfig },
        });

        if (alreadySentToday + sent.length >= messageLimit) {
          await updateDispatchAttempt(prisma, attempt.id, { status: "blocked", reason: "Limite diario de mensagens atingido para esta organizacao" });
          failed.push({ id: run.id, error: "Limite diario de mensagens atingido para esta organizacao" });
          continue;
        }
        if (!isInsideBusinessHours(runtimeConfig.businessHours)) {
          await updateDispatchAttempt(prisma, attempt.id, { status: "skipped", reason: `Fora do horario comercial (${runtimeConfig.businessHours})` });
          failed.push({ id: run.id, error: `Fora do horario comercial (${safetyRules.businessHours || "08:00-19:00"})` });
          continue;
        }
        const phone = normalizeWhatsAppPhone(run.leadPhone);
        if (!phone.jid || !phone.isValid || !run.firstMessage) {
          await updateDispatchAttempt(prisma, attempt.id, { status: "failed", reason: "Lead sem telefone valido ou mensagem" });
          failed.push({ id: run.id, error: "Lead sem telefone ou mensagem" });
          continue;
        }
        if (await isOptedOut(prisma, orgId, phone.digits)) {
          await updateDispatchAttempt(prisma, attempt.id, { status: "blocked", reason: "Contato em opt-out" });
          await prisma.prospectingRun.update({
            where: { id: run.id },
            data: { status: "stopped", nextAction: "opt_out_blocked" },
          });
          failed.push({ id: run.id, error: "Contato em opt-out" });
          continue;
        }
        const leadSentToday = await prisma.prospectingDispatchAttempt.count({
          where: {
            organizationId: orgId,
            runId: run.id,
            status: "sent",
            createdAt: { gte: dayStart() },
          },
        });
        if (leadSentToday >= runtimeConfig.maxDailyMessagesPerLead) {
          await updateDispatchAttempt(prisma, attempt.id, { status: "blocked", reason: "Limite diario por lead atingido" });
          failed.push({ id: run.id, error: "Limite diario por lead atingido" });
          continue;
        }
        try {
          const bridge = await callBridge(`/sessions/${channel.id}/send`, {
            channelId: channel.id,
            to: phone.jid,
            message: firstMessage,
          });
          await recordOutboundProspectingMessage(prisma, {
            channel,
            organizationId: orgId,
            toJid: phone.jid,
            content: firstMessage || "",
            run,
            userId: req.user?.id,
            bridgeMessageId: bridge.messageId || null,
          });
          await prisma.prospectingRun.update({
            where: { id: run.id },
            data: {
              status: "sent",
              firstMessage,
              lastContactAt: new Date(),
              nextAction: "wait_lead_reply",
              qualification: {
                ...mergeProspectingAgentMemory((run.qualification as any) || {}, {
                  currentStage: (run as any).stage,
                  nextStage: (run as any).stage,
                  aiMessage: firstMessage || "",
                  status: "sent",
                  nextAction: "wait_lead_reply",
                  summary: "Primeira mensagem enviada. Aguardar resposta antes de avancar abordagem.",
                }),
                bridgeMessageId: bridge.messageId || null,
              },
            },
          });
          await updateDispatchAttempt(prisma, attempt.id, {
            status: "sent",
            bridgeMessageId: bridge.messageId || null,
            sentAt: new Date(),
            metadata: { bridge },
          });
          sent.push(run.id);
        } catch (err: any) {
          await updateDispatchAttempt(prisma, attempt.id, { status: "failed", reason: err.message });
          failed.push({ id: run.id, error: err.message });
        }
      }

      res.json({ sent, failed });
    } catch (error) { next(error); }
  });

  return router;
}

export function whatsappInternalRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post("/events", async (req, res, next) => {
    try {
      if (req.headers["x-whatsapp-bridge-secret"] !== bridgeSecret()) {
        return res.status(401).json({ error: "INVALID_BRIDGE_SECRET" });
      }

      const payload = req.body || {};
      await logWhatsappWebhook(prisma, {
        organizationId: payload.organizationId || payload.orgId || null,
        channelId: payload.channelId || null,
        eventType: payload.type || "unknown",
        status: "received",
        payload,
      });
      if (payload.type === "status") {
        const channel = await prisma.channel.findUnique({ where: { id: payload.channelId } });
        if (channel) {
          const currentConfig = (channel.config as any) || {};
          const errorMessage = payload.error || payload.message || null;
          await prisma.channel.update({
            where: { id: channel.id },
            data: {
              config: {
                ...currentConfig,
                status: payload.status,
                qrCode: payload.qrCode || null,
                qrPng: payload.qrPng || null,
                pushName: payload.pushName || currentConfig.pushName || null,
                profilePictureUrl: payload.profilePictureUrl || currentConfig.profilePictureUrl || null,
                connectedJid: payload.connectedJid || currentConfig.connectedJid || null,
                lastConnectError: payload.status === "error" ? String(errorMessage || "Erro ao gerar QR Code") : null,
                lastConnectErrorAt: payload.status === "error" ? new Date().toISOString() : null,
                lastEventAt: new Date().toISOString(),
              },
            },
          });
          if (payload.organizationId) {
            await logWhatsappConnection(prisma, {
              organizationId: payload.organizationId,
              channelId: channel.id,
              event: "status",
              status: payload.status,
              metadata: payload,
            });
          }
        }
        return res.json({ ok: true });
      }

      if (payload.type === "message") {
        const result = await upsertInboundWhatsAppMessage(prisma, payload);
        await logWhatsappWebhook(prisma, {
          organizationId: payload.organizationId || payload.orgId || null,
          channelId: payload.channelId || null,
          eventType: "message",
          status: (result as any).ignored ? "ignored" : "processed",
          result,
        });
        return res.json({
          ok: true,
          ignored: (result as any).ignored || false,
          conversationId: (result as any).conversation?.id || null,
          duplicate: (result as any).duplicate || false
        });
      }

      res.json({ ok: true, ignored: true });
    } catch (error) { next(error); }
  });

  return router;
}
