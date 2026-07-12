import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { enqueueAgentQueueForClient, executeAgentQueueItem, processAgentQueue } from "../services/agentQueue.js";

export function agentQueueRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const where: any = { organizationId: orgId };
      if (req.query.clientId) where.clientId = String(req.query.clientId);
      if (req.query.status) where.status = String(req.query.status);
      if (req.query.agentId) where.agentId = String(req.query.agentId);

      const items = await prisma.agentQueueItem.findMany({
        where,
        include: { client: { select: { id: true, corporateName: true, tradeName: true, status: true } } },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: Number(req.query.limit || 100),
      });

      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  router.post("/clients/:clientId/enqueue", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const result = await enqueueAgentQueueForClient(prisma, {
        organizationId: orgId,
        clientId: req.params.clientId,
        requestedById: req.user?.id,
        source: req.body?.source || "manual_enqueue",
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/process", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const result = await processAgentQueue(prisma, orgId, Number(req.body?.limit || 10), req.body?.clientId ? String(req.body.clientId) : null);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/run", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const item = await executeAgentQueueItem(prisma, req.params.id, orgId);
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.agentQueueItem.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Item da fila nao encontrado" });

      const data: any = {};
      for (const field of ["status", "priority", "scheduledAt", "description", "metadata"] as const) {
        if (req.body?.[field] !== undefined) data[field] = field === "scheduledAt" && req.body[field] ? new Date(req.body[field]) : req.body[field];
      }

      const item = await prisma.agentQueueItem.update({ where: { id: existing.id }, data });
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
