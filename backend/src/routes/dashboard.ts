import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import { cache } from "../utils/cache.js";

async function safeDashboardValue<T>(label: string, fallback: T, loader: () => Promise<T>): Promise<T> {
  try { return await loader(); }
  catch (error: any) {
    logger.error(`Dashboard`, `Metric error: ${label}`, { error: error?.message || error });
    return fallback;
  }
}

export function dashboardRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res, next) => {
    try {
      if (!req.user?.orgId) return res.status(403).json({ error: "TENANT_MISSING" });
      const orgId = req.user.orgId;
      const cacheKey = `dashboard:${orgId}`;
      const cached = cache.get<any>(cacheKey);
      if (cached) return res.json(cached);

      const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      const [leads, clients, proposals, invoices, contentCount, chartData, monthlyStats, org, user, agency] = await Promise.all([
        safeDashboardValue("leads", 0, () => prisma.lead.count({ where: { organizationId: orgId } })),
        safeDashboardValue("clients", 0, () => prisma.client.count({ where: { organizationId: orgId } })),
        safeDashboardValue("proposals", 0, () => prisma.proposal.count({ where: { organizationId: orgId } })),
        safeDashboardValue("invoices", { _sum: { total: 0 } }, () => prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'paga' }, _sum: { total: true } })),
        safeDashboardValue("creatives", 0, () => prisma.creative.count({ where: { organizationId: orgId } })),
        safeDashboardValue("chartData", [], () =>
          prisma.$queryRawUnsafe<Array<{ date: Date; leads: bigint; conv: bigint }>>(
            `SELECT DATE(l."createdAt") as date, COUNT(*) FILTER (WHERE l.status = 'qualificado' OR l.status = 'fechado') as conv,
             COUNT(*) as leads FROM "Lead" l WHERE l."organizationId" = $1 AND l."createdAt" >= $2 GROUP BY DATE(l."createdAt") ORDER BY date ASC`,
            orgId, sevenDaysAgo
          ).then((rows) =>
            rows.map((r) => ({
              name: dayLabels[new Date(r.date).getDay()] || "N/A",
              leads: Number(r.leads),
              conv: Number(r.conv),
            }))
          ).catch(() => [])
        ),
        safeDashboardValue("monthlyStats", { qualifiedLeads: 0, sentProposals: 0 }, () =>
          Promise.all([
            prisma.lead.count({ where: { organizationId: orgId, status: { in: ["qualificado", "fechado"] }, createdAt: { gte: firstOfMonth } } }),
            prisma.proposal.count({ where: { organizationId: orgId, createdAt: { gte: firstOfMonth } } }),
          ]).then(([qualifiedLeads, sentProposals]) => ({ qualifiedLeads, sentProposals }))
        ),
        safeDashboardValue("organization", null, () => orgId ? prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, plan: true, planObj: true } }) : Promise.resolve(null)),
        safeDashboardValue("user", null, () => req.user?.id ? prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }) : Promise.resolve(null)),
        safeDashboardValue("agency", null, () => req.user?.agencyId ? prisma.agency.findUnique({ where: { id: req.user.agencyId }, select: { name: true } }) : Promise.resolve(null)),
      ]);

      const conversions = leads > 0 ? Number(((clients / leads) * 100).toFixed(1)) : 0;
      const legacyPlan = !org?.planObj && org?.plan
        ? await safeDashboardValue("legacy plan", null, () => prisma.plan.findFirst({ where: { name: org.plan } }))
        : null;
      const sourcePlan = org?.planObj || legacyPlan || { name: 'Free', maxLeads: 100 };
      const plan = {
        ...sourcePlan,
        maxLeads: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
        leadsLimit: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
      };

      const totalLeadGoal = plan.maxLeads || 100;
      const totalProposalGoal = Math.max(Math.round(proposals * 1.5), 10);

      const dashboardData = {
        orgName: org?.name || agency?.name || "Minha Agência",
        userName: user?.name || "Usuário",
        plan,
        usage: { leads },
        metrics: { leads, clients, proposals, conversions, revenue: invoices._sum.total || 0, contentCount },
        chartData: chartData.length > 0 ? chartData : [],
        monthlyGoals: [
          { label: "Leads Qualificados", current: monthlyStats.qualifiedLeads, total: totalLeadGoal, color: "bg-blue-600" },
          { label: "Propostas Enviadas", current: monthlyStats.sentProposals, total: totalProposalGoal, color: "bg-purple-600" },
          { label: "Conversão Final", current: conversions, total: 5, color: "bg-green-600", isPercent: true },
        ],
      };
      cache.set(cacheKey, dashboardData, 30_000);
      res.json(dashboardData);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
