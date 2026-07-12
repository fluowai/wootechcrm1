import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { AccessToken } from "livekit-server-sdk";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";
import { resolveTenant } from "../middleware/tenant.js";

const scheduledMeetings = new Map<string, any>();

const livekitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function createAccessCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function createRoomId(): string {
  return `room-${crypto.randomBytes(8).toString("hex")}`;
}

function normalizeEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase();
}

function isGuestAllowed(meeting: any, email: string): boolean {
  if (!Array.isArray(meeting.guests) || meeting.guests.length === 0) return true;
  return meeting.guests.some((guest: any) => normalizeEmail(guest.email) === normalizeEmail(email));
}

function publicMeeting(meeting: any) {
  return {
    id: meeting.id,
    title: meeting.title,
  };
}

export function livekitRoutes(prisma: PrismaClient) {
  const router = express.Router();
  router.use(livekitLimiter);

  router.post("/schedule", authenticateToken, resolveTenant, async (req: AuthRequest, res) => {
    const { title, date, guests } = req.body;
    const code = createAccessCode();
    const roomId = createRoomId();

    const meeting = {
      id: roomId,
      title: String(title || "Reuniao Nexus360").slice(0, 120),
      date,
      code,
      orgId: req.user?.orgId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      guests: Array.isArray(guests)
        ? guests.map((guest: any) => ({ email: normalizeEmail(guest.email), status: "invited" }))
        : [],
    };

    scheduledMeetings.set(code, meeting);
    res.json({ success: true, code, roomId, link: `/meet/${roomId}?code=${code}` });
  });

  router.post("/validate-code", async (req, res) => {
    const { code, email } = req.body;
    if (!/^\d{6}$/.test(String(code || "")) || !email) {
      return res.status(400).json({ error: "Codigo e e-mail sao obrigatorios." });
    }

    let meeting = scheduledMeetings.get(String(code));

    if (!meeting) {
      const dbEvent = await prisma.calendarEvent.findFirst({
        where: {
          meetingLink: { contains: `code=${code}` },
        },
      });

      if (dbEvent) {
        meeting = {
          id: dbEvent.meetingLink?.split("?")[0].split("/").pop(),
          title: dbEvent.title,
          code,
          expiresAt: new Date(dbEvent.endDate || dbEvent.startDate).getTime() + 24 * 60 * 60 * 1000,
          guests: [],
        };
      }
    }

    if (!meeting) {
      return res.status(404).json({ error: "Reuniao nao encontrada ou codigo expirado." });
    }

    if (meeting.expiresAt && meeting.expiresAt < Date.now()) {
      scheduledMeetings.delete(String(code));
      return res.status(404).json({ error: "Reuniao expirada." });
    }

    if (!isGuestAllowed(meeting, normalizeEmail(email))) {
      return res.status(403).json({ error: "E-mail nao autorizado para esta reuniao." });
    }

    res.json({ valid: true, meeting: publicMeeting(meeting) });
  });

  router.post("/token", async (req, res) => {
    try {
      const { roomName, participantName, code, email } = req.body;
      if (!roomName || !participantName || !code || !email) {
        return res.status(400).json({ error: "roomName, participantName, email and code are required" });
      }

      let meeting = scheduledMeetings.get(String(code));

      if (!meeting) {
        const dbEvent = await prisma.calendarEvent.findFirst({
          where: { meetingLink: { contains: `code=${code}` } },
        });
        if (dbEvent) {
          meeting = {
            id: dbEvent.meetingLink?.split("?")[0].split("/").pop(),
            title: dbEvent.title,
            code,
            orgId: dbEvent.organizationId,
            expiresAt: new Date(dbEvent.endDate || dbEvent.startDate).getTime() + 24 * 60 * 60 * 1000,
            guests: [],
          };
        }
      }

      const expectedRoomName = meeting ? `nexus-360-${meeting.id}` : null;
      if (!meeting || meeting.expiresAt < Date.now() || !isGuestAllowed(meeting, normalizeEmail(email))) {
        return res.status(403).json({ error: "Acesso a reuniao negado." });
      }

      if (roomName !== expectedRoomName) {
        return res.status(403).json({ error: "Sala invalida para este codigo." });
      }

      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;

      if (!apiKey || !apiSecret) {
        console.error("[LIVEKIT_ERROR] Credenciais ausentes no ambiente.");
        return res.status(500).json({ error: "LiveKit credentials not configured on server" });
      }

      const identity = `${normalizeEmail(email)}-${crypto.randomBytes(4).toString("hex")}`;
      const at = new AccessToken(apiKey, apiSecret, {
        identity,
        name: String(participantName).slice(0, 80),
      });
      at.addGrant({ roomJoin: true, room: roomName });
      const token = await at.toJwt();
      res.json({ token });
    } catch (error) {
      console.error("[LIVEKIT_TOKEN_ERROR]", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  return router;
}
