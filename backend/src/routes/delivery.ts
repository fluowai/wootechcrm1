import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function deliveryRoutes(prisma: PrismaClient) {
  const router = Router();

  // ==================== DELIVERABLES ====================

  router.get("/deliverables", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const { projectId, clientId, status } = req.query;
      const where: any = { organizationId: orgId };
      if (projectId) where.projectId = projectId;
      if (clientId) where.clientId = clientId;
      if (status) where.status = status;
      const deliverables = await prisma.deliverable.findMany({ where, orderBy: { createdAt: "desc" } });
      res.json(deliverables);
    } catch (error) {
      console.error("[DELIVERABLES_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar entregáveis" });
    }
  });

  router.post("/deliverables", async (req: AuthRequest, res) => {
    try {
      const { title, description, type, priority, dueDate, projectId, clientId } = req.body;
      if (!title || !type) return res.status(400).json({ error: "Título e tipo são obrigatórios" });
      const deliverable = await prisma.deliverable.create({
        data: { title, description, type, priority: priority || "medium", dueDate: dueDate ? new Date(dueDate) : undefined, projectId, clientId, createdById: req.user!.id, organizationId: req.user!.orgId },
      });
      res.json(deliverable);
    } catch (error) {
      console.error("[DELIVERABLES_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar entregável" });
    }
  });

  router.patch("/deliverables/:id", async (req: AuthRequest, res) => {
    try {
      const { status, notes, fileUrl, version, isFinal, priority } = req.body;
      const data: any = {};
      if (status) data.status = status;
      if (notes !== undefined) data.notes = notes;
      if (fileUrl) data.fileUrl = fileUrl;
      if (version) data.version = version;
      if (isFinal !== undefined) data.isFinal = isFinal;
      if (priority) data.priority = priority;
      if (status === "delivered") data.deliveredAt = new Date();
      if (status === "approved") data.isFinal = true;
      const result = await prisma.deliverable.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data,
      });
      if (!result.count) return res.status(404).json({ error: "Entregável não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[DELIVERABLES_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar entregável" });
    }
  });

  router.delete("/deliverables/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.deliverable.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Entregável não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[DELIVERABLES_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar entregável" });
    }
  });

  // ==================== APPROVALS ====================

  router.get("/approvals", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const { status } = req.query;
      const orgDeliverableIds = await prisma.deliverable.findMany({
        where: { organizationId: orgId },
        select: { id: true }
      });
      const ids = orgDeliverableIds.map(d => d.id);
      const where: any = { deliverableId: { in: ids } };
      if (status) where.status = status;
      const approvals = await prisma.approval.findMany({ where, orderBy: { createdAt: "desc" } });
      res.json(approvals);
    } catch (error) {
      console.error("[APPROVALS_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar aprovações" });
    }
  });

  router.post("/deliverables/:id/approve", async (req: AuthRequest, res) => {
    try {
      const { comment, status } = req.body;
      if (!status || !["approved", "rejected", "changes_requested"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }
      const deliverable = await prisma.deliverable.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!deliverable) return res.status(404).json({ error: "Entregável não encontrado" });
      await prisma.approval.create({
        data: { status, comment, requestedChanges: status === "changes_requested" ? req.body.requestedChanges : undefined, approvedById: req.user!.id, approvedAt: new Date(), deliverableId: req.params.id },
      });
      await prisma.deliverable.update({
        where: { id: req.params.id },
        data: { status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "in_review", approvedById: status === "approved" ? req.user!.id : undefined },
      });
      res.json({ success: true, status });
    } catch (error) {
      console.error("[APPROVALS_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao processar aprovação" });
    }
  });

  return router;
}
