import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('nexus360_2024', 10)

  // 1. Criar Planos Sistema
  const plans = [
    {
      name: 'Free',
      slug: 'free',
      priceMonthly: 0,
      maxUsers: 1,
      maxContacts: 50,
      maxDeals: 10,
      maxPipelines: 1,
      maxAutomations: 0,
      maxLandingPages: 0,
      maxInboxes: 1,
      maxMessages: 100,
      maxAIRequests: 0,
    },
    {
      name: 'Starter',
      slug: 'starter',
      priceMonthly: 97,
      maxUsers: 3,
      maxContacts: 500,
      maxDeals: 100,
      maxPipelines: 2,
      maxAutomations: 5,
      maxLandingPages: 1,
      maxInboxes: 1,
      maxMessages: 1000,
      maxAIRequests: 50,
    },
    {
      name: 'Pro',
      slug: 'pro',
      priceMonthly: 297,
      maxUsers: 10,
      maxContacts: 5000,
      maxDeals: 1000,
      maxPipelines: 5,
      maxAutomations: 20,
      maxLandingPages: 10,
      maxInboxes: 5,
      maxMessages: 10000,
      maxAIRequests: 500,
    },
    {
      name: 'Scale',
      slug: 'scale',
      priceMonthly: 997,
      maxUsers: 50,
      maxContacts: 50000,
      maxDeals: 10000,
      maxPipelines: 20,
      maxAutomations: 100,
      maxLandingPages: 50,
      maxInboxes: 20,
      maxMessages: 100000,
      maxAIRequests: 5000,
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })
  }

  // 2. Criar Roles Globais
  const roles = [
    { key: 'SUPER_ADMIN', name: 'Super Administrador', scope: 'PLATFORM', isSystem: true },
    { key: 'AGENCY_ADMIN', name: 'Admin da Agência', scope: 'AGENCY', isSystem: true },
    { key: 'ORG_ADMIN', name: 'Admin da Organização', scope: 'CLIENT', isSystem: true },
    { key: 'SDR', name: 'SDR (Pré-venda)', scope: 'CLIENT', isSystem: true },
    { key: 'BDR', name: 'BDR (Prospecção)', scope: 'CLIENT', isSystem: true },
    { key: 'CLOSER', name: 'Closer (Vendedor)', scope: 'CLIENT', isSystem: true },
    { key: 'SUPPORT', name: 'Suporte', scope: 'CLIENT', isSystem: true },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { organizationId_key: { organizationId: null as any, key: role.key } },
      update: role,
      create: { ...role, organizationId: null as any },
    })
  }

  // 3. Criar Agência Modelo (White-label)
  const agency = await prisma.agency.upsert({
    where: { slug: 'nexus-agency' },
    update: {},
    create: {
      name: 'WooTech Digital Agency',
      slug: 'nexus-agency',
      domain: 'agency.wootech.com.br',
      primaryColor: '#0F172A',
      secondaryColor: '#3B82F6',
    },
  })

  // 4. Criar Super Admin User
  await prisma.user.upsert({
    where: { email: 'admin@wootech.com.br' },
    update: {},
    create: {
      email: 'admin@wootech.com.br',
      name: 'WooTech Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  })

  console.log('Seed comercial finalizado com sucesso! 🚀')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
