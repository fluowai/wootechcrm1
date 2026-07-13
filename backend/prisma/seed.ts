import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed WooTech CRM...\n");

  // ==================== PLANOS ====================
  console.log("📋 Criando planos...");

  const plans = [
    {
      name: "Free",
      slug: "free",
      description: "Plano gratuito para começar",
      priceMonthly: 0,
      priceYearly: 0,
      isPublic: true,
      maxUsers: 1,
      maxContacts: 100,
      maxDeals: 50,
      maxPipelines: 1,
      maxAutomations: 2,
      maxLandingPages: 1,
      maxInboxes: 1,
      maxMessages: 500,
      maxAIRequests: 10,
      features: {
        whiteLabel: false,
        apiAccess: false,
        customDomain: false,
        advancedReports: false,
        phoneIntegration: false,
        webhooks: false,
      },
    },
    {
      name: "Starter",
      slug: "starter",
      description: "Para negócios em crescimento",
      priceMonthly: 97,
      priceYearly: 970,
      isPublic: true,
      maxUsers: 3,
      maxContacts: 1000,
      maxDeals: 500,
      maxPipelines: 3,
      maxAutomations: 10,
      maxLandingPages: 5,
      maxInboxes: 2,
      maxMessages: 5000,
      maxAIRequests: 100,
      features: {
        whiteLabel: false,
        apiAccess: false,
        customDomain: false,
        advancedReports: false,
        phoneIntegration: false,
        webhooks: true,
      },
    },
    {
      name: "Pro",
      slug: "pro",
      description: "Para times comerciais profissionais",
      priceMonthly: 197,
      priceYearly: 1970,
      isPublic: true,
      maxUsers: 10,
      maxContacts: 10000,
      maxDeals: 5000,
      maxPipelines: 10,
      maxAutomations: 50,
      maxLandingPages: 20,
      maxInboxes: 5,
      maxMessages: 50000,
      maxAIRequests: 500,
      features: {
        whiteLabel: false,
        apiAccess: true,
        customDomain: true,
        advancedReports: true,
        phoneIntegration: false,
        webhooks: true,
      },
    },
    {
      name: "Performance",
      slug: "performance",
      description: "Para empresas de alta performance comercial",
      priceMonthly: 397,
      priceYearly: 3970,
      isPublic: true,
      maxUsers: 25,
      maxContacts: 50000,
      maxDeals: 25000,
      maxPipelines: 25,
      maxAutomations: 200,
      maxLandingPages: 50,
      maxInboxes: 10,
      maxMessages: 200000,
      maxAIRequests: 2000,
      features: {
        whiteLabel: false,
        apiAccess: true,
        customDomain: true,
        advancedReports: true,
        phoneIntegration: true,
        webhooks: true,
      },
    },
    {
      name: "Scale",
      slug: "scale",
      description: "Para operações de escala",
      priceMonthly: 697,
      priceYearly: 6970,
      isPublic: true,
      maxUsers: 50,
      maxContacts: 200000,
      maxDeals: 100000,
      maxPipelines: 50,
      maxAutomations: 500,
      maxLandingPages: 100,
      maxInboxes: 25,
      maxMessages: 500000,
      maxAIRequests: 5000,
      features: {
        whiteLabel: false,
        apiAccess: true,
        customDomain: true,
        advancedReports: true,
        phoneIntegration: true,
        webhooks: true,
      },
    },
    {
      name: "White-Label",
      slug: "white-label",
      description: "Para agências e revendedores",
      priceMonthly: 997,
      priceYearly: 9970,
      isPublic: true,
      maxUsers: 100,
      maxContacts: 500000,
      maxDeals: 250000,
      maxPipelines: 100,
      maxAutomations: 1000,
      maxLandingPages: 500,
      maxInboxes: 50,
      maxMessages: 1000000,
      maxAIRequests: 10000,
      features: {
        whiteLabel: true,
        apiAccess: true,
        customDomain: true,
        advancedReports: true,
        phoneIntegration: true,
        webhooks: true,
      },
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "Para grandes operações e franquias",
      priceMonthly: null,
      priceYearly: null,
      isPublic: false,
      maxUsers: 9999,
      maxContacts: 9999999,
      maxDeals: 9999999,
      maxPipelines: 9999,
      maxAutomations: 9999,
      maxLandingPages: 9999,
      maxInboxes: 9999,
      maxMessages: 9999999,
      maxAIRequests: 99999,
      features: {
        whiteLabel: true,
        apiAccess: true,
        customDomain: true,
        advancedReports: true,
        phoneIntegration: true,
        webhooks: true,
        dedicatedSupport: true,
        sla: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
    console.log(`  ✅ Plano: ${plan.name}`);
  }

  // ==================== MÓDULOS E FEATURES ====================
  console.log("\n📦 Criando módulos e features...");

  const modules = [
    {
      key: "dashboard",
      name: "Dashboard",
      category: "core",
      features: ["dashboard.view", "dashboard.ceo", "dashboard.manager", "dashboard.seller"],
    },
    {
      key: "crm",
      name: "CRM",
      category: "core",
      features: [
        "crm.view", "crm.create_lead", "crm.edit_lead", "crm.delete_lead",
        "crm.manage_boards", "crm.export", "crm.import", "crm.custom_fields",
      ],
    },
    {
      key: "companies",
      name: "Empresas",
      category: "core",
      features: ["companies.view", "companies.create", "companies.edit", "companies.delete", "companies.export"],
    },
    {
      key: "deals",
      name: "Negócios",
      category: "core",
      features: [
        "deals.view", "deals.create", "deals.edit", "deals.delete",
        "deals.move_stage", "deals.win", "deals.lose", "deals.export",
      ],
    },
    {
      key: "tasks",
      name: "Tarefas",
      category: "core",
      features: ["tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign"],
    },
    {
      key: "proposals",
      name: "Propostas",
      category: "commercial",
      features: ["proposals.view", "proposals.create", "proposals.edit", "proposals.send", "proposals.delete"],
    },
    {
      key: "conversations",
      name: "Conversas",
      category: "omnichannel",
      features: ["conversations.view", "conversations.reply", "conversations.assign", "conversations.close"],
    },
    {
      key: "automations",
      name: "Automações",
      category: "automation",
      features: ["automations.view", "automations.create", "automations.edit", "automations.delete", "automations.execute"],
    },
    {
      key: "ai",
      name: "Inteligência Artificial",
      category: "ai",
      features: ["ai.sdr", "ai.bdr", "ai.closer", "ai.support", "ai.auditor", "ai.whatsapp_assistant"],
    },
    {
      key: "landing_pages",
      name: "Landing Pages",
      category: "marketing",
      features: ["landing_pages.view", "landing_pages.create", "landing_pages.edit", "landing_pages.publish"],
    },
    {
      key: "reports",
      name: "Relatórios",
      category: "analytics",
      features: ["reports.view", "reports.export", "reports.forecast"],
    },
    {
      key: "settings",
      name: "Configurações",
      category: "admin",
      features: ["settings.view", "settings.edit", "settings.billing", "settings.integrations"],
    },
    {
      key: "white_label",
      name: "White-Label",
      category: "agency",
      features: ["white_label.branding", "white_label.clients", "white_label.plans", "white_label.billing"],
    },
  ];

  for (const mod of modules) {
    await prisma.module.upsert({
      where: { key: mod.key },
      update: { name: mod.name, category: mod.category },
      create: { key: mod.key, name: mod.name, category: mod.category },
    });

    for (const featureKey of mod.features) {
      await prisma.feature.upsert({
        where: { key: featureKey },
        update: { name: featureKey, moduleKey: mod.key },
        create: { key: featureKey, name: featureKey, moduleKey: mod.key },
      });
    }
    console.log(`  ✅ Módulo: ${mod.name} (${mod.features.length} features)`);
  }

  // ==================== SUPER ADMIN ====================
  console.log("\n👤 Criando Super Admin...");

  const adminEmail = "admin@nexus360.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 12) {
      throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 characters");
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const org = await prisma.organization.upsert({
      where: { slug: "nexus360-platform" },
      update: {},
      create: {
        name: "WooTech CRM Platform",
        slug: "nexus360-platform",
        plan: "Enterprise",
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Super Admin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        organizationId: org.id,
        status: "ACTIVE",
      },
    });
    console.log(`  ✅ Super Admin criado: ${adminEmail}`);
  } else {
    console.log(`  ℹ️ Super Admin já existe: ${adminEmail}`);
  }

  // ==================== SYSTEM SETTINGS ====================
  console.log("\n⚙️ Configurações do sistema...");

  await prisma.systemSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      crmPublic: true,
      salesMachinePublic: true,
      agentBuilderPublic: false,
    },
  });
  console.log("  ✅ SystemSettings global criado");

  // ==================== FEATURE FLAGS ====================
  console.log("\n🚩 Feature Flags...");

  const flags = [
    { key: "omnichannel", description: "Central de atendimento omnichannel", isEnabled: false },
    { key: "ai_agents", description: "Agentes de IA comercial", isEnabled: false },
    { key: "phone_virtual", description: "Telefone virtual inteligente", isEnabled: false },
    { key: "landing_builder", description: "Builder visual de landing pages", isEnabled: true },
    { key: "white_label", description: "Modo white-label para agências", isEnabled: false },
    { key: "api_public", description: "API pública REST", isEnabled: false },
    { key: "webhooks", description: "Webhooks de eventos", isEnabled: false },
    { key: "forecast", description: "Previsão de receita (Forecast)", isEnabled: false },
    { key: "acp_method", description: "Método ACP - Arquitetura de Crescimento Previsível", isEnabled: false },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { description: flag.description },
      create: flag,
    });
    console.log(`  ✅ Flag: ${flag.key} (${flag.isEnabled ? "ON" : "OFF"})`);
  }

  console.log("\n✨ Seed concluído com sucesso!\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
