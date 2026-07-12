import { PrismaClient } from "@prisma/client";
import { OutboundDispatcherService } from "./outboundDispatcher.js";
import { generateContractHtml, buildContractData, generateContractNumber } from "./contractGenerator.js";
import { logger } from "../utils/logger.js";

type AutoContractResult = {
  success: boolean;
  contractId: string | null;
  contractUrl: string | null;
  error?: string;
};

export class AutoContractService {
  private prisma: PrismaClient;
  private dispatcher: OutboundDispatcherService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.dispatcher = new OutboundDispatcherService(prisma);
  }

  async generateAndSendContract(
    clientId: string,
    soldProductId: string,
    orgId: string
  ): Promise<AutoContractResult> {
    logger.info("AutoContract", "Iniciando geração automática de contrato", {
      clientId,
      soldProductId,
    });

    try {
      // 1. Buscar dados do cliente e produto
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, organizationId: orgId },
      });

      if (!client) {
        return { success: false, contractId: null, contractUrl: null, error: "Cliente não encontrado" };
      }

      const soldProduct = await this.prisma.soldProduct.findFirst({
        where: { id: soldProductId, clientId },
      });

      if (!soldProduct) {
        return { success: false, contractId: null, contractUrl: null, error: "Produto/serviço não encontrado" };
      }

      // 2. Buscar template de contrato ativo
      const template = await this.prisma.contractTemplate.findFirst({
        where: { organizationId: orgId, isActive: true },
        orderBy: { createdAt: "asc" },
      });

      if (!template) {
        return { success: false, contractId: null, contractUrl: null, error: "Nenhum template de contrato encontrado" };
      }

      // 3. Gerar dados do contrato
      const org = await this.prisma.organization.findFirst({
        where: { id: orgId },
      });

      const contractData = buildContractData(client, soldProduct, org);
      const contractNumber = generateContractNumber();

      // 4. Gerar HTML do contrato
      const html = generateContractHtml(template.content, contractData);

      // 5. Criar registro do contrato
      const contract = await this.prisma.contract.create({
        data: {
          clientId,
          organizationId: orgId,
          soldProductId,
          templateId: template.id,
          status: "sent",
          title: `Contrato - ${client.corporateName} - ${soldProduct.name}`,
          contractNumber,
          contractData: contractData as any,
          fileUrl: null, // Será preenchido se gerar PDF
          signedAt: null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias para assinar
        },
      });

      // 6. Atualizar status do cliente
      await this.prisma.client.update({
        where: { id: clientId },
        data: {
          closerStatus: "contract_sent",
        },
      });

      // 7. Enviar contrato via WhatsApp para o lead
      const phone = client.responsiblePhone || client.phone;
      if (phone) {
        const leadName = client.responsibleName || client.corporateName;
        const message = [
          `Oi ${leadName}, tudo bem?`,
          `Segue o contrato para sua análise. Qualquer dúvida, estou à disposição.`,
          `Para assinar, basta responder este contato confirmando os dados.`,
          `Número do contrato: ${contractNumber}`,
          `Validade: 7 dias úteis.`,
        ].join("\n");

        await this.dispatcher.dispatchText({
          organizationId: orgId,
          contact: { name: leadName, phone },
          message,
          ia: false,
          source: "auto_contract",
          metadata: { contractId: contract.id },
        });
      }

      // 8. Criar notificação
      await this.prisma.notification.create({
        data: {
          title: "Contrato enviado automaticamente",
          message: `Contrato ${contractNumber} enviado para ${client.corporateName}`,
          type: "success",
          link: `/crm/contracts/${contract.id}`,
          organizationId: orgId,
        },
      });

      logger.info("AutoContract", "Contrato gerado e enviado", {
        contractId: contract.id,
        contractNumber,
        clientName: client.corporateName,
      });

      return {
        success: true,
        contractId: contract.id,
        contractUrl: `/crm/contracts/${contract.id}`,
      };
    } catch (error: any) {
      logger.error("AutoContract", "Erro ao gerar contrato automático", {
        error: error?.message,
        clientId,
      });

      return {
        success: false,
        contractId: null,
        contractUrl: null,
        error: error?.message || "Erro desconhecido",
      };
    }
  }

  async confirmContractAndClose(
    contractId: string,
    orgId: string,
    closerId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const contract = await this.prisma.contract.findFirst({
        where: { id: contractId, organizationId: orgId },
        include: {
          client: true,
          soldProduct: true,
        },
      });

      if (!contract) {
        return { success: false, message: "Contrato não encontrado" };
      }

      // Atualizar contrato para assinado
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: "active",
          signedAt: new Date(),
        },
      });

      // Atualizar status do cliente
      if (contract.clientId) {
        await this.prisma.client.update({
          where: { id: contract.clientId },
          data: {
            closerStatus: "payment_pending",
          },
        });
      }

      // Criar invoice se não existir
      if (contract.soldProduct && contract.clientId) {
        const existingInvoice = await this.prisma.invoice.findFirst({
          where: {
            clientId: contract.clientId,
            contractId,
          },
        });

        if (!existingInvoice) {
          const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
          await this.prisma.invoice.create({
            data: {
              invoiceNumber,
              status: "pendente",
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              subtotal: contract.soldProduct.setupValue + contract.soldProduct.monthlyValue,
              total: contract.soldProduct.setupValue + contract.soldProduct.monthlyValue,
              description: `Faturamento - ${contract.soldProduct.name}`,
              organizationId: orgId,
              clientId: contract.clientId,
              contractId,
            },
          });
        }
      }

      // Notificar closer
      await this.prisma.notification.create({
        data: {
          title: "Contrato assinado!",
          message: `Contrato ${contract.contractNumber} foi assinado pelo cliente ${contract.client?.corporateName}`,
          type: "success",
          link: `/crm/contracts/${contractId}`,
          organizationId: orgId,
        },
      });

      // Enviar mensagem de confirmação para o cliente
      const phone = contract.client?.responsiblePhone || contract.client?.phone;
      if (phone) {
        const leadName = contract.client?.responsibleName || contract.client?.corporateName;
        await this.dispatcher.dispatchText({
          organizationId: orgId,
          contact: { name: leadName || "", phone },
          message: `Perfeito! Contrato ${contract.contractNumber} confirmado. Em breve entraremos em contato para dar início ao onboarding. Bem-vindo(a)!`,
          ia: false,
          source: "contract_confirmed",
          metadata: { contractId },
        });
      }

      return {
        success: true,
        message: `Contrato ${contract.contractNumber} confirmado com sucesso!`,
      };
    } catch (error: any) {
      logger.error("AutoContract", "Erro ao confirmar contrato", {
        error: error?.message,
        contractId,
      });

      return {
        success: false,
        message: error?.message || "Erro ao confirmar contrato",
      };
    }
  }
}
