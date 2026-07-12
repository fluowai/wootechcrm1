import { PrismaClient } from "@prisma/client";

type ExperienceInput = {
  organizationId: string;
  userId?: string | null;
  source?: string;
  answers?: Record<string, any>;
  diagnosis?: Record<string, any> | null;
};

type DefaultBlueprint = {
  slug: string;
  name: string;
  description: string;
  vertical: string;
  modules: string[];
  vocabulary: Record<string, string>;
  focus: string[];
};

const CORE_MODULES = [
  "dashboard",
  "crm",
  "proposals",
  "reports",
  "settings",
  "team",
];

const DEFAULT_BLUEPRINTS: DefaultBlueprint[] = [
  {
    slug: "venda-consultiva",
    name: "Venda Consultiva",
    description: "Consultorias, assessorias, servicos premium e alto ticket.",
    vertical: "consulting",
    modules: ["agenda", "projects", "delivery", "service_catalog", "knowledge_base", "ai", "prompt_architect", "finance", "health_score"],
    vocabulary: { client: "cliente", opportunity: "oportunidade", delivery: "projeto", pipeline: "funil consultivo" },
    focus: ["diagnostico", "propostas personalizadas", "reunioes", "implantacao"],
  },
  {
    slug: "agencia-marketing",
    name: "Agencia e Marketing",
    description: "Agencias, social media, trafego pago, criativos e operacoes de marketing.",
    vertical: "marketing_agency",
    modules: ["ads", "landing_pages", "assets", "projects", "delivery", "service_catalog", "time_tracking", "finance", "health_score", "ai", "prompt_architect", "knowledge_base"],
    vocabulary: { client: "cliente", opportunity: "projeto comercial", delivery: "entrega", pipeline: "funil de aquisicao" },
    focus: ["campanhas", "criativos", "landing pages", "entregas recorrentes"],
  },
  {
    slug: "b2b-comercial",
    name: "B2B Comercial",
    description: "SaaS, industria, distribuidores, representantes e fornecedores B2B.",
    vertical: "b2b_sales",
    modules: ["prospecting", "whatsapp_funnels", "whatsapp", "sales", "agenda", "projects", "delivery", "finance", "health_score", "ai", "knowledge_base"],
    vocabulary: { client: "conta", opportunity: "negocio", delivery: "implantacao", pipeline: "pipeline B2B" },
    focus: ["prospeccao ativa", "qualificacao", "follow-up", "contratos", "implantacao"],
  },
  {
    slug: "servicos-locais",
    name: "Servicos Locais",
    description: "Clinicas, escritorios, prestadores de servico e negocios por agendamento.",
    vertical: "local_services",
    modules: ["whatsapp", "agenda", "google_local", "finance", "health_score", "notifications", "ai", "knowledge_base"],
    vocabulary: { client: "cliente", opportunity: "solicitacao", delivery: "atendimento", pipeline: "fluxo de atendimento" },
    focus: ["agendamento", "orcamento", "execucao", "avaliacao", "recompra"],
  },
  {
    slug: "saude-clinicas",
    name: "Saude e Clinicas",
    description: "Clinicas, consultorios e operacoes com agenda, retorno e relacionamento.",
    vertical: "healthcare",
    modules: ["whatsapp", "agenda", "google_local", "finance", "health_score", "notifications", "ai", "knowledge_base"],
    vocabulary: { client: "paciente", opportunity: "avaliacao", delivery: "consulta", pipeline: "jornada do paciente" },
    focus: ["captacao", "agendamento", "confirmacao", "retorno", "reputacao"],
  },
  {
    slug: "imobiliaria",
    name: "Imobiliaria",
    description: "Imobiliarias, corretores, incorporadoras e vendas com visitas.",
    vertical: "real_estate",
    modules: ["prospecting", "whatsapp", "agenda", "sales", "proposals", "projects", "finance", "ai", "knowledge_base"],
    vocabulary: { client: "interessado", opportunity: "negociacao", delivery: "visita", pipeline: "funil imobiliario" },
    focus: ["captacao", "qualificacao", "visitas", "propostas", "documentacao"],
  },
  {
    slug: "treinamento-educacao",
    name: "Treinamento e Educacao",
    description: "Cursos, escolas livres, mentorias, turmas e treinamentos in company.",
    vertical: "education",
    modules: ["landing_pages", "whatsapp", "agenda", "proposals", "finance", "health_score", "notifications", "ai", "knowledge_base"],
    vocabulary: { client: "aluno", opportunity: "inscricao", delivery: "turma", pipeline: "funil de matricula" },
    focus: ["inscricoes", "turmas", "pagamentos", "pos-curso", "indicacoes"],
  },
  {
    slug: "ecommerce-produtos",
    name: "E-commerce e Produtos",
    description: "Varejo, produtos fisicos, lojas virtuais e operacoes transacionais.",
    vertical: "commerce",
    modules: ["landing_pages", "assets", "whatsapp", "finance", "reports", "notifications", "ai"],
    vocabulary: { client: "cliente", opportunity: "pedido", delivery: "entrega", pipeline: "jornada de compra" },
    focus: ["conversao", "pedidos", "recompra", "campanhas", "atendimento"],
  },
];

function normalizeText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function inferVertical(answers: Record<string, any>, diagnosis?: Record<string, any> | null) {
  const haystack = normalizeText([
    answers.businessType,
    answers.businessDescription,
    answers.businessName,
    answers.targetAudience,
    answers.deliveryProcess,
    answers.biggestProblem,
    answers.painPoints,
    diagnosis?.recommendedTemplate,
    diagnosis?.templateLabel,
  ].filter(Boolean).join(" "));

  if (haystack.match(/clinic|clinica|saude|medic|odont|dent|estet|psicolog|terapia/)) return "healthcare";
  if (haystack.match(/imobili|corret|imovel|incorpor|lote|aluguel|locacao/)) return "real_estate";
  if (haystack.match(/curso|educa|escola|trein|mentoria|aluno|turma/)) return "education";
  if (haystack.match(/agenc|marketing|trafego|social media|criativo|publicidade|conteudo/)) return "marketing_agency";
  if (haystack.match(/saas|software|industr|distrib|represent|b2b|fornecedor|tecnologia/)) return "b2b_sales";
  if (haystack.match(/e-?commerce|loja|varejo|produto|pedido|shop|marketplace/)) return "commerce";
  if (haystack.match(/consult|assessor|advoc|contabil|premium|alto ticket/)) return "consulting";
  if (haystack.match(/servic|local|orcamento|agendamento|manutencao|escritorio/)) return "local_services";

  return "consulting";
}

function blueprintForVertical(vertical: string) {
  return DEFAULT_BLUEPRINTS.find((blueprint) => blueprint.vertical === vertical) || DEFAULT_BLUEPRINTS[0];
}

function buildRecommendedModules(blueprint: DefaultBlueprint, answers: Record<string, any>, diagnosis?: Record<string, any> | null) {
  const modules = new Set([...CORE_MODULES, ...blueprint.modules]);
  const leadChannels = asStringArray(answers.leadChannels).map(normalizeText);
  const recommendedModules = asStringArray(asRecord(answers.rawAnswers).recommendedModules);

  for (const moduleKey of recommendedModules) modules.add(moduleKey);

  if (leadChannels.some((channel) => channel.includes("whatsapp"))) {
    modules.add("whatsapp");
    modules.add("whatsapp_funnels");
  }

  if (answers.needsMeeting) modules.add("agenda");
  if (answers.needsProposal || answers.needsContract) modules.add("proposals");
  if (answers.hasSdr || answers.hasCloser) modules.add("sales");
  if (answers.hasOnboarding || answers.hasChecklist) {
    modules.add("projects");
    modules.add("delivery");
    modules.add("service_catalog");
  }
  if (answers.hasRecurrence || answers.hasPostSales || answers.hasRenewal || answers.hasUpsell) {
    modules.add("health_score");
    modules.add("finance");
  }

  const template = normalizeText(diagnosis?.recommendedTemplate);
  if (template.includes("agencia")) {
    ["ads", "landing_pages", "assets", "projects", "delivery"].forEach((moduleKey) => modules.add(moduleKey));
  }
  if (template.includes("b2b")) {
    ["prospecting", "whatsapp", "agenda", "sales"].forEach((moduleKey) => modules.add(moduleKey));
  }

  return unique(Array.from(modules));
}

function buildExperiencePayload(answers: Record<string, any>, diagnosis?: Record<string, any> | null) {
  const vertical = inferVertical(answers, diagnosis);
  const defaultBlueprint = blueprintForVertical(vertical);
  const moduleKeys = buildRecommendedModules(defaultBlueprint, answers, diagnosis);
  const vocabulary = {
    ...defaultBlueprint.vocabulary,
    product: defaultBlueprint.vertical === "education" ? "curso" : "oferta",
    owner: defaultBlueprint.vertical === "real_estate" ? "corretor" : "responsavel",
  };

  const blueprint = {
    slug: defaultBlueprint.slug,
    vertical,
    label: defaultBlueprint.name,
    summary: diagnosis?.summary || defaultBlueprint.description,
    modules: moduleKeys,
    vocabulary,
    focus: defaultBlueprint.focus,
    recommendedTemplate: diagnosis?.recommendedTemplate || defaultBlueprint.slug,
    generatedAt: new Date().toISOString(),
  };

  return { defaultBlueprint, vertical, moduleKeys, vocabulary, blueprint };
}

export async function ensureDefaultExperienceBlueprints(prisma: PrismaClient) {
  for (const blueprint of DEFAULT_BLUEPRINTS) {
    await prisma.experienceBlueprint.upsert({
      where: { slug: blueprint.slug },
      update: {
        name: blueprint.name,
        description: blueprint.description,
        vertical: blueprint.vertical,
        config: {
          modules: blueprint.modules,
          vocabulary: blueprint.vocabulary,
          focus: blueprint.focus,
        },
        isActive: true,
      },
      create: {
        slug: blueprint.slug,
        name: blueprint.name,
        description: blueprint.description,
        vertical: blueprint.vertical,
        config: {
          modules: blueprint.modules,
          vocabulary: blueprint.vocabulary,
          focus: blueprint.focus,
        },
        isActive: true,
      },
    });
  }
}

export async function provisionExperienceForOrganization(prisma: PrismaClient, input: ExperienceInput) {
  const answers = asRecord(input.answers);
  const diagnosis = input.diagnosis ? asRecord(input.diagnosis) : null;

  await ensureDefaultExperienceBlueprints(prisma);

  const run = await prisma.provisioningRun.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId || null,
      source: input.source || "onboarding",
      status: "running",
      input: { answers, diagnosis } as any,
    },
  });

  try {
    const { defaultBlueprint, vertical, moduleKeys, vocabulary, blueprint } = buildExperiencePayload(answers, diagnosis);
    const template = await prisma.experienceBlueprint.findUnique({ where: { slug: defaultBlueprint.slug } });

    const result = await prisma.$transaction(async (tx) => {
      await tx.organizationModule.updateMany({
        where: {
          organizationId: input.organizationId,
          source: "experience",
          moduleKey: { notIn: moduleKeys },
        },
        data: { isEnabled: false },
      });

      const modules = [];
      for (const moduleKey of moduleKeys) {
        modules.push(await tx.organizationModule.upsert({
          where: {
            organizationId_moduleKey: {
              organizationId: input.organizationId,
              moduleKey,
            },
          },
          update: {
            isEnabled: true,
            source: "experience",
            settings: { vocabulary, vertical } as any,
          },
          create: {
            organizationId: input.organizationId,
            moduleKey,
            source: "experience",
            settings: { vocabulary, vertical } as any,
          },
        }));
      }

      const experience = await tx.organizationExperience.upsert({
        where: { organizationId: input.organizationId },
        update: {
          blueprintId: template?.id || null,
          vertical,
          label: defaultBlueprint.name,
          status: "active",
          source: input.source || "onboarding",
          answers: answers as any,
          blueprint: blueprint as any,
          moduleKeys: moduleKeys as any,
          vocabulary: vocabulary as any,
          appliedAt: new Date(),
        },
        create: {
          organizationId: input.organizationId,
          blueprintId: template?.id || null,
          vertical,
          label: defaultBlueprint.name,
          source: input.source || "onboarding",
          answers: answers as any,
          blueprint: blueprint as any,
          moduleKeys: moduleKeys as any,
          vocabulary: vocabulary as any,
          appliedAt: new Date(),
        },
      });

      const currentOrg = await tx.organization.findUnique({
        where: { id: input.organizationId },
        select: { settings: true },
      });
      const settings = asRecord(currentOrg?.settings);
      await tx.organization.update({
        where: { id: input.organizationId },
        data: {
          businessType: answers.businessType || defaultBlueprint.name,
          businessDescription: answers.businessDescription || answers.deliveryProcess || answers.painPoints || defaultBlueprint.description,
          settings: {
            ...settings,
            onboardingCompleted: true,
            experienceVertical: vertical,
            experienceLabel: defaultBlueprint.name,
            experienceProvisionedAt: new Date().toISOString(),
          } as any,
        },
      });

      return { experience, modules };
    });

    await prisma.provisioningRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        output: blueprint as any,
        createdItems: {
          experienceId: result.experience.id,
          moduleKeys,
          moduleCount: result.modules.length,
        } as any,
        finishedAt: new Date(),
      },
    });

    return {
      runId: run.id,
      experience: result.experience,
      modules: result.modules,
      moduleKeys,
      blueprint,
    };
  } catch (error: any) {
    await prisma.provisioningRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: error?.message || "Falha ao provisionar experiencia",
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function provisionExperienceFromOnboardingResponse(
  prisma: PrismaClient,
  organizationId: string,
  userId?: string | null,
) {
  const response = await prisma.onboardingResponse.findUnique({
    where: { organizationId },
  });
  if (!response) throw new Error("Onboarding nao encontrado para provisionar experiencia.");

  const rawAnswers = asRecord(response.rawAnswers);
  const answers = {
    ...rawAnswers,
    businessName: response.businessName,
    businessType: response.businessType,
    targetAudience: response.targetAudience,
    averageTicket: response.averageTicket,
    salesCycle: response.salesCycle,
    needsMeeting: response.needsMeeting,
    needsProposal: response.needsProposal,
    needsContract: response.needsContract,
    hasRecurrence: response.hasRecurrence,
    leadChannels: response.leadChannels,
    hasSdr: response.hasSdr,
    hasCloser: response.hasCloser,
    hasPostSales: response.hasPostSales,
    painPoints: response.painPoints,
    biggestProblem: response.biggestProblem,
    deliveryProcess: response.deliveryProcess,
    hasOnboarding: response.hasOnboarding,
    hasChecklist: response.hasChecklist,
    hasRenewal: response.hasRenewal,
    hasUpsell: response.hasUpsell,
    rawAnswers,
  };

  return provisionExperienceForOrganization(prisma, {
    organizationId,
    userId,
    source: "onboarding",
    answers,
    diagnosis: response.aiDiagnosis as Record<string, any> | null,
  });
}

export async function getOrganizationExperienceState(prisma: PrismaClient, organizationId: string) {
  const [experience, modules] = await Promise.all([
    prisma.organizationExperience.findUnique({ where: { organizationId } }),
    prisma.organizationModule.findMany({
      where: { organizationId, isEnabled: true },
      orderBy: { moduleKey: "asc" },
    }),
  ]);

  const moduleKeys = modules.map((module) => module.moduleKey);

  return {
    provisioned: Boolean(experience || moduleKeys.length),
    experience,
    modules,
    moduleKeys,
    vocabulary: experience?.vocabulary || null,
  };
}
