import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authenticateToken } from "../middleware/auth.js";
import { resolveTenant } from "../middleware/tenant.js";
import { ProposalService } from "../services/proposalService.js";

export function proposalRoutes(prisma: PrismaClient) {
  const router = Router();
  const service = new ProposalService(prisma);

  // Listar propostas
  router.get("/", authenticateToken, resolveTenant, async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const proposals = await prisma.proposal.findMany({
        where: { organizationId: orgId },
        include: { client: { select: { corporateName: true, tradeName: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ error: "Erro ao listar propostas" });
    }
  });

  // Criar proposta a partir de oportunidade
  router.post("/from-opportunity", authenticateToken, resolveTenant, async (req: AuthRequest, res) => {
    const { opportunityId, title, notes } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    if (!opportunityId || !title) return res.status(400).json({ error: "opportunityId e title sÃ£o obrigatÃ³rios" });
    try {
      const proposal = await service.createFromOpportunity(orgId, opportunityId, { title, notes });
      res.json(proposal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Buscar detalhes e renderizar (com variáveis)
  router.get("/:id/render", authenticateToken, resolveTenant, async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    try {
      const rendered = await service.renderProposal(orgId, req.params.id);
      res.json(rendered);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
}
