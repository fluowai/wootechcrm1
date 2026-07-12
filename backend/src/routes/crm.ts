import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.js";
import { AuthRequest, authenticateToken } from "../middleware/auth.js";
import { sanitizeBody } from "../utils/sanitizer.js";
import { auditFromRequest } from "../utils/auditLogger.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";
import { ensureDefaultSalesPipeline, getInitialSalesStage } from "../services/crmPipeline.js";
import { ensureClientAgentContext } from "../services/clientAgentContext.js";

export function crmRoutes(prisma: PrismaClient) {
  const router = Router();

  const listPipelines = async (orgId: string) => {
    await ensureDefaultSalesPipeline(prisma, orgId);
    return prisma.pipeline.findMany({
      where: { organizationId: orgId },
      include: { stages: { orderBy: { order: 'asc' } } }
    });
  };

  const safeQuery = async <T>(label: string, query: Promise<T>, fallback: T): Promise<T> => {
    try { return await query; }
    catch (error: any) { console.error(`[CRM_GROWTH_${label}_ERROR]`, error?.message || error); return fallback; }
  };

  const getCustomFieldString = (customFields: unknown, key: string) => {
    if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) return null;
    const value = (customFields as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value : null;
  };

  router.get("/ping-crm", (req, res) => res.json({ message: "crm router is active", timestamp: new Date().toISOString() }));

  // ==================== PIPELINES ====================

  router.get("/pipelines", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    try { res.json(await listPipelines(orgId)); } catch (error) { next(error); }
  });

  router.get("/boards", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    try { res.json(await listPipelines(orgId)); } catch (error) { next(error); }
  });

  router.post("/boards/setup", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    try {
      const pipeline = await ensureDefaultSalesPipeline(prisma, orgId, req.body?.boardId);
      res.json(pipeline);
    } catch (error) { next(error); }
  });

  // ==================== OPPORTUNITIES ====================

  router.get("/opportunities", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    const { skip, take } = getPagination(req.query);
    try {
      const where: any = { organizationId: orgId };
      if (req.query.status) where.status = req.query.status;
      if (req.query.pipelineId) where.pipelineId = req.query.pipelineId;
      if (req.query.stageId) where.stageId = req.query.stageId;
      if (req.query.assignedToId) where.assignedToId = req.query.assignedToId;

      const [opportunities, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          skip, take,
          include: {
            client: { select: { id: true, corporateName: true, tradeName: true } },
            pipeline: { select: { id: true, name: true } },
            stageObj: { select: { id: true, name: true, color: true } },
            assignedTo: { select: { id: true, name: true } },
            tasks: { where: { status: { not: "concluida" } }, take: 3, orderBy: { dueDate: "asc" } },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.opportunity.count({ where }),
      ]);
      res.json({ opportunities, total });
    } catch (error) { next(error); }
  });

  router.get("/opportunities/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const opportunity = await prisma.opportunity.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: {
          client: true,
          pipeline: { select: { id: true, name: true, stages: { orderBy: { order: "asc" } } } },
          stageObj: true,
          assignedTo: { select: { id: true, name: true } },
          tasks: { orderBy: { createdAt: "desc" } },
          proposals: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!opportunity) return res.status(404).json({ error: "Oportunidade não encontrada" });
      const crmLeadId = getCustomFieldString(opportunity.customFields, "crmLeadId");
      const activities = await prisma.activity.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { dealId: opportunity.id },
            ...(crmLeadId ? [{ contactId: crmLeadId }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json({ ...opportunity, activities });
    } catch (error) { next(error); }
  });

  router.post("/opportunities", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    const { title, clientId, pipelineId, stageId, value, description, assignedToId, expectedCloseDate } = req.body;

    if (!title) return res.status(400).json({ error: "Título é obrigatório" });

    try {
      let targetClientId = clientId;
      if (!targetClientId) {
        if (req.body.clientName) {
          const newClient = await prisma.client.create({
            data: {
              corporateName: req.body.clientName,
              email: req.body.clientEmail || "",
              phone: req.body.clientPhone || "",
              organizationId: orgId,
              assignedToId: assignedToId || req.user?.id,
              status: "prospect"
            }
          });
          targetClientId = newClient.id;
        } else {
          return res.status(400).json({ error: "clientId ou clientName e obrigatorio para criar oportunidade" });
        }
      } else {
        const client = await prisma.client.findFirst({ where: { id: targetClientId, organizationId: orgId }, select: { id: true } });
        if (!client) return res.status(400).json({ error: "Cliente invalido para esta organizacao" });
      }

      let targetPipelineId = pipelineId;
      let ensuredPipeline = null;
      if (!targetPipelineId) {
        ensuredPipeline = await ensureDefaultSalesPipeline(prisma, orgId);
        targetPipelineId = ensuredPipeline.id;
      }

      if (targetPipelineId) {
        const pipeline = await prisma.pipeline.findFirst({ where: { id: targetPipelineId, organizationId: orgId }, include: { stages: { orderBy: { order: "asc" } } } });
        if (!pipeline) return res.status(400).json({ error: "Pipeline invalido para esta organizacao" });
        ensuredPipeline = pipeline;
      }

      if (assignedToId) {
        const assignee = await prisma.user.findFirst({ where: { id: assignedToId, organizationId: orgId }, select: { id: true } });
        if (!assignee) return res.status(400).json({ error: "Responsavel invalido para esta organizacao" });
      }

      let targetStageId = stageId;
      if (targetPipelineId && !stageId) {
        if (!ensuredPipeline) ensuredPipeline = await ensureDefaultSalesPipeline(prisma, orgId, targetPipelineId);
        targetStageId = getInitialSalesStage(ensuredPipeline)?.id;
      }

      if (targetStageId) {
        const stage = await prisma.pipelineStage.findFirst({
          where: { id: targetStageId, pipeline: { organizationId: orgId, ...(targetPipelineId ? { id: targetPipelineId } : {}) } },
          select: { id: true },
        });
        if (!stage) return res.status(400).json({ error: "Etapa invalida para esta organizacao" });
      }

      const opportunity = await prisma.opportunity.create({
        data: {
          title,
          description,
          value: parseFloat(value) || 0,
          estimatedValue: parseFloat(value) || 0,
          organizationId: orgId,
          clientId: targetClientId,
          pipelineId: targetPipelineId,
          stageId: targetStageId,
          assignedToId: assignedToId || req.user?.id,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
          stage: targetStageId ? undefined : "qualificacao",
        },
        include: {
          client: { select: { id: true, corporateName: true } },
          pipeline: { select: { id: true, name: true } },
          stageObj: true,
        },
      });

      await prisma.activity.create({
        data: {
          organizationId: orgId,
          type: "SYSTEM",
          description: `Oportunidade "${title}" criada`,
          userId: req.user?.id,
          dealId: opportunity.id,
        },
      });

      auditFromRequest(req, "CREATE", "Opportunity", opportunity.id);
      emitAutomationEvent("opportunity.created", { organizationId: orgId, opportunityId: opportunity.id, opportunity });
      res.json(opportunity);
    } catch (error) { next(error); }
  });

  router.patch("/opportunities/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    try {
      const existing = await prisma.opportunity.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Oportunidade não encontrada" });

      const { title, value, description, clientId, pipelineId, stageId, assignedToId, expectedCloseDate, temperature, score } = req.body;
      const data: any = {};
      if (title !== undefined) data.title = title;
      if (value !== undefined) data.value = parseFloat(value);
      if (description !== undefined) data.description = description;
      if (clientId !== undefined) data.clientId = clientId;
      if (pipelineId !== undefined) data.pipelineId = pipelineId;
      if (stageId !== undefined) data.stageId = stageId;
      if (assignedToId !== undefined) data.assignedToId = assignedToId;
      if (expectedCloseDate !== undefined) data.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
      if (temperature !== undefined) data.temperature = temperature;
      if (score !== undefined) data.score = parseInt(score);

      if (clientId) {
        const client = await prisma.client.findFirst({ where: { id: clientId, organizationId: orgId }, select: { id: true } });
        if (!client) return res.status(400).json({ error: "Cliente invalido para esta organizacao" });
      }
      if (pipelineId) {
        const pipeline = await prisma.pipeline.findFirst({ where: { id: pipelineId, organizationId: orgId }, select: { id: true } });
        if (!pipeline) return res.status(400).json({ error: "Pipeline invalido para esta organizacao" });
      }
      if (assignedToId) {
        const assignee = await prisma.user.findFirst({ where: { id: assignedToId, organizationId: orgId }, select: { id: true } });
        if (!assignee) return res.status(400).json({ error: "Responsavel invalido para esta organizacao" });
      }
      if (stageId) {
        const stage = await prisma.pipelineStage.findFirst({
          where: { id: stageId, pipeline: { organizationId: orgId, ...(pipelineId ? { id: pipelineId } : {}) } },
          select: { id: true },
        });
        if (!stage) return res.status(400).json({ error: "Etapa invalida para esta organizacao" });
      }

      const oldStageId = existing.stageId;
      if (stageId && stageId !== oldStageId) {
        const oldStage = oldStageId ? await prisma.pipelineStage.findFirst({ where: { id: oldStageId, pipeline: { organizationId: orgId } } }) : null;
        const newStage = await prisma.pipelineStage.findFirst({ where: { id: stageId, pipeline: { organizationId: orgId } } });
        await prisma.dealStageHistory.create({
          data: {
            dealId: existing.id,
            fromStageId: oldStageId,
            toStageId: stageId,
            fromStageName: oldStage?.name || null,
            toStageName: newStage?.name || "Unknown",
            movedById: req.user?.id,
            metadata: { timestamp: new Date().toISOString() },
          },
        });
        await prisma.activity.create({
          data: {
            organizationId: orgId,
            type: "STAGE_CHANGE",
            description: `Oportunidade movida de "${oldStage?.name || "?"}" para "${newStage?.name || "?"}"`,
            userId: req.user?.id,
            dealId: existing.id,
          },
        });
        emitAutomationEvent("opportunity.stage_changed", {
          organizationId: orgId,
          opportunityId: existing.id,
          fromStage: oldStageId,
          toStage: stageId,
        });
      }

      const opportunity = await prisma.opportunity.update({
        where: { id: req.params.id },
        data,
        include: {
          client: { select: { id: true, corporateName: true } },
          pipeline: { select: { id: true, name: true } },
          stageObj: true,
        },
      });
      res.json(opportunity);
    } catch (error) { next(error); }
  });

  router.post("/opportunities/:id/win", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    const userId = req.user?.id;

    try {
      const existing = await prisma.opportunity.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { client: true },
      });
      if (!existing) return res.status(404).json({ error: "Oportunidade não encontrada" });

      const { wonReasonId, corporateName, respEmail, product, setupValue, monthlyValue, paymentMethod, billingDay, contractTerm } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        await tx.opportunity.update({
          where: { id: req.params.id },
          data: { status: "WON", closedAt: new Date(), wonReasonId: wonReasonId || null },
        });

        let clientId = existing.clientId;
        if (!clientId) {
          const newClient = await tx.client.create({
            data: {
              corporateName: corporateName || existing.title,
              email: respEmail || "",
              status: "onboarding",
              organizationId: orgId,
              assignedToId: userId,
            },
          });
          clientId = newClient.id;
          await tx.opportunity.update({ where: { id: req.params.id }, data: { clientId } });
        }

        if (product) {
          const soldProduct = await tx.soldProduct.create({
            data: {
              clientId,
              name: product,
              setupValue: parseFloat(setupValue) || 0,
              monthlyValue: parseFloat(monthlyValue) || 0,
              paymentMethod: paymentMethod || null,
              billingDay: parseInt(billingDay) || 5,
              contractTerm: parseInt(contractTerm) || 12,
              status: "onboarding",
            },
          });

          await tx.contract.create({
            data: {
              clientId,
              soldProductId: soldProduct.id,
              status: "draft",
              organizationId: orgId,
              title: `Contrato - ${product}`,
            },
          });
        }

        await tx.activity.create({
          data: {
            organizationId: orgId,
            type: "SYSTEM",
            description: `Oportunidade "${existing.title}" ganha!`,
            userId: userId,
            dealId: existing.id,
          },
        });

        return { clientId };
      });

      auditFromRequest(req, "DEAL_WON", "Opportunity", req.params.id, result);
      emitAutomationEvent("opportunity.won", { organizationId: orgId, opportunityId: existing.id, ...result });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  });

  router.post("/opportunities/:id/lose", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    try {
      const existing = await prisma.opportunity.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Oportunidade não encontrada" });

      const { lostReasonId, lostReason } = req.body;

      await prisma.opportunity.update({
        where: { id: req.params.id },
        data: { status: "LOST", closedAt: new Date(), lostReasonId: lostReasonId || null, lostReason: lostReason || null },
      });

      await prisma.activity.create({
        data: {
          organizationId: orgId,
          type: "SYSTEM",
          description: `Oportunidade "${existing.title}" perdida`,
          userId: req.user?.id,
          dealId: existing.id,
        },
      });

      auditFromRequest(req, "DEAL_LOST", "Opportunity", req.params.id, { lostReasonId, lostReason });
      emitAutomationEvent("opportunity.lost", { organizationId: orgId, opportunityId: existing.id, lostReasonId, lostReason });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  router.delete("/opportunities/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    try {
      const existing = await prisma.opportunity.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Oportunidade não encontrada" });
      await prisma.opportunity.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // ==================== LEGACY LEADS (backward compat) ====================

  router.get("/leads", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    const { skip, take } = getPagination(req.query);
    try {
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { organizationId: orgId },
          skip, take,
          include: { followUps: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' }
        }).catch(async () => {
          const fallback = await prisma.lead.findMany({ where: { organizationId: orgId }, skip, take, orderBy: { createdAt: 'desc' } });
          return fallback.map(l => ({ ...l, followUps: [] }));
        }),
        prisma.lead.count({ where: { organizationId: orgId } })
      ]);
      res.json({ leads, total });
    } catch (error) { next(error); }
  });

  router.get("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { followUps: { orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } } }
      });
      if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
      const activities = await prisma.activity.findMany({
        where: { organizationId: orgId, contactId: lead.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json({ ...lead, activities });
    } catch (error) { next(error); }
  });

  router.post("/leads", authenticateToken, async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const data = sanitizeBody(req.body, "lead");
    if (!data.name || !data.email) return res.status(400).json({ error: "Nome e e-mail são obrigatórios" });
    try {
      const lead = await prisma.lead.create({
        data: {
          name: data.name, email: data.email, phone: data.phone, whatsapp: data.whatsapp,
          cpf: data.cpf, jobTitle: data.jobTitle, status: data.status || 'novo',
          value: parseFloat(data.value) || 0, source: data.source, channel: data.channel,
          notes: data.notes, tags: data.tags, temperature: data.temperature || 'COLD',
          score: parseInt(data.score) || 0, lgpdConsent: data.lgpdConsent || false,
          organizationId: orgId!, assignedToId: data.assignedToId || req.user?.id,
          pipelineId: data.pipelineId, stageId: data.stageId,
        }
      });
      auditFromRequest(req, "CREATE", "Lead", lead.id);
      emitAutomationEvent("lead.created", { organizationId: orgId, leadId: lead.id, lead });
      res.json(lead);
    } catch (error) { next(error); }
  });

  router.patch("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    const data = sanitizeBody(req.body, "lead");
    try {
      const existing = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Lead não encontrado" });
      if (data.value !== undefined) data.value = parseFloat(data.value) || 0;
      if (data.score !== undefined) data.score = parseInt(data.score) || 0;
      const lead = await prisma.lead.update({ where: { id: req.params.id }, data });
      auditFromRequest(req, "UPDATE", "Lead", lead.id, { fields: Object.keys(data) });
      emitAutomationEvent("lead.updated", { organizationId: orgId, leadId: lead.id, lead });
      res.json(lead);
    } catch (error) { next(error); }
  });

  router.delete("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    try {
      const lead = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
      await prisma.lead.delete({ where: { id: req.params.id } });
      auditFromRequest(req, "DELETE", "Lead", req.params.id);
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  router.post("/leads/:id/followups", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    const { type, content, scheduledAt } = req.body;
    try {
      const lead = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
      const followUp = await prisma.followUp.create({
        data: { leadId: req.params.id, type, content, scheduledAt: scheduledAt ? new Date(scheduledAt) : null, userId: req.user?.id },
        include: { user: { select: { name: true } } }
      });
      res.json(followUp);
    } catch (error) { next(error); }
  });

  router.post("/leads/:id/win", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    const userId = req.user?.id;
    try {
      const existing = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Lead não encontrado" });
      const { corporateName, respEmail, product, setupValue, monthlyValue, paymentMethod, billingDay, contractTerm } = req.body;
      const result = await prisma.$transaction(async (tx) => {
        await tx.lead.update({ where: { id: req.params.id }, data: { status: 'fechado' } });
        const client = await tx.client.create({ data: { corporateName, email: respEmail, status: 'onboarding', organizationId: orgId, assignedToId: userId } });
        const soldProduct = await tx.soldProduct.create({ data: { clientId: client.id, name: product, setupValue: parseFloat(setupValue) || 0, monthlyValue: parseFloat(monthlyValue) || 0, paymentMethod, billingDay: parseInt(billingDay) || 5, contractTerm: parseInt(contractTerm) || 12, status: 'onboarding' } });
        await tx.contract.create({ data: { clientId: client.id, soldProductId: soldProduct.id, status: 'draft', organizationId: orgId } });
        return { clientId: client.id, soldProductId: soldProduct.id };
      });
      auditFromRequest(req, "DEAL_WON", "Lead", req.params.id, result);
      emitAutomationEvent("lead.won", { organizationId: orgId, leadId: req.params.id, ...result });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  });

  // ==================== CLIENTS ====================

  router.get("/clients", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    try {
      const clients = await prisma.client.findMany({ where: { organizationId: orgId }, orderBy: { corporateName: 'asc' } });
      res.json(clients);
    } catch (error) { next(error); }
  });

  router.post("/clients", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    const data = sanitizeBody(req.body, "client");
    try {
      const client = await prisma.client.create({
        data: {
          corporateName: data.corporateName, tradeName: data.tradeName, cnpj: data.cnpj,
          email: data.email, phone: data.phone, website: data.website, segment: data.segment,
          source: data.source, sourceDetail: data.sourceDetail, notes: data.notes,
          status: data.status || 'prospect', porte: data.porte, revenue: parseFloat(data.revenue) || 0,
          responsibleName: data.responsibleName, responsibleEmail: data.responsibleEmail,
          responsiblePhone: data.responsiblePhone, responsibleRole: data.responsibleRole,
          organizationId: orgId, assignedToId: data.assignedToId || req.user?.id
        }
      });
      await ensureClientAgentContext(prisma, client, data.aiBriefing || data.briefing || {});
      auditFromRequest(req, "CREATE", "Client", client.id);
      res.json(client);
    } catch (error) { next(error); }
  });

  // ==================== CUSTOM FIELDS ====================

  router.get("/custom-fields", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const where: any = { organizationId: orgId };
      if (req.query.model) where.model = req.query.model;
      const fields = await prisma.customField.findMany({ where, orderBy: { order: "asc" } });
      res.json(fields);
    } catch (error) { next(error); }
  });

  router.post("/custom-fields", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const { name, key, type, options, model, isRequired, order } = req.body;
    if (!name || !key || !type || !model) return res.status(400).json({ error: "name, key, type e model são obrigatórios" });
    try {
      const field = await prisma.customField.create({
        data: {
          organizationId: orgId!, name, key: key.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          type, options: options || undefined, model, isRequired: !!isRequired, order: order || 0,
        },
      });
      res.json(field);
    } catch (error) { next(error); }
  });

  router.delete("/custom-fields/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    try {
      const field = await prisma.customField.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!field) return res.status(404).json({ error: "Campo não encontrado" });
      await prisma.customField.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // ==================== LOST REASONS ====================

  router.get("/lost-reasons", async (req: AuthRequest, res, next) => {
    try {
      const reasons = await prisma.lostReason.findMany({ where: { organizationId: req.user!.orgId }, orderBy: { name: "asc" } });
      res.json(reasons);
    } catch (error) { next(error); }
  });

  router.post("/lost-reasons", async (req: AuthRequest, res, next) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
    try {
      const reason = await prisma.lostReason.create({ data: { name, organizationId: req.user!.orgId } });
      res.json(reason);
    } catch (error) { next(error); }
  });

  router.patch("/lost-reasons/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const existing = await prisma.lostReason.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Motivo não encontrado" });
      const reason = await prisma.lostReason.update({ where: { id: req.params.id }, data: { name: req.body.name, isActive: req.body.isActive } });
      res.json(reason);
    } catch (error) { next(error); }
  });

  router.delete("/lost-reasons/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const existing = await prisma.lostReason.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Motivo não encontrado" });
      await prisma.lostReason.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // ==================== WON REASONS ====================

  router.get("/won-reasons", async (req: AuthRequest, res, next) => {
    try {
      const reasons = await prisma.wonReason.findMany({ where: { organizationId: req.user!.orgId }, orderBy: { name: "asc" } });
      res.json(reasons);
    } catch (error) { next(error); }
  });

  router.post("/won-reasons", async (req: AuthRequest, res, next) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
    try {
      const reason = await prisma.wonReason.create({ data: { name, organizationId: req.user!.orgId } });
      res.json(reason);
    } catch (error) { next(error); }
  });

  router.patch("/won-reasons/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const existing = await prisma.wonReason.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Motivo não encontrado" });
      const reason = await prisma.wonReason.update({ where: { id: req.params.id }, data: req.body });
      res.json(reason);
    } catch (error) { next(error); }
  });

  router.delete("/won-reasons/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const existing = await prisma.wonReason.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!existing) return res.status(404).json({ error: "Motivo não encontrado" });
      await prisma.wonReason.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  // ==================== ACTIVITIES ====================

  router.get("/activities", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const where: any = { organizationId: orgId };
      if (req.query.dealId) where.dealId = req.query.dealId;
      if (req.query.contactId) where.contactId = req.query.contactId;
      if (req.query.companyId) where.companyId = req.query.companyId;
      const activities = await prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.json(activities);
    } catch (error) { next(error); }
  });

  router.post("/activities", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });
    const { type, description, metadata, contactId, companyId, dealId, taskId } = req.body;
    if (!description) return res.status(400).json({ error: "Descrição é obrigatória" });
    try {
      const activity = await prisma.activity.create({
        data: {
          organizationId: orgId,
          type: type || "NOTE",
          description,
          metadata,
          userId: req.user?.id,
          contactId,
          companyId,
          dealId,
          taskId,
        },
      });
      res.json(activity);
    } catch (error) { next(error); }
  });

  // ==================== GROWTH INTELLIGENCE ====================

  router.get("/growth-intelligence", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    try {
      const [opportunities, leads, clients, soldProducts, healthScores, tasks] = await Promise.all([
        safeQuery("OPPS", prisma.opportunity.findMany({
          where: { organizationId: orgId },
          include: { stageObj: { select: { name: true, probability: true } } },
          orderBy: { updatedAt: "desc" },
        }), []),
        safeQuery("LEADS", prisma.lead.findMany({
          where: { organizationId: orgId },
          include: { followUps: { orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: { updatedAt: "desc" },
        }), []),
        safeQuery("CLIENTS", prisma.client.findMany({
          where: { organizationId: orgId },
          select: { id: true, corporateName: true, tradeName: true, segment: true, status: true, updatedAt: true, createdAt: true },
        }), []),
        safeQuery("SOLD_PRODUCTS", prisma.soldProduct.findMany({
          where: { client: { organizationId: orgId } },
          include: { client: { select: { id: true, corporateName: true, tradeName: true, status: true, segment: true } } },
        }), []),
        safeQuery("HEALTH_SCORES", prisma.clientHealthScore.findMany({ where: { organizationId: orgId } }), []),
        safeQuery("TASKS", prisma.task.findMany({
          where: { organizationId: orgId, status: { not: "concluida" } },
          orderBy: { dueDate: "asc" }, take: 8,
        }), []),
      ]);

      const openOpps = opportunities.filter(o => o.status === "OPEN");
      const wonOpps = opportunities.filter(o => o.status === "WON");
      const openValue = openOpps.reduce((sum, o) => sum + (o.value || 0), 0);
      const wonValue = wonOpps.reduce((sum, o) => sum + (o.value || 0), 0);
      const weightedForecast = openOpps.reduce((sum, o) => {
        const prob = o.stageObj?.probability || 10;
        return sum + ((o.value || 0) * prob / 100);
      }, 0);
      const monthlyRecurring = soldProducts
        .filter(p => !["cancelado", "churned", "inativo"].includes(p.status))
        .reduce((sum, p) => sum + (p.monthlyValue || 0), 0);
      const conversionRate = opportunities.length ? Math.round((wonOpps.length / opportunities.length) * 100) : 0;
      const criticalClients = healthScores.filter(s => s.riskLevel === "critical" || s.riskLevel === "high").length;

      const topOpportunities = [...openOpps].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 8).map(o => ({
        id: o.id, title: o.title, value: o.value, stage: o.stageObj?.name || o.stage,
        score: o.score, recommendedAction: "Avaliar próxima ação",
      }));

      res.json({
        forecast: { openValue, wonValue, weightedForecast, conversionRate, monthlyRecurring },
        benchmark: {
          opportunities: opportunities.length, leads: leads.length, clients: clients.length,
          wonDeals: wonOpps.length,
          activeClients: clients.filter(c => c.status === "ativo" || c.status === "onboarding").length,
          criticalClients,
        },
        sellerAssistant: { topOpportunities, pendingTasks: tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate })) },
      });
    } catch (error) { next(error); }
  });

  router.use((req, res) => {
    res.status(404).json({ success: false, error: 'CRM Route not found', path: req.originalUrl, availableRoutes: ['/opportunities', '/leads', '/pipelines', '/custom-fields', '/lost-reasons', '/won-reasons', '/activities'] });
  });

  return router;
}
