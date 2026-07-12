import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getClientAdsReport, getSharedClientReport } from "../services/adsIntelligence.js";

export function clientPortalRoutes(prisma: PrismaClient) {
  const router = Router();
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  const JWT_SECRET = process.env.JWT_SECRET;

  router.get("/reports/:token", async (req, res) => {
    try {
      const result = await getSharedClientReport(prisma, req.params.token);
      res.json(result);
    } catch (error: any) {
      res.status(error?.status || 500).json({ error: error?.message || "Erro ao buscar relatorio." });
    }
  });

  router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    try {
      const client = await prisma.client.findFirst({
        where: { email },
      });

      if (!client || !client.portalAccess) {
        return res.status(403).json({ error: "Acesso negado ou conta nao encontrada." });
      }

      const validPassword = await bcrypt.compare(password, client.password || "");
      if (!validPassword) {
        return res.status(401).json({ error: "Senha invalida." });
      }

      const token = jwt.sign(
        { id: client.id, role: "CLIENT", orgId: client.organizationId },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token, client: { id: client.id, name: client.corporateName, email: client.email } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  });

  const authenticateClient = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Token ausente" });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== "CLIENT") throw new Error("Nao e cliente");
      req.client = decoded;
      next();
    } catch {
      return res.status(403).json({ error: "Token invalido" });
    }
  };

  router.get("/dashboard", authenticateClient, async (req: any, res) => {
    try {
      const clientId = req.client.id;

      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          invoices: { orderBy: { dueDate: "desc" } },
          opportunities: { orderBy: { createdAt: "desc" }, take: 10 },
          projects: { include: { tasks: true } },
        },
      });

      if (!client) return res.status(404).json({ error: "Cliente nao encontrado" });
      const adsReport = await getClientAdsReport(prisma, client.organizationId, client.id).catch(() => null);

      res.json({
        metrics: {
          leadsGenerated: client.opportunities.length,
          salesClosed: client.opportunities.filter((o) => o.stage === "fechado_ganho").length,
          adsSpent: (adsReport?.totals?.spend || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          conversionRate: adsReport?.totals?.clicks ? `${adsReport.totals.ctr.toLocaleString("pt-BR")}% CTR` : "0%",
        },
        ads: adsReport,
        recentLeads: client.opportunities.map((o) => ({
          id: o.id,
          name: o.title || "Lead",
          status: o.stage,
          date: new Date(o.createdAt).toLocaleDateString("pt-BR"),
        })),
        invoices: client.invoices.map((inv) => ({
          id: inv.invoiceNumber || inv.id,
          amount: inv.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          status: inv.status,
          dueDate: new Date(inv.dueDate).toLocaleDateString("pt-BR"),
        })),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao buscar dados do dashboard." });
    }
  });

  return router;
}
