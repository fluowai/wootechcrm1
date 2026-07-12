import { PrismaClient } from "@prisma/client";
import {
  createDispatchAttempt,
  getFunnelRuntimeConfig,
  isInsideBusinessHours,
  isOptedOut,
  mergeProspectingAgentMemory,
  renderProspectingTemplate,
  updateDispatchAttempt,
} from "../services/prospectingAutomation.js";
import { OutboundDispatcherService } from "../services/outboundDispatcher.js";
import { logger } from "../utils/logger.js";
import { mutex } from "../utils/concurrency.js";

export class FollowUpWorker {
  private prisma: PrismaClient;
  private interval: NodeJS.Timeout | null = null;
  private processingProspecting = false;
  private dispatcher: OutboundDispatcherService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.dispatcher = new OutboundDispatcherService(prisma);
  }

  start(intervalMs = 5 * 60 * 1000) {
    logger.info("FollowUpWorker", "Worker iniciado (check a cada 5 min)...");
    this.check();
    this.interval = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.info("FollowUpWorker", "Worker parado.");
  }

  private async check() {
    try {
      const now = new Date();
      const pending = await this.prisma.followUp.findMany({
        where: {
          status: "pending",
          scheduledAt: { lte: now },
        },
        include: {
          lead: { select: { organizationId: true, assignedToId: true } },
        },
      });

      for (const followUp of pending) {
        // Criar notificação para o responsável
        if (followUp.lead?.organizationId) {
          await this.prisma.notification.create({
            data: {
              title: "Follow-up pendente",
              message: followUp.content.substring(0, 200),
              type: "warning",
              link: `/crm/leads/${followUp.leadId}`,
              organizationId: followUp.lead.organizationId,
            },
          });
        }

        // Marcar como concluído (notificado)
        await this.prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: "notified" },
        });
      }

      if (pending.length > 0) {
        logger.info("FollowUpWorker", `${pending.length} follow-up(s) notificado(s)`);
      }

      await this.checkProspectingFollowUps();
    } catch (error: any) {
      logger.error("FollowUpWorker", "Error checking follow-ups", { error: error?.message });
    }
  }

  private async checkProspectingFollowUps() {
    if (this.processingProspecting) return;
    this.processingProspecting = true;

    await mutex.acquire("follow-up-worker:prospecting", async () => {
      try {
        const now = new Date();
        const minimumDelayMinutes = Math.max(Number(process.env.PROSPECTING_FOLLOWUP_MIN_AFTER_MINUTES || 5), 1);
        const cutoff = new Date(now.getTime() - minimumDelayMinutes * 60 * 1000);
        const maxPerTick = Number(process.env.PROSPECTING_FOLLOWUP_BATCH_SIZE || 5);
        const runs = await this.prisma.prospectingRun.findMany({
          where: {
            channel: "WHATSAPP",
            status: { in: ["sent", "active"] },
            nextAction: "wait_lead_reply",
            lastContactAt: { lte: cutoff },
          },
          include: { funnel: { include: { stages: { orderBy: { order: "asc" } } } }, stage: true },
          orderBy: { lastContactAt: "asc" },
          take: Math.max(maxPerTick * 4, maxPerTick),
        });

      let processed = 0;
      for (const run of runs) {
        if (processed >= maxPerTick) break;
        const qualification = (run.qualification as any) || {};
        const runtimeConfig = getFunnelRuntimeConfig(run.funnel);
        const followUpCount = Number(qualification.followUpCount || 0);
        const maxFollowUps = Number(qualification?.campaign?.maxFollowUps || runtimeConfig.maxFollowUps || process.env.PROSPECTING_MAX_FOLLOWUPS || 2);
        if (followUpCount >= maxFollowUps) {
          await this.prisma.prospectingRun.update({
            where: { id: run.id },
            data: { status: "nurturing", nextAction: "max_followups_reached" },
          });
          processed += 1;
          continue;
        }

        const afterMinutes = Number(qualification?.campaign?.followUpAfterMinutes || runtimeConfig.followUpAfterMinutes || process.env.PROSPECTING_FOLLOWUP_AFTER_MINUTES || 1440);
        const dueAt = new Date(new Date(run.lastContactAt || run.updatedAt).getTime() + afterMinutes * 60 * 1000);
        if (dueAt > now) continue;

        if (!isInsideBusinessHours(runtimeConfig.businessHours, now)) continue;

        if (await isOptedOut(this.prisma, run.organizationId, run.leadPhone)) {
          await this.prisma.prospectingRun.update({
            where: { id: run.id },
            data: { status: "stopped", nextAction: "opt_out_blocked" },
          });
          continue;
        }

        const template = runtimeConfig.followUpMessages[followUpCount] || runtimeConfig.followUpMessages[runtimeConfig.followUpMessages.length - 1];
        const leadSnapshot = (run.leadSnapshot as any) || {};
        const message = renderProspectingTemplate(template, {
          agentName: runtimeConfig.agentName,
          senderCompanyName: runtimeConfig.senderCompanyName,
          businessName: run.leadName || leadSnapshot.businessName,
          targetRoleLabel: runtimeConfig.targetRoleLabel,
          segment: qualification?.playbook?.segment || leadSnapshot.category,
          city: leadSnapshot.city,
          state: leadSnapshot.state,
        });
        const attempt = await createDispatchAttempt(this.prisma, {
          organizationId: run.organizationId,
          run,
          channelId: qualification?.campaign?.channelId || null,
          message,
          status: "queued",
          metadata: { automated: true, kind: "follow_up", followUpCount: followUpCount + 1 },
        });

        try {
          const dispatch = await this.dispatcher.dispatchText({
            organizationId: run.organizationId,
            channelId: qualification?.campaign?.channelId || undefined,
            contact: { name: run.leadName, phone: run.leadPhone || "" },
            message,
            ia: false,
            source: "nexus_prospecting_followup",
            metadata: { prospectingRunId: run.id, followUpCount: followUpCount + 1 },
          });

          await updateDispatchAttempt(this.prisma, attempt.id, {
            status: "sent",
            bridgeMessageId: dispatch.bridgeMessageId || null,
            sentAt: new Date(),
            metadata: { dispatch, automated: true, kind: "follow_up" },
          });

          await this.prisma.prospectingRun.update({
            where: { id: run.id },
            data: {
              lastContactAt: new Date(),
              nextAction: "wait_lead_reply",
              qualification: {
                ...mergeProspectingAgentMemory(qualification, {
                  currentStage: run.stage,
                  nextStage: run.stage,
                  aiMessage: message,
                  status: run.status,
                  nextAction: "wait_lead_reply",
                  summary: "Follow-up automatico enviado. Aguardar resposta do lead.",
                  conversationId: dispatch.conversationId,
                  messageId: dispatch.messageId,
                }),
                followUpCount: followUpCount + 1,
              },
            },
          });
          processed += 1;
        } catch (error: any) {
          await updateDispatchAttempt(this.prisma, attempt.id, {
            status: "failed",
            reason: error?.message || "Falha ao enviar follow-up",
          });
        }
      }

      if (runs.length > 0) {
        logger.info("FollowUpWorker", `prospecting follow-ups avaliados=${runs.length}`);
      }
    } catch (error: any) {
      logger.error("FollowUpWorker", "Error in prospecting follow-ups", { error: error?.message });
    } finally {
      this.processingProspecting = false;
    }
    });
  }
}
