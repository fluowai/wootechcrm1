import { prisma } from "../lib/prisma.js";

export async function seedSaaSCore() {
  console.log("🌱 Seeding SaaS Core Modules and Features...");

  const modules = [
    { key: "dashboard", name: "Dashboard", category: "Geral" },
    { key: "crm", name: "CRM & Pipelines", category: "Vendas" },
    { key: "prospecting", name: "Prospecção", category: "Vendas" },
    { key: "marketing", name: "Marketing", category: "Growth" },
    { key: "ads", name: "Tráfego Pago (Ads)", category: "Growth" },
    { key: "landing_pages", name: "Landing Pages", category: "Growth" },
    { key: "automations", name: "Automações", category: "Automação" },
    { key: "ai", name: "Inteligência Artificial", category: "IA" },
    { key: "finance", name: "Financeiro", category: "Operação" },
    { key: "projects", name: "Gestão de Projetos", category: "Operação" },
    { key: "white_label", name: "White Label", category: "Admin" },
  ];

  for (const m of modules) {
    await prisma.module.upsert({
      where: { key: m.key },
      update: { name: m.name, category: m.category },
      create: m
    });
  }

  const features = [
    { moduleKey: "crm", key: "crm.view", name: "Visualizar CRM" },
    { moduleKey: "crm", key: "crm.create_lead", name: "Criar Leads" },
    { moduleKey: "crm", key: "crm.export", name: "Exportar Leads (Excel/CSV)" },
    { moduleKey: "crm", key: "crm.manage_boards", name: "Gerenciar Funis" },

    { moduleKey: "prospecting", key: "prospecting.view", name: "Visualizar Captacao" },
    { moduleKey: "prospecting", key: "prospecting.capture", name: "Captar Leads" },
    { moduleKey: "prospecting", key: "prospecting.enrich", name: "Enriquecer Leads" },
    { moduleKey: "prospecting", key: "prospecting.schedule", name: "Agendar Captacao" },
    { moduleKey: "prospecting", key: "prospecting.funnels", name: "Funis IA WhatsApp" },
    
    { moduleKey: "ai", key: "ai.agents", name: "Central de Agentes" },
    { moduleKey: "ai", key: "ai.prompt_architect", name: "Arquiteto de Prompts" },
    { moduleKey: "ai", key: "ai.sdr", name: "Agente SDR Automático" },

    { moduleKey: "white_label", key: "white_label.custom_domain", name: "Domínio Customizado" },
    { moduleKey: "white_label", key: "white_label.remove_brand", name: "Remover Marca Nexus360" },
    
    { moduleKey: "automations", key: "automation.create", name: "Criar Automações" },
    { moduleKey: "automations", key: "automation.webhooks", name: "Webhooks de Saída" },
  ];

  for (const f of features) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, moduleKey: f.moduleKey },
      create: f
    });
  }

  console.log("✅ SaaS Core Seeded!");
}
