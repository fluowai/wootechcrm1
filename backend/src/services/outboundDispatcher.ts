import { PrismaClient } from "@prisma/client";
import { normalizeWhatsAppPhone } from "../utils/whatsapp.js";
import { MessageRewriteService } from "./messageRewrite.js";

const WHATSAPP_PROVIDER = "WHATS_MEOW";

type OutboundContact = {
  name?: string | null;
  phone: string;
  email?: string | null;
};

type DispatchInput = {
  organizationId: string;
  userId?: string | null;
  channelId?: string | null;
  contact: OutboundContact;
  message: string;
  ia?: boolean;
  source?: string;
  metadata?: any;
};

function bridgeBaseUrl() {
  return process.env.WHATSAPP_BRIDGE_URL || "http://localhost:8091";
}

function bridgeSecret() {
  return process.env.WHATSAPP_BRIDGE_SECRET || "dev-whatsapp-bridge-secret";
}

async function callBridge(path: string, body: any) {
  const res = await fetch(`${bridgeBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-whatsapp-bridge-secret": bridgeSecret(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `WhatsApp bridge error ${res.status}`);
  }
  return data;
}

export class OutboundDispatcherService {
  private rewriteService: MessageRewriteService;

  constructor(private prisma: PrismaClient) {
    this.rewriteService = new MessageRewriteService(prisma);
  }

  private async pickChannel(organizationId: string, channelId?: string | null) {
    if (channelId) {
      const selected = await this.prisma.channel.findFirst({
        where: { id: channelId, provider: WHATSAPP_PROVIDER, isActive: true, inbox: { organizationId } },
        include: { inbox: true },
      });
      if (selected) return selected;
    }

    return this.prisma.channel.findFirst({
      where: { provider: WHATSAPP_PROVIDER, isActive: true, inbox: { organizationId } },
      include: { inbox: true },
      orderBy: { createdAt: "desc" },
    });
  }

  private async upsertConversation(input: {
    channel: any;
    phoneJid: string;
    contact: OutboundContact;
    metadata: any;
  }) {
    const phone = normalizeWhatsAppPhone(input.phoneJid);
    const displayName = String(input.contact.name || "").trim() || phone.display || "Contato WhatsApp";

    const existing = await this.prisma.conversation.findFirst({
      where: { channelId: input.channel.id, contactId: input.phoneJid },
    });

    if (existing) {
      return this.prisma.conversation.update({
        where: { id: existing.id },
        data: {
          subject: displayName,
          status: existing.status === "closed" ? "open" : existing.status,
          lastMessageAt: new Date(),
        } as any,
      });
    }

    return this.prisma.conversation.create({
      data: {
        subject: displayName,
        inboxId: input.channel.inboxId,
        channelId: input.channel.id,
        contactId: input.phoneJid,
        status: "open",
        priority: "medium",
        lastMessageAt: new Date(),
      } as any,
    });
  }

  async dispatchText(input: DispatchInput) {
    if (!input.organizationId) throw Object.assign(new Error("Organizacao obrigatoria."), { status: 400 });
    if (!input.contact?.phone) throw Object.assign(new Error("Telefone obrigatorio."), { status: 400 });
    if (!input.message) throw Object.assign(new Error("Mensagem obrigatoria."), { status: 400 });

    const phone = normalizeWhatsAppPhone(input.contact.phone);
    if (!phone.jid || !phone.isValid) {
      throw Object.assign(new Error("Telefone WhatsApp invalido."), { status: 400 });
    }

    const channel = await this.pickChannel(input.organizationId, input.channelId);
    if (!channel) {
      throw Object.assign(new Error("Nenhuma instancia WhatsApp ativa encontrada."), { status: 400 });
    }

    const rewrite = input.ia
      ? await this.rewriteService.rewriteWhatsAppMessage(input.organizationId, input.message)
      : { text: input.message, applied: false, provider: null };
    const finalMessage = rewrite.text;

    const bridge = await callBridge(`/sessions/${channel.id}/send`, {
      channelId: channel.id,
      to: phone.jid,
      message: finalMessage,
    });

    const conversationMetadata = {
      externalChatId: phone.jid,
      isGroup: false,
      phone: phone.e164,
      displayPhone: phone.display,
      displayName: input.contact.name || phone.display,
      provider: WHATSAPP_PROVIDER,
      source: input.source || "outbound_dispatcher",
    };

    const conversation = await this.upsertConversation({
      channel,
      phoneJid: phone.jid,
      contact: input.contact,
      metadata: conversationMetadata,
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: input.userId || undefined,
        senderType: input.userId ? "USER" : "AI",
        content: finalMessage,
        type: "text",
        metadata: {
          source: input.source || "outbound_dispatcher",
          bridgeMessageId: bridge.messageId || null,
          fromMe: true,
          originalMessage: input.message,
          rewrite,
          contact: input.contact,
          conversation: conversationMetadata,
          ...input.metadata,
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), subject: input.contact.name || conversation.subject },
    });

    return {
      ok: true,
      channelId: channel.id,
      conversationId: conversation.id,
      messageId: message.id,
      bridgeMessageId: bridge.messageId || null,
      phone: phone.e164,
      displayPhone: phone.display,
      finalMessage,
      rewrite,
    };
  }
}
