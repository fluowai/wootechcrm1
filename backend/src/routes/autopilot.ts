import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { getAutopilotStatus, runAutonomousOperatingCycle } from "../services/autonomousOps.js";

export function autopilotRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/status", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const status = await getAutopilotStatus(prisma, orgId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  });

  router.post("/run", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const objective = String(req.body?.objective || "").trim();
      if (!objective) {
        return res.status(400).json({ error: "Objetivo e obrigatorio para iniciar o piloto automatico." });
      }

      const result = await runAutonomousOperatingCycle(prisma, {
        organizationId: orgId,
        userId: req.user?.id,
        clientId: req.body?.clientId ? String(req.body.clientId) : null,
        objective,
        niche: req.body?.niche,
        city: req.body?.city,
        state: req.body?.state,
        country: req.body?.country || "Brasil",
        budget: req.body?.budget,
        requestedLimit: req.body?.requestedLimit,
        publishLanding: req.body?.publishLanding === true,
        autonomy: req.body?.autonomy || "semi_autonomous",
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
