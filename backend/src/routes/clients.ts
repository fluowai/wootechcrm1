import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { sanitizeBody } from "../utils/sanitizer.js";
import { ensureClientAgentContext, upsertClientAgentContext } from "../services/clientAgentContext.js";

function normalizeDocument(value: unknown) {
  if (typeof value !== "string") return value;
  const digits = value.replace(/\D/g, "");
  return digits || null;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") return value;
  return value.trim();
}

export function normalizeClientPayload(body: Record<string, any>) {
  const data = sanitizeBody(body, "client") as any;

  if ("cnpj" in data) data.cnpj = normalizeDocument(data.cnpj);
  if ("cpf" in data) data.cpf = normalizeDocument(data.cpf);
  if ("responsibleCpf" in data) data.responsibleCpf = normalizeDocument(data.responsibleCpf);

  if ("email" in data) data.email = normalizeRequiredString(data.email);

  for (const field of ["phone", "website", "responsibleEmail", "responsiblePhone"]) {
    if (field in data) data[field] = normalizeOptionalString(data[field]);
  }

  return data;
}

export function clientRoutes(prisma: PrismaClient) {
  const router = Router();

  // List all clients for the organization
  router.get("/", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const clients = await prisma.client.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(clients);
    } catch (error) {
      next(error);
    }
  });

  // Get specific client details
  router.get("/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const client = await prisma.client.findFirst({
        where: { 
          id: req.params.id,
          organizationId: orgId
        },
        include: {
          opportunities: true,
          contracts: true
        }
      });
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  // Create a new client manually
  router.post("/", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const data = normalizeClientPayload(req.body);
      const client = await prisma.client.create({
        data: {
          ...data,
          email: data.email || "",
          organization: { connect: { id: orgId } },
          status: data.status || 'prospect'
        }
      });
      await ensureClientAgentContext(prisma, client, data.aiBriefing || data.briefing || {});
      res.json(client);
    } catch (error: any) {
      if (error?.code === "P2002") {
        const target = error.meta?.target as string[] | undefined;
        const field = target?.[0] || "campo";
        return res.status(409).json({ error: `Já existe um cliente com este ${field}. Verifique o CNPJ ou CPF.` });
      }
      next(error);
    }
  });

  // Update client
  router.patch("/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await prisma.client.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existing) return res.status(404).json({ error: "Cliente não encontrado" });

      const client = await prisma.client.update({
        where: { id: req.params.id },
        data: normalizeClientPayload(req.body)
      });
      await upsertClientAgentContext(prisma, {
        organizationId: orgId,
        clientId: client.id,
        event: "client.updated",
        briefing: (req.body as any).aiBriefing || (req.body as any).briefing || {},
        metadata: { source: "clients_route" },
      });
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await prisma.client.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existing) return res.status(404).json({ error: "Cliente não encontrado" });

      await prisma.client.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Visão 360 Completa do Cliente
  router.get("/:id/full", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const client = await prisma.client.findFirst({
        where: { 
          id: req.params.id,
          organizationId: orgId
        },
        include: {
          contracts: { orderBy: { createdAt: 'desc' } },
          invoices: { orderBy: { dueDate: 'desc' } },
          demands: { orderBy: { createdAt: 'desc' } },
          soldProducts: true,
          proposals: { orderBy: { createdAt: 'desc' } }
        }
      });
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/context", async (req: AuthRequest, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const context = await prisma.clientAIContext.findFirst({
        where: { 
          clientId: req.params.id,
          client: {
            organizationId: req.user.orgId
          }
        }
      });
      res.json(context);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id/context", async (req: AuthRequest, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const context = await upsertClientAgentContext(prisma, {
        organizationId: req.user.orgId,
        clientId: req.params.id,
        event: "client.context.updated",
        briefing: req.body?.briefing || req.body || {},
        metadata: { source: "manual_context_update" },
      });

      res.json(context);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
