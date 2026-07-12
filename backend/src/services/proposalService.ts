import { PrismaClient } from "@prisma/client";

export class ProposalService {
  constructor(private prisma: PrismaClient) {}

  async createFromOpportunity(orgId: string, opportunityId: string, data: { title: string; notes?: string }) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId: orgId },
      include: { client: true, organization: true },
    });

    if (!opportunity) throw new Error("Negócio não encontrado.");

    const slug = `${opportunity.organization.slug || 'prop'}-${Date.now()}`;

    const content = {
      header: { title: data.title, date: new Date(), orgName: opportunity.organization.name },
      client: { name: opportunity.client.tradeName || opportunity.client.corporateName, email: opportunity.client.email },
      items: [],
      notes: data.notes || "",
      terms: "Válido por 7 dias. Condições de pagamento a combinar.",
      totalValue: opportunity.value || 0,
    };

    return this.prisma.proposal.create({
      data: {
        title: data.title,
        slug,
        organizationId: opportunity.organizationId,
        clientId: opportunity.clientId,
        opportunityId,
        content: content as any,
        status: "draft",
      },
    });
  }

  async renderProposal(orgId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId },
      include: { organization: true, client: true },
    });
    if (!proposal) throw new Error("Proposta não encontrada.");
    return proposal;
  }

  async changeStatus(proposalId: string, newStatus: string, orgId: string, userId?: string, metadata?: any) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId },
    });
    if (!proposal) throw new Error("Proposta não encontrada.");

    const validStatuses = ["draft", "sent", "viewed", "negotiation", "accepted", "rejected"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Status inválido. Use: ${validStatuses.join(", ")}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.proposalStatusHistory.create({
        data: {
          proposalId,
          fromStatus: proposal.status,
          toStatus: newStatus,
          changedById: userId || null,
          metadata: metadata || null,
        },
      });

      return tx.proposal.update({
        where: { id: proposalId },
        data: { status: newStatus },
      });
    });

    return result;
  }

  async generateProposalHtml(orgId: string, proposalId: string): Promise<string> {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, organizationId: orgId },
      include: { organization: true, client: true, items: true },
    });
    if (!proposal) throw new Error("Proposta não encontrada.");

    const content = proposal.content as any;
    const clientName = proposal.client?.tradeName || proposal.client?.corporateName || "Cliente";
    const itemsHtml = proposal.items
      .map(
        (item) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;">${item.service}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">R$ ${item.unitPrice.toFixed(2)}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">R$ ${item.total.toFixed(2)}</td>
      </tr>`
      )
      .join("");

    const totalValue = proposal.items.reduce((sum, i) => sum + i.total, 0);

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #333; }
  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
  .header h1 { color: #2563eb; margin: 0; }
  .client-info { margin-bottom: 30px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #2563eb; color: white; padding: 12px; text-align: left; }
  .total-row td { font-weight: bold; font-size: 1.1em; padding-top: 15px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
  .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }
  .status-draft { background: #f3f4f6; color: #6b7280; }
  .status-sent { background: #dbeafe; color: #2563eb; }
  .status-accepted { background: #d1fae5; color: #059669; }
</style></head>
<body>
  <div class="header">
    <h1>${content?.header?.title || proposal.title}</h1>
    <p>${content?.header?.orgName || ""} — ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
  <div class="client-info">
    <h3>Cliente: ${clientName}</h3>
    <p>${proposal.client?.email || ""}</p>
  </div>
  <table>
    <thead><tr><th>Serviço</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr></thead>
    <tbody>
      ${itemsHtml || "<tr><td colspan='4' style='text-align:center;padding:20px;'>Nenhum item adicionado</td></tr>"}
      <tr class="total-row"><td colspan="3" style="text-align:right;">Total:</td><td>R$ ${totalValue.toFixed(2)}</td></tr>
    </tbody>
  </table>
  ${content?.notes ? `<div><h4>Observações:</h4><p>${content.notes}</p></div>` : ""}
  ${content?.terms ? `<div><h4>Termos:</h4><p>${content.terms}</p></div>` : ""}
  <div class="footer">
    <p>Proposta gerada por Nexus360 — ${new Date().toLocaleString("pt-BR")}</p>
  </div>
</body></html>`;
  }
}
