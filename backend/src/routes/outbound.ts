import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { OutboundDispatcherService } from "../services/outboundDispatcher.js";
import { MessageRewriteService } from "../services/messageRewrite.js";

export function outboundRoutes(prisma: PrismaClient) {
  const router = Router();
  const dispatcher = new OutboundDispatcherService(prisma);
  const rewriteService = new MessageRewriteService(prisma);

  router.post("/dispatch", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });

      const { contact, message, ia, channelId, media, messageId } = req.body || {};
      if (media) {
        return res.status(501).json({
          error: "MEDIA_OUTBOUND_NOT_READY",
          message: "O Disparador PRO interno ja envia texto via WhatsMeow. Envio de midia outbound sera implementado no bridge WhatsMeow em uma etapa separada.",
        });
      }

      const result = await dispatcher.dispatchText({
        organizationId: orgId,
        userId: req.user?.id,
        channelId,
        contact,
        message,
        ia: Boolean(ia),
        source: "disparador_pro_whatsmeow",
        metadata: { externalMessageId: messageId || null },
      });

      res.status(201).json({ result: "success", ...result });
    } catch (error: any) {
      const status = Number(error?.status || 500);
      if (status >= 500) {
        console.error("[OUTBOUND_DISPATCH_ERROR]", {
          orgId: req.user?.orgId,
          userId: req.user?.id,
          error: error?.message,
          stack: error?.stack,
        });
      }
      res.status(status).json({ result: "error", error: error?.message || "Erro ao disparar mensagem." });
    }
  });

  router.post("/rewrite", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
      const result = await rewriteService.rewriteWhatsAppMessage(orgId, req.body?.message || "");
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
