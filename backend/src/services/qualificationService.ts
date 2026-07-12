import { PrismaClient } from "@prisma/client";
import { enrollCapturedLeadsInFunnel } from "../routes/prospectingFunnels.js";

type RoutingTarget = "SDR" | "BDR" | "CLOSER";

type RoutingRule = {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: any;
  target: RoutingTarget;
  scoreMin?: number;
  scoreMax?: number;
};

type IcpField = {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "select" | "multi_select" | "boolean" | "textarea";
  required: boolean;
  options?: string[];
  order: number;
  weight?: number;
  scoreMap?: Record<string, number>;
};

type FormAnswers = Record<string, any>;

type TrackingData = Record<string, any>;

function sanitizeTracking(tracking?: TrackingData): TrackingData {
  if (!tracking || typeof tracking !== "object" || Array.isArray(tracking)) return {};
  const allowedKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "referrer",
    "landingUrl",
    "path",
    "ip",
    "userAgent",
  ];
  return allowedKeys.reduce((acc, key) => {
    const value = tracking[key];
    if (value === null || value === undefined || value === "") return acc;
    acc[key] = String(value).slice(0, 500);
    return acc;
  }, {} as TrackingData);
}

function formatTrackingSummary(tracking: TrackingData): string | null {
  const parts = [
    tracking.utm_source ? `utm_source=${tracking.utm_source}` : null,
    tracking.utm_medium ? `utm_medium=${tracking.utm_medium}` : null,
    tracking.utm_campaign ? `utm_campaign=${tracking.utm_campaign}` : null,
    tracking.referrer ? `referrer=${tracking.referrer}` : null,
  ].filter(Boolean);
  return parts.length ? `Rastreamento: ${parts.join(" | ")}` : null;
}

function getScoreForField(field: IcpField, value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (field.weight === undefined || field.weight === 0) return 0;
  if (field.scoreMap) {
    const strVal = String(value).trim();
    return field.scoreMap[strVal] ?? 0;
  }
  if (field.type === "boolean") {
    return value === true ? field.weight : 0;
  }
  if (field.type === "number" && typeof value === "number") {
    return Math.min(value, field.weight);
  }
  return field.weight;
}

function calculateScore(fields: IcpField[], answers: FormAnswers): { score: number; maxScore: number; scorePercent: number } {
  let score = 0;
  let maxScore = 0;
  for (const field of fields) {
    if (field.weight) maxScore += field.weight;
    score += getScoreForField(field, answers[field.key]);
  }
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, scorePercent };
}

function findRoutingTarget(rules: RoutingRule[], answers: FormAnswers, score: number): { target: RoutingTarget; reason: string } | null {
  for (const rule of rules) {
    if (rule.scoreMin !== undefined && score < rule.scoreMin) continue;
    if (rule.scoreMax !== undefined && score > rule.scoreMax) continue;
    const value = answers[rule.field];
    let matched = false;
    switch (rule.operator) {
      case "eq": matched = value === rule.value; break;
      case "neq": matched = value !== rule.value; break;
      case "gt": matched = Number(value) > Number(rule.value); break;
      case "gte": matched = Number(value) >= Number(rule.value); break;
      case "lt": matched = Number(value) < Number(rule.value); break;
      case "lte": matched = Number(value) <= Number(rule.value); break;
      case "in": matched = Array.isArray(rule.value) && rule.value.includes(value); break;
      case "contains": matched = String(value).toLowerCase().includes(String(rule.value).toLowerCase()); break;
    }
    if (matched) {
      return { target: rule.target, reason: `Regra: ${rule.field} ${rule.operator} ${rule.value} → ${rule.target}` };
    }
  }
  return null;
}

function findAvailableUser(users: { id: string; department: string | null }[], target: RoutingTarget): { id: string } | null {
  const candidates = users.filter((u) => u.department === target);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function submitQualification(
  prisma: PrismaClient,
  formId: string,
  data: { name: string; email: string; phone?: string; notes?: string; answers: FormAnswers; tracking?: TrackingData },
) {
  const form = await prisma.qualificationForm.findUnique({
    where: { id: formId },
    include: { organization: { include: { users: { select: { id: true, department: true } } } } },
  });
  if (!form || !form.isActive) throw new Error("Formulário não encontrado ou inativo");

  const fields = form.icpFields as IcpField[];
  const rules = form.routingRules ? (form.routingRules as RoutingRule[]) : [];
  const { score, maxScore, scorePercent } = calculateScore(fields, data.answers);
  const routing = findRoutingTarget(rules, data.answers, score);
  const tracking = sanitizeTracking(data.tracking);
  const trackingSummary = formatTrackingSummary(tracking);
  const answersWithTracking = Object.keys(tracking).length
    ? { ...data.answers, __tracking: tracking }
    : data.answers;

  let leadId: string | null = null;
  if (form.createLead) {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        notes: [data.notes, trackingSummary].filter(Boolean).join("\n") || null,
        source: tracking.utm_source ? `qualification:${tracking.utm_source}` : "qualification_form",
        channel: tracking.utm_medium || null,
        organizationId: form.organizationId,
        status: routing ? "qualificado" : "pending",
        score,
        temperature: scorePercent >= 70 ? "HOT" : scorePercent >= 40 ? "WARM" : "COLD",
        pipelineId: form.leadPipelineId || null,
        stageId: form.leadStageId || null,
      },
    });
    leadId = lead.id;
  }

  const target = routing?.target || null;
  const routedUser = target ? findAvailableUser(form.organization.users, target) : null;

  const submission = await prisma.qualificationSubmission.create({
    data: {
      formId,
      organizationId: form.organizationId,
      leadId,
      leadName: data.name,
      leadEmail: data.email,
      leadPhone: data.phone || null,
      leadNotes: data.notes || null,
      answers: answersWithTracking as any,
      score,
      maxScore,
      scorePercent,
      status: routing ? "approved" : "pending",
      routedTo: target,
      routedToUserId: routedUser?.id || null,
      routedAt: routing ? new Date() : null,
      routeReason: routing?.reason || null,
    },
  });

  let funnelResult = null;
  if (form.createFunnelLead && form.funnelId && submission.leadPhone) {
    try {
      const phoneDigits = submission.leadPhone.replace(/\D/g, "");
      const captured = await prisma.capturedLead.upsert({
        where: {
          organizationId_provider_externalId: {
            organizationId: form.organizationId,
            provider: "qualification_form",
            externalId: `qualification-submission-${submission.id}`,
          },
        },
        update: {
          businessName: submission.leadName,
          email: submission.leadEmail,
          phone: submission.leadPhone,
          phoneNormalized: phoneDigits,
          notes: [`Score ICP: ${scorePercent}%`, submission.leadNotes, trackingSummary].filter(Boolean).join("\n"),
          crmStatus: "prospecting_funnel",
        },
        create: {
          organizationId: form.organizationId,
          provider: "qualification_form",
          externalId: `qualification-submission-${submission.id}`,
          businessName: submission.leadName,
          email: submission.leadEmail,
          phone: submission.leadPhone,
          phoneNormalized: phoneDigits,
          hasPhone: true,
          crmStatus: "prospecting_funnel",
          notes: [`Score ICP: ${scorePercent}%`, submission.leadNotes, trackingSummary].filter(Boolean).join("\n"),
        },
      });
      funnelResult = await enrollCapturedLeadsInFunnel(prisma, form.organizationId, [captured.id], form.funnelId);
    } catch (err) {
      console.warn("[Qualification] Erro ao enviar ao funil de prospecção:", err);
    }
  }

  return { submission, form: { allowScheduling: form.allowScheduling, schedulingMessage: form.schedulingMessage, createFunnelLead: form.createFunnelLead }, routed: !!routing, target, funnelResult };
}

export async function getQualificationFormPublic(prisma: PrismaClient, formId: string) {
  const form = await prisma.qualificationForm.findUnique({
    where: { id: formId, isActive: true },
    select: { id: true, name: true, description: true, icpFields: true, allowScheduling: true, schedulingMessage: true },
  });
  return form;
}

export async function listQualificationForms(prisma: PrismaClient, organizationId: string) {
  return prisma.qualificationForm.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
}

export async function listSubmissions(prisma: PrismaClient, organizationId: string, filters?: { status?: string; formId?: string; routedTo?: string }) {
  const where: any = { organizationId };
  if (filters?.status) where.status = filters.status;
  if (filters?.formId) where.formId = filters.formId;
  if (filters?.routedTo) where.routedTo = filters.routedTo;
  return prisma.qualificationSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { form: { select: { name: true } } },
  });
}

export async function scheduleQualification(
  prisma: PrismaClient,
  submissionId: string,
  data: { scheduledTo: string; notes?: string; userId?: string },
) {
  const submission = await prisma.qualificationSubmission.findUnique({
    where: { id: submissionId },
    include: { form: true },
  });
  if (!submission) throw new Error("Submissão não encontrada");
  if (submission.status !== "approved") throw new Error("Lead precisa estar aprovado para agendar");

  const scheduledDate = new Date(data.scheduledTo);
  const target = submission.routedTo || "GERAL";

  const agenda = await prisma.agenda.findFirst({
    where: { organizationId: submission.organizationId, type: target, OR: [{ type: target }, { type: "GERAL" }] },
  });

  const event = await prisma.calendarEvent.create({
    data: {
      title: `${target}: ${submission.leadName}`,
      description: data.notes || submission.leadNotes || `Qualificação via formulário - Score: ${submission.scorePercent}%`,
      startDate: scheduledDate,
      endDate: new Date(scheduledDate.getTime() + 60 * 60 * 1000),
      type: "QUALIFICATION",
      status: "scheduled",
      organizationId: submission.organizationId,
      userId: data.userId || submission.routedToUserId || null,
      agendaId: agenda?.id || null,
      leadId: submission.leadId || undefined,
    },
  });

  return prisma.qualificationSubmission.update({
    where: { id: submissionId },
    data: {
      status: "scheduled",
      scheduledTo: scheduledDate,
      calendarEventId: event.id,
      schedulingNotes: data.notes || null,
    },
  });
}

export async function enrollQualificationInFunnel(
  prisma: PrismaClient,
  organizationId: string,
  submissionId: string,
  funnelId: string = "default",
) {
  const submission = await prisma.qualificationSubmission.findFirst({
    where: { id: submissionId, organizationId },
  });
  if (!submission) throw new Error("Submissão não encontrada");
  if (submission.status !== "approved") throw new Error("Lead precisa estar aprovado para enviar ao funil");

  const phoneDigits = (submission.leadPhone || "").replace(/\D/g, "");
  const captured = await prisma.capturedLead.upsert({
    where: {
      organizationId_provider_externalId: {
        organizationId,
        provider: "qualification_form",
        externalId: `qualification-submission-${submission.id}`,
      },
    },
    update: {
      businessName: submission.leadName,
      email: submission.leadEmail,
      phone: submission.leadPhone,
      phoneNormalized: phoneDigits,
      notes: [`Score ICP: ${submission.scorePercent}%`, submission.leadNotes].filter(Boolean).join("\n"),
      crmStatus: "prospecting_funnel",
    },
    create: {
      organizationId,
      provider: "qualification_form",
      externalId: `qualification-submission-${submission.id}`,
      businessName: submission.leadName,
      email: submission.leadEmail,
      phone: submission.leadPhone,
      phoneNormalized: phoneDigits,
      hasPhone: true,
      crmStatus: "prospecting_funnel",
      notes: [`Score ICP: ${submission.scorePercent}%`, submission.leadNotes].filter(Boolean).join("\n"),
    },
  });

  const result = await enrollCapturedLeadsInFunnel(prisma, organizationId, [captured.id], funnelId);

  await prisma.qualificationSubmission.update({
    where: { id: submission.id },
    data: {
      status: result.enrolled > 0 ? "converted" : submission.status,
    },
  });

  return { capturedLead: captured, funnelResult: result };
}

export async function getTeamAvailability(prisma: PrismaClient, organizationId: string) {
  const users = await prisma.user.findMany({
    where: { organizationId, department: { in: ["SDR", "BDR", "CLOSER"] }, status: "ACTIVE" },
    select: { id: true, name: true, department: true },
  });

  const agendas = await prisma.agenda.findMany({
    where: { organizationId, type: { in: ["SDR", "BDR", "CLOSER", "GERAL"] } },
    include: { events: { where: { startDate: { gte: new Date() } }, orderBy: { startDate: "asc" } } },
  });

  return { users, agendas };
}
