import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { normalizeWhatsAppPhone } from "../utils/whatsapp.js";
import { initiateCall, endCall, getCallStatus, listActiveCalls } from "../services/wacalls.js";
import { bridgeBaseUrl, bridgeSecret } from "../services/whatsappBridge.js";

export function whatsappCallRoutes(prisma: PrismaClient) {
  const router = Router();

  async function findOrgChannel(channelId: string, organizationId: string) {
    return prisma.channel.findFirst({
      where: { id: channelId, inbox: { organizationId } },
    });
  }

  router.post("/initiate", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { channelId, to } = req.body;
      if (!channelId || !to) {
        return res.status(400).json({ error: "channelId e to (telefone ou JID) são obrigatórios" });
      }

      const channel = await findOrgChannel(channelId, orgId);
      if (!channel) return res.status(404).json({ error: "Canal WhatsApp não encontrado" });

      const toJid = to.includes("@") ? to : normalizeWhatsAppPhone(to).jid;
      if (!toJid) return res.status(400).json({ error: "Destinatário inválido" });

      const bridgeCall = await initiateCall({
        channelId,
        toJid,
        organizationId: orgId,
      });

      const dbCall = await prisma.whatsAppCall.create({
        data: {
          organizationId: orgId,
          channelId,
          callBridgeId: bridgeCall.id,
          direction: "outgoing",
          state: bridgeCall.state,
          toJid,
          startedAt: bridgeCall.startTime ? new Date(bridgeCall.startTime) : undefined,
          metadata: { ...(bridgeCall as any) },
        },
      });

      res.json({ ...bridgeCall, dbId: dbCall.id });
    } catch (err: any) {
      next(err);
    }
  });

  router.post("/:channelId/:callId/end", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const channel = await findOrgChannel(req.params.channelId, orgId);
      if (!channel) return res.status(404).json({ error: "Canal WhatsApp nao encontrado" });

      await endCall(req.params.channelId, req.params.callId);

      await prisma.whatsAppCall.updateMany({
        where: { callBridgeId: req.params.callId, organizationId: orgId, channelId: req.params.channelId },
        data: { state: "ended", endedAt: new Date() },
      });

      res.json({ success: true });
    } catch (err: any) {
      next(err);
    }
  });

  router.get("/:channelId/:callId/status", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const channel = await findOrgChannel(req.params.channelId, orgId);
      if (!channel) return res.status(404).json({ error: "Canal WhatsApp nao encontrado" });

      const [bridgeCall, dbCall] = await Promise.all([
        getCallStatus(req.params.channelId, req.params.callId),
        prisma.whatsAppCall.findFirst({
          where: { callBridgeId: req.params.callId, organizationId: orgId, channelId: req.params.channelId },
        }),
      ]);
      res.json({ ...bridgeCall, dbRecord: dbCall });
    } catch (err: any) {
      next(err);
    }
  });

  router.get("/:channelId/active", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const channel = await findOrgChannel(req.params.channelId, orgId);
      if (!channel) return res.status(404).json({ error: "Canal WhatsApp nao encontrado" });

      const calls = await listActiveCalls(req.params.channelId);
      res.json(calls);
    } catch (err: any) {
      next(err);
    }
  });

  router.get("/events", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const calls = await prisma.whatsAppCall.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.json(calls);
    } catch (err: any) {
      next(err);
    }
  });

  router.get("/:channelId/events", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const channel = await findOrgChannel(req.params.channelId, orgId);
      if (!channel) return res.status(404).json({ error: "Canal WhatsApp nao encontrado" });

      const url = `${bridgeBaseUrl()}/calls/${req.params.channelId}/events`;
      const bridgeRes = await fetch(url, {
        method: "GET",
        headers: {
          "x-whatsapp-bridge-secret": bridgeSecret(),
          Accept: "text/event-stream",
        },
      });

      if (!bridgeRes.ok || !bridgeRes.body) {
        return res.status(502).json({ error: "Bridge SSE indisponivel" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = bridgeRes.body.getReader();
      const decoder = new TextDecoder();
      req.on("close", () => reader.cancel());

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value));
      }
      res.end();
    } catch (err: any) {
      next(err);
    }
  });

  return router;
}
