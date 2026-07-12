import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function extraRoutes(prisma: PrismaClient) {
  const router = Router();

  // ==================== QUIZZES ====================

  router.get("/quizzes", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const quizzes = await prisma.quiz.findMany({
        where: { organizationId: orgId },
        include: { questions: { orderBy: { order: "asc" } }, _count: { select: { submissions: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(quizzes);
    } catch (error) {
      console.error("[QUIZZES_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar quizzes" });
    }
  });

  router.post("/quizzes", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: "Nome do quiz é obrigatório" });
      let slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
      const existing = await prisma.quiz.findUnique({ where: { slug } });
      if (existing) slug = slug + "-" + Date.now().toString(36);
      const quiz = await prisma.quiz.create({
        data: { name, slug, description, organizationId: orgId },
      });
      res.json(quiz);
    } catch (error) {
      console.error("[QUIZZES_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar quiz" });
    }
  });

  router.get("/quizzes/:id", async (req: AuthRequest, res) => {
    try {
      const quiz = await prisma.quiz.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        include: { questions: { orderBy: { order: "asc" } } },
      });
      if (!quiz) return res.status(404).json({ error: "Quiz não encontrado" });
      res.json(quiz);
    } catch (error) {
      console.error("[QUIZZES_GET_ERROR]", error);
      res.status(500).json({ error: "Erro ao buscar quiz" });
    }
  });

  router.patch("/quizzes/:id", async (req: AuthRequest, res) => {
    try {
      const { name, description } = req.body;
      const quiz = await prisma.quiz.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data: { ...(name && { name }), ...(description !== undefined && { description }) },
      });
      if (!quiz.count) return res.status(404).json({ error: "Quiz não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[QUIZZES_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar quiz" });
    }
  });

  router.delete("/quizzes/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.quiz.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Quiz não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[QUIZZES_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar quiz" });
    }
  });

  // Questions
  router.post("/quizzes/:quizId/questions", async (req: AuthRequest, res) => {
    try {
      const { text, type, options, order } = req.body;
      const quiz = await prisma.quiz.findFirst({
        where: { id: req.params.quizId, organizationId: req.user!.orgId },
      });
      if (!quiz) return res.status(404).json({ error: "Quiz não encontrado" });
      const question = await prisma.quizQuestion.create({
        data: {
          quizId: req.params.quizId,
          text,
          type: type || "text",
          options: options || undefined,
          order: order ?? 0,
        },
      });
      res.json(question);
    } catch (error) {
      console.error("[QUIZ_QUESTIONS_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar pergunta" });
    }
  });

  router.patch("/quizzes/:quizId/questions/:id", async (req: AuthRequest, res) => {
    try {
      const { text, type, options, order } = req.body;
      const question = await prisma.quizQuestion.updateMany({
        where: { id: req.params.id, quizId: req.params.quizId },
        data: { ...(text && { text }), ...(type && { type }), ...(options && { options }), ...(order !== undefined && { order }) },
      });
      if (!question.count) return res.status(404).json({ error: "Pergunta não encontrada" });
      res.json({ success: true });
    } catch (error) {
      console.error("[QUIZ_QUESTIONS_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar pergunta" });
    }
  });

  router.delete("/quizzes/:quizId/questions/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.quizQuestion.deleteMany({
        where: { id: req.params.id, quizId: req.params.quizId },
      });
      if (!result.count) return res.status(404).json({ error: "Pergunta não encontrada" });
      res.json({ success: true });
    } catch (error) {
      console.error("[QUIZ_QUESTIONS_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar pergunta" });
    }
  });

  // Submissions
  router.post("/quizzes/:quizId/submit", async (req: AuthRequest, res) => {
    try {
      const { answers, leadId } = req.body;
      const quiz = await prisma.quiz.findFirst({
        where: { id: req.params.quizId, organizationId: req.user!.orgId },
      });
      if (!quiz) return res.status(404).json({ error: "Quiz não encontrado" });
      const submission = await prisma.quizSubmission.create({
        data: { quizId: req.params.quizId, answers, leadId },
      });
      res.json(submission);
    } catch (error) {
      console.error("[QUIZ_SUBMIT_ERROR]", error);
      res.status(500).json({ error: "Erro ao submeter quiz" });
    }
  });

  router.get("/quizzes/:quizId/submissions", async (req: AuthRequest, res) => {
    try {
      const submissions = await prisma.quizSubmission.findMany({
        where: { quizId: req.params.quizId, quiz: { organizationId: req.user!.orgId } },
        include: { lead: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(submissions);
    } catch (error) {
      console.error("[QUIZ_SUBMISSIONS_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar submissions" });
    }
  });

  // ==================== ASSETS ====================

  router.get("/assets", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const { type, folderId, search } = req.query;
      const where: any = { organizationId: orgId };
      if (type) where.type = type;
      if (folderId) where.folderId = folderId;
      if (search) where.name = { contains: search as string, mode: "insensitive" };
      const assets = await prisma.asset.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      res.json(assets);
    } catch (error) {
      console.error("[ASSETS_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar assets" });
    }
  });

  router.post("/assets", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const { name, type, mimeType, size, url, thumbnailUrl, width, height, duration, tags, folderId } = req.body;
      if (!name || !type) return res.status(400).json({ error: "Nome e tipo são obrigatórios" });
      const asset = await prisma.asset.create({
        data: { name, type, mimeType, size, url, thumbnailUrl, width, height, duration, tags, folderId, organizationId: orgId },
      });
      res.json(asset);
    } catch (error) {
      console.error("[ASSETS_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar asset" });
    }
  });

  router.patch("/assets/:id", async (req: AuthRequest, res) => {
    try {
      const { name, type, tags, folderId } = req.body;
      const asset = await prisma.asset.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data: { ...(name && { name }), ...(type && { type }), ...(tags && { tags }), ...(folderId !== undefined && { folderId }) },
      });
      if (!asset.count) return res.status(404).json({ error: "Asset não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[ASSETS_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar asset" });
    }
  });

  router.delete("/assets/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.asset.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Asset não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[ASSETS_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar asset" });
    }
  });

  // Asset Folders
  router.get("/asset-folders", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const folders = await prisma.assetFolder.findMany({
        where: { organizationId: orgId },
        include: { _count: { select: { assets: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(folders);
    } catch (error) {
      console.error("[ASSET_FOLDERS_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar pastas" });
    }
  });

  router.post("/asset-folders", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const { name, parentId } = req.body;
      if (!name) return res.status(400).json({ error: "Nome da pasta é obrigatório" });
      const folder = await prisma.assetFolder.create({
        data: { name, parentId, organizationId: orgId },
      });
      res.json(folder);
    } catch (error) {
      console.error("[ASSET_FOLDERS_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar pasta" });
    }
  });

  router.patch("/asset-folders/:id", async (req: AuthRequest, res) => {
    try {
      const { name, parentId } = req.body;
      const folder = await prisma.assetFolder.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data: { ...(name && { name }), ...(parentId !== undefined && { parentId }) },
      });
      if (!folder.count) return res.status(404).json({ error: "Pasta não encontrada" });
      res.json({ success: true });
    } catch (error) {
      console.error("[ASSET_FOLDERS_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar pasta" });
    }
  });

  router.delete("/asset-folders/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.assetFolder.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Pasta não encontrada" });
      res.json({ success: true });
    } catch (error) {
      console.error("[ASSET_FOLDERS_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar pasta" });
    }
  });

  return router;
}
