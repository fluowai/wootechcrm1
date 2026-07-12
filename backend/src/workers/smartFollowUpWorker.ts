import { PrismaClient } from "@prisma/client";
import { OutboundDispatcherService } from "../services/outboundDispatcher.js";
import { logger } from "../utils/logger.js";
import { mutex } from "../utils/concurrency.js";

type FollowUpType = "cold_lead" | "meeting_reminder" | "post_meeting" | "contract_sent";

type FollowUpConfig = {
  type: FollowUpType;
  delayMinutes: number;
  maxAttempts: number;
  messageTemplate: string;
};

const FOLLOW_UP_CONFIGS: FollowUpConfig[] = [
  {
    type: "cold_lead",
    delayMinutes: 1440,
    maxAttempts: 3,
    messageTemplate:
      "Oi {leadName}, tudo bem? Aqui é o Paulo da {companyName}. Passando para saber se você conseguiu ver minha mensagem anterior. Temos uma proposta que pode ajudar a organizar a parte comercial da sua empresa. Pode ser um bom momento para conversarmos?",
  },
  {
    type: "meeting_reminder",
    delayMinutes: 60,
    maxAttempts: 1,
    messageTemplate:
      "Oi {leadName}, tudo bem? Passando para confirmar nossa call de hoje às {meetingTime}. Estou preparado para apresentar como podemos ajudar a {companyName} a organizar melhor a parte comercial. Até lá!",
  },
  {
    type: "post_meeting",
    delayMinutes: 120,
    maxAttempts: 1,
    messageTemplate:
      "Oi {leadName}, foi ótimo conversar com você! Conforme combinamos, vou enviar os próximos passos. Qualquer dúvida, estou à disposição.",
  },
  {
    type: "contract_sent",
    delayMinutes: 1440,
    maxAttempts: 2,
    messageTemplate:
      "Oi {leadName}, enviei o contrato para sua análise. Se tiver alguma dúvida ou precisar ajustar algo, é só me chamar. Estou à disposição para fecharmos essa parceria!",
  },
];

export class SmartFollowUpWorker {
  private prisma: PrismaClient;
  private dispatcher: OutboundDispatcherService;
  private interval: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.dispatcher = new OutboundDispatcherService(prisma);
  }

  start(intervalMs = 5 * 60 * 1000) {
    logger.info("SmartFollowUpWorker", "Iniciado (check a cada 5 min)...");
    this.check();
    this.interval = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.info("SmartFollowUpWorker", "Parado.");
  }

  private async check() {
    if (this.processing) return;
    this.processing = true;

    await mutex.acquire("smart-follow-up-worker", async () => {
      try {
        await this.checkColdLeadFollowUps();
        await this.checkMeetingReminders();
        await this.checkPostMeetingFollowUps();
        await this.checkContractFollowUps();
      } catch (error: any) {
        logger.error("SmartFollowUpWorker", "Erro geral", { error: error?.message });
      } finally {
        this.processing = false;
      }
    });
  }

  private async checkColdLeadFollowUps() {
    const now = new Date();
    const config = FOLLOW_UP_CONFIGS.find((c) => c.type === "cold_lead")!;

    const runs = await this.prisma.prospectingRun.findMany({
      where: {
        status: "active",
        nextAction: "wait_lead_reply",
        lastContactAt: {
          lte: new Date(now.getTime() - config.delayMinutes * 60 * 1000),
        },
      },
      orderBy: { lastContactAt: "asc" },
      take: 20,
    });

    for (const run of runs) {
      const qualification = (run.qualification as any) || {};
      const followUpCount = Number(qualification.coldLeadFollowUpCount || 0);

      if (followUpCount >= config.maxAttempts) {
        await this.prisma.prospectingRun.update({
          where: { id: run.id },
          data: { status: "nurturing", nextAction: "max_followups_reached" },
        });
        continue;
      }

      const message = config.messageTemplate
        .replace("{leadName}", run.leadName || "parceiro")
        .replace("{companyName}", "Consultio");

      try {
        await this.dispatcher.dispatchText({
          organizationId: run.organizationId,
          contact: { name: run.leadName || "", phone: run.leadPhone || "" },
          message,
          ia: false,
          source: "smart_followup_cold",
          metadata: { prospectingRunId: run.id, followUpCount: followUpCount + 1 },
        });

        await this.prisma.prospectingRun.update({
          where: { id: run.id },
          data: {
            lastContactAt: new Date(),
            qualification: {
              ...qualification,
              coldLeadFollowUpCount: followUpCount + 1,
              lastFollowUpType: "cold_lead",
              lastFollowUpAt: new Date().toISOString(),
            },
          },
        });

        logger.info("SmartFollowUpWorker", "Follow-up frio enviado", {
          runId: run.id,
          attempt: followUpCount + 1,
        });
      } catch (error: any) {
        logger.warn("SmartFollowUpWorker", "Erro ao enviar follow-up frio", {
          runId: run.id,
          error: error?.message,
        });
      }
    }
  }

  private async checkMeetingReminders() {
    const now = new Date();
    const config = FOLLOW_UP_CONFIGS.find((c) => c.type === "meeting_reminder")!;

    const upcomingEvents = await this.prisma.calendarEvent.findMany({
      where: {
        type: "reunion",
        status: "scheduled",
        startDate: {
          gte: now,
          lte: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        },
        leadId: { not: null },
      },
      orderBy: { startDate: "asc" },
      take: 20,
    });

    for (const event of upcomingEvents) {
      if (!event.leadId) continue;

      const lead = await this.prisma.lead.findFirst({
        where: { id: event.leadId, organizationId: event.organizationId },
        select: { id: true, name: true, whatsapp: true, phone: true, organizationId: true },
      });

      if (!lead) continue;

      const minutesUntilMeeting = Math.floor(
        (event.startDate.getTime() - now.getTime()) / (60 * 1000)
      );

      if (minutesUntilMeeting > 30 && minutesUntilMeeting <= 90) {
        const meetingTime = event.startDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const message = config.messageTemplate
          .replace("{leadName}", lead.name || "parceiro")
          .replace("{meetingTime}", meetingTime)
          .replace("{companyName}", "Consultio");

        const phone = lead.whatsapp || lead.phone;
        if (!phone) continue;

        const existingReminder = await this.prisma.followUp.findFirst({
          where: {
            leadId: lead.id,
            type: "meeting_reminder",
            scheduledAt: {
              gte: new Date(now.getTime() - 60 * 60 * 1000),
            },
          },
        });

        if (existingReminder) continue;

        try {
          await this.dispatcher.dispatchText({
            organizationId: lead.organizationId,
            contact: { name: lead.name || "", phone },
            message,
            ia: false,
            source: "meeting_reminder",
            metadata: { calendarEventId: event.id },
          });

          await this.prisma.followUp.create({
            data: {
              leadId: lead.id,
              type: "meeting_reminder",
              content: `Lembrete enviado para reunião às ${meetingTime}`,
              status: "completed",
              scheduledAt: new Date(),
            },
          });

          logger.info("SmartFollowUpWorker", "Lembrete de reunião enviado", {
            meetingId: event.id,
            leadName: lead.name,
            minutesUntilMeeting,
          });
        } catch (error: any) {
          logger.warn("SmartFollowUpWorker", "Erro ao enviar lembrete", {
            meetingId: event.id,
            error: error?.message,
          });
        }
      }
    }
  }

  private async checkPostMeetingFollowUps() {
    const now = new Date();
    const config = FOLLOW_UP_CONFIGS.find((c) => c.type === "post_meeting")!;

    const recentEvents = await this.prisma.calendarEvent.findMany({
      where: {
        type: "reunion",
        status: "completed",
        endDate: {
          gte: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          lte: new Date(now.getTime() - config.delayMinutes * 60 * 1000),
        },
        leadId: { not: null },
      },
      orderBy: { endDate: "desc" },
      take: 20,
    });

    for (const event of recentEvents) {
      if (!event.leadId) continue;

      const lead = await this.prisma.lead.findFirst({
        where: { id: event.leadId, organizationId: event.organizationId },
        select: { id: true, name: true, whatsapp: true, phone: true, organizationId: true },
      });

      if (!lead) continue;

      const existingFollowUp = await this.prisma.followUp.findFirst({
        where: {
          leadId: lead.id,
          type: "post_meeting",
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existingFollowUp) continue;

      const message = config.messageTemplate
        .replace("{leadName}", lead.name || "parceiro")
        .replace("{companyName}", "Consultio");

      const phone = lead.whatsapp || lead.phone;
      if (!phone) continue;

      try {
        await this.dispatcher.dispatchText({
          organizationId: lead.organizationId,
          contact: { name: lead.name || "", phone },
          message,
          ia: false,
          source: "post_meeting_followup",
          metadata: { calendarEventId: event.id },
        });

        await this.prisma.followUp.create({
          data: {
            leadId: lead.id,
            type: "post_meeting",
            content: "Follow-up pós-reunião enviado",
            status: "completed",
            scheduledAt: new Date(),
          },
        });

        logger.info("SmartFollowUpWorker", "Follow-up pós-reunião enviado", {
          meetingId: event.id,
          leadName: lead.name,
        });
      } catch (error: any) {
        logger.warn("SmartFollowUpWorker", "Erro ao enviar follow-up pós-reunião", {
          meetingId: event.id,
          error: error?.message,
        });
      }
    }
  }

  private async checkContractFollowUps() {
    const now = new Date();
    const config = FOLLOW_UP_CONFIGS.find((c) => c.type === "contract_sent")!;

    const pendingContracts = await this.prisma.contract.findMany({
      where: {
        status: "sent",
        createdAt: {
          lte: new Date(now.getTime() - config.delayMinutes * 60 * 1000),
        },
      },
      include: {
        client: true,
      },
    });

    for (const contract of pendingContracts) {
      if (!contract.client) continue;

      const leadName = contract.client.responsibleName || contract.client.corporateName;
      const phone = contract.client.responsiblePhone || contract.client.phone;

      if (!phone) continue;

      // Contract follow-ups need a leadId - find the lead linked to this client
      const linkedLead = await this.prisma.lead.findFirst({
        where: { clientId: contract.clientId },
        select: { id: true },
      });

      if (!linkedLead) continue;

      const existingFollowUp = await this.prisma.followUp.findFirst({
        where: {
          leadId: linkedLead.id,
          type: "contract_sent",
          createdAt: {
            gte: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          },
        },
      });

      if (existingFollowUp) continue;

      const message = config.messageTemplate
        .replace("{leadName}", leadName || "parceiro")
        .replace("{companyName}", "Consultio");

      try {
        await this.dispatcher.dispatchText({
          organizationId: contract.client.organizationId,
          contact: { name: leadName, phone },
          message,
          ia: false,
          source: "contract_followup",
          metadata: { contractId: contract.id },
        });

        await this.prisma.followUp.create({
          data: {
            leadId: linkedLead.id,
            type: "contract_sent",
            content: `Follow-up de contrato enviado - ${contract.id}`,
            status: "completed",
            scheduledAt: new Date(),
          },
        });

        logger.info("SmartFollowUpWorker", "Follow-up de contrato enviado", {
          contractId: contract.id,
          clientName: leadName,
        });
      } catch (error: any) {
        logger.warn("SmartFollowUpWorker", "Erro ao enviar follow-up de contrato", {
          contractId: contract.id,
          error: error?.message,
        });
      }
    }
  }
}
