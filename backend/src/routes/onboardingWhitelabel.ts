import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AuthRequest } from "../middleware/auth.js";
import { normalizeDomain, DOMAIN_REGEX, verifyDomainDns, getDnsInstructions } from "../utils/domainConfig.js";
import { syncTraefikDomainConfig, removeTraefikDomainConfig } from "../services/traefikDomainConfig.js";

const MAX_ONBOARDING_STEP = 5;

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function nextStep(settings: Record<string, any>, step: number) {
  return Math.max(Number(settings.whitelabelOnboardingStep) || 1, step);
}

function getPrimaryDomain(org: { domain?: string | null; domains?: Array<{ name: string; status: string }> }) {
  if (!org.domains?.length) return null;
  return org.domains.find(domain => domain.name === org.domain) || org.domains[0] || null;
}

function buildWhitelabelStatus(org: any) {
  const settings = asRecord(org.settings);
  const brand = asRecord(org.whiteLabelConfig);
  const primaryDomain = getPrimaryDomain(org);
  const domainStatus = primaryDomain?.status || (org.domain ? "pending" : "not_configured");
  const step = Math.min(Number(settings.whitelabelOnboardingStep) || 1, MAX_ONBOARDING_STEP);
  const complete = Boolean(settings.whitelabelOnboardingComplete);

  const checklist = {
    brand: Boolean(brand.name),
    domainConfigured: Boolean(org.domain || primaryDomain?.name),
    domainVerified: domainStatus === "verified",
    teamInvited: Boolean(settings.whitelabelTeamInvited),
    aiConfigured: Boolean(org.groqKey || org.geminiKey),
  };

  const provisioningStatus = complete
    ? "active"
    : checklist.domainConfigured && !checklist.domainVerified
      ? "pending_dns"
      : "onboarding";

  return {
    whitelabel: true,
    step,
    complete,
    provisioningStatus,
    checklist,
    brand,
    domain: org.domain || primaryDomain?.name || null,
    domainStatus,
    domainRecord: primaryDomain,
    domainDns: org.domain ? getDnsInstructions(org.domain, org.slug) : null,
    slug: org.slug,
    pendingInvites: settings.whitelabelPendingInvites || [],
  };
}

export function onboardingWhitelabelRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/status", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          type: true,
          whiteLabelConfig: true,
          settings: true,
          domain: true,
          slug: true,
          groqKey: true,
          geminiKey: true,
          domains: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!org || org.type !== "WHITELABEL") {
        return res.json({ whitelabel: false });
      }

      res.json(buildWhitelabelStatus(org));
    } catch (error) {
      next(error);
    }
  });

  router.post("/brand", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { name, logoUrl, faviconUrl, primaryColor, secondaryColor } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { whiteLabelConfig: true, settings: true },
      });

      if (!org) return res.status(404).json({ error: "Organizacao nao encontrada" });

      const currentConfig = asRecord(org.whiteLabelConfig);
      const currentSettings = asRecord(org.settings);

      const updated = await prisma.organization.update({
        where: { id: orgId },
        data: {
          whiteLabelConfig: {
            ...currentConfig,
            ...(name !== undefined && { name }),
            ...(logoUrl !== undefined && { logoUrl }),
            ...(faviconUrl !== undefined && { faviconUrl }),
            ...(primaryColor !== undefined && { primaryColor }),
            ...(secondaryColor !== undefined && { secondaryColor }),
          },
          settings: {
            ...currentSettings,
            whitelabelOnboardingStep: nextStep(currentSettings, 2),
            whitelabelProvisioningMode: currentSettings.whitelabelProvisioningMode || "guided",
          },
        },
        select: { whiteLabelConfig: true },
      });

      res.json({ success: true, whiteLabelConfig: updated.whiteLabelConfig });
    } catch (error) {
      next(error);
    }
  });

  router.post("/domain", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { domain } = req.body;

      const normalizedDomain = normalizeDomain(domain);
      if (!normalizedDomain || !DOMAIN_REGEX.test(normalizedDomain)) {
        return res.status(400).json({ error: "Informe um dominio valido, ex: crm.seudominio.com.br" });
      }

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { slug: true, domain: true, settings: true },
      });

      if (!org) return res.status(404).json({ error: "Organizacao nao encontrada" });

      const existing = await prisma.domain.findUnique({ where: { name: normalizedDomain } });
      if (existing && existing.organizationId !== orgId) {
        return res.status(409).json({ error: "Este dominio ja esta vinculado a outra organizacao." });
      }

      const previousDomain = org.domain !== normalizedDomain ? org.domain : null;
      const verification = await verifyDomainDns(normalizedDomain, org.slug);
      const currentSettings = asRecord(org.settings);

      await prisma.$transaction(async (tx) => {
        if (previousDomain) {
          await tx.domain.deleteMany({ where: { name: previousDomain, organizationId: orgId } });
        }

        await tx.domain.upsert({
          where: { name: normalizedDomain },
          update: { organizationId: orgId, provider: "crm", status: verification.verified ? "verified" : "pending" },
          create: { name: normalizedDomain, provider: "crm", status: verification.verified ? "verified" : "pending", organizationId: orgId },
        });

        await tx.organization.update({
          where: { id: orgId },
          data: {
            domain: normalizedDomain,
            settings: {
              ...currentSettings,
              whitelabelOnboardingStep: nextStep(currentSettings, 3),
              whitelabelDomainStatus: verification.verified ? "verified" : "pending",
              whitelabelProvisioningMode: currentSettings.whitelabelProvisioningMode || "guided",
            },
          },
        });
      });

      const traefik = await syncTraefikDomainConfig(normalizedDomain, verification.verified);

      if (previousDomain) {
        await removeTraefikDomainConfig(previousDomain).catch(() => {});
      }

      res.json({
        success: true,
        message: verification.verified
          ? "Dominio cadastrado e DNS verificado com sucesso!"
          : "Dominio cadastrado. Configure o DNS para apontar ao servidor Nexus360.",
        domain: {
          name: normalizedDomain,
          status: verification.verified ? "verified" : "pending",
          dns: getDnsInstructions(normalizedDomain, org.slug),
        },
        verified: verification.verified,
        traefik,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/agency", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { teamMembers } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const currentSettings = asRecord(org?.settings);
      const pendingInvites = Array.isArray(currentSettings.whitelabelPendingInvites)
        ? currentSettings.whitelabelPendingInvites
        : [];

      if (Array.isArray(teamMembers) && teamMembers.length > 0) {
        const adminUser = await prisma.user.findFirst({
          where: { organizationId: orgId, role: "ORG_ADMIN" },
        });

        if (adminUser) {
          for (const member of teamMembers) {
            const email = String(member.email || "").trim().toLowerCase();
            const name = String(member.name || "").trim();
            if (!email || !name) continue;

            const temporaryPassword = crypto.randomBytes(24).toString("base64url");
            const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
            await prisma.user.upsert({
              where: { email },
              update: { name, organizationId: orgId, role: "USER", department: member.role || "GERAL" },
              create: {
                name,
                email,
                password: hashedPassword,
                role: "USER",
                organizationId: orgId,
                department: member.role || "GERAL",
                status: "INACTIVE",
              },
            });

            if (!pendingInvites.some((invite: any) => invite.email === email)) {
              pendingInvites.push({
                email,
                name,
                role: member.role || "GERAL",
                status: "pending",
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          settings: {
            ...currentSettings,
            whitelabelOnboardingStep: nextStep(currentSettings, 4),
            whitelabelTeamInvited: Array.isArray(teamMembers) && teamMembers.length > 0 ? true : currentSettings.whitelabelTeamInvited || false,
            whitelabelPendingInvites: pendingInvites,
          },
        },
      });

      res.json({ success: true, pendingInvites });
    } catch (error) {
      next(error);
    }
  });

  router.post("/ai-keys", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { groqKey, geminiKey } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const currentSettings = asRecord(org?.settings);

      const data: Record<string, any> = {};
      if (groqKey !== undefined) data.groqKey = groqKey;
      if (geminiKey !== undefined) data.geminiKey = geminiKey;
      if (groqKey) data.aiProvider = "groq";
      else if (geminiKey) data.aiProvider = "gemini";
      data.settings = { ...currentSettings, whitelabelOnboardingStep: MAX_ONBOARDING_STEP };

      await prisma.organization.update({
        where: { id: orgId },
        data,
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/complete", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const currentSettings = asRecord(org?.settings);

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          settings: {
            ...currentSettings,
            whitelabelOnboardingComplete: true,
            whitelabelOnboardingStep: MAX_ONBOARDING_STEP,
            whitelabelActivatedAt: currentSettings.whitelabelActivatedAt || new Date().toISOString(),
          },
        },
      });

      res.json({ success: true, message: "Onboarding whitelabel concluido!" });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
