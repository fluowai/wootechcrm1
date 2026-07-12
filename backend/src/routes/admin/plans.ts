import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../../middleware/auth.js";

export function adminPlansRoutes(prisma: PrismaClient) {
  const router = Router();

  const toOptionalString = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const toOptionalNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const toOptionalBoolean = (value: unknown) => {
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return undefined;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  };

  const toNumberOrDefault = (value: unknown, fallback: number) => {
    const parsed = toOptionalNumber(value);
    return parsed === undefined ? fallback : parsed;
  };

  const buildPlanUpdateData = (body: any) => {
    const data: Record<string, any> = {};

    const stringFields = ["name", "slug", "description"];
    for (const field of stringFields) {
      const value = toOptionalString(body[field]);
      if (value !== undefined) data[field] = value;
    }

    const numberFields = [
      "priceMonthly",
      "priceYearly",
      "maxUsers",
      "maxClients",
      "maxLeads",
      "maxAutomations",
      "maxReports",
      "maxIntegrations",
      "maxMessages",
      "maxContacts",
      "maxDeals",
      "maxPipelines",
      "maxLandingPages",
      "maxInboxes",
      "maxAIRequests",
    ];

    for (const field of numberFields) {
      const value = toOptionalNumber(body[field]);
      if (value !== undefined) data[field] = value;
    }

    const isActive = toOptionalBoolean(body.isActive);
    const isPublic = toOptionalBoolean(body.isPublic);
    if (isActive !== undefined) data.isActive = isActive;
    if (isPublic !== undefined) data.isPublic = isPublic;

    return data;
  };

  const ensureFeatureCatalog = async () => {
    const modules = [
      { key: "dashboard", name: "Dashboard", category: "Workspace" },
      { key: "reports", name: "Relatorios", category: "Gestao" },
      { key: "prospecting", name: "Captacao de Leads", category: "Comercial" },
      { key: "qualification", name: "Qualificacao de Leads", category: "Comercial" },
      { key: "whatsapp_funnels", name: "Funis IA WhatsApp", category: "Comercial" },
      { key: "whatsapp", name: "WhatsApp", category: "Comercial" },
      { key: "crm", name: "CRM & Pipelines", category: "Comercial" },
      { key: "sales", name: "Sales Machine", category: "Comercial" },
      { key: "proposals", name: "Propostas", category: "Comercial" },
      { key: "google_local", name: "Google Local", category: "Comercial" },
      { key: "projects", name: "Projetos & Demandas", category: "Operacao" },
      { key: "delivery", name: "Entregas & Aprovacoes", category: "Operacao" },
      { key: "service_catalog", name: "Catalogo de Servicos", category: "Operacao" },
      { key: "time_tracking", name: "Apontamento de Horas", category: "Operacao" },
      { key: "ads", name: "Trafego", category: "Marketing" },
      { key: "landing_pages", name: "Landing Pages", category: "Marketing" },
      { key: "assets", name: "Criativos & Assets", category: "Marketing" },
      { key: "content", name: "Conteudo", category: "Marketing" },
      { key: "automations", name: "Automacoes", category: "Automacao" },
      { key: "notifications", name: "Notificacoes", category: "Automacao" },
      { key: "knowledge_base", name: "Base de Conhecimento", category: "Automacao" },
      { key: "ai", name: "Central de Agentes", category: "Inteligencia Artificial" },
      { key: "prompt_architect", name: "Arquiteto de Prompts", category: "Inteligencia Artificial" },
      { key: "finance", name: "Financeiro", category: "Gestao" },
      { key: "health_score", name: "Health Score", category: "Gestao" },
      { key: "agenda", name: "Agenda", category: "Gestao" },
      { key: "team", name: "Equipe e Acessos", category: "Administracao" },
      { key: "clients", name: "Meus Clientes", category: "Administracao" },
      { key: "billing", name: "Assinatura e Uso", category: "Administracao" },
      { key: "settings", name: "Configuracoes", category: "Administracao" },
    ];

    const features = [
      { moduleKey: "dashboard", key: "dashboard.view", name: "Visualizar Dashboard" },
      { moduleKey: "reports", key: "reports.view", name: "Visualizar Relatorios" },
      { moduleKey: "crm", key: "crm.view", name: "Visualizar CRM" },
      { moduleKey: "crm", key: "crm.create_lead", name: "Criar Leads" },
      { moduleKey: "crm", key: "crm.manage_boards", name: "Gerenciar Funis CRM" },
      { moduleKey: "prospecting", key: "prospecting.view", name: "Visualizar Captacao" },
      { moduleKey: "prospecting", key: "prospecting.capture", name: "Captar Leads" },
      { moduleKey: "prospecting", key: "prospecting.enrich", name: "Enriquecer Leads" },
      { moduleKey: "prospecting", key: "prospecting.schedule", name: "Agendar Captacao" },
      { moduleKey: "qualification", key: "qualification.view", name: "Visualizar Qualificacao" },
      { moduleKey: "qualification", key: "qualification.manage", name: "Gerenciar Formularios de Qualificacao" },
      { moduleKey: "whatsapp_funnels", key: "whatsapp_funnels.view", name: "Visualizar Funis IA WhatsApp" },
      { moduleKey: "whatsapp_funnels", key: "whatsapp_funnels.manage", name: "Gerenciar Funis IA WhatsApp" },
      { moduleKey: "whatsapp", key: "whatsapp.view", name: "Visualizar WhatsApp" },
      { moduleKey: "whatsapp", key: "whatsapp.instances", name: "Gerenciar Instancias WhatsApp" },
      { moduleKey: "whatsapp", key: "whatsapp.messages", name: "Visualizar Mensagens WhatsApp" },
      { moduleKey: "google_local", key: "google_local.view", name: "Visualizar Google Local" },
      { moduleKey: "google_local", key: "google_local.manage", name: "Gerenciar Google Local" },
      { moduleKey: "ai", key: "ai.sdr", name: "Agente SDR Automatico" },
      { moduleKey: "ai", key: "ai.agents", name: "Central de Agentes" },
      { moduleKey: "prompt_architect", key: "prompt_architect.view", name: "Visualizar Arquiteto de Prompts" },
      { moduleKey: "automations", key: "automations.view", name: "Visualizar Automacoes" },
      { moduleKey: "automations", key: "automations.create", name: "Criar Automacoes" },
      { moduleKey: "notifications", key: "notifications.view", name: "Visualizar Notificacoes" },
      { moduleKey: "knowledge_base", key: "knowledge_base.view", name: "Visualizar Base de Conhecimento" },
      { moduleKey: "finance", key: "finance.view", name: "Visualizar Financeiro" },
      { moduleKey: "projects", key: "projects.view", name: "Visualizar Projetos" },
      { moduleKey: "delivery", key: "delivery.view", name: "Visualizar Entregas e Aprovacoes" },
      { moduleKey: "service_catalog", key: "service_catalog.view", name: "Visualizar Catalogo de Servicos" },
      { moduleKey: "time_tracking", key: "time_tracking.view", name: "Visualizar Apontamento de Horas" },
      { moduleKey: "ads", key: "ads.view", name: "Visualizar Trafego" },
      { moduleKey: "landing_pages", key: "landing_pages.view", name: "Visualizar Landing Pages" },
      { moduleKey: "assets", key: "assets.view", name: "Visualizar Criativos e Assets" },
      { moduleKey: "content", key: "content.view", name: "Visualizar Conteudo" },
      { moduleKey: "content", key: "content.create", name: "Criar Conteudo" },
      { moduleKey: "sales", key: "sales.view", name: "Visualizar Vendas" },
      { moduleKey: "proposals", key: "proposals.view", name: "Visualizar Propostas" },
      { moduleKey: "health_score", key: "health_score.view", name: "Visualizar Health Score" },
      { moduleKey: "agenda", key: "agenda.calendar", name: "Visualizar Calendario" },
      { moduleKey: "agenda", key: "agenda.tasks", name: "Visualizar Tarefas" },
      { moduleKey: "team", key: "team.view", name: "Visualizar Equipe e Acessos" },
      { moduleKey: "clients", key: "clients.view", name: "Visualizar Meus Clientes" },
      { moduleKey: "billing", key: "billing.view", name: "Visualizar Assinatura e Uso" },
      { moduleKey: "settings", key: "settings.view", name: "Visualizar Configuracoes" },
      { moduleKey: "settings", key: "settings.ai", name: "Configurar IA" },
    ];

    for (const module of modules) {
      await prisma.module.upsert({
        where: { key: module.key },
        update: { name: module.name, category: module.category, isActive: true },
        create: module,
      });
    }

    for (const feature of features) {
      await prisma.feature.upsert({
        where: { key: feature.key },
        update: { name: feature.name, moduleKey: feature.moduleKey, isActive: true },
        create: feature,
      });
    }
  };

  // Middleware de proteção Super Admin
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso restrito ao Super Administrador." });
    }
    next();
  };

  router.use(authenticateToken, requireSuperAdmin);

  // Listar Planos
  router.get("/", async (req, res) => {
    const plans = await prisma.plan.findMany({
      include: { planFeatures: true },
      orderBy: { priceMonthly: "asc" },
    });
    res.json(plans);
  });

  // Criar Plano
  router.post("/", async (req, res) => {
    const { name, slug, description, priceMonthly, priceYearly, ...limits } = req.body;
    try {
      if (!toOptionalString(name)) {
        return res.status(400).json({ error: "Nome do plano e obrigatorio." });
      }

      const plan = await prisma.plan.create({
        data: {
          name,
          slug: toOptionalString(slug) || name.toLowerCase().replace(/ /g, '-'),
          description,
          priceMonthly: toNumberOrDefault(priceMonthly, 0),
          priceYearly: toNumberOrDefault(priceYearly, 0),
          maxUsers: toNumberOrDefault(limits.maxUsers, 5),
          maxClients: toNumberOrDefault(limits.maxClients, 10),
          maxLeads: toNumberOrDefault(limits.maxLeads, 100),
          maxAutomations: toNumberOrDefault(limits.maxAutomations, 5),
          maxReports: toNumberOrDefault(limits.maxReports, 10),
          maxIntegrations: toNumberOrDefault(limits.maxIntegrations, 3),
          maxMessages: toNumberOrDefault(limits.maxMessages, 1000),
          maxContacts: toNumberOrDefault(limits.maxContacts, 1000),
          maxDeals: toNumberOrDefault(limits.maxDeals, 100),
          maxPipelines: toNumberOrDefault(limits.maxPipelines, 3),
          maxLandingPages: toNumberOrDefault(limits.maxLandingPages, 5),
          maxInboxes: toNumberOrDefault(limits.maxInboxes, 1),
          maxAIRequests: toNumberOrDefault(limits.maxAIRequests, 1000),
        }
      });
      res.json(plan);
    } catch (error: any) {
      console.error("[ADMIN_PLAN_CREATE_ERROR]", error?.message || error);
      res.status(500).json({ error: "Erro ao criar plano.", details: error?.message });
    }
  });

  router.post("/:id/duplicate", async (req, res) => {
    try {
      const source = await prisma.plan.findUnique({
        where: { id: req.params.id },
        include: { planFeatures: true },
      });

      if (!source) {
        return res.status(404).json({ error: "Plano nao encontrado." });
      }

      const sourceFeatures = source.features && typeof source.features === "object" && !Array.isArray(source.features)
        ? (source.features as Record<string, any>)
        : {};
      const suffix = Date.now().toString().slice(-6);

      const plan = await prisma.plan.create({
        data: {
          name: `${source.name} Copia`,
          slug: `${source.slug}-copy-${suffix}`,
          description: source.description,
          priceMonthly: source.priceMonthly,
          priceYearly: source.priceYearly,
          isPublic: false,
          isActive: true,
          maxUsers: source.maxUsers,
          maxContacts: source.maxContacts,
          maxDeals: source.maxDeals,
          maxPipelines: source.maxPipelines,
          maxAutomations: source.maxAutomations,
          maxLandingPages: source.maxLandingPages,
          maxInboxes: source.maxInboxes,
          maxMessages: source.maxMessages,
          maxAIRequests: source.maxAIRequests,
          maxLeads: source.maxLeads,
          maxClients: source.maxClients,
          maxReports: source.maxReports,
          maxIntegrations: source.maxIntegrations,
          features: { ...sourceFeatures, duplicatedFromPlanId: source.id },
          planFeatures: {
            create: source.planFeatures.map((feature) => ({
              featureKey: feature.featureKey,
              isEnabled: feature.isEnabled,
              limit: feature.limit,
            })),
          },
        },
        include: { planFeatures: true },
      });

      res.json(plan);
    } catch (error: any) {
      console.error("[ADMIN_PLAN_DUPLICATE_ERROR]", error?.message || error);
      res.status(500).json({ error: "Erro ao duplicar plano.", details: error?.message });
    }
  });

  router.post("/:id/archive", async (req, res) => {
    try {
      const source = await prisma.plan.findUnique({ where: { id: req.params.id } });
      if (!source) return res.status(404).json({ error: "Plano nao encontrado." });

      const sourceFeatures = source.features && typeof source.features === "object" && !Array.isArray(source.features)
        ? (source.features as Record<string, any>)
        : {};
      const plan = await prisma.plan.update({
        where: { id: req.params.id },
        data: {
          isActive: false,
          isPublic: false,
          features: { ...sourceFeatures, archivedAt: new Date().toISOString() },
        },
        include: { planFeatures: true },
      });
      res.json(plan);
    } catch (error: any) {
      console.error("[ADMIN_PLAN_ARCHIVE_ERROR]", error?.message || error);
      res.status(500).json({ error: "Erro ao arquivar plano.", details: error?.message });
    }
  });

  router.post("/:id/activate", async (req, res) => {
    try {
      const plan = await prisma.plan.update({
        where: { id: req.params.id },
        data: { isActive: true },
        include: { planFeatures: true },
      });
      res.json(plan);
    } catch (error: any) {
      console.error("[ADMIN_PLAN_ACTIVATE_ERROR]", error?.message || error);
      res.status(500).json({ error: "Erro ao ativar plano.", details: error?.message });
    }
  });

  // Atualizar Plano
  router.patch("/:id", async (req, res) => {
    try {
      const data = buildPlanUpdateData(req.body);
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Nenhum campo valido enviado para atualizar." });
      }

      const plan = await prisma.plan.update({
        where: { id: req.params.id },
        data
      });
      res.json(plan);
    } catch (error: any) {
      console.error("[ADMIN_PLAN_UPDATE_ERROR]", {
        planId: req.params.id,
        body: req.body,
        message: error?.message,
        code: error?.code,
      });
      res.status(500).json({ error: "Erro ao atualizar plano.", details: error?.message });
    }
  });

  // Gerenciar Features do Plano
  router.post("/:id/features", async (req, res) => {
    const { featureKey, isEnabled, limit } = req.body;
    try {
      const planFeature = await prisma.planFeature.upsert({
        where: {
          planId_featureKey: {
            planId: req.params.id,
            featureKey
          }
        },
        update: { isEnabled, limit },
        create: {
          planId: req.params.id,
          featureKey,
          isEnabled,
          limit
        }
      });
      res.json(planFeature);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar feature do plano." });
    }
  });

  // Listar todas as features disponíveis para a matriz
  router.get("/features-list", async (req, res) => {
    await ensureFeatureCatalog();
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      include: { features: { where: { isActive: true }, orderBy: { name: "asc" } } },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    });
    res.json(modules);
  });

  return router;
}
