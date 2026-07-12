import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { getPagination } from "../utils/pagination.js";
import { retryFailedEvent } from "../services/webhookDelivery.js";

const URL_REGEX = /^https?:\/\/.+/i;

export function webhookRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const webhooks = await prisma.webhook.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
      });
      res.json(webhooks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { url, secret, events, isActive } = req.body;
      if (!url || !URL_REGEX.test(url)) {
        return res.status(400).json({ error: "URL inválida. Deve começar com http:// ou https://" });
      }
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: "Informe ao menos um evento" });
      }

      const webhook = await prisma.webhook.create({
        data: {
          organizationId: orgId,
          url,
          secret: secret || null,
          events,
          isActive: isActive !== false,
        },
      });
      res.status(201).json(webhook);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/:id", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.webhook.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Webhook não encontrado" });

      const { url, secret, events, isActive } = req.body;
      if (url && !URL_REGEX.test(url)) {
        return res.status(400).json({ error: "URL inválida" });
      }
      if (events && (!Array.isArray(events) || events.length === 0)) {
        return res.status(400).json({ error: "Informe ao menos um evento" });
      }

      const webhook = await prisma.webhook.update({
        where: { id: req.params.id },
        data: {
          ...(url !== undefined ? { url } : {}),
          ...(secret !== undefined ? { secret: secret || null } : {}),
          ...(events !== undefined ? { events } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(webhook);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.webhook.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Webhook não encontrado" });

      await prisma.webhook.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/:id/events", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const webhook = await prisma.webhook.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!webhook) return res.status(404).json({ error: "Webhook não encontrado" });

      const { skip, take } = getPagination(req.query);
      const [events, total] = await Promise.all([
        prisma.webhookEvent.findMany({
          where: { webhookId: req.params.id },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.webhookEvent.count({ where: { webhookId: req.params.id } }),
      ]);
      res.json({ data: events, total, skip, take });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/:id/events/:eventId/retry", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const webhook = await prisma.webhook.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!webhook) return res.status(404).json({ error: "Webhook não encontrado" });

      await retryFailedEvent(prisma, req.params.eventId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
