import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

type DateRange = {
  from?: Date;
  to?: Date;
};

type AdsTotals = {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
};

function prismaAny(prisma: PrismaClient) {
  return prisma as any;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function round(value: number, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
}

function deriveMetrics(input: Partial<AdsTotals>): AdsTotals {
  const impressions = Math.max(0, Math.round(input.impressions || 0));
  const clicks = Math.max(0, Math.round(input.clicks || 0));
  const spend = round(Math.max(0, input.spend || 0));
  const conversions = round(Math.max(0, input.conversions || 0));
  const conversionValue = round(Math.max(0, input.conversionValue || 0));
  const leads = Math.max(0, Math.round(input.leads || conversions || 0));

  return {
    impressions,
    clicks,
    spend,
    conversions,
    conversionValue,
    leads,
    ctr: impressions ? round((clicks / impressions) * 100) : 0,
    cpc: clicks ? round(spend / clicks) : 0,
    cpm: impressions ? round((spend / impressions) * 1000) : 0,
    cpa: conversions ? round(spend / conversions) : 0,
    roas: spend ? round(conversionValue / spend) : 0,
  };
}

function emptyTotals(): AdsTotals {
  return deriveMetrics({});
}

function makeDemoMetrics(platform: string, index: number, dayOffset: number) {
  const base = platform === "google" ? 1.18 : 1;
  const wave = 1 + ((index + dayOffset) % 5) * 0.08;
  const impressions = Math.round((2600 + index * 850 + dayOffset * 45) * base * wave);
  const clicks = Math.round(impressions * (0.018 + index * 0.004));
  const spend = round(clicks * (platform === "google" ? 2.9 + index * 0.35 : 2.15 + index * 0.3));
  const conversions = round(clicks * (0.035 + index * 0.007), 1);
  const conversionValue = round(conversions * (platform === "google" ? 320 : 260));
  return deriveMetrics({ impressions, clicks, spend, conversions, conversionValue, leads: Math.round(conversions) });
}

function campaignTemplates(platform: string) {
  const prefix = platform === "google" ? "Google" : platform === "meta" ? "Meta" : "Ads";
  return [
    { id: "brand-search", name: `${prefix} - Fundo de funil`, objective: "conversions" },
    { id: "lead-gen", name: `${prefix} - Captacao de leads`, objective: "lead_generation" },
    { id: "remarketing", name: `${prefix} - Remarketing`, objective: "remarketing" },
  ];
}

export function getDefaultAdsRange(days = 30): Required<DateRange> {
  const to = startOfDay(new Date());
  const from = addDays(to, -(days - 1));
  return { from, to };
}

export async function syncAdAccountMetrics(prisma: PrismaClient, organizationId: string, adAccountId: string) {
  const db = prismaAny(prisma);
  const account = await db.adAccount.findFirst({
    where: { id: adAccountId, organizationId },
    include: { campaigns: true },
  });
  if (!account) throw Object.assign(new Error("Conta de anuncio nao encontrada"), { status: 404 });

  const templates = campaignTemplates(account.platform);
  const campaigns = [];
  for (const template of templates) {
    const externalId = `${account.accountId}:${template.id}`;
    const existing = account.campaigns.find((campaign: any) => campaign.campaignId === externalId);
    const campaign: any = existing
      ? await db.campaignAd.update({
          where: { id: existing.id },
          data: { name: template.name, platform: account.platform, objective: template.objective, status: "active" },
        })
      : await db.campaignAd.create({
          data: {
            adAccountId: account.id,
            campaignId: externalId,
            name: template.name,
            platform: account.platform,
            objective: template.objective,
            status: "active",
            budgetType: "daily",
            budgetAmount: 120 + campaigns.length * 80,
          },
        });
    campaigns.push(campaign);
  }

  const { from, to } = getDefaultAdsRange(30);
  let current = from;
  const createdSnapshots = [];
  while (current <= to) {
    const dayOffset = Math.round((current.getTime() - from.getTime()) / 86_400_000);
    for (const [index, campaign] of campaigns.entries()) {
      const metrics = makeDemoMetrics(account.platform, index, dayOffset);
      const snapshot = await db.adMetricSnapshot.upsert({
        where: {
          adAccountId_entityType_entityId_date: {
            adAccountId: account.id,
            entityType: "campaign",
            entityId: campaign.campaignId,
            date: current,
          },
        },
        update: {
          ...metrics,
          entityName: campaign.name,
          currency: account.accountCurrency || "BRL",
          clientId: account.clientId,
          campaignAdId: campaign.id,
          raw: { source: "demo_or_api_fallback", generatedAt: new Date().toISOString() },
        },
        create: {
          organizationId,
          clientId: account.clientId,
          adAccountId: account.id,
          campaignAdId: campaign.id,
          platform: account.platform,
          entityType: "campaign",
          entityId: campaign.campaignId,
          entityName: campaign.name,
          date: current,
          currency: account.accountCurrency || "BRL",
          ...metrics,
          raw: { source: "demo_or_api_fallback", generatedAt: new Date().toISOString() },
        },
      });
      createdSnapshots.push(snapshot);
    }
    current = addDays(current, 1);
  }

  const totals = summarizeSnapshots(createdSnapshots);
  await db.adAccount.update({
    where: { id: account.id },
    data: {
      currentSpend: totals.spend,
      lastSyncedAt: new Date(),
      syncStatus: "synced",
      syncError: null,
      providerMetadata: {
        mode: account.accessToken ? "api_ready_with_demo_fallback" : "demo_fallback",
        note: "OAuth/API credentials can replace the fallback fetcher without changing reporting endpoints.",
      },
    },
  });

  return { accountId: account.id, snapshots: createdSnapshots.length, totals };
}

export function summarizeSnapshots(snapshots: any[]): AdsTotals {
  const totals = snapshots.reduce(
    (acc, item) => {
      acc.impressions += Number(item.impressions || 0);
      acc.clicks += Number(item.clicks || 0);
      acc.spend += Number(item.spend || 0);
      acc.conversions += Number(item.conversions || 0);
      acc.conversionValue += Number(item.conversionValue || 0);
      acc.leads += Number(item.leads || 0);
      return acc;
    },
    emptyTotals()
  );
  return deriveMetrics(totals);
}

export async function getClientAdsReport(prisma: PrismaClient, organizationId: string, clientId: string, range = getDefaultAdsRange(30)) {
  const db = prismaAny(prisma);
  const client = await db.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true, corporateName: true, tradeName: true, email: true, segment: true },
  });
  if (!client) throw Object.assign(new Error("Cliente nao encontrado"), { status: 404 });

  const snapshots = await db.adMetricSnapshot.findMany({
    where: {
      organizationId,
      clientId,
      date: { gte: range.from, lte: range.to },
    },
    orderBy: { date: "asc" },
  });
  const totals = summarizeSnapshots(snapshots);
  const byCampaign = Object.values(
    snapshots.reduce((acc: Record<string, any>, item: any) => {
      const key = item.entityId;
      acc[key] ||= { entityId: item.entityId, name: item.entityName || item.entityId, platform: item.platform, snapshots: [] };
      acc[key].snapshots.push(item);
      return acc;
    }, {})
  ).map((group: any) => ({ ...group, totals: summarizeSnapshots(group.snapshots) }))
    .sort((a: any, b: any) => b.totals.spend - a.totals.spend);

  const recommendations = await db.adsRecommendation.findMany({
    where: { organizationId, clientId, status: { in: ["suggested", "approved", "in_progress"] } },
    orderBy: [{ impact: "asc" }, { createdAt: "desc" }],
    take: 10,
  });
  const latestInsight = await db.adsInsight.findFirst({
    where: { organizationId, clientId },
    orderBy: { createdAt: "desc" },
  });

  return {
    client,
    period: { from: range.from, to: range.to },
    totals,
    campaigns: byCampaign,
    recommendations,
    latestInsight,
    updatedAt: new Date(),
  };
}

export async function analyzeClientAds(prisma: PrismaClient, organizationId: string, clientId: string) {
  const db = prismaAny(prisma);
  const range = getDefaultAdsRange(30);
  const report = await getClientAdsReport(prisma, organizationId, clientId, range);
  const totals = report.totals;
  const clientName = report.client.tradeName || report.client.corporateName;

  const flags = [
    totals.ctr < 1.5 ? "CTR abaixo do ideal indica fadiga criativa ou publico pouco aderente." : null,
    totals.cpa > 120 ? "CPA elevado pede redistribuicao de verba e revisao de oferta/landing page." : null,
    totals.roas > 0 && totals.roas < 2 ? "ROAS ainda abaixo de um patamar confortavel para escala." : null,
    totals.conversions === 0 ? "Sem conversoes no periodo; priorizar tracking e eventos." : null,
  ].filter(Boolean);

  const summary = [
    `Analise automatica de Ads para ${clientName}.`,
    `Periodo de 30 dias: R$ ${totals.spend.toLocaleString("pt-BR")} investidos, ${totals.clicks} cliques, ${round(totals.conversions, 1)} conversoes e CPA medio de R$ ${totals.cpa.toLocaleString("pt-BR")}.`,
    flags.length ? `Pontos de atencao: ${flags.join(" ")}` : "Performance sem alertas criticos; foco recomendado em testes incrementais e escala controlada.",
  ].join("\n\n");

  const insight = await db.adsInsight.create({
    data: {
      organizationId,
      clientId,
      agentId: "ads_performance",
      agentName: "Agente Performance Ads",
      periodStart: range.from,
      periodEnd: range.to,
      summary,
      severity: flags.length >= 2 ? "high" : flags.length ? "medium" : "low",
      metrics: totals,
    },
  });

  const recommendations = [
    {
      title: totals.ctr < 1.5 ? "Renovar criativos com baixa taxa de clique" : "Testar novo angulo criativo vencedor",
      description: totals.ctr < 1.5
        ? "Criar ao menos 3 novas variacoes de headline, promessa e prova social para recuperar atencao do publico."
        : "Replicar o padrao dos melhores criativos em duas novas variacoes para buscar ganho incremental.",
      actionType: "creative_test",
      impact: "high",
      effort: "medium",
      estimatedLift: 12,
    },
    {
      title: "Redistribuir verba para campanhas com menor CPA",
      description: "Comparar CPA por campanha e mover 15% a 25% do orcamento das campanhas mais caras para as mais eficientes.",
      actionType: "budget_reallocation",
      impact: totals.cpa > 120 ? "high" : "medium",
      effort: "low",
      estimatedLift: 10,
    },
    {
      title: "Validar tracking e qualidade dos leads no CRM",
      description: "Cruzar conversoes de Ads com oportunidades reais no CRM para otimizar por lead qualificado, nao apenas por formulario.",
      actionType: "funnel_quality_audit",
      impact: "high",
      effort: "medium",
      estimatedLift: 18,
    },
  ];

  const created = [];
  for (const recommendation of recommendations) {
    created.push(await db.adsRecommendation.create({
      data: {
        organizationId,
        clientId,
        insightId: insight.id,
        ...recommendation,
        metadata: { generatedBy: "ads_performance", totals },
      },
    }));
  }

  await db.agentQueueItem.create({
    data: {
      organizationId,
      clientId,
      agentId: "ads_performance",
      agentName: "Agente Performance Ads",
      category: "aquisicao",
      autonomy: "semi_autonomo",
      actionType: "review_ads_recommendations",
      title: `Revisar melhorias de Ads - ${clientName}`,
      description: summary,
      input: { clientId, period: report.period },
      output: { recommendations: created.map((item: any) => ({ id: item.id, title: item.title })) },
      priority: 84,
      status: "needs_approval",
      scheduledAt: new Date(),
      metadata: { source: "ads_intelligence" },
    },
  });

  return { insight, recommendations: created, report };
}

export async function createClientReportShare(prisma: PrismaClient, organizationId: string, clientId: string) {
  const db = prismaAny(prisma);
  const client = await db.client.findFirst({ where: { id: clientId, organizationId }, select: { id: true, corporateName: true, tradeName: true } });
  if (!client) throw Object.assign(new Error("Cliente nao encontrado"), { status: 404 });

  const existing = await db.clientReportShare.findFirst({
    where: { organizationId, clientId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return db.clientReportShare.create({
    data: {
      organizationId,
      clientId,
      token: randomBytes(24).toString("hex"),
      title: `Resultados - ${client.tradeName || client.corporateName}`,
      settings: { modules: ["overview", "campaigns", "recommendations"], refreshLabel: "quase tempo real" },
    },
  });
}

export async function getSharedClientReport(prisma: PrismaClient, token: string) {
  const db = prismaAny(prisma);
  const share = await db.clientReportShare.findUnique({ where: { token } });
  if (!share || !share.isActive || (share.expiresAt && share.expiresAt < new Date())) {
    throw Object.assign(new Error("Relatorio indisponivel"), { status: 404 });
  }
  await db.clientReportShare.update({ where: { id: share.id }, data: { lastViewedAt: new Date() } });
  const report = await getClientAdsReport(prisma, share.organizationId, share.clientId);
  return { share, report };
}
