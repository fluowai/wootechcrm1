import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { auditFromRequest } from "../utils/auditLogger.js";

export function omnichannelRoutes(prisma: PrismaClient) {
  const router = Router();

  // ==================== INBOXES ====================

  router.get("/inboxes", async (req: AuthRequest, res, next) => {
    try {
      const inboxes = await prisma.inbox.findMany({
        where: { organizationId: req.user!.orgId },
        include: {
          channels: { where: { isActive: true } },
          _count: {
            select: {
              conversations: { where: { status: "open" } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      res.json(inboxes);
    } catch (error) {
      next(error);
    }
  });

  router.post("/inboxes", async (req: AuthRequest, res, next) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Nome do inbox é obrigatório" });

      const inbox = await prisma.inbox.create({
        data: {
          name,
          organizationId: req.user!.orgId,
        },
      });
      auditFromRequest(req, "CREATE", "Inbox", inbox.id);
      res.json(inbox);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/inboxes/:id", async (req: AuthRequest, res, next) => {
    try {
      const { name } = req.body;
      const inbox = await prisma.inbox.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!inbox) return res.status(404).json({ error: "Inbox não encontrado" });

      const updated = await prisma.inbox.update({
        where: { id: req.params.id },
        data: { ...(name && { name }) },
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/inboxes/:id", async (req: AuthRequest, res, next) => {
    try {
      const inbox = await prisma.inbox.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!inbox) return res.status(404).json({ error: "Inbox não encontrado" });
      await prisma.inbox.delete({ where: { id: req.params.id } });
      auditFromRequest(req, "DELETE", "Inbox", req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ==================== CHANNELS ====================

  router.get("/channels", async (req: AuthRequest, res, next) => {
    try {
      const channels = await prisma.channel.findMany({
        where: {
          inbox: { organizationId: req.user!.orgId },
        },
        include: { inbox: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(channels);
    } catch (error) {
      next(error);
    }
  });

  router.post("/channels", async (req: AuthRequest, res, next) => {
    try {
      const { inboxId, type, provider, identifier, config } = req.body;
      if (!inboxId || !type || !identifier) {
        return res.status(400).json({ error: "inboxId, type e identifier são obrigatórios" });
      }

      const inbox = await prisma.inbox.findFirst({
        where: { id: inboxId, organizationId: req.user!.orgId },
      });
      if (!inbox) return res.status(404).json({ error: "Inbox não encontrado" });

      const channel = await prisma.channel.create({
        data: {
          type,
          provider: provider || "manual",
          identifier,
          config: config || undefined,
          inboxId,
        },
      });
      auditFromRequest(req, "CREATE", "Channel", channel.id);
      res.json(channel);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/channels/:id", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Canal não encontrado" });

      const { config, isActive } = req.body;
      const data: any = {};
      if (config !== undefined) data.config = config;
      if (isActive !== undefined) data.isActive = isActive;

      const updated = await prisma.channel.update({ where: { id: req.params.id }, data });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // ==================== CONVERSATIONS ====================

  router.get("/conversations", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const where: any = {
        inbox: { organizationId: orgId },
      };

      if (req.query.status) where.status = req.query.status;
      if (req.query.inboxId) where.inboxId = req.query.inboxId;
      if (req.query.channelId) where.channelId = req.query.channelId;
      if (req.query.assignedToId) where.assignedToId = req.query.assignedToId;
      if (req.query.search) {
        where.OR = [
          { lead: { name: { contains: req.query.search as string, mode: "insensitive" } } },
          { subject: { contains: req.query.search as string, mode: "insensitive" } },
        ];
      }

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          include: {
            inbox: { select: { id: true, name: true } },
            channel: { select: { id: true, type: true, identifier: true } },
            lead: { select: { id: true, name: true, phone: true, email: true } },
            assignedTo: { select: { id: true, name: true, avatarUrl: true } },
            messages: { take: 1, orderBy: { createdAt: "desc" }, select: { content: true, createdAt: true } },
            _count: { select: { messages: true } },
          },
          orderBy: { lastMessageAt: "desc" },
        }),
        prisma.conversation.count({ where }),
      ]);
      res.json({ conversations, total });
    } catch (error) {
      next(error);
    }
  });

  router.get("/conversations/:id", async (req: AuthRequest, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId } },
        include: {
          inbox: { select: { id: true, name: true } },
          channel: { select: { id: true, type: true, identifier: true } },
          lead: { select: { id: true, name: true, phone: true, email: true, whatsapp: true, tags: true } },
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });

      // Marcar como lida
      await prisma.conversation.update({
        where: { id: req.params.id },
        data: { lastMessageAt: new Date() },
      });

      res.json(conversation);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/conversations/:id/assign", async (req: AuthRequest, res, next) => {
    try {
      const { assignedToId } = req.body;
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId } },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });

      const updated = await prisma.conversation.update({
        where: { id: req.params.id },
        data: { assignedToId: assignedToId || null },
      });
      auditFromRequest(req, "OWNER_CHANGE", "Conversation", req.params.id, { assignedToId });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/conversations/:id/status", async (req: AuthRequest, res, next) => {
    try {
      const { status } = req.body;
      if (!["open", "pending", "closed", "snoozed"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId } },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });

      const updated = await prisma.conversation.update({
        where: { id: req.params.id },
        data: { status },
      });
      auditFromRequest(req, "UPDATE", "Conversation", req.params.id, { status });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // ==================== MESSAGES ====================

  router.get("/conversations/:id/messages", async (req: AuthRequest, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId } },
        select: { id: true },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });

      const messages = await prisma.message.findMany({
        where: { conversationId: req.params.id },
        orderBy: { createdAt: "asc" },
      });
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });

  router.post("/conversations/:id/messages", async (req: AuthRequest, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId } },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });

      const { content, type, fileUrl, isPrivate } = req.body;
      if (!content && !fileUrl) return res.status(400).json({ error: "Conteúdo ou arquivo é obrigatório" });

      const message = await prisma.message.create({
        data: {
          conversationId: req.params.id,
          senderId: req.user!.id,
          senderType: isPrivate ? "USER" : "USER",
          content: content || null,
          type: type || "text",
          fileUrl: fileUrl || null,
          isPrivate: !!isPrivate,
          metadata: { source: "nexus_web" },
        },
      });

      await prisma.conversation.update({
        where: { id: req.params.id },
        data: { lastMessageAt: new Date() },
      });

      res.json(message);
    } catch (error) {
      next(error);
    }
  });

  // ==================== QUICK REPLIES ====================

  router.get("/quick-replies", async (req: AuthRequest, res, next) => {
    try {
      const replies = await prisma.quickReply.findMany({
        where: { organizationId: req.user!.orgId },
        orderBy: { category: "asc" },
      });
      res.json(replies);
    } catch (error) {
      next(error);
    }
  });

  router.post("/quick-replies", async (req: AuthRequest, res, next) => {
    try {
      const { title, content, category, shortcut } = req.body;
      if (!title || !content) return res.status(400).json({ error: "Título e conteúdo são obrigatórios" });

      const reply = await prisma.quickReply.create({
        data: {
          title,
          content,
          category: category || null,
          shortcut: shortcut || null,
          organizationId: req.user!.orgId,
        },
      });
      res.json(reply);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/quick-replies/:id", async (req: AuthRequest, res, next) => {
    try {
      const reply = await prisma.quickReply.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!reply) return res.status(404).json({ error: "Resposta rápida não encontrada" });

      const { title, content, category, shortcut, isActive } = req.body;
      const data: any = {};
      if (title !== undefined) data.title = title;
      if (content !== undefined) data.content = content;
      if (category !== undefined) data.category = category;
      if (shortcut !== undefined) data.shortcut = shortcut;
      if (isActive !== undefined) data.isActive = isActive;

      const updated = await prisma.quickReply.update({ where: { id: req.params.id }, data });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/quick-replies/:id", async (req: AuthRequest, res, next) => {
    try {
      const reply = await prisma.quickReply.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!reply) return res.status(404).json({ error: "Resposta rápida não encontrada" });
      await prisma.quickReply.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // ==================== INBOX SLA ====================

  router.get("/sla/:inboxId", async (req: AuthRequest, res, next) => {
    try {
      const inbox = await prisma.inbox.findFirst({
        where: { id: req.params.inboxId, organizationId: req.user!.orgId },
      });
      if (!inbox) return res.status(404).json({ error: "Inbox não encontrado" });

      const sla = await prisma.inboxSla.findUnique({
        where: { inboxId: req.params.inboxId },
      });
      res.json(sla || null);
    } catch (error) {
      next(error);
    }
  });

  router.post("/sla/:inboxId", async (req: AuthRequest, res, next) => {
    try {
      const inbox = await prisma.inbox.findFirst({
        where: { id: req.params.inboxId, organizationId: req.user!.orgId },
      });
      if (!inbox) return res.status(404).json({ error: "Inbox não encontrado" });

      const { firstResponseTime, resolutionTime, businessHoursOnly, workingDays, workingHours } = req.body;

      const sla = await prisma.inboxSla.upsert({
        where: { inboxId: req.params.inboxId },
        update: {
          firstResponseTime,
          resolutionTime,
          businessHoursOnly: businessHoursOnly ?? true,
          workingDays: workingDays || undefined,
          workingHours: workingHours || undefined,
        },
        create: {
          inboxId: req.params.inboxId,
          firstResponseTime,
          resolutionTime,
          businessHoursOnly: businessHoursOnly ?? true,
          workingDays: workingDays || undefined,
          workingHours: workingHours || undefined,
        },
      });
      res.json(sla);
    } catch (error) {
      next(error);
    }
  });

  router.use((req, res) => {
    res.status(404).json({ success: false, error: "Omnichannel route not found", path: req.originalUrl });
  });

  return router;
}
