import { PrismaClient } from "@prisma/client";
import { syncAdAccountMetrics } from "./adsIntelligence.js";

type AutopilotInput = {
  organizationId: string;
  userId?: string | null;
  clientId?: string | null;
  objective: string;
  niche?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  budget?: number | null;
  requestedLimit?: number | null;
  publishLanding?: boolean;
  autonomy?: "assisted" | "semi_autonomous" | "autonomous";
};

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "nexus-autopilot";
}

async function uniqueLandingSlug(prisma: PrismaClient, base: string) {
  let slug = slugify(base);
  let attempt = 1;
  while (await prisma.landingPage.findUnique({ where: { slug }, select: { id: true } })) {
    attempt += 1;
    slug = `${slugify(base)}-${attempt}`;
  }
  return slug;
}

function compact(value?: string | null, fallback = "Nao informado") {
  return String(value || "").trim() || fallback;
}

function buildLandingSections(input: AutopilotInput, offerName: string) {
  const niche = compact(input.niche, "empresas em crescimento");
  const city = compact(input.city, "sua regiao");
  return [
    {
      type: "HeroBlock",
      props: {
        headline: `${offerName} para ${niche}`,
        subheadline: `Uma estrutura comercial para captar, qualificar e converter oportunidades em ${city} com acompanhamento consultivo.`,
        ctaText: "Quero uma avaliacao",
        ctaUrl: "#form",
        imageUrl: `https://picsum.photos/seed/${slugify(niche)}/1200/600`,
        alignment: "center",
        visible: true,
      },
    },
    {
      type: "ProblemBlock",
      props: {
        title: "Quando crescimento depende de improviso, o time perde velocidade.",
        description: "A maioria das empresas perde oportunidades por falta de processo, follow-up lento, campanhas sem pagina dedicada e ausencia de rotina clara para SDR e closer.",
        visible: true,
      },
    },
    {
      type: "SolutionBlock",
      props: {
        title: "Uma operacao comercial montada de ponta a ponta.",
        description: "Criamos captacao, pagina de conversao, qualificacao, cadencia de abordagem e passagem para fechamento em uma unica rotina mensuravel.",
        visible: true,
      },
    },
    {
      type: "BenefitsBlock",
      props: {
        title: "O que fica pronto",
        items: [
          { icon: "Check", title: "Prospeccao ativa", description: "Lista de leads, abordagem inicial e criterio de qualificacao." },
          { icon: "Check", title: "Landing page", description: "Pagina publicada com formulario e rastreamento do lead." },
          { icon: "Check", title: "Rotina comercial", description: "Tarefas de BDR, SDR, closer e follow-up para manter a execucao rodando." },
        ],
        visible: true,
      },
    },
    {
      type: "FAQBlock",
      props: {
        title: "Perguntas frequentes",
        items: [
          { question: "Preciso ter um time comercial grande?", answer: "Nao. O processo foi pensado para comecar enxuto e ganhar volume conforme os dados aparecem." },
          { question: "A pagina ja capta leads?", answer: "Sim. O formulario cria lead no Nexus e pode acionar automacoes internas." },
        ],
        visible: true,
      },
    },
    {
      type: "FormBlock",
      props: {
        title: "Solicite contato",
        description: "Preencha os dados para iniciar a avaliacao comercial.",
        buttonText: "Enviar",
        fields: ["nome", "telefone", "email", "mensagem"],
        visible: true,
      },
    },
  ];
}

function buildProspectingStages(objective: string) {
  return [
    {
      name: "BDR - localizar decisor",
      order: 1,
      agentKey: "bdr-autopilot",
      agentName: "BDR Autopilot",
      goal: "Encontrar contatos com aderencia ao ICP e identificar o decisor comercial.",
      prompt: `Localize empresas aderentes ao objetivo: ${objective}. Priorize decisores, telefone/WhatsApp e sinais de necessidade comercial.`,
      nextAction: "sdr_qualify",
      maxMessages: 1,
    },
    {
      name: "SDR - qualificar interesse",
      order: 2,
      agentKey: "sdr-agent",
      agentName: "SDR IA",
      goal: "Conduzir conversa curta, validar dor, identificar responsavel e pedir handoff quando houver interesse real.",
      prompt: "Responda em ate 3 linhas, uma pergunta por vez, sem prometer resultado e sem forcar reuniao.",
      nextAction: "closer_handoff",
      maxMessages: 4,
    },
    {
      name: "Closer - converter oportunidade",
      order: 3,
      agentKey: "closer-autopilot",
      agentName: "Closer Autopilot",
      goal: "Preparar contexto, proposta e proximos passos para fechamento humano ou assistido.",
      prompt: "Organize resumo executivo, dores, objeções, proxima acao e proposta consultiva.",
      nextAction: "human_or_contract",
      maxMessages: 2,
      isHumanHandoff: true,
    },
  ];
}

export async function runAutonomousOperatingCycle(prisma: PrismaClient, input: AutopilotInput) {
  const objective = compact(input.objective, "Gerar novas oportunidades comerciais");
  const niche = compact(input.niche, "empresas B2B");
  const location = [input.city, input.state].map((item) => compact(item, "")).filter(Boolean).join(" - ") || "Brasil";
  const budget = Math.max(0, Number(input.budget || 0));
  const requestedLimit = Math.min(500, Math.max(10, Number(input.requestedLimit || 100)));

  const client = input.clientId
    ? await prisma.client.findFirst({
        where: { id: input.clientId, organizationId: input.organizationId },
        select: { id: true, corporateName: true, tradeName: true, segment: true },
      })
    : null;
  if (input.clientId && !client) {
    throw Object.assign(new Error("Cliente invalido para esta organizacao."), { status: 400 });
  }

  const missionName = `Autopilot - ${niche} - ${new Date().toLocaleDateString("pt-BR")}`;
  const campaignName = `Campanha Autonoma - ${niche}`;

  const project = await prisma.project.create({
    data: {
      title: missionName,
      description: [
        `Objetivo: ${objective}`,
        `Nicho: ${niche}`,
        `Regiao: ${location}`,
        client ? `Cliente: ${client.tradeName || client.corporateName}` : null,
        `Autonomia: ${input.autonomy || "semi_autonomous"}`,
      ].filter(Boolean).join("\n"),
      status: "planejamento",
      deadline: addDays(30),
      clientId: client?.id || null,
      organizationId: input.organizationId,
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      name: campaignName,
      description: `Campanha criada pelo Nexus Autopilot para: ${objective}`,
      type: "autopilot_acquisition",
      status: "planejamento",
      startDate: new Date(),
      endDate: addDays(30),
      budget,
      utmSource: "nexus",
      utmMedium: "autopilot",
      utmCampaign: slugify(campaignName),
      organizationId: input.organizationId,
    },
  });

  const landingSlug = await uniqueLandingSlug(prisma, campaignName);
  const landingSections = buildLandingSections(input, campaignName);
  const landingPage = await prisma.landingPage.create({
    data: {
      name: campaignName,
      slug: landingSlug,
      organizationId: input.organizationId,
      status: input.publishLanding ? "published" : "draft",
      publishedAt: input.publishLanding ? new Date() : null,
      metaTitle: `${campaignName} | Nexus`,
      metaDescription: `Pagina de captacao para ${niche} em ${location}.`,
      headline: `${campaignName} para ${niche}`,
      heroImage: `https://picsum.photos/seed/${slugify(niche)}/1200/600`,
      sections: landingSections,
      wizardData: {
        objective,
        niche,
        city: input.city,
        state: input.state,
        country: input.country || "Brasil",
        clientId: client?.id || null,
      },
      theme: {
        primaryColor: "#2563eb",
        secondaryColor: "#0f172a",
        fontFamily: "Inter",
      },
      tracking: {
        source: "nexus_autopilot",
        campaignId: campaign.id,
      },
    },
  });

  const leadSource = await prisma.leadCaptureSource.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId || null,
      provider: "nexus_autopilot",
      query: `${niche} ${location}`,
      niche,
      keyword: niche,
      city: input.city || null,
      state: input.state || null,
      country: input.country || "Brasil",
      requestedLimit,
      status: "processing",
      rawRequest: {
        objective,
        campaignId: campaign.id,
        landingPageId: landingPage.id,
        autonomy: input.autonomy || "semi_autonomous",
      },
    },
  });

  const existingFunnel = await prisma.prospectingFunnel.findFirst({
    where: { organizationId: input.organizationId, name: `Funil Autopilot - ${niche}` },
    include: { stages: true },
  });
  const funnel = existingFunnel || await prisma.prospectingFunnel.create({
    data: {
      organizationId: input.organizationId,
      name: `Funil Autopilot - ${niche}`,
      description: `Funil autonomo criado para: ${objective}`,
      channel: "WHATSAPP",
      status: "active",
      objective,
      qualificationRules: {
        minScore: 60,
        requiredSignals: ["decisor", "dor comercial", "abertura para conversa"],
      },
      handoffRules: {
        humanRequiredWhen: ["pede preco", "quer reuniao", "manda proposta", "tem objecao juridica"],
      },
      safetyRules: {
        neverPromiseResults: true,
        requireHumanForContract: true,
      },
      stages: { create: buildProspectingStages(objective) },
    },
    include: { stages: true },
  });

  const taskPayloads = [
    ["BDR: revisar fonte de leads", `Validar busca "${leadSource.query}" e importar leads aderentes ao ICP.`, "alta", 1],
    ["SDR: ativar abordagem inicial", "Conferir mensagem, horarios comerciais, opt-out e handoff antes do disparo.", "alta", 2],
    ["Closer: preparar roteiro de fechamento", "Criar roteiro consultivo, perguntas de diagnostico e proximos passos para oportunidades qualificadas.", "alta", 3],
    ["Marketing: revisar landing page", `Validar pagina /lp/${landingSlug}, CTA, formulario e UTM antes de escalar trafego.`, "media", 2],
    ["Trafego: configurar BM e campanha", "Conectar conta de anuncio, pixel, publico, verba diaria e criativos antes de publicar midia paga.", "alta", 4],
    ["CS/Ops: rotina de acompanhamento", "Criar checkpoint de 7 dias para revisar leads, conversoes, custo e gargalos de atendimento.", "media", 7],
  ] as const;

  const tasks = [];
  for (const [title, description, priority, days] of taskPayloads) {
    tasks.push(await prisma.task.create({
      data: {
        title,
        description: `${description}\n\nCriado pelo Nexus Autopilot.\nProjeto: ${project.title}`,
        status: "pendente",
        priority,
        dueDate: addDays(days),
        projectId: project.id,
        organizationId: input.organizationId,
      },
    }));
  }

  const automations = [];
  const landingAutomationName = `Autopilot - tratar leads da ${campaignName}`;
  const existingAutomation = await prisma.automation.findFirst({
    where: { organizationId: input.organizationId, name: landingAutomationName },
  });
  if (!existingAutomation) {
    automations.push(await prisma.automation.create({
      data: {
        organizationId: input.organizationId,
        name: landingAutomationName,
        description: "Quando a landing page captar um lead, criar tarefa comercial, oportunidade e notificar o time.",
        triggerType: "landing_page.lead",
        triggerConfig: { landingPageId: landingPage.id, slug: landingPage.slug },
        actions: [
          { type: "create_task", params: { title: "SDR: responder lead da landing page", description: "Contato recebido via Autopilot. Responder rapido, qualificar e atualizar CRM.", priority: "alta", daysAfter: 0 } },
          { type: "create_opportunity", params: {} },
          { type: "notify", params: { title: "Novo lead Autopilot", message: `Lead captado na pagina ${landingPage.name}.` } },
        ],
      },
    }));
  }

  const adAccounts = client
    ? await prisma.adAccount.findMany({ where: { organizationId: input.organizationId, clientId: client.id } })
    : [];
  const requiredHumanActions: string[] = [];
  const bmOperations = [];

  if (client && !adAccounts.length) {
    requiredHumanActions.push("Conectar a BM/conta de anuncio do cliente e validar token/permissoes.");
  }

  for (const account of adAccounts) {
    const tokenExpired = account.tokenExpiry ? account.tokenExpiry.getTime() <= Date.now() : false;
    if (!account.accessToken || tokenExpired || account.accountStatus !== "active") {
      requiredHumanActions.push(`Validar token/permissoes da conta ${account.accountName} (${account.platform}).`);
      continue;
    }

    const synced = await syncAdAccountMetrics(prisma, input.organizationId, account.id).catch((error: any) => ({
      error: error?.message || "Falha ao sincronizar BM",
    }));
    const campaignAd = await prisma.campaignAd.create({
      data: {
        adAccountId: account.id,
        campaignId: `nexus-autopilot:${campaign.id}:${account.id}`,
        name: `${campaign.name} - ${account.platform}`,
        platform: account.platform,
        objective: "lead_generation",
        status: "active",
        budgetType: "daily",
        budgetAmount: budget > 0 ? Math.max(20, Math.round(budget / 30)) : 0,
        startDate: new Date(),
        endDate: addDays(30),
        locations: [input.city, input.state, input.country || "Brasil"].filter(Boolean).join(", "),
        interests: niche,
        conversionEvent: "Lead",
      },
    });
    bmOperations.push({ accountId: account.id, accountName: account.accountName, synced, campaignAd });
  }

  let adsInsight = null;
  if (client && adAccounts.length) {
    adsInsight = await prisma.adsInsight.create({
      data: {
        organizationId: input.organizationId,
        clientId: client.id,
        adAccountId: adAccounts[0].id,
        agentId: "traffic-manager-autopilot",
        agentName: "Traffic Manager Autopilot",
        periodStart: addDays(-7),
        periodEnd: new Date(),
        summary: "Rotina Autopilot criada para revisar BM, verba, tracking e campanhas antes de escalar investimento.",
        severity: "medium",
        status: "open",
        metrics: { source: "autopilot_bootstrap", campaignId: campaign.id },
      },
    });
    await prisma.adsRecommendation.create({
      data: {
        organizationId: input.organizationId,
        clientId: client.id,
        adAccountId: adAccounts[0].id,
        insightId: adsInsight.id,
        title: "Validar estrutura de campanha e eventos antes de escalar",
        description: "Conferir pixel/conversoes, UTMs, pagina de destino, criativos e limite diario da BM.",
        actionType: "bm_quality_check",
        impact: "high",
        effort: "medium",
        metadata: { campaignId: campaign.id, landingPageId: landingPage.id },
      },
    });
  }

  const queueItems = [];
  if (client) {
    for (const agent of [
      ["ceo-autopilot", "CEO Autopilot", "Criar plano de crescimento e priorizar execucao", 96],
      ["bdr-autopilot", "BDR Autopilot", "Captar e enriquecer leads", 90],
      ["sdr-agent", "SDR IA", "Qualificar leads e acionar handoff", 88],
      ["closer-autopilot", "Closer Autopilot", "Preparar fechamento e proposta", 84],
      ["traffic-manager-autopilot", "Gestor de Trafego Autopilot", "Gerenciar BM, campanhas e tracking", 82],
      ["cs-autopilot", "CS Autopilot", "Monitorar onboarding, entrega e risco de churn", 72],
    ] as const) {
      queueItems.push(await prisma.agentQueueItem.create({
        data: {
          organizationId: input.organizationId,
          clientId: client.id,
          agentId: agent[0],
          agentName: agent[1],
          phase: "autopilot",
          category: "operacao_autonoma",
          autonomy: input.autonomy || "semi_autonomous",
          actionType: "autonomous_operating_cycle",
          title: `${agent[1]} - ${missionName}`,
          description: agent[2],
          input: { objective, niche, location, campaignId: campaign.id, landingPageId: landingPage.id, funnelId: funnel.id },
          output: { next: "Aguardando processamento pelo ciclo autonomo" },
          priority: agent[3],
          scheduledAt: new Date(),
          metadata: { source: "nexus_autopilot", projectId: project.id },
        },
      }));
    }
  }

  await prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      title: "Nexus Autopilot iniciou uma operacao",
      message: `Campanha, landing page, funil, fonte de leads e tarefas criadas para: ${objective}`,
      type: "info",
      link: "/autopilot",
    },
  }).catch(() => null);

  await prisma.aiLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId || null,
      agentType: "nexus-autopilot",
      prompt: objective,
      response: `Criados: projeto ${project.id}, campanha ${campaign.id}, landing ${landingPage.id}, funil ${funnel.id}, fonte ${leadSource.id}.`,
      model: "deterministic-autopilot-v1",
      success: true,
    },
  }).catch(() => null);

  return {
    project,
    campaign,
    landingPage: {
      ...landingPage,
      publicPath: `/lp/${landingPage.slug}`,
    },
    leadSource,
    funnel,
    tasks,
    automations,
    queueItems,
    adsInsight,
    summary: {
      objective,
      client: client ? { id: client.id, name: client.tradeName || client.corporateName } : null,
      created: {
        projects: 1,
        campaigns: 1,
        landingPages: 1,
        leadSources: 1,
        funnels: existingFunnel ? 0 : 1,
        tasks: tasks.length,
        automations: automations.length,
        queueItems: queueItems.length,
        adsInsights: adsInsight ? 1 : 0,
      },
      requiredHumanActions,
      bmOperations,
      autonomyRule: "Humano so intervem para conectar BM/contas de anuncio e validar tokens/permissoes. O restante do ciclo e executado pela Nexus.",
    },
  };
}

export async function getAutopilotStatus(prisma: PrismaClient, organizationId: string) {
  const [queue, logs, tasks, pages, campaigns, leadSources] = await Promise.all([
    prisma.agentQueueItem.findMany({
      where: { organizationId, category: "operacao_autonoma" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.aiLog.findMany({
      where: { organizationId, agentType: "nexus-autopilot" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { organizationId, description: { contains: "Nexus Autopilot" } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.landingPage.findMany({
      where: { organizationId, tracking: { path: ["source"], equals: "nexus_autopilot" } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }).catch(() => prisma.landingPage.findMany({
      where: { organizationId, name: { contains: "Campanha Autonoma" } },
      orderBy: { createdAt: "desc" },
      take: 8,
    })),
    prisma.campaign.findMany({
      where: { organizationId, type: "autopilot_acquisition" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.leadCaptureSource.findMany({
      where: { organizationId, provider: "nexus_autopilot" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    queue,
    logs,
    tasks,
    pages,
    campaigns,
    leadSources,
    counts: {
      queue: queue.length,
      logs: logs.length,
      tasks: tasks.length,
      pages: pages.length,
      campaigns: campaigns.length,
      leadSources: leadSources.length,
    },
  };
}
