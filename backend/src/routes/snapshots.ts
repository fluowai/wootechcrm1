import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authenticateToken } from "../middleware/auth.js";
import { requireAccess } from "../middleware/access.js";

interface SnapshotData {
  boards: { name: string }[];
  stages: { name: string; order: number; boardName?: string }[];
}

export function snapshotRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", authenticateToken, async (req: AuthRequest, res) => {
    const orgId = req.user!.orgId;
    const snapshots = await prisma.snapshot.findMany({
      where: {
        OR: [
          { organizationId: orgId },
          { isPublic: true }
        ]
      }
    });
    res.json(snapshots);
  });

  router.post("/", authenticateToken, requireAccess({ feature: "snapshots.create" }), async (req: AuthRequest, res) => {
    const orgId = req.user!.orgId;
    const { name, description, isPublic } = req.body;

    try {
      // Buscar dados para o snapshot (pipelines, etapas, etc.)
      const [boards, stages] = await Promise.all([
        prisma.pipeline.findMany({ where: { organizationId: orgId } }),
        prisma.pipelineStage.findMany({ where: { pipeline: { organizationId: orgId } } })
      ]);

      const snapshotData = {
        boards: boards.map(b => ({ name: b.name })),
        stages: stages.map(s => ({ name: s.name, order: s.order, boardName: boards.find(b => b.id === s.pipelineId)?.name }))
      };

      const snapshot = await prisma.snapshot.create({
        data: {
          name,
          description,
          isPublic: isPublic || false,
          organizationId: orgId,
          createdBy: req.user!.id,
          data: snapshotData
        }
      });

      res.json(snapshot);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar snapshot" });
    }
  });

  router.post("/:id/apply", authenticateToken, requireAccess({ feature: "snapshots.apply" }), async (req: AuthRequest, res) => {
    const orgId = req.user!.orgId;
    
    try {
      const snapshot = await prisma.snapshot.findUnique({
        where: { id: req.params.id }
      });

      if (!snapshot) return res.status(404).json({ error: "Snapshot não encontrado" });

      const data = snapshot.data as unknown as SnapshotData;

      await prisma.$transaction(async (tx) => {
        for (const boardData of data.boards) {
          const board = await tx.pipeline.create({
            data: { name: boardData.name, organizationId: orgId }
          });

          const boardStages = data.stages.filter((s) => s.boardName === boardData.name);
          for (const stageData of boardStages) {
            await tx.pipelineStage.create({
              data: { name: stageData.name, order: stageData.order, pipelineId: board.id }
            });
          }
        }
      });

      res.json({ success: true, message: "Snapshot aplicado com sucesso!" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao aplicar snapshot" });
    }
  });

  return router;
}
