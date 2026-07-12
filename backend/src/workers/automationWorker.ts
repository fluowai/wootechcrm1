import { PrismaClient } from "@prisma/client";
import { EventEmitter } from "events";
import { logger } from "../utils/logger.js";
import { mutex } from "../utils/concurrency.js";

export const automationEvents = new EventEmitter();
automationEvents.setMaxListeners(100);

type AutomationAction = {
  type: string;
  params: Record<string, any>;
};

export class AutomationWorker {
  private prisma: PrismaClient;
  private running = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.registerListeners();
  }

  start() {
    this.running = true;
    logger.info("AutomationWorker", "Worker iniciado e escutando eventos...");
  }

  stop() {
    this.running = false;
    automationEvents.removeAllListeners();
    logger.info("AutomationWorker", "Worker parado.");
  }

  private registerListeners() {
    // Eventos de lead
    automationEvents.on("lead.created", async (data: { organizationId: string; leadId: string; lead: any }) => {
      await this.processEvent("lead.created", data);
    });

    automationEvents.on("lead.updated", async (data: { organizationId: string; leadId: string; lead: any }) => {
      await this.processEvent("lead.updated", data);
    });

    // Eventos de oportunidade
    automationEvents.on("opportunity.stage_changed", async (data: { organizationId: string; opportunityId: string; fromStage: string; toStage: string }) => {
      await this.processEvent("opportunity.stage_changed", data);
    });

    automationEvents.on("opportunity.won", async (data: { organizationId: string; opportunityId: string }) => {
      await this.processEvent("opportunity.won", data);
    });

    automationEvents.on("opportunity.lost", async (data: { organizationId: string; opportunityId: string }) => {
      await this.processEvent("opportunity.lost", data);
    });

    // Eventos de proposta
    automationEvents.on("proposal.sent", async (data: { organizationId: string; proposalId: string }) => {
      await this.processEvent("proposal.sent", data);
    });

    automationEvents.on("proposal.accepted", async (data: { organizationId: string; proposalId: string }) => {
      await this.processEvent("proposal.accepted", data);
    });

    // Eventos de conversa
    automationEvents.on("conversation.stale", async (data: { organizationId: string; conversationId: string; hoursSinceLastMessage: number }) => {
      await this.processEvent("conversation.stale", data);
    });
  }

  private async processEvent(event: string, data: Record<string, any>) {
    if (!this.running) return;

    const lockKey = `automation:${data.organizationId}:${event}`;
    await mutex.acquire(lockKey, async () => {
      try {
        const automations = await this.prisma.automation.findMany({
          where: {
            organizationId: data.organizationId,
            triggerType: event,
            isActive: true,
          },
        });

        for (const automation of automations) {
          await this.executeAutomation(automation, event, data);
        }
      } catch (error: any) {
        logger.error("AutomationWorker", `Error processing event ${event}`, { error: error?.message });
      }
    });
  }

  private async executeAutomation(automation: any, event: string, data: Record<string, any>) {
    const actions = automation.actions as AutomationAction[];
    const results: Record<string, any> = {};

    for (const action of actions) {
      try {
        results[action.type] = await this.executeAction(action, data);
      } catch (error: any) {
        results[action.type] = { error: error.message };

        await this.prisma.automationLog.create({
          data: {
            organizationId: data.organizationId,
            automationId: automation.id,
            event,
            resourceType: Object.keys(data).find(k => k.endsWith("Id")) || "unknown",
            resourceId: Object.values(data).find(v => typeof v === "string" && v.includes("-")) || null,
            action: action.type,
            result: { error: error.message } as any,
            status: "error",
            errorMessage: error.message,
          },
        });
      }
    }

    // Log de sucesso
    await this.prisma.automationLog.create({
      data: {
        organizationId: data.organizationId,
        automationId: automation.id,
        event,
        resourceType: Object.keys(data).find(k => k.endsWith("Id"))?.replace("Id", "") || "unknown",
        resourceId: Object.values(data).find(v => typeof v === "string" && v.includes("-")) || null,
        action: actions.map(a => a.type).join(", "),
        result: results as any,
        status: "success",
      },
    });
  }

  private async executeAction(action: AutomationAction, data: Record<string, any>): Promise<any> {
    switch (action.type) {
      case "create_task": {
        const task = await this.prisma.task.create({
          data: {
            title: action.params.title || "Tarefa automática",
            description: action.params.description || null,
            status: "pendente",
            priority: action.params.priority || "media",
            organizationId: data.organizationId,
            dueDate: action.params.daysAfter
              ? new Date(Date.now() + action.params.daysAfter * 24 * 60 * 60 * 1000)
              : null,
            opportunityId: data.opportunityId || null,
          },
        });
        return { taskId: task.id };
      }

      case "create_followup": {
        if (!data.leadId && data.proposalId) {
          const proposal = await this.prisma.proposal.findFirst({
            where: { id: data.proposalId, organizationId: data.organizationId },
            select: { id: true, leadId: true, opportunityId: true },
          });
          if (!proposal) return { error: "proposalId invalido para esta organizacao" };

          if (!proposal.leadId) {
            const task = await this.prisma.task.create({
              data: {
                title: "Follow-up de proposta",
                description: action.params.content || "Verificar se o cliente recebeu e analisou a proposta",
                status: "pendente",
                priority: "media",
                organizationId: data.organizationId,
                proposalId: proposal.id,
                opportunityId: proposal.opportunityId || null,
                dueDate: action.params.daysAfter
                  ? new Date(Date.now() + action.params.daysAfter * 24 * 60 * 60 * 1000)
                  : null,
              },
            });
            return { taskId: task.id };
          }

          data.leadId = proposal.leadId;
        }
        if (!data.leadId) return { error: "leadId não disponível" };
        const lead = await this.prisma.lead.findFirst({
          where: { id: data.leadId, organizationId: data.organizationId },
        });
        if (!lead) return { error: "leadId invalido para esta organizacao" };
        const followUp = await this.prisma.followUp.create({
          data: {
            leadId: lead.id,
            type: "automacao",
            content: action.params.content || "Follow-up automático",
            status: "pending",
            scheduledAt: action.params.daysAfter
              ? new Date(Date.now() + action.params.daysAfter * 24 * 60 * 60 * 1000)
              : null,
          },
        });
        return { followUpId: followUp.id };
      }

      case "create_opportunity": {
        if (!data.leadId) return { error: "leadId não disponível" };
        const lead = await this.prisma.lead.findFirst({
          where: { id: data.leadId, organizationId: data.organizationId },
        });
        if (!lead) return { error: "leadId invalido para esta organizacao" };

        let clientId = lead.clientId;
        if (!clientId) {
          const client = await this.prisma.client.create({
            data: {
              corporateName: lead.name,
              email: lead.email || "contato@empresa.com",
              phone: lead.phone || lead.whatsapp || null,
              status: "prospect",
              source: lead.source || null,
              organizationId: data.organizationId,
              assignedToId: lead.assignedToId || null,
            },
          });
          clientId = client.id;
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { clientId },
          });
        }

        if (action.params.pipelineId) {
          const pipeline = await this.prisma.pipeline.findFirst({
            where: { id: action.params.pipelineId, organizationId: data.organizationId },
            select: { id: true },
          });
          if (!pipeline) return { error: "pipelineId invalido para esta organizacao" };
        }

        if (action.params.stageId) {
          const stage = await this.prisma.pipelineStage.findFirst({
            where: { id: action.params.stageId, pipeline: { organizationId: data.organizationId } },
            select: { id: true },
          });
          if (!stage) return { error: "stageId invalido para esta organizacao" };
        }

        const opp = await this.prisma.opportunity.create({
          data: {
            title: lead.name ? `Oportunidade - ${lead.name}` : "Nova oportunidade",
            organizationId: data.organizationId,
            clientId,
            pipelineId: action.params.pipelineId || null,
            stageId: action.params.stageId || null,
            value: lead.value || 0,
            assignedToId: lead.assignedToId || null,
          },
        });
        return { opportunityId: opp.id };
      }

      case "move_stage": {
        if (!data.opportunityId) return { error: "opportunityId não disponível" };
        const opportunity = await this.prisma.opportunity.findFirst({
          where: { id: data.opportunityId, organizationId: data.organizationId },
        });
        if (!opportunity) return { error: "opportunityId invalido para esta organizacao" };
        const stage = await this.prisma.pipelineStage.findFirst({
          where: { id: action.params.toStageId, pipeline: { organizationId: data.organizationId } },
          select: { id: true },
        });
        if (!stage) return { error: "toStageId invalido para esta organizacao" };
        await this.prisma.opportunity.update({
          where: { id: opportunity.id },
          data: { stageId: stage.id },
        });
        return { moved: true };
      }

      case "notify": {
        await this.prisma.notification.create({
          data: {
            title: action.params.title || "Notificação automática",
            message: action.params.message || "",
            type: "info",
            organizationId: data.organizationId,
          },
        });
        return { notified: true };
      }

      default:
        return { error: `Ação desconhecida: ${action.type}` };
    }
  }
}

// Utilitário para emitir eventos de forma segura
export function emitAutomationEvent(event: string, data: Record<string, any>) {
  try {
    automationEvents.emit(event, data);
  } catch (error: any) {
      logger.error("AutomationEvents", `Error emitting ${event}`, { error: error?.message || error });
  }
}
