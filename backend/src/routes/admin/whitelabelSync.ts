import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../../middleware/auth.js";

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function mergeDeep(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && result[key] && typeof result[key] === "object") {
      result[key] = mergeDeep(asRecord(result[key]), source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function adminWhitelabelSyncRoutes(prisma: PrismaClient) {
  const router = Router();

  // ==================== TEMPLATES ====================

  router.get("/templates", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      const templates = await prisma.whitelabelSyncTemplate.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { syncLogs: true } } },
      });
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  router.post("/templates", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });
    const { name, description, config, settings, orgFields, tags } = req.body;
    if (!name) return res.status(400).json({ error: "Nome do template é obrigatório" });
    try {
      const template = await prisma.whitelabelSyncTemplate.create({
        data: { name, description, config: config || {}, settings, orgFields, tags },
      });
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  router.put("/templates/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });
    const { name, description, config, settings, orgFields, tags, isActive } = req.body;
    try {
      const template = await prisma.whitelabelSyncTemplate.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(config !== undefined && { config }),
          ...(settings !== undefined && { settings }),
          ...(orgFields !== undefined && { orgFields }),
          ...(tags !== undefined && { tags }),
          ...(isActive !== undefined && { isActive }),
        },
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  router.delete("/templates/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      await prisma.whitelabelSyncTemplate.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // ==================== PUSH ====================

  router.post("/push", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });
    const { templateId, organizationIds, dryRun } = req.body;

    if (!templateId) return res.status(400).json({ error: "templateId é obrigatório" });

    try {
      const template = await prisma.whitelabelSyncTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) return res.status(404).json({ error: "Template não encontrado" });
      if (!template.isActive) return res.status(400).json({ error: "Template está inativo" });

      const whereOrgIds: any = { type: "WHITELABEL" };
      if (Array.isArray(organizationIds) && organizationIds.length > 0) {
        whereOrgIds.id = { in: organizationIds };
      }

      const orgs = await prisma.organization.findMany({
        where: whereOrgIds,
        select: { id: true, name: true, whiteLabelConfig: true, settings: true },
      });

      if (orgs.length === 0) {
        return res.status(404).json({ error: "Nenhuma organização whitelabel encontrada para aplicar o template" });
      }

      if (dryRun) {
        return res.json({
          dryRun: true,
          templateId: template.id,
          templateName: template.name,
          targetCount: orgs.length,
          targets: orgs.map(o => ({
            id: o.id,
            name: o.name,
            currentConfig: o.whiteLabelConfig,
            currentSettings: o.settings,
            willApply: {
              whiteLabelConfig: mergeDeep(asRecord(o.whiteLabelConfig), asRecord(template.config)),
              settings: template.settings ? mergeDeep(asRecord(o.settings), asRecord(template.settings)) : undefined,
              orgFields: template.orgFields || undefined,
            },
          })),
        });
      }

      const results: Array<{ organizationId: string; organizationName: string; status: string; error?: string }> = [];

      for (const org of orgs) {
        try {
          const mergedConfig = mergeDeep(asRecord(org.whiteLabelConfig), asRecord(template.config));
          const updateData: Record<string, any> = {
            whiteLabelConfig: mergedConfig,
          };
          if (template.settings) {
            updateData.settings = mergeDeep(asRecord(org.settings), asRecord(template.settings));
          }
          if (template.orgFields) {
            const orgFields = asRecord(template.orgFields);
            for (const [key, value] of Object.entries(orgFields)) {
              if (key !== "id" && key !== "type") {
                updateData[key] = value;
              }
            }
          }

          await prisma.organization.update({
            where: { id: org.id },
            data: updateData,
          });

          await prisma.whitelabelSyncLog.create({
            data: {
              templateId: template.id,
              organizationId: org.id,
              status: "success",
              appliedConfig: { whiteLabelConfig: mergedConfig, settings: template.settings, orgFields: template.orgFields },
              createdBy: req.user.id,
            },
          });

          results.push({ organizationId: org.id, organizationName: org.name, status: "success" });
        } catch (err: any) {
          await prisma.whitelabelSyncLog.create({
            data: {
              templateId: template.id,
              organizationId: org.id,
              status: "failed",
              error: err.message,
              createdBy: req.user.id,
            },
          });
          results.push({ organizationId: org.id, organizationName: org.name, status: "failed", error: err.message });
        }
      }

      res.json({
        success: true,
        templateId: template.id,
        templateName: template.name,
        total: results.length,
        succeeded: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "failed").length,
        results,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to push template" });
    }
  });

  // Push to a single org
  router.post("/push/:orgId", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });
    const { templateId, dryRun } = req.body;

    if (!templateId) return res.status(400).json({ error: "templateId é obrigatório" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.params.orgId },
        select: { id: true, name: true, type: true, whiteLabelConfig: true, settings: true },
      });
      if (!org) return res.status(404).json({ error: "Organização não encontrada" });
      if (org.type !== "WHITELABEL") return res.status(400).json({ error: "Organização não é whitelabel" });

      const template = await prisma.whitelabelSyncTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) return res.status(404).json({ error: "Template não encontrado" });
      if (!template.isActive) return res.status(400).json({ error: "Template está inativo" });

      if (dryRun) {
        return res.json({
          dryRun: true,
          templateId: template.id,
          templateName: template.name,
          targetCount: 1,
          targets: [{
            id: org.id,
            name: org.name,
            currentConfig: org.whiteLabelConfig,
            currentSettings: org.settings,
            willApply: {
              whiteLabelConfig: mergeDeep(asRecord(org.whiteLabelConfig), asRecord(template.config)),
              settings: template.settings ? mergeDeep(asRecord(org.settings), asRecord(template.settings)) : undefined,
              orgFields: template.orgFields || undefined,
            },
          }],
        });
      }

      const mergedConfig = mergeDeep(asRecord(org.whiteLabelConfig), asRecord(template.config));
      const updateData: Record<string, any> = { whiteLabelConfig: mergedConfig };
      if (template.settings) {
        updateData.settings = mergeDeep(asRecord(org.settings), asRecord(template.settings));
      }
      if (template.orgFields) {
        const orgFields = asRecord(template.orgFields);
        for (const [key, value] of Object.entries(orgFields)) {
          if (key !== "id" && key !== "type") {
            updateData[key] = value;
          }
        }
      }

      await prisma.organization.update({
        where: { id: org.id },
        data: updateData,
      });

      await prisma.whitelabelSyncLog.create({
        data: {
          templateId: template.id,
          organizationId: org.id,
          status: "success",
          appliedConfig: { whiteLabelConfig: mergedConfig, settings: template.settings, orgFields: template.orgFields },
          createdBy: req.user.id,
        },
      });

      res.json({
        success: true,
        templateId: template.id,
        templateName: template.name,
        organizationId: org.id,
        organizationName: org.name,
        status: "success",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to push to organization" });
    }
  });

  // ==================== SYNC LOGS ====================

  router.get("/logs", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });
    const { templateId, organizationId, status, limit } = req.query;
    try {
      const where: any = {};
      if (templateId) where.templateId = String(templateId);
      if (organizationId) where.organizationId = String(organizationId);
      if (status) where.status = String(status);

      const logs = await prisma.whitelabelSyncLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Number(limit) || 50,
        include: {
          template: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true } },
        },
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sync logs" });
    }
  });

  return router;
}
