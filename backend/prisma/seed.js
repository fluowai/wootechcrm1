import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const plans = [
  {
    name: "Free",
    slug: "free",
    description: "Plano gratuito para comecar",
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
    },
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    description: "Para grandes operacoes e franquias",
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
      dedicatedSupport: true,
    },
  },
];

const modules = [
  {
    key: "dashboard",
    name: "Dashboard",
    category: "core",
    features: ["dashboard.view", "dashboard.ceo", "dashboard.manager"],
  },
  {
    key: "crm",
    name: "CRM",
    category: "core",
    features: ["crm.view", "crm.create_lead", "crm.edit_lead", "crm.delete_lead"],
  },
  {
    key: "tasks",
    name: "Tarefas",
    category: "core",
    features: ["tasks.view", "tasks.create", "tasks.edit", "tasks.delete"],
  },
  {
    key: "proposals",
    name: "Propostas",
    category: "commercial",
    features: ["proposals.view", "proposals.create", "proposals.edit", "proposals.send"],
  },
  {
    key: "landing_pages",
    name: "Landing Pages",
    category: "marketing",
    features: ["landing_pages.view", "landing_pages.create", "landing_pages.publish"],
  },
  {
    key: "reports",
    name: "Relatorios",
    category: "analytics",
    features: ["reports.view", "reports.export"],
  },
  {
    key: "settings",
    name: "Configuracoes",
    category: "admin",
    features: ["settings.view", "settings.edit", "settings.billing"],
  },
  {
    key: "white_label",
    name: "White-Label",
    category: "agency",
    features: ["white_label.branding", "white_label.clients", "white_label.plans"],
  },
];

const featureFlags = [
  { key: "omnichannel", description: "Central de atendimento omnichannel", isEnabled: false },
  { key: "ai_agents", description: "Agentes de IA comercial", isEnabled: false },
  { key: "landing_builder", description: "Builder visual de landing pages", isEnabled: true },
  { key: "white_label", description: "Modo white-label para agencias", isEnabled: false },
  { key: "api_public", description: "API publica REST", isEnabled: false },
  { key: "webhooks", description: "Webhooks de eventos", isEnabled: false },
];

async function main() {
  console.log("Seeding Nexus360 database...");

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

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
  }

  const enterprisePlan = await prisma.plan.findUnique({ where: { slug: "enterprise" } });
  const organization = await prisma.organization.upsert({
    where: { slug: "nexus360-platform" },
    update: {
      plan: "Enterprise",
      planId: enterprisePlan?.id,
      isActive: true,
    },
    create: {
      name: "Nexus360 Platform",
      slug: "nexus360-platform",
      plan: "Enterprise",
      planId: enterprisePlan?.id,
      isActive: true,
      subscriptionStatus: "ACTIVE",
      betaAccess: true,
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@nexus360.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@2024!";
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Super Admin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        organizationId: organization.id,
        status: "ACTIVE",
      },
    });

    console.log(`Created default admin: ${adminEmail}`);
  } else {
    console.log(`Default admin already exists: ${adminEmail}`);
  }

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

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        description: flag.description,
        isEnabled: flag.isEnabled,
      },
      create: flag,
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
