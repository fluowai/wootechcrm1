import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

type CallSession = {
  sessionId: string;
  roomUrl: string;
  token: string;
  expiresAt: Date;
};

export class CallIntegrationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createCallSession(
    calendarEventId: string,
    orgId: string
  ): Promise<CallSession | null> {
    try {
      const event = await this.prisma.calendarEvent.findFirst({
        where: { id: calendarEventId, organizationId: orgId },
      });

      if (!event) {
        logger.warn("CallIntegration", "Evento não encontrado", { calendarEventId });
        return null;
      }

      // Gerar sessão de call
      const sessionId = `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const roomUrl = `${process.env.CALL_BASE_URL || "https://meet.nexus360.com"}/room/${sessionId}`;

      // Gerar token de acesso (simplificado - em produção usar LiveKit/Jitsi API)
      const token = this.generateCallToken(sessionId, orgId);

      // Salvar link da sala no evento
      await this.prisma.calendarEvent.update({
        where: { id: calendarEventId },
        data: {
          meetingLink: roomUrl,
          meetingRoom: sessionId,
        },
      });

      // Criar registro de chamada
      await this.prisma.whatsAppCall.create({
        data: {
          organizationId: orgId,
          callBridgeId: sessionId,
          conversationId: event.leadId || undefined,
          leadId: event.leadId || undefined,
          direction: "outgoing",
          state: "ringing",
          toJid: "",
          startedAt: new Date(),
        },
      });

      logger.info("CallIntegration", "Sessão de call criada", {
        sessionId,
        roomUrl,
        calendarEventId,
      });

      return {
        sessionId,
        roomUrl,
        token,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
      };
    } catch (error: any) {
      logger.error("CallIntegration", "Erro ao criar sessão de call", {
        error: error?.message,
        calendarEventId,
      });
      return null;
    }
  }

  async getCallLinkForEvent(
    calendarEventId: string,
    orgId: string
  ): Promise<{ url: string; token: string } | null> {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: calendarEventId, organizationId: orgId },
    });

    if (!event?.meetingLink) {
      // Criar nova sessão se não existir
      const session = await this.createCallSession(calendarEventId, orgId);
      if (!session) return null;
      return { url: session.roomUrl, token: session.token };
    }

    // Retornar link existente
    const sessionId = event.meetingRoom || "default";
    const token = this.generateCallToken(sessionId, orgId);

    return {
      url: event.meetingLink,
      token,
    };
  }

  private generateCallToken(sessionId: string, orgId: string): string {
    // Em produção, usar biblioteca específica do provedor de call
    // Por exemplo, LiveKit: new AccessToken(apiKey, apiSecret)
    // Por enquanto, gerar token simplificado
    const payload = {
      sessionId,
      orgId,
      exp: Math.floor(Date.now() / 1000) + 7200, // 2 horas
      iat: Math.floor(Date.now() / 1000),
    };

    return Buffer.from(JSON.stringify(payload)).toString("base64");
  }
}
