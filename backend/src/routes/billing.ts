import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";
import { verifyHmacSignature, isProduction } from "../utils/security.js";

export function billingRoutes(prisma: PrismaClient) {
  const router = Router();

  // Catálogo público. A página de vendas reflete exatamente os planos
  // publicados pelo Super Admin, sem manter preços duplicados no frontend.
  router.get("/plans", async (_req, res) => {
    try {
      const plans = await prisma.plan.findMany({
        where: { isActive: true, isPublic: true },
        include: {
          planFeatures: {
            where: { isEnabled: true },
            select: { featureKey: true, isEnabled: true, limit: true },
          },
        },
        orderBy: { priceMonthly: "asc" },
      });
      res.json(plans);
    } catch (error) {
      console.error("[PUBLIC_PLANS_ERROR]", error);
      res.status(500).json({ error: "Não foi possível carregar os planos." });
    }
  });

  // Listar faturas da organização
  router.get("/invoices", authenticateToken, async (req: any, res) => {
    const orgId = req.user.orgId;
    const invoices = await prisma.saaSInvoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  });

  // Obter detalhes da assinatura atual
  router.get("/subscription", authenticateToken, async (req: any, res) => {
    const orgId = req.user.orgId;
    const subscription = await prisma.saaSSubscription.findFirst({
      where: { organizationId: orgId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subscription);
  });

  // Iniciar ou Alterar Assinatura (Checkout)
  router.post("/subscribe", authenticateToken, async (req: any, res) => {
    const { planId, cycle } = req.body; // cycle: 'monthly' | 'yearly'
    const orgId = req.user.orgId;

    try {
      if (isProduction()) {
        return res.status(403).json({
          error: "CHECKOUT_PROVIDER_REQUIRED",
          message: "Assinaturas em produção devem ser ativadas pelo provedor de pagamento.",
        });
      }

      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: "Plano não encontrado" });

      // Aqui integraria com Asaas/Stripe para gerar cobrança
      // Por agora, vamos simular a ativação imediata (Modo Demo)
      
      const subscription = await prisma.saaSSubscription.create({
        data: {
          organizationId: orgId,
          planId: planId,
          status: 'ACTIVE',
          price: cycle === 'yearly' ? plan.priceYearly || 0 : plan.priceMonthly || 0,
          billingCycle: cycle.toUpperCase(),
          startDate: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
        }
      });

      // Atualiza a organização
      await prisma.organization.update({
        where: { id: orgId },
        data: { 
          planId: planId,
          plan: plan.name,
          subscriptionStatus: 'ACTIVE'
        }
      });

      res.json({ success: true, subscription });
    } catch (error) {
      res.status(500).json({ error: "Erro ao processar assinatura" });
    }
  });

  // Webhook para integração com Gateway (Ex: Asaas / Stripe)
  router.post("/webhook/:provider", async (req, res) => {
    const { provider } = req.params;
    const event = req.body;
    const secret =
      process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] ||
      process.env.BILLING_WEBHOOK_SECRET;

    if (!secret) {
      return res.status(503).json({ error: "Webhook secret not configured" });
    }

    const signature = req.headers["x-signature"] || req.headers["asaas-signature"];
    const payload = JSON.stringify(event);
    if (!verifyHmacSignature(payload, Array.isArray(signature) ? signature[0] : signature, secret)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    console.log(`[Billing Webhook] Received ${provider} event:`, event.event || event.type);

    try {
      if (provider === 'asaas') {
        const { event: eventType, payment } = event;
        const externalId = payment.subscriptionId || payment.id;

        // Buscar assinatura vinculada ao ID do provedor
        const sub = await prisma.saaSSubscription.findFirst({
          where: { providerSubId: externalId }
        });

        if (sub) {
          let newStatus = sub.status;
          if (eventType === 'PAYMENT_RECEIVED') newStatus = 'ACTIVE';
          if (eventType === 'PAYMENT_OVERDUE') newStatus = 'PAST_DUE';
          
          await prisma.$transaction([
            prisma.saaSSubscription.update({
              where: { id: sub.id },
              data: { status: newStatus }
            }),
            prisma.organization.update({
              where: { id: sub.organizationId },
              data: { subscriptionStatus: newStatus }
            })
          ]);
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[Billing Webhook Error]", error);
      res.status(500).json({ error: "Webhook handling failed" });
    }
  });

  return router;
}
