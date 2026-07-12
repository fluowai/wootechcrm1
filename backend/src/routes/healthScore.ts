import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function healthScoreRoutes(prisma: PrismaClient) {
  const router = Router();

  const parseHealthPayload = (flags?: string | null) => {
    if (!flags) return { flags: [] as string[] };
    try {
      const parsed = JSON.parse(flags);
      return typeof parsed === "object" && parsed ? parsed : { flags: [flags] };
    } catch {
      return { flags: flags.split(",").map((flag) => flag.trim()).filter(Boolean) };
    }
  };

  const enrichScores = async (orgId: string, scores: any[]) => {
    const clients = await prisma.client.findMany({
      where: { organizationId: orgId, id: { in: scores.map((score) => score.clientId) } },
      select: {
        id: true,
        corporateName: true,
        tradeName: true,
        email: true,
        phone: true,
        segment: true,
        status: true,
        updatedAt: true,
      },
    });
    const clientMap = new Map(clients.map((client) => [client.id, client]));

    return scores.map((score) => {
      const client = clientMap.get(score.clientId);
      const payload = parseHealthPayload(score.flags);
      return {
        ...score,
        ...payload,
        client,
        clientName: client?.tradeName || client?.corporateName || "Cliente",
      };
    });
  };

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const scores = await prisma.clientHealthScore.findMany({
        where: { organizationId: orgId },
        orderBy: { score: "asc" },
      });
      res.json(await enrichScores(orgId, scores));
    } catch (error) {
      console.error("[HEALTH_SCORE_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar health scores" });
    }
  });

  router.get("/client/:clientId", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const score = await prisma.clientHealthScore.findUnique({
        where: { clientId: req.params.clientId },
      });
      if (!score || score.organizationId !== orgId) {
        return res.status(404).json({ error: "Health score nao encontrado" });
      }
      res.json((await enrichScores(orgId, [score]))[0]);
    } catch (error) {
      console.error("[HEALTH_SCORE_GET_ERROR]", error);
      res.status(500).json({ error: "Erro ao buscar health score" });
    }
  });

  router.post("/calculate/:clientId", async (req: AuthRequest, res) => {
    try {
      const clientId = req.params.clientId;
      const orgId = req.user!.orgId;

      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: orgId },
        include: {
          invoices: { orderBy: { dueDate: "desc" }, take: 12 },
          projects: { select: { status: true, updatedAt: true } },
          soldProducts: { select: { name: true, monthlyValue: true, status: true, updatedAt: true } },
          demands: { select: { status: true, priority: true, dueDate: true } },
        },
      });
      if (!client) return res.status(404).json({ error: "Cliente nao encontrado" });

      const now = new Date();
      const paidInvoices = client.invoices.filter((invoice) => invoice.status === "paga");
      const overdueInvoices = client.invoices.filter((invoice) => invoice.status !== "paga" && invoice.dueDate && invoice.dueDate < now);
      const paymentInDay = overdueInvoices.length === 0;
      const npsResponse = null;
      const lastContactAt = client.updatedAt;

      const projectStatuses = client.projects.map((project) => project.status);
      const hasDelayedProject = projectStatuses.some((status) => status === "atrasado");
      const hasCompletedProject = projectStatuses.some((status) => status === "concluido");
      const activeProjects = projectStatuses.filter((status) => status === "execucao" || status === "planejamento").length;
      const activeProducts = client.soldProducts.filter((product) => !["cancelado", "churned", "inativo"].includes(product.status));
      const monthlyRecurring = activeProducts.reduce((sum, product) => sum + (product.monthlyValue || 0), 0);
      const delayedDemands = client.demands.filter((demand) => demand.status !== "done" && demand.dueDate && demand.dueDate < now).length;
      const urgentDemands = client.demands.filter((demand) => demand.priority === "high" || demand.priority === "urgent").length;

      let score = 70;
      if (paymentInDay) score += 15;
      if (paidInvoices.length >= 3) score += 5;
      if (hasCompletedProject) score += 10;
      if (activeProjects > 2) score += 5;
      if (hasDelayedProject) score -= 20;
      if (activeProjects === 0) score -= 10;
      if (overdueInvoices.length > 0) score -= Math.min(30, overdueInvoices.length * 10);
      if (delayedDemands > 0) score -= Math.min(20, delayedDemands * 5);
      if (urgentDemands > 2) score -= 5;

      score = Math.max(0, Math.min(100, score));

      const riskLevel = score >= 80 ? "low" : score >= 60 ? "medium" : score >= 40 ? "high" : "critical";
      const engagementRate = activeProjects > 0 ? Math.min(100, activeProjects * 20) : activeProducts.length > 0 ? 35 : 0;
      const expansionScore = Math.max(0, Math.min(100,
        35 +
        (monthlyRecurring > 0 ? 20 : 0) +
        (paymentInDay ? 15 : -20) +
        (activeProjects > 0 ? 15 : 0) +
        (score >= 80 ? 15 : score < 50 ? -15 : 0)
      ));
      const flags = [
        !paymentInDay ? "Pagamento em atraso" : null,
        hasDelayedProject || delayedDemands > 0 ? "Entrega em risco" : null,
        activeProjects === 0 ? "Sem projeto ativo" : null,
        expansionScore >= 75 ? "Potencial de expansao" : null,
        score < 60 ? "Priorizar retencao" : null,
      ].filter(Boolean);
      const recommendation = score < 60
        ? "Abrir plano de retencao com contato humano, revisao de entregas e renegociacao de pendencias."
        : expansionScore >= 75
          ? "Mapear upsell de midia, conteudo, automacao ou CRO e propor o proximo pacote de crescimento."
          : "Manter acompanhamento quinzenal e registrar proximos marcos de valor entregue.";
      const flagsPayload = JSON.stringify({
        flags,
        expansionScore,
        monthlyRecurring,
        overdueInvoices: overdueInvoices.length,
        delayedDemands,
        activeProducts: activeProducts.length,
        recommendation,
      });

      const existing = await prisma.clientHealthScore.findUnique({ where: { clientId } });
      const result = existing
        ? await prisma.clientHealthScore.update({
            where: { clientId },
            data: {
              score,
              prevScore: existing.score,
              trend: score > existing.score ? "up" : score < existing.score ? "down" : "stable",
              lastContactAt,
              paymentsInDay: paymentInDay,
              npsResponse,
              engagementRate,
              projectStatus: hasDelayedProject || delayedDemands > 0 ? "critical" : activeProjects > 0 ? "good" : "warning",
              riskLevel,
              flags: flagsPayload,
              calculatedAt: new Date(),
            },
          })
        : await prisma.clientHealthScore.create({
            data: {
              clientId,
              score,
              lastContactAt,
              paymentsInDay: paymentInDay,
              engagementRate,
              projectStatus: hasDelayedProject || delayedDemands > 0 ? "critical" : activeProjects > 0 ? "good" : "warning",
              riskLevel,
              flags: flagsPayload,
              organizationId: orgId,
            },
          });

      res.json((await enrichScores(orgId, [result]))[0]);
    } catch (error) {
      console.error("[HEALTH_SCORE_CALCULATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao calcular health score" });
    }
  });

  router.get("/summary", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const [all, critical, high, medium, low] = await Promise.all([
        prisma.clientHealthScore.count({ where: { organizationId: orgId } }),
        prisma.clientHealthScore.count({ where: { organizationId: orgId, riskLevel: "critical" } }),
        prisma.clientHealthScore.count({ where: { organizationId: orgId, riskLevel: "high" } }),
        prisma.clientHealthScore.count({ where: { organizationId: orgId, riskLevel: "medium" } }),
        prisma.clientHealthScore.count({ where: { organizationId: orgId, riskLevel: "low" } }),
      ]);
      res.json({ total: all, critical, high, medium, low });
    } catch (error) {
      console.error("[HEALTH_SCORE_SUMMARY_ERROR]", error);
      res.status(500).json({ error: "Erro ao carregar sumario" });
    }
  });

  return router;
}
