import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import {
  ensureDefaultExperienceBlueprints,
  getOrganizationExperienceState,
  provisionExperienceForOrganization,
  provisionExperienceFromOnboardingResponse,
} from "../services/experienceProvisioning.js";

export function experienceRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const state = await getOrganizationExperienceState(prisma, orgId);
      res.json({ success: true, ...state });
    } catch (error) {
      next(error);
    }
  });

  router.get("/navigation", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const state = await getOrganizationExperienceState(prisma, orgId);
      res.json({
        success: true,
        provisioned: state.provisioned,
        modules: state.moduleKeys,
        vocabulary: state.vocabulary,
        experience: state.experience
          ? {
              id: state.experience.id,
              vertical: state.experience.vertical,
              label: state.experience.label,
              status: state.experience.status,
              appliedAt: state.experience.appliedAt,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/blueprints", async (_req: AuthRequest, res, next) => {
    try {
      await ensureDefaultExperienceBlueprints(prisma);
      const blueprints = await prisma.experienceBlueprint.findMany({
        where: { isActive: true },
        orderBy: [{ vertical: "asc" }, { name: "asc" }],
      });
      res.json({ success: true, blueprints });
    } catch (error) {
      next(error);
    }
  });

  router.post("/provision", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const result = await provisionExperienceForOrganization(prisma, {
        organizationId: orgId,
        userId: req.user?.id,
        source: req.body?.source || "manual",
        answers: req.body?.answers || req.body || {},
        diagnosis: req.body?.diagnosis || null,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reapply-onboarding", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const result = await provisionExperienceFromOnboardingResponse(prisma, orgId, req.user?.id);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
