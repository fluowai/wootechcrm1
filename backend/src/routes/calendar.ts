import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import crypto from "crypto";

export function calendarRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar todos os eventos (com suporte a filtro por setor ou profissional)
  router.get("/", async (req: AuthRequest, res) => {
    try {
      const { department, userId } = req.query;
      const where: any = {
        organizationId: req.user?.orgId
      };

      if (userId) {
        where.userId = userId;
      } else if (department) {
        where.user = { department: department as string };
      }

      const events = await prisma.calendarEvent.findMany({
        where,
        include: {
          user: {
            select: { name: true, department: true }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      });
      res.json(events);
    } catch (error) {
      console.error("[CALENDAR_GET]", error);
      res.status(500).json({ error: "Erro ao buscar eventos do calendário" });
    }
  });

  // Criar novo evento
  router.post("/", async (req: AuthRequest, res) => {
    const { title, description, startDate, endDate, allDay, type, reminder, userId } = req.body;
    
    if (!title || !startDate || !type) {
      return res.status(400).json({ error: "Título, data de início e tipo são obrigatórios" });
    }

    // Gerar link de reunião automático quando o tipo for "reunion"
    let meetingLink: string | null = null;
    let meetingCode: string | null = null;
    
    if (type === 'reunion') {
      const roomId = `room-${Math.random().toString(36).substring(7)}`;
      meetingCode = Math.floor(100000 + Math.random() * 900000).toString();
      meetingLink = `/meet/${roomId}?code=${meetingCode}`;
    }

    try {
      const event = await prisma.calendarEvent.create({
        data: {
          title,
          description: meetingCode ? `${description || ''}\n🔑 Código Meet: ${meetingCode}` : description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          allDay: Boolean(allDay),
          type,
          reminder: reminder ? Number(reminder) : null,
          meetingLink,
          userId: userId || req.user?.id, // Se não passar, vincula ao criador
          organizationId: req.user?.orgId as string
        }
      });
      res.json(event);
    } catch (error) {
      console.error("[CALENDAR_POST]", error);
      res.status(500).json({ error: "Erro ao criar evento" });
    }
  });

  // Editar evento
  router.put("/:id", async (req: AuthRequest, res) => {
    const { title, description, startDate, endDate, allDay, type, reminder } = req.body;

    try {
      const existing = await prisma.calendarEvent.findUnique({
        where: { id: req.params.id }
      });

      if (!existing || existing.organizationId !== req.user?.orgId) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      // Se mudou para tipo reunião e não tinha link, gerar um
      let meetingLink = existing.meetingLink;
      if (type === 'reunion' && !meetingLink) {
        const roomId = crypto.randomUUID().split('-')[0];
        meetingLink = `/meet/nexus-${roomId}`;
      } else if (type !== 'reunion') {
        meetingLink = null;
      }

      const event = await prisma.calendarEvent.update({
        where: { id: req.params.id },
        data: {
          title,
          description,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : null,
          allDay: allDay !== undefined ? Boolean(allDay) : undefined,
          type,
          reminder: reminder ? Number(reminder) : null,
          meetingLink
        }
      });
      res.json(event);
    } catch (error) {
      console.error("[CALENDAR_PUT]", error);
      res.status(500).json({ error: "Erro ao atualizar evento" });
    }
  });

  // Deletar evento
  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: req.params.id }
      });

      if (!event || event.organizationId !== req.user?.orgId) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      await prisma.calendarEvent.delete({
        where: { id: req.params.id }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[CALENDAR_DELETE]", error);
      res.status(500).json({ error: "Erro ao deletar evento" });
    }
  });

  return router;
}
