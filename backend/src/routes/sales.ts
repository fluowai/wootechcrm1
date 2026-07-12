import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { proposalAI } from "../services/proposalAI.js";
import { v4 as uuidv4 } from 'uuid';
import { sanitizeBody } from "../utils/sanitizer.js";
import { auditFromRequest } from "../utils/auditLogger.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";

export function salesRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar Fila de Vendas (Queue)
  router.get("/queue", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Feature Flag Check
      const [org, settings] = await Promise.all([
        prisma.organization.findUnique({ where: { id: orgId }, select: { betaAccess: true } }),
        prisma.systemSettings.findUnique({ where: { id: "global" } })
      ]);

      if (!settings?.salesMachinePublic && !org?.betaAccess) {
        return res.status(403).json({ error: "O recurso Sales Machine está em fase de homologação. Contate o suporte para liberar acesso beta." });
      }

      const queue = await prisma.lead.findMany({
        where: { 
          organizationId: orgId,
          status: { in: ['novo', 'contato'] }
        },
        orderBy: { updatedAt: 'desc' }
      });
      res.json(Array.isArray(queue) ? queue : []);
    } catch (error) {
      console.error("[SALES_QUEUE_ERROR]", error);
      res.status(500).json({ error: "Erro ao buscar fila de vendas" });
    }
  });

  router.get("/sold-services", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const services = await prisma.soldProduct.findMany({
        where: {
          client: { organizationId: orgId }
        },
        include: {
          client: { select: { id: true, corporateName: true, tradeName: true, status: true } },
          contracts: { select: { id: true, status: true, createdAt: true } }
        },
        orderBy: { createdAt: "desc" }
      });
      res.json(services);
    } catch (error) {
      next(error);
    }
  });

  // Listar Propostas da Organização
  router.get("/proposals", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const proposals = await prisma.proposal.findMany({
        where: { organizationId: orgId },
        include: { client: { select: { corporateName: true } }, lead: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(proposals);
    } catch (error) {
      next(error);
    }
  });

  // Gerar Proposta com IA
  router.post("/proposals/generate", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { niche, clientName, services } = req.body;
    
    if (!niche || !clientName) {
      return res.status(400).json({ error: "Nicho e nome do cliente são obrigatórios." });
    }

    try {
      const content = await proposalAI.generate(prisma, niche, clientName, services || [], orgId, req.user?.id);
      res.json(content);
    } catch (error: any) {
      console.error("[SALES_PROPOSAL_GENERATE_ERROR]", error);
      res.status(500).json({ 
        error: "Falha ao gerar proposta", 
        details: error.message 
      });
    }
  });

  // Salvar Proposta Final
  router.post("/proposals", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const data = sanitizeBody(req.body, "proposal");

    try {
      const proposal = await prisma.proposal.create({
        data: {
          title: data.title,
          slug: uuidv4().substring(0, 8),
          organizationId: orgId,
          clientId: data.clientId,
          leadId: data.leadId,
          content: data.content,
          logoUrl: data.logoUrl,
          footerText: data.footerText,
          status: 'sent'
        }
      });

      auditFromRequest(req, "PROPOSAL_SENT", "Proposal", proposal.id);
      emitAutomationEvent("proposal.sent", { organizationId: orgId, proposalId: proposal.id });
      res.json(proposal);
    } catch (error) {
      next(error);
    }
  });

  // Buscar Detalhes — IDOR FIXED: filtra por orgId
  router.get("/proposals/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const proposal = await prisma.proposal.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { client: true, lead: true }
      });

      if (!proposal) {
        return res.status(404).json({ error: "Proposta não encontrada" });
      }

      res.json(proposal);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
