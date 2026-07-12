import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import {
  analyzeClientAds,
  createClientReportShare,
  getClientAdsReport,
  syncAdAccountMetrics,
} from "../services/adsIntelligence.js";

export function adsRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/ad-accounts", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const accounts = await prisma.adAccount.findMany({
        where: {
          organizationId: orgId,
          ...(req.query.clientId ? { clientId: String(req.query.clientId) } : {}),
        },
        include: { client: { select: { id: true, corporateName: true, tradeName: true } } },
        orderBy: { accountName: "asc" },
      });
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });

  router.post("/ad-accounts", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, accountName, platform, accountId, status, accountStatus, accessToken, clientId } = req.body;
    try {
      if (clientId) {
        const client = await prisma.client.findFirst({ where: { id: String(clientId), organizationId: orgId }, select: { id: true } });
        if (!client) return res.status(400).json({ error: "Cliente invalido para esta organizacao" });
      }

      const account = await prisma.adAccount.create({
        data: {
          accountName: accountName || name,
          platform,
          accountId,
          accountStatus: accountStatus || status || "active",
          accessToken,
          clientId: clientId || null,
          organizationId: orgId,
        },
      });
      res.json(account);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/ad-accounts/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { accountName, platform, accountStatus, accessToken, dailySpendLimit, clientId } = req.body;
    try {
      const existing = await prisma.adAccount.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Conta de anuncio nao encontrada" });

      if (clientId) {
        const client = await prisma.client.findFirst({ where: { id: String(clientId), organizationId: orgId }, select: { id: true } });
        if (!client) return res.status(400).json({ error: "Cliente invalido para esta organizacao" });
      }

      const account = await prisma.adAccount.update({
        where: { id: req.params.id },
        data: {
          accountName,
          platform,
          accountStatus,
          accessToken,
          clientId: clientId === undefined ? undefined : clientId || null,
          dailySpendLimit: dailySpendLimit !== undefined ? Number(dailySpendLimit) || 0 : undefined,
        },
      });
      res.json(account);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/ad-accounts/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await prisma.adAccount.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Conta de anuncio nao encontrada" });

      await prisma.adAccount.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/ad-accounts/:id/sync", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const result = await syncAdAccountMetrics(prisma, orgId, req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/campaigns-ads", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const campaigns = await prisma.campaignAd.findMany({
        where: {
          adAccount: {
            organizationId: orgId,
            ...(req.query.clientId ? { clientId: String(req.query.clientId) } : {}),
          },
        },
        include: { adAccount: { select: { accountName: true, clientId: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(campaigns.map((campaign) => ({
        ...campaign,
        accountName: campaign.adAccount.accountName,
        clientId: campaign.adAccount.clientId,
      })));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/campaigns-ads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await prisma.campaignAd.findFirst({
        where: { id: req.params.id, adAccount: { organizationId: orgId } },
      });
      if (!existing) return res.status(404).json({ error: "Campanha nao encontrada" });

      const campaign = await prisma.campaignAd.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status,
          budgetAmount: req.body.budgetAmount !== undefined ? Number(req.body.budgetAmount) || 0 : undefined,
          spendAmount: req.body.spendAmount !== undefined ? Number(req.body.spendAmount) || 0 : undefined,
        },
      });
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  });

  router.get("/summary", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    if (!req.query.clientId) return res.status(400).json({ error: "clientId e obrigatorio" });

    try {
      const report = await getClientAdsReport(prisma, orgId, String(req.query.clientId));
      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  router.post("/clients/:clientId/analyze", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const result = await analyzeClientAds(prisma, orgId, req.params.clientId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/clients/:clientId/share", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const share = await createClientReportShare(prisma, orgId, req.params.clientId);
      res.status(201).json({
        ...share,
        url: `/client-results/${share.token}`,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
