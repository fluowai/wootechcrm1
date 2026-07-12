import { PrismaClient } from "@prisma/client";
import { normalizeWhatsAppPhone } from "../utils/whatsapp.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";

function syntheticEmail(phoneDigits?: string | null) {
  return `prospect-${phoneDigits || "sem-telefone"}@nexus360.local`;
}

async function pickDefaultPipeline(prisma: PrismaClient, organizationId: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { organizationId, isActive: true },
    include: { stages: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  return {
    pipelineId: pipeline?.id || null,
    stageId: pipeline?.stages?.[0]?.id || null,
  };
}

export async function convertProspectingRunToCrm(prisma: PrismaClient, run: any, input: {
  reason: string;
  summary?: string | null;
  userId?: string | null;
  conversationId?: string | null;
  meetingStartDate?: Date | null;
  durationMinutes?: number;
}): Promise<{ lead: any; client: any; opportunity: any; calendarEvent: any }> {
  const organizationId = run.organizationId;
  const leadSnapshot = (run.leadSnapshot as any) || {};
  const qualification = (run.qualification as any) || {};
  const phone = normalizeWhatsAppPhone(run.leadPhone || leadSnapshot.phoneNormalized || leadSnapshot.phone);
  const leadName = run.leadName || leadSnapshot.businessName || qualification?.agentMemory?.companyContext?.businessName || "Lead de prospeccao";
  const assignedToId = qualification.consultantId || leadSnapshot.responsibleId || null;
  const { pipelineId, stageId } = await pickDefaultPipeline(prisma, organizationId);
  const notes = [
    "Convertido automaticamente pela prospeccao Nexus WhatsMeow.",
    input.reason ? `Motivo: ${input.reason}` : null,
    input.summary ? `Resumo: ${input.summary}` : null,
    leadSnapshot.category ? `Segmento: ${leadSnapshot.category}` : null,
    leadSnapshot.city && leadSnapshot.state ? `Local: ${leadSnapshot.city}/${leadSnapshot.state}` : null,
    qualification.lastLeadMessage ? `Ultima resposta: ${qualification.lastLeadMessage}` : null,
  ].filter(Boolean).join("\n");

  const existingLead = run.crmLeadId
    ? await prisma.lead.findFirst({ where: { id: run.crmLeadId, organizationId } })
    : await prisma.lead.findFirst({
        where: {
          organizationId,
          OR: [
            ...(phone.e164 ? [{ whatsapp: phone.e164 }, { phone: phone.e164 }] : []),
            ...(phone.digits ? [{ whatsapp: phone.digits }, { phone: phone.digits }] : []),
          ],
        },
        orderBy: { updatedAt: "desc" },
      });

  const leadData = {
    name: leadName,
    email: leadSnapshot.email || existingLead?.email || syntheticEmail(phone.digits),
    phone: phone.e164 || run.leadPhone || null,
    whatsapp: phone.e164 || run.leadPhone || null,
    status: "qualificado",
    source: "Prospeccao WhatsMeow",
    channel: "WHATSAPP",
    tags: ["Prospeccao IA", "WhatsMeow", input.reason].filter(Boolean).join(", "),
    notes,
    cnpj: leadSnapshot.cnpj || null,
    owners: leadSnapshot.owners || null,
    managementTeam: leadSnapshot.managementTeam || null,
    aiDiagnosis: input.summary || run.lastAiSummary || leadSnapshot.aiDiagnosis || null,
    temperature: "HOT",
    score: run.score || leadSnapshot.scoreOpportunity || 80,
    organizationId,
    assignedToId,
    pipelineId,
    stageId,
  };

  const lead = existingLead
    ? await prisma.lead.update({ where: { id: existingLead.id }, data: leadData as any })
    : await prisma.lead.create({ data: leadData as any });

  const existingClient = await prisma.client.findFirst({
    where: {
      organizationId,
      OR: [
        ...(leadSnapshot.cnpj ? [{ cnpj: leadSnapshot.cnpj }] : []),
        { phone: phone.e164 || phone.digits || run.leadPhone || "" },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const clientData = {
    corporateName: leadSnapshot.legalName || leadSnapshot.businessName || leadName,
    tradeName: leadSnapshot.tradeName || leadSnapshot.businessName || leadName,
    cnpj: leadSnapshot.cnpj || null,
    email: leadSnapshot.email || lead.email,
    phone: phone.e164 || run.leadPhone || null,
    website: leadSnapshot.website || null,
    city: leadSnapshot.city || null,
    state: leadSnapshot.state || null,
    segment: leadSnapshot.category || null,
    responsibleName: qualification.decisionMakerName || qualification?.agentMemory?.peopleContext?.decisionMakerName || null,
    status: "prospect",
    organizationId,
  };

  const client = existingClient
    ? await prisma.client.update({ where: { id: existingClient.id }, data: clientData as any })
    : await prisma.client.create({ data: clientData as any });

  const opportunity = await prisma.opportunity.create({
    data: {
      title: `Prospeccao - ${leadName}`,
      description: notes,
      organizationId,
      clientId: client.id,
      assignedToId,
      pipelineId,
      stageId,
      stage: "qualificacao",
      probability: 60,
      temperature: "HOT",
      score: run.score || lead.score || 80,
      lastInteractionAt: new Date(),
      customFields: {
        prospectingRunId: run.id,
        capturedLeadId: run.capturedLeadId || null,
        conversationId: input.conversationId || qualification.lastConversationId || null,
      },
    } as any,
  });

  let calendarEvent = null;
  if (input.meetingStartDate) {
    const start = input.meetingStartDate;
    const end = new Date(start.getTime() + Number(input.durationMinutes || 30) * 60 * 1000);
    calendarEvent = await prisma.calendarEvent.create({
      data: {
        title: `Reuniao comercial - ${leadName}`,
        description: notes,
        startDate: start,
        endDate: end,
        type: "reunion",
        leadId: lead.id,
        userId: input.userId || assignedToId || undefined,
        organizationId,
      },
    });
  }

  await prisma.prospectingRun.update({
    where: { id: run.id },
    data: {
      crmLeadId: lead.id,
      status: calendarEvent ? "qualified" : "human_handoff",
      nextAction: calendarEvent ? "meeting_booked" : "human_follow_up",
      qualifiedAt: new Date(),
      handedOffAt: new Date(),
      qualification: {
        ...qualification,
        crm: {
          leadId: lead.id,
          clientId: client.id,
          opportunityId: opportunity.id,
          calendarEventId: calendarEvent?.id || null,
          convertedAt: new Date().toISOString(),
          reason: input.reason,
        },
      },
    },
  });

  emitAutomationEvent("lead.qualified", { organizationId, leadId: lead.id, opportunityId: opportunity.id, prospectingRunId: run.id });
  return { lead, client, opportunity, calendarEvent };
}
