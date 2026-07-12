import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import path from "path";
import { AuthRequest } from "../middleware/auth.js";

const CALL_MARKER = "[SDR TGA 03-15/06]";
const RETURN_MARKER = "[SDR TGA retorno 16-19/06]";
const REPORT_FILE_NAME = "relatorio-sdr-tga-marketing-2026-06.pdf";

function percent(value: number, total: number) {
  return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function dateTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getReportFilePath() {
  const candidates = [
    path.resolve(process.cwd(), "output", "pdf", REPORT_FILE_NAME),
    path.resolve(process.cwd(), "..", "output", "pdf", REPORT_FILE_NAME),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

export function reportsRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/tga-sdr", async (req: AuthRequest, res) => {
    try {
      const organizationId = req.user?.orgId;
      if (!organizationId) return res.status(401).json({ error: "Organizacao nao encontrada na sessao." });

      const [organization, callActivities, returnActivities, scheduledEvents] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, type: true },
        }),
        prisma.activity.findMany({
          where: {
            organizationId,
            type: "CALL",
            description: { contains: CALL_MARKER },
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.activity.findMany({
          where: {
            organizationId,
            type: "TASK",
            description: { contains: RETURN_MARKER },
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.calendarEvent.findMany({
          where: {
            organizationId,
            type: "call",
            startDate: {
              gte: new Date("2026-06-16T00:00:00-03:00"),
              lte: new Date("2026-06-19T23:59:59-03:00"),
            },
          },
          include: {
            user: { select: { name: true, department: true } },
          },
          orderBy: { startDate: "asc" },
        }),
      ]);

      const calledLeadIds = Array.from(new Set(callActivities.map((activity) => activity.contactId).filter(Boolean))) as string[];
      const interestedLeadIds = Array.from(new Set(returnActivities.map((activity) => activity.contactId).filter(Boolean))) as string[];
      const scheduledLeadIds = Array.from(new Set(scheduledEvents.map((event) => event.leadId).filter(Boolean))) as string[];
      const allLeadIds = Array.from(new Set([...calledLeadIds, ...interestedLeadIds, ...scheduledLeadIds]));

      const leads = allLeadIds.length
        ? await prisma.lead.findMany({
            where: { organizationId, id: { in: allLeadIds } },
            select: { id: true, name: true, phone: true, whatsapp: true },
          })
        : [];

      const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
      const callsByDate = callActivities.reduce<Record<string, number>>((acc, activity) => {
        const key = dateKey(activity.createdAt);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const returnsByDate = scheduledEvents.reduce<Record<string, number>>((acc, event) => {
        const key = dateKey(event.startDate);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const scheduledReturns = scheduledEvents.map((event) => {
        const lead = event.leadId ? leadMap.get(event.leadId) : null;
        return {
          id: event.id,
          leadId: event.leadId,
          leadName: lead?.name || event.title.replace(/^Retorno SDR -\s*/i, ""),
          phone: lead?.phone || lead?.whatsapp || "",
          startsAt: event.startDate.toISOString(),
          startsAtLabel: dateTimeLabel(event.startDate),
          sdrName: event.user?.name || "Ana Cristina",
          department: event.user?.department || "SDR",
          status: event.status === "scheduled" ? "Agendado" : event.status,
        };
      });

      const baseLeads = calledLeadIds.map((leadId) => {
        const lead = leadMap.get(leadId);
        const firstCall = callActivities.find((activity) => activity.contactId === leadId);
        const scheduled = scheduledReturns.find((event) => event.leadId === leadId);
        return {
          id: leadId,
          name: lead?.name || "Lead sem nome",
          phone: lead?.phone || lead?.whatsapp || "",
          callDate: firstCall ? dateKey(firstCall.createdAt) : null,
          interested: interestedLeadIds.includes(leadId),
          returnAt: scheduled?.startsAtLabel || null,
        };
      });

      const reportPath = getReportFilePath();
      res.json({
        organization: {
          name: organization?.name || "TGA Marketing",
          type: organization?.type || "CLIENT",
        },
        period: {
          calls: "03/06/2026 a 15/06/2026",
          returns: "16/06/2026 a 19/06/2026",
        },
        metrics: {
          kanbanLeads: calledLeadIds.length,
          callActivities: callActivities.length,
          distinctCalledLeads: calledLeadIds.length,
          interestedLeads: interestedLeadIds.length,
          scheduledReturns: scheduledEvents.length,
          distinctScheduledLeads: scheduledLeadIds.length,
          callCoveragePct: percent(calledLeadIds.length, calledLeadIds.length),
          interestRatePct: percent(interestedLeadIds.length, calledLeadIds.length),
          scheduleRatePct: percent(scheduledLeadIds.length, interestedLeadIds.length),
        },
        callsByDate: Object.entries(callsByDate).map(([date, count]) => ({ date, count })),
        returnsByDate: Object.entries(returnsByDate).map(([date, count]) => ({ date, count })),
        scheduledReturns,
        leads: baseLeads,
        report: {
          filename: REPORT_FILE_NAME,
          available: existsSync(reportPath),
        },
      });
    } catch (error) {
      console.error("[REPORTS_TGA_SDR]", error);
      res.status(500).json({ error: "Erro ao carregar relatorio SDR." });
    }
  });

  router.get("/tga-sdr/pdf", async (_req: AuthRequest, res) => {
    const reportPath = getReportFilePath();
    if (!existsSync(reportPath)) {
      return res.status(404).json({ error: "PDF do relatorio ainda nao foi gerado." });
    }

    res.download(reportPath, REPORT_FILE_NAME);
  });

  return router;
}
