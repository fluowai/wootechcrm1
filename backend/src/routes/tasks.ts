import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { auditFromRequest } from "../utils/auditLogger.js";

export function taskRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar todas as tarefas da organização
  router.get("/", async (req: AuthRequest, res) => {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          organizationId: req.user?.orgId
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      res.json(tasks);
    } catch (error) {
      console.error("[TASKS_GET]", error);
      res.status(500).json({ error: "Erro ao buscar tarefas" });
    }
  });

  // Criar nova tarefa
  router.post("/", async (req: AuthRequest, res) => {
    const { title, description, status, priority, dueDate, assignedToId, activityLog } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: "Título é obrigatório" });
    }

    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          status: status || "pendente",
          priority: priority || "media",
          dueDate: dueDate ? new Date(dueDate) : null,
          assignedToId: assignedToId || req.user?.id,
          organizationId: req.user?.orgId as string,
          leadId: req.body.leadId || null,
          opportunityId: req.body.opportunityId || null,
          // Notas: Salvamos o log na descrição ou campos extras se houver
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      res.json(task);
    } catch (error) {
      console.error("[TASKS_POST]", error);
      res.status(500).json({ error: "Erro ao criar tarefa" });
    }
  });

  // Atualizar tarefa (status, etc)
  router.patch("/:id", async (req: AuthRequest, res) => {
    const { status, priority, title, description, dueDate, assignedToId, activityLog } = req.body;
    
    try {
      const existingTask = await prisma.task.findFirst({
        where: { id: req.params.id, organizationId: req.user?.orgId }
      });

      if (!existingTask) {
        return res.status(404).json({ error: "Tarefa não encontrada" });
      }

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: {
          status,
          priority,
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          assignedToId,
          completedAt: status === 'concluida' ? new Date() : undefined,
          //activityLog // Se o schema tiver este campo, senão concatenamos na descrição
        }
      });

      res.json(task);
    } catch (error) {
      console.error("[TASKS_PATCH]", error);
      res.status(500).json({ error: "Erro ao atualizar tarefa" });
    }
  });

  // Deletar tarefa
  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const task = await prisma.task.findFirst({
        where: { id: req.params.id, organizationId: req.user?.orgId }
      });

      if (!task) {
        return res.status(404).json({ error: "Tarefa não encontrada" });
      }

      await prisma.task.delete({
        where: { id: req.params.id }
      });

      auditFromRequest(req, "DELETE", "Task", req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[TASKS_DELETE]", error);
      res.status(500).json({ error: "Erro ao deletar tarefa" });
    }
  });

  return router;
}
