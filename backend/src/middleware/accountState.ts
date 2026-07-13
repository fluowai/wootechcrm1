import type { NextFunction, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import type { AuthRequest } from "./auth.js";

const BLOCKED_STATUSES = new Set(["SUSPENDED", "EXPIRED", "CANCELED"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function enforceAccountState(prisma: PrismaClient) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });

    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          status: true,
          role: true,
          organizationId: true,
          permissions: true,
          accessProfile: { select: { permissions: true } },
        },
      });
      if (!currentUser || currentUser.status !== "ACTIVE") {
        return res.status(403).json({ error: "ACCOUNT_SUSPENDED", message: "Conta suspensa ou inativa." });
      }

      req.user.role = currentUser.role;
      req.user.permissions = (currentUser.accessProfile?.permissions || currentUser.permissions || {}) as Record<string, string | string[]>;
      if (currentUser.role === "SUPER_ADMIN") return next();

      if (!currentUser.organizationId || currentUser.organizationId !== req.user.orgId) {
        return res.status(403).json({ error: "TENANT_MISMATCH" });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: req.user.orgId },
        select: { isActive: true, subscriptionStatus: true, trialEndsAt: true },
      });
      if (!organization || !organization.isActive) {
        return res.status(403).json({ error: "TENANT_SUSPENDED", message: "Organização suspensa ou inativa." });
      }

      const status = String(organization.subscriptionStatus || "TRIAL").toUpperCase();
      const trialExpired = status === "TRIAL" && organization.trialEndsAt && organization.trialEndsAt < new Date();
      if (BLOCKED_STATUSES.has(status) || trialExpired) {
        return res.status(402).json({ error: "SUBSCRIPTION_BLOCKED", status: trialExpired ? "EXPIRED" : status });
      }
      if (status === "PAST_DUE" && WRITE_METHODS.has(req.method)) {
        return res.status(402).json({ error: "SUBSCRIPTION_READ_ONLY", status });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
