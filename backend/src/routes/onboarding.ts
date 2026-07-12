import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { OnboardingAIService } from "../services/onboardingAI.js";
import {
  getOrganizationExperienceState,
  provisionExperienceFromOnboardingResponse,
} from "../services/experienceProvisioning.js";
import { bootstrapAgencyOperatingSystem, parseServices } from "../services/agencyOperatingSystem.js";

function buildOrgSlug(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function onboardingRoutes(prisma: PrismaClient) {
  const router = Router();
  const aiService = new OnboardingAIService(prisma);

  const suggestModules = (businessType: string, answers: any) => {
    const normalized = String(businessType || "").toLowerCase();
    const base = ["dashboard", "crm", "sales", "proposals"];
    const modules = new Set(base);

    if (normalized.includes("consult")) {
      ["agenda", "ai"].forEach((module) => modules.add(module));
    } else if (normalized.includes("ind") || normalized.includes("represent")) {
      ["prospecting", "whatsapp_funnels", "whatsapp", "ai"].forEach((module) => modules.add(module));
    } else if (normalized.includes("agenc") || normalized.includes("marketing")) {
      ["ads", "landing_pages", "projects", "delivery", "finance", "assets"].forEach((module) => modules.add(module));
    } else if (normalized.includes("saas")) {
      ["prospecting", "automations", "health_score", "ai", "knowledge_base"].forEach((module) => modules.add(module));
    } else {
      ["prospecting", "ai"].forEach((module) => modules.add(module));
    }

    if (answers?.leadChannels?.includes("WhatsApp")) {
      modules.add("whatsapp");
      modules.add("whatsapp_funnels");
    }
    if (answers?.needsMeeting) modules.add("agenda");
    if (answers?.hasRecurrence || answers?.hasPostSales) modules.add("health_score");
    if (answers?.hasOnboarding || answers?.hasChecklist) modules.add("projects");

    return Array.from(modules);
  };

  router.get("/status", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { type: true, whiteLabelConfig: true, settings: true },
      });
      const response = await prisma.onboardingResponse.findUnique({
        where: { organizationId: orgId },
        select: { id: true, appliedAt: true, recommendedTemplate: true, aiDiagnosis: true, createdAt: true },
      });
      res.json({
        completed: !!response?.appliedAt,
        started: !!response,
        response,
        orgType: org?.type || "CLIENT",
        isWhitelabel: org?.type === "WHITELABEL",
        whiteLabelConfig: org?.whiteLabelConfig || null,
        whitelabelOnboarding: org?.type === "WHITELABEL"
          ? {
              step: (org?.settings as any)?.whitelabelOnboardingStep || 1,
              complete: (org?.settings as any)?.whitelabelOnboardingComplete || false,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/start", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const {
        businessName, businessType, targetAudience, averageTicket, salesCycle,
        needsMeeting, needsProposal, needsContract, hasRecurrence,
        leadChannels, hasSdr, hasCloser, hasPostSales,
        painPoints, biggestProblem,
        deliveryProcess, hasOnboarding, hasChecklist, hasRenewal, hasUpsell,
        servicesOffered,
      } = req.body;

      if (!businessName || !businessType || !targetAudience) {
        return res.status(400).json({ error: "businessName, businessType e targetAudience são obrigatórios" });
      }

      const existing = await prisma.onboardingResponse.findUnique({
        where: { organizationId: orgId },
      });

      const recommendedModules = suggestModules(businessType, req.body);
      const services = parseServices(servicesOffered);
      const data = {
        businessName,
        businessType,
        targetAudience,
        averageTicket: averageTicket ? parseFloat(averageTicket) : null,
        salesCycle: salesCycle || null,
        needsMeeting: !!needsMeeting,
        needsProposal: !!needsProposal,
        needsContract: !!needsContract,
        hasRecurrence: !!hasRecurrence,
        leadChannels: leadChannels || [],
        hasSdr: !!hasSdr,
        hasCloser: !!hasCloser,
        hasPostSales: !!hasPostSales,
        painPoints: painPoints || null,
        biggestProblem: biggestProblem || null,
        deliveryProcess: deliveryProcess || null,
        hasOnboarding: !!hasOnboarding,
        hasChecklist: !!hasChecklist,
        hasRenewal: !!hasRenewal,
        hasUpsell: !!hasUpsell,
        rawAnswers: { ...req.body, servicesOffered: services, recommendedModules },
        organizationId: orgId,
        appliedAt: null,
      };

      const response = existing
        ? await prisma.onboardingResponse.update({ where: { id: existing.id }, data })
        : await prisma.onboardingResponse.create({ data });

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          businessType: businessType,
          businessDescription: `Empresa de ${businessType} focada em ${targetAudience}. ${painPoints || ""}`,
        },
      });

      const normalizedType = String(businessType || "").toLowerCase();
      const shouldBootstrapAgency = normalizedType.includes("agenc") ||
        normalizedType.includes("marketing") ||
        services.length > 0;
      const agencyOperatingSystem = shouldBootstrapAgency
        ? await bootstrapAgencyOperatingSystem(prisma, {
            organizationId: orgId,
            userId: req.user?.id,
            businessName,
            businessType,
            targetAudience,
            services,
            deliveryProcess,
          })
        : null;

      res.json({ success: true, response, recommendedModules, agencyOperatingSystem });
    } catch (error) {
      next(error);
    }
  });

  router.post("/analyze", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user?.id;

      const response = await prisma.onboardingResponse.findUnique({
        where: { organizationId: orgId },
      });

      if (!response) {
        return res.status(400).json({ error: "Complete o onboarding primeiro (POST /api/onboarding/start)" });
      }

      const diagnosis = await aiService.generateDiagnosis(
        {
          businessName: response.businessName,
          businessType: response.businessType,
          targetAudience: response.targetAudience,
          averageTicket: response.averageTicket,
          salesCycle: response.salesCycle,
          needsMeeting: response.needsMeeting,
          needsProposal: response.needsProposal,
          needsContract: response.needsContract,
          hasRecurrence: response.hasRecurrence,
          leadChannels: response.leadChannels as string[],
          hasSdr: response.hasSdr,
          hasCloser: response.hasCloser,
          hasPostSales: response.hasPostSales,
          painPoints: response.painPoints,
          biggestProblem: response.biggestProblem,
          deliveryProcess: response.deliveryProcess,
          hasOnboarding: response.hasOnboarding,
          hasChecklist: response.hasChecklist,
          hasRenewal: response.hasRenewal,
          hasUpsell: response.hasUpsell,
        },
        orgId,
        userId,
      );

      await prisma.onboardingResponse.update({
        where: { id: response.id },
        data: {
          aiDiagnosis: diagnosis as any,
          recommendedTemplate: diagnosis.recommendedTemplate,
        },
      });

      res.json({ success: true, diagnosis });
    } catch (error: any) {
      console.error("[ONBOARDING_ANALYZE_ERROR]", error.message);
      res.status(500).json({ error: error.message || "Erro ao gerar diagnóstico" });
    }
  });

  router.post("/apply", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user?.id;

      const response = await prisma.onboardingResponse.findUnique({
        where: { organizationId: orgId },
      });

      if (!response || !response.aiDiagnosis) {
        return res.status(400).json({ error: "Gere o diagnóstico primeiro (POST /api/onboarding/analyze)" });
      }

      if (response.appliedAt) {
        const state = await getOrganizationExperienceState(prisma, orgId);
        const experienceResult = state.provisioned
          ? null
          : await provisionExperienceFromOnboardingResponse(prisma, orgId, userId);

        return res.json({
          success: true,
          message: "Ambiente comercial ja estava configurado.",
          experienceProvisioned: Boolean(experienceResult),
          experience: state.experience || experienceResult?.experience || null,
          modules: state.moduleKeys.length ? state.moduleKeys : experienceResult?.moduleKeys || [],
        });
      }

      const diagnosis = response.aiDiagnosis as any;
      await aiService.applyDiagnosis(orgId, diagnosis, userId);
      const experienceResult = await provisionExperienceFromOnboardingResponse(prisma, orgId, userId);

      await prisma.onboardingResponse.update({
        where: { id: response.id },
        data: { appliedAt: new Date() },
      });

      res.json({
        success: true,
        message: "Ambiente comercial configurado com sucesso!",
        experience: experienceResult.experience,
        modules: experienceResult.moduleKeys,
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== CONVERTER PARA WHITELABEL ====================

  router.post("/convert-to-whitelabel", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { brandName, logoUrl, primaryColor, secondaryColor } = req.body;

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { type: true, whiteLabelConfig: true, name: true, slug: true, settings: true },
      });

      if (!org) return res.status(404).json({ error: "Organização não encontrada" });
      if (org.type === "WHITELABEL") return res.json({ success: true, message: "Já é whitelabel." });

      const wlConfig: Record<string, any> = {
        name: brandName || org.name,
      };
      if (logoUrl) wlConfig.logoUrl = logoUrl;
      if (primaryColor) wlConfig.primaryColor = primaryColor;
      if (secondaryColor) wlConfig.secondaryColor = secondaryColor;

      const currentSettings = (org.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, any>;

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          type: "WHITELABEL",
          whiteLabelConfig: wlConfig,
          slug: buildOrgSlug(org.slug || org.name),
          settings: {
            ...currentSettings,
            whitelabelOnboardingStep: 1,
            whitelabelOnboardingComplete: false,
          },
        },
      });

      res.json({ success: true, message: "Conta convertida para White Label!" });
    } catch (error) {
      next(error);
    }
  });

  // ==================== EXPERIÊNCIA PROFISSIONAL ====================

  router.get("/professional-experiences", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const experiences = await prisma.professionalExperience.findMany({
        where: { organizationId: orgId },
        orderBy: { order: "asc" },
      });
      res.json({ success: true, experiences });
    } catch (error) {
      next(error);
    }
  });

  router.post("/professional-experiences", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user?.id;
      const { companyName, role, description, location, startDate, endDate, isCurrent, order } = req.body;

      if (!companyName || !role || !startDate) {
        return res.status(400).json({ error: "companyName, role e startDate são obrigatórios" });
      }

      const maxOrder = await prisma.professionalExperience.aggregate({
        where: { organizationId: orgId },
        _max: { order: true },
      });

      const experience = await prisma.professionalExperience.create({
        data: {
          organizationId: orgId,
          userId: userId || null,
          companyName,
          role,
          description: description || null,
          location: location || null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          isCurrent: !!isCurrent,
          order: order ?? (maxOrder._max.order ?? -1) + 1,
        },
      });

      res.status(201).json({ success: true, experience });
    } catch (error) {
      next(error);
    }
  });

  router.put("/professional-experiences/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { id } = req.params;
      const { companyName, role, description, location, startDate, endDate, isCurrent, order } = req.body;

      const existing = await prisma.professionalExperience.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Experiência não encontrada" });

      const experience = await prisma.professionalExperience.update({
        where: { id },
        data: {
          ...(companyName !== undefined && { companyName }),
          ...(role !== undefined && { role }),
          ...(description !== undefined && { description }),
          ...(location !== undefined && { location }),
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(isCurrent !== undefined && { isCurrent: !!isCurrent }),
          ...(order !== undefined && { order }),
        },
      });

      res.json({ success: true, experience });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/professional-experiences/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { id } = req.params;

      const existing = await prisma.professionalExperience.findFirst({
        where: { id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Experiência não encontrada" });

      await prisma.professionalExperience.delete({ where: { id } });

      res.json({ success: true, message: "Experiência removida" });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
