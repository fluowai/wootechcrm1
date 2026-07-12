import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import multer from "multer";
import {
  uploadFile,
  deleteFile,
  getPresignedUrl,
  getPresignedUploadUrl,
  listFiles,
  syncOrgStorageUsage,
  getStorageConfig,
} from "../services/storage.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

export function storageRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/config", async (req: AuthRequest, res) => {
    const config = getStorageConfig();
    if (!config.configured) {
      return res.status(503).json({ error: "MinIO nao configurado", config });
    }
    res.json({ config });
  });

  router.get("/usage", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true, limitsUsage: true } });
      if (!org?.slug) return res.status(400).json({ error: "Organizacao sem slug" });

      const usage = await syncOrgStorageUsage(prisma, orgId, org.slug);
      const limits = (org.limitsUsage as any) || {};
      const storageLimitMB = limits.storageLimitMB || 5000;

      res.json({
        usage,
        limitMB: storageLimitMB,
        percentUsed: usage ? +((usage.totalMB / storageLimitMB) * 100).toFixed(1) : 0,
      });
    } catch (error: any) {
      next(error);
    }
  });

  router.get("/files", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
      if (!org?.slug) return res.status(400).json({ error: "Organizacao sem slug" });

      const prefix = (req.query.prefix as string) || "";
      const files = await listFiles(org.slug, prefix);
      res.json({ files });
    } catch (error: any) {
      next(error);
    }
  });

  router.post("/upload", upload.single("file"), async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
      if (!org?.slug) return res.status(400).json({ error: "Organizacao sem slug" });

      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

      const filePath = req.body.path || `uploads/${Date.now()}-${req.file.originalname}`;
      const result = await uploadFile(org.slug, filePath, req.file.buffer, req.file.mimetype);

      await prisma.asset.create({
        data: {
          name: req.file.originalname,
          type: req.file.mimetype.startsWith("image/") ? "image" : "document",
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: result.url,
          organizationId: orgId,
        },
      });

      res.json({ success: true, ...result, size: req.file.size });
    } catch (error: any) {
      next(error);
    }
  });

  router.delete("/files", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
      if (!org?.slug) return res.status(400).json({ error: "Organizacao sem slug" });

      const { path } = req.body;
      if (!path) return res.status(400).json({ error: "path é obrigatorio" });

      await deleteFile(org.slug, path);
      res.json({ success: true, message: "Arquivo removido" });
    } catch (error: any) {
      next(error);
    }
  });

  router.get("/presigned-url", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
      if (!org?.slug) return res.status(400).json({ error: "Organizacao sem slug" });

      const filePath = req.query.path as string;
      if (!filePath) return res.status(400).json({ error: "path é obrigatorio" });

      const url = await getPresignedUrl(org.slug, filePath);
      res.json({ url });
    } catch (error: any) {
      next(error);
    }
  });

  router.get("/presigned-upload-url", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
      if (!org?.slug) return res.status(400).json({ error: "Organizacao sem slug" });

      const filePath = req.query.path as string;
      if (!filePath) return res.status(400).json({ error: "path é obrigatorio" });

      const url = await getPresignedUploadUrl(org.slug, filePath);
      res.json({ url });
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}

export function adminStorageRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/orgs", async (req: AuthRequest, res, next) => {
    try {
      if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });

      const orgs = await prisma.organization.findMany({
        where: { type: "WHITELABEL", slug: { not: null } },
        select: { id: true, name: true, slug: true, limitsUsage: true, plan: true },
        orderBy: { createdAt: "desc" },
      });

      const result = [];
      for (const org of orgs) {
        const usage = await syncOrgStorageUsage(prisma, org.id, org.slug!);
        const limits = (org.limitsUsage as any) || {};
        result.push({
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          usage: usage || { totalMB: 0, totalFiles: 0 },
          limitMB: limits.storageLimitMB || 5000,
          percentUsed: usage ? +((usage.totalMB / (limits.storageLimitMB || 5000)) * 100).toFixed(1) : 0,
        });
      }

      res.json({ organizations: result });
    } catch (error: any) {
      next(error);
    }
  });

  router.put("/orgs/:id/limit", async (req: AuthRequest, res, next) => {
    try {
      if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Unauthorized" });

      const { storageLimitMB } = req.body;
      if (!storageLimitMB || storageLimitMB < 100) {
        return res.status(400).json({ error: "Limite minimo de 100MB" });
      }

      const org = await prisma.organization.findUnique({ where: { id: req.params.id }, select: { limitsUsage: true } });
      const currentLimits = (org?.limitsUsage as any) || {};

      await prisma.organization.update({
        where: { id: req.params.id },
        data: {
          limitsUsage: { ...currentLimits, storageLimitMB },
        },
      });

      res.json({ success: true, storageLimitMB });
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}
