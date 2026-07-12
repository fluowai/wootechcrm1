import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { getPaymentProvider } from "../services/paymentProvider.js";
import { buildContractData, generateContractHtml, generateContractNumber } from "../services/contractGenerator.js";
import { AutoContractService } from "../services/autoContract.js";
import { CallIntegrationService } from "../services/callIntegration.js";

export function closingRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/queue", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.id;

      const closerEvents = await prisma.calendarEvent.findMany({
        where: {
          organizationId: orgId,
          userId,
          agenda: { type: "CLOSER" },
          startDate: { lte: new Date() },
          endDate: { gte: new Date(new Date().getTime() - 86400000) },
        },
        include: {
          agenda: true,
        },
        orderBy: { startDate: "desc" },
        take: 20,
      });

      const eventIds = closerEvents.map((e) => e.id);
      const relatedCalendarEvents = await prisma.calendarEvent.findMany({
        where: { id: { in: eventIds }, leadId: { not: null } },
        select: { leadId: true },
      });
      const leadIds = relatedCalendarEvents.map((e) => e.leadId).filter(Boolean) as string[];
      const leadsFromEvents = leadIds.length > 0 ? await prisma.lead.findMany({
        where: { id: { in: leadIds }, organizationId: orgId },
      }) : [];

      const clientsFromQueue = await prisma.client.findMany({
        where: {
          organizationId: orgId,
          assignedToId: userId,
          closerStatus: { in: ["pending_review", "verified", "contract_pending", "contract_signed", "payment_pending"] },
        },
        orderBy: { updatedAt: "desc" },
      });

      const pendingReview = await prisma.client.findMany({
        where: {
          organizationId: orgId,
          closerStatus: "pending",
          assignedToId: null,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: { opportunities: { take: 1, orderBy: { updatedAt: "desc" } } },
      });

      const agendaClients = await Promise.all(
        leadsFromEvents.map(async (lead) => {
          if (lead.clientId) return prisma.client.findUnique({ where: { id: lead.clientId } });
          return null;
        })
      );

      res.json({
        todayEvents: closerEvents,
        assignedQueue: clientsFromQueue,
        unassigned: pendingReview.filter(Boolean),
        agendaClients: agendaClients.filter(Boolean),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/client/:id/review", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const client = await prisma.client.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: {
          opportunities: { orderBy: { updatedAt: "desc" }, take: 5 },
          soldProducts: true,
          contracts: { orderBy: { createdAt: "desc" }, take: 5 },
          leads: { take: 5, orderBy: { createdAt: "desc" } },
          checklistItems: true,
        },
      });
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });

      const serviceCatalog = await prisma.serviceCatalog.findMany({
        where: { organizationId: orgId, isActive: true },
      });

      const contractTemplates = await prisma.contractTemplate.findMany({
        where: { organizationId: orgId, isActive: true },
      });

      res.json({ client, serviceCatalog, contractTemplates });
    } catch (error) {
      next(error);
    }
  });

  router.post("/client/:id/verify", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.id;
      const { checklistItems } = req.body;

      await prisma.client.update({
        where: { id: req.params.id },
        data: { closerStatus: "verified", assignedToId: userId },
      });

      if (Array.isArray(checklistItems)) {
        await prisma.closerChecklistItem.deleteMany({
          where: { clientId: req.params.id, organizationId: orgId },
        });
        await prisma.closerChecklistItem.createMany({
          data: checklistItems.map((item: string) => ({
            clientId: req.params.id,
            organizationId: orgId,
            item,
            checked: true,
            checkedBy: userId,
            checkedAt: new Date(),
          })),
        });
      }

      res.json({ success: true, closerStatus: "verified" });
    } catch (error) {
      next(error);
    }
  });

  router.post("/contract/generate", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { clientId, soldProductId, templateId, customData } = req.body;

      if (!clientId || !templateId) {
        return res.status(400).json({ error: "clientId e templateId são obrigatórios" });
      }

      const [client, template, org] = await Promise.all([
        prisma.client.findFirst({ where: { id: clientId, organizationId: orgId } }),
        prisma.contractTemplate.findFirst({ where: { id: templateId, organizationId: orgId } }),
        prisma.organization.findUnique({ where: { id: orgId } }),
      ]);

      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
      if (!template) return res.status(404).json({ error: "Template não encontrado" });

      let soldProduct = null;
      if (soldProductId) {
        soldProduct = await prisma.soldProduct.findFirst({
          where: { id: soldProductId, clientId },
        });
        if (!soldProduct) return res.status(404).json({ error: "Produto vendido não encontrado" });
      }

      const contractNumber = generateContractNumber();
      const contractData = { ...buildContractData(client, soldProduct, org), ...(customData || {}) };
      const contractHtml = generateContractHtml(template.content, contractData);

      const contract = await prisma.contract.create({
        data: {
          clientId: client.id,
          organizationId: orgId,
          templateId: template.id,
          soldProductId: soldProduct?.id,
          title: `Contrato - ${client.corporateName}`,
          contractNumber,
          status: "draft",
          contractData,
          fileUrl: null,
        },
      });

      await prisma.client.update({
        where: { id: clientId },
        data: { closerStatus: "contract_pending" },
      });

      res.json({ success: true, contract, html: contractHtml });
    } catch (error) {
      next(error);
    }
  });

  router.post("/contract/:id/sign", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { signerName, signerCpf, signerEmail, signatureData } = req.body;

      if (!signatureData) {
        return res.status(400).json({ error: "signatureData (base64) é obrigatório" });
      }

      const contract = await prisma.contract.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!contract) return res.status(404).json({ error: "Contrato não encontrado" });

      const signature = await prisma.contractSignature.create({
        data: {
          contractId: contract.id,
          organizationId: orgId,
          signerName: signerName || "Cliente",
          signerCpf,
          signerEmail,
          signatureData,
          ip: req.ip,
          userAgent: req.headers["user-agent"] || "",
        },
      });

      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: "signed", signedAt: new Date() },
      });

      if (contract.clientId) {
        await prisma.client.update({
          where: { id: contract.clientId },
          data: { closerStatus: "contract_signed" },
        });
      }

      res.json({ success: true, signature });
    } catch (error) {
      next(error);
    }
  });

  router.post("/contract/:id/payment/pix", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { provider } = req.body;

      const contract = await prisma.contract.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { client: true, soldProduct: true },
      });
      if (!contract) return res.status(404).json({ error: "Contrato não encontrado" });

      const contractData = contract.contractData as Record<string, any> | null;
      const amount = req.body.amount || (contractData?.valor_setup
        ? parseFloat(String(contractData.valor_setup).replace(/[^\d,]/g, "").replace(",", "."))
        : contract.soldProduct?.setupValue || 0);

      const pixProvider = getPaymentProvider(provider || "ASAAS");
      const result = await pixProvider.createPixPayment({
        amount,
        clientName: contract.client?.corporateName || "Cliente",
        clientCpfCnpj: contract.client?.cnpj || "",
        clientEmail: contract.client?.responsibleEmail || contract.client?.email || "",
        description: `Pagamento contrato ${contract.contractNumber} - ${contract.client?.corporateName}`,
        externalReference: contract.id,
      });

      const transaction = await prisma.paymentTransaction.create({
        data: {
          clientId: contract.clientId,
          contractId: contract.id,
          organizationId: orgId,
          provider: result.provider,
          method: "PIX",
          amount,
          status: result.status,
          externalId: result.externalId,
          qrCode: result.qrCode,
          qrCodeBase64: result.qrCodeBase64,
          pixCopiaECola: result.pixCopiaECola,
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
        },
      });

      await prisma.client.update({
        where: { id: contract.clientId },
        data: { closerStatus: "payment_pending" },
      });

      res.json({ success: true, transaction, payment: result });
    } catch (error) {
      next(error);
    }
  });

  router.get("/contract/:id/payment/status", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { contractId: req.params.id, organizationId: orgId },
        orderBy: { createdAt: "desc" },
      });
      if (!transaction) return res.status(404).json({ error: "Transação não encontrada" });

      if (transaction.status === "paid") {
        return res.json({ status: "paid", transaction });
      }

      const provider = getPaymentProvider(transaction.provider.split("_")[0]);
      const status = await provider.checkPaymentStatus(transaction.externalId || "");

      if (status.status !== transaction.status) {
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: status.status, paidAt: status.paidAt ? new Date(status.paidAt) : undefined },
        });
      }

      res.json({ status: status.status, transaction: { ...transaction, status: status.status } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/client/:id/finalize", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const clientId = req.params.id;

      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: orgId },
        include: {
          soldProducts: { where: { status: "onboarding" }, take: 1 },
          contracts: { where: { status: "signed" }, take: 1 },
        },
      });
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });

      const soldProduct = client.soldProducts[0];

      await prisma.client.update({
        where: { id: clientId },
        data: { closerStatus: "onboarding", status: "onboarding" },
      });

      const onboardingDemands = [
        { title: `Onboarding Técnico - ${client.corporateName}`, description: "Configurar ambiente, acessos e integrações" },
        { title: `Reunião de Kickoff - ${client.corporateName}`, description: "Alinhar expectativas, cronograma e entregáveis" },
        { title: `Checklist de Implantação - ${client.corporateName}`, description: "Validar entregas iniciais e documentação" },
      ];

      const demands = await Promise.all(
        onboardingDemands.map((d) =>
          prisma.demand.create({
            data: {
              title: d.title,
              description: d.description,
              status: "pending",
              clientId,
              soldProductId: soldProduct?.id,
              assignedToId: null,
            },
          })
        )
      );

      await prisma.notification.create({
        data: {
          organizationId: orgId,
          title: "Novo onboarding iniciado",
          message: `${client.corporateName} entrou em onboarding. ${demands.length} demandas criadas.`,
          type: "onboarding",
          link: `/clients/${clientId}`,
        },
      });

      res.json({
        success: true,
        message: "Cliente encaminhado para onboarding",
        closerStatus: "onboarding",
        demands,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/webhook/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      const event = req.body;

      let externalId = "";
      let eventStatus = "";

      if (provider === "asaas") {
        externalId = event.payment?.id || event.id;
        eventStatus = event.event;
      } else if (provider === "mercadopago") {
        externalId = event.data?.id?.toString() || event.id?.toString();
        eventStatus = event.type;
      } else if (provider === "inter") {
        externalId = event.id;
        eventStatus = event.status;
      }

      if (!externalId) return res.status(400).json({ error: "externalId não identificado" });

      const statusMap: Record<string, string> = {
        PAYMENT_RECEIVED: "paid",
        PAYMENT_CONFIRMED: "paid",
        "payment.created": "pending",
        "payment.updated": "paid",
        RECEBIDO: "paid",
        CONFIRMADO: "paid",
      };

      const newStatus = statusMap[eventStatus] || "pending";

      const transaction = await prisma.paymentTransaction.findFirst({
        where: { externalId },
      });

      if (transaction && newStatus === "paid" && transaction.status !== "paid") {
        await prisma.$transaction(async (tx) => {
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: "paid", paidAt: new Date() },
          });

          await tx.client.update({
            where: { id: transaction.clientId },
            data: { closerStatus: "payment_confirmed" },
          });

          if (transaction.contractId) {
            const existingSold = await tx.soldProduct.findFirst({
              where: { clientId: transaction.clientId, status: "onboarding" },
            });
            if (!existingSold) {
              const contract = await tx.contract.findUnique({
                where: { id: transaction.contractId },
                include: { soldProduct: true },
              });
              if (contract?.soldProduct) {
                await tx.soldProduct.update({
                  where: { id: contract.soldProduct.id },
                  data: { status: "active" },
                });
              }
            }
          }
        });
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[CLOSING_WEBHOOK_ERROR]", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ==================== AUTO-CONTRACT (Máquina de Vendas) ====================
  router.post("/contract/auto-generate", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { clientId, soldProductId } = req.body;

      if (!clientId || !soldProductId) {
        return res.status(400).json({ error: "clientId e soldProductId são obrigatórios" });
      }

      const autoContractService = new AutoContractService(prisma);
      const result = await autoContractService.generateAndSendContract(clientId, soldProductId, orgId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/contract/:id/confirm-close", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user!.id;
      const { contractId } = req.params;

      const autoContractService = new AutoContractService(prisma);
      const result = await autoContractService.confirmContractAndClose(contractId, orgId, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // ==================== CALL INTEGRATION ====================
  router.post("/call/create", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { calendarEventId } = req.body;

      if (!calendarEventId) {
        return res.status(400).json({ error: "calendarEventId é obrigatório" });
      }

      const callService = new CallIntegrationService(prisma);
      const session = await callService.createCallSession(calendarEventId, orgId);

      if (!session) {
        return res.status(404).json({ error: "Evento não encontrado ou erro ao criar sessão" });
      }

      res.json({ success: true, session });
    } catch (error) {
      next(error);
    }
  });

  router.get("/call/link/:eventId", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { eventId } = req.params;

      const callService = new CallIntegrationService(prisma);
      const session = await callService.getCallLinkForEvent(eventId, orgId);

      if (!session) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      res.json({ success: true, session });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
