import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { auditFromRequest } from "../utils/auditLogger.js";

function canManagePrivacy(req: AuthRequest): boolean {
  return req.user?.role === "SUPER_ADMIN" || req.user?.role === "ORG_ADMIN" || req.user?.role === "AGENCY_ADMIN";
}

function maskedEmail(id: string): string {
  return `anon-${id.slice(0, 8)}@privacy.local`;
}

export function privacyRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/export", async (req: AuthRequest, res) => {
    if (!canManagePrivacy(req)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Tenant ausente." });

    const [users, clients, leads] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      }),
      prisma.client.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          corporateName: true,
          tradeName: true,
          cnpj: true,
          cpf: true,
          email: true,
          phone: true,
          responsibleName: true,
          responsibleCpf: true,
          responsibleEmail: true,
          responsiblePhone: true,
          source: true,
          createdAt: true,
        },
      }),
      prisma.lead.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          whatsapp: true,
          cpf: true,
          cnpj: true,
          source: true,
          channel: true,
          lgpdConsent: true,
          lgpdDate: true,
          createdAt: true,
        },
      }),
    ]);

    auditFromRequest(req, "EXPORT", "PrivacyData", orgId, {
      users: users.length,
      clients: clients.length,
      leads: leads.length,
    });

    res.json({
      exportedAt: new Date().toISOString(),
      organizationId: orgId,
      data: { users, clients, leads },
    });
  });

  router.post("/anonymize", async (req: AuthRequest, res) => {
    if (!canManagePrivacy(req)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const orgId = req.user?.orgId;
    const { resource, id } = req.body;
    if (!orgId || !id || !["lead", "client"].includes(resource)) {
      return res.status(400).json({ error: "Informe resource=lead|client e id." });
    }

    if (resource === "lead") {
      const lead = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: "Lead nao encontrado." });

      await prisma.lead.update({
        where: { id },
        data: {
          name: "Titular anonimizado",
          email: maskedEmail(id),
          phone: null,
          whatsapp: null,
          cpf: null,
          cnpj: null,
          notes: null,
          owners: null,
          managementTeam: null,
          aiDiagnosis: null,
          lgpdConsent: false,
          lgpdDate: new Date(),
        },
      });
    }

    if (resource === "client") {
      const client = await prisma.client.findFirst({ where: { id, organizationId: orgId } });
      if (!client) return res.status(404).json({ error: "Cliente nao encontrado." });

      await prisma.client.update({
        where: { id },
        data: {
          corporateName: "Titular anonimizado",
          tradeName: null,
          cnpj: null,
          cpf: null,
          email: maskedEmail(id),
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          responsibleName: null,
          responsibleCpf: null,
          responsibleEmail: null,
          responsiblePhone: null,
          responsibleRole: null,
          notes: null,
          tags: null,
          portalAccess: false,
          password: null,
        },
      });
    }

    auditFromRequest(req, "DELETE", "PrivacyData", id, { resource, mode: "anonymize" });
    res.json({ success: true });
  });

  return router;
}

