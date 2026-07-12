import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

export const getDashboardMetrics = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const orgId = req.user.orgId;
    
    // Contagens básicas para os cards do dashboard
    const missionsActive = await prisma.prospectMission.count({
      where: { organizationId: orgId, status: "em_execucao" }
    });
    
    const leadsCaptadosHoje = await prisma.prospectLead.count({
      where: {
        mission: { organizationId: orgId },
        captureDate: { gte: new Date(new Date().setHours(0,0,0,0)) }
      }
    });

    const leadsValidados = await prisma.prospectLead.count({
      where: { mission: { organizationId: orgId }, status: "validado" }
    });

    const leadsAprovados = await prisma.prospectLead.count({
      where: { mission: { organizationId: orgId }, status: "aprovado_para_contato" }
    });

    res.json({
      success: true,
      data: {
        metrics: {
          missionsActive,
          leadsCaptadosHoje,
          leadsValidados,
          leadsAprovados
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMissions = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const orgId = req.user.orgId;
    const missions = await prisma.prospectMission.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { leads: true, messages: true, appointments: true }
        }
      }
    });
    res.json({ success: true, data: missions });
  } catch (error) {
    next(error);
  }
};

export const createMission = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const orgId = req.user.orgId;
    const userId = req.user.id;
    const {
      name,
      niche,
      city,
      state,
      country,
      leadQuantity,
      executionDate,
      executionTime,
      recurrence,
      initialApproach,
      minScore,
      dailyMessageLimit,
      messageIntervalMinutes
    } = req.body;

    if (!name || !niche || !city || !state || !leadQuantity || !executionDate || !executionTime) {
      return res.status(400).json({ error: "Informe nome, segmento, cidade, UF, quantidade, data e horario." });
    }

    const mission = await prisma.prospectMission.create({
      data: {
        organizationId: orgId,
        userId: userId,
        name,
        niche,
        city,
        state: String(state).toUpperCase(),
        country: country || "Brasil",
        leadQuantity: Number(leadQuantity),
        executionDate: new Date(executionDate),
        executionTime,
        recurrence: recurrence || "unica",
        minScore: Number(minScore || 50),
        dailyMessageLimit: Number(dailyMessageLimit || 50),
        messageIntervalMinutes: Number(messageIntervalMinutes || 15),
        initialApproach: initialApproach || "Abordagem humana para localizar socio, proprietario ou responsavel comercial. Nao dizer que somos agencia e nao abrir diagnostico antes de conversar com o decisor.",
        status: "agendada"
      }
    });

    res.json({ success: true, data: mission });
  } catch (error) {
    next(error);
  }
};

export const getMissionById = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;
    
    const mission = await prisma.prospectMission.findFirst({
      where: { id, organizationId: orgId },
      include: {
        leads: { take: 10, orderBy: { createdAt: "desc" } }
      }
    });

    if (!mission) return res.status(404).json({ error: "Missão não encontrada" });

    res.json({ success: true, data: mission });
  } catch (error) {
    next(error);
  }
};

export const updateMission = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;
    const updateData = req.body;

    // Verificar se existe
    const exists = await prisma.prospectMission.findFirst({ where: { id, organizationId: orgId } });
    if (!exists) return res.status(404).json({ error: "Missão não encontrada" });

    const mission = await prisma.prospectMission.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: mission });
  } catch (error) {
    next(error);
  }
};

export const deleteMission = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    const exists = await prisma.prospectMission.findFirst({ where: { id, organizationId: orgId } });
    if (!exists) return res.status(404).json({ error: "Missão não encontrada" });

    await prisma.prospectMission.delete({ where: { id } });

    res.json({ success: true, message: "Missão deletada" });
  } catch (error) {
    next(error);
  }
};

// Ações rápidas da missão
const updateMissionStatus = async (id: string, orgId: string, status: string, prisma: PrismaClient) => {
  const exists = await prisma.prospectMission.findFirst({ where: { id, organizationId: orgId } });
  if (!exists) throw new Error("Missão não encontrada");
  return await prisma.prospectMission.update({ where: { id }, data: { status } });
};

export const runMission = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const mission = await updateMissionStatus(req.params.id, req.user.orgId, "em_execucao", prisma);
    res.json({ success: true, message: "Missão iniciada", data: mission });
  } catch (error) { next(error); }
};

export const pauseMission = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const mission = await updateMissionStatus(req.params.id, req.user.orgId, "pausada", prisma);
    res.json({ success: true, message: "Missão pausada", data: mission });
  } catch (error) { next(error); }
};

export const resumeMission = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const mission = await updateMissionStatus(req.params.id, req.user.orgId, "em_execucao", prisma);
    res.json({ success: true, message: "Missão retomada", data: mission });
  } catch (error) { next(error); }
};

export const cancelMission = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const mission = await updateMissionStatus(req.params.id, req.user.orgId, "cancelada", prisma);
    res.json({ success: true, message: "Missão cancelada", data: mission });
  } catch (error) { next(error); }
};

export const getLeads = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const orgId = req.user.orgId;
    const leads = await prisma.prospectLead.findMany({
      where: { mission: { organizationId: orgId } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        validation: true,
        dossier: true
      }
    });
    res.json({ success: true, data: leads });
  } catch (error) {
    next(error);
  }
};

export const getMissionLeads = async (req: any, res: Response, next: NextFunction, prisma: PrismaClient) => {
  try {
    const orgId = req.user.orgId;
    const { id } = req.params;

    const mission = await prisma.prospectMission.findFirst({
      where: { id, organizationId: orgId }
    });
    if (!mission) return res.status(404).json({ error: "Missão não encontrada" });

    // 1. Busca os ProspectLead (pipeline legado)
    const prospectLeads = await prisma.prospectLead.findMany({
      where: { missionId: id },
      orderBy: { createdAt: "desc" },
      include: {
        validation: true,
        dossier: true
      }
    });

    // 2. Busca os CapturedLead (pipeline moderno) a partir do missionResult
    let capturedLeads: any[] = [];
    const missionResult = mission.missionResult as any;
    if (missionResult?.capturedLeadIds?.length) {
      capturedLeads = await prisma.capturedLead.findMany({
        where: {
          id: { in: missionResult.capturedLeadIds },
          organizationId: orgId
        },
        orderBy: { createdAt: "desc" }
      });
    }

    // 3. Converte CapturedLead para o formato esperado pelo frontend (ProspectLead-like)
    const phoneForDisplay = (cl: any) => cl.phoneNormalized || cl.phone;
    const mappedCapturedLeads = capturedLeads.map(cl => ({
      id: cl.id,
      companyName: cl.businessName,
      category: cl.category,
      phone: phoneForDisplay(cl),
      whatsapp: phoneForDisplay(cl),
      website: cl.website,
      address: null,
      city: cl.city,
      state: cl.state,
      googleRating: cl.rating,
      googleReviewsCount: cl.reviewsCount,
      status: cl.cnpjStatus === "validated" ? "aprovado_para_contato" : cl.cnpjStatus === "rejected" ? "descartado" : "validado",
      captureDate: cl.createdAt,
      createdAt: cl.createdAt,
      _capturedLead: true,
      validation: {
        cnpj: cl.cnpj,
        owners: cl.owners,
        managementTeam: cl.managementTeam,
        scoreOpportunity: cl.scoreOpportunity,
        opportunityLevel: cl.opportunityLevel,
        aiDiagnosis: cl.aiDiagnosis
      },
      altPhone: cl.rawData?.altPhone || null,
      dossier: cl.aiDiagnosis ? { diagnosis: cl.aiDiagnosis } : null
    }));

    // 4. Junta e ordena por data decrescente
    const allLeads = [...mappedCapturedLeads, ...prospectLeads]
      .sort((a, b) => new Date(b.captureDate || b.createdAt).getTime() - new Date(a.captureDate || a.createdAt).getTime());

    res.json({ success: true, data: allLeads });
  } catch (error) {
    next(error);
  }
};
