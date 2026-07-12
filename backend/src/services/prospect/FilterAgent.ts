import { PrismaClient } from "@prisma/client";

export class FilterAgent {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async run(missionId: string) {
    try {
      console.log(`[FilterAgent] Aplicando filtros na missão ${missionId}`);
      
      const mission = await this.prisma.prospectMission.findUnique({
        where: { id: missionId },
        include: {
          leads: {
            where: { status: "validado" },
            include: { validation: true, dossier: true }
          }
        }
      });

      if (!mission) throw new Error("Missão não encontrada.");

      let approvedCount = 0;
      let rejectedCount = 0;

      for (const lead of mission.leads) {
        let isApproved = true;
        let rejectReason = "";

        // Regras de Ouro
        if (!lead.validation?.whatsappValid) {
          isApproved = false;
          rejectReason = "Sem WhatsApp Válido";
        } else if (lead.validation?.accountantSuspect) {
          isApproved = false;
          rejectReason = "Suspeita de Contador";
        } else if (lead.validation?.duplicate) {
          isApproved = false;
          rejectReason = "Lead Duplicado";
        } else if ((lead.dossier?.opportunityScore || 0) < mission.minScore) {
          isApproved = false;
          rejectReason = `Score Abaixo do Mínimo (${lead.dossier?.opportunityScore} < ${mission.minScore})`;
        }

        // Atualização do status
        await this.prisma.prospectLead.update({
          where: { id: lead.id },
          data: { 
            status: isApproved ? "aprovado_para_contato" : "reprovado" 
          }
        });

        if (isApproved) approvedCount++;
        else rejectedCount++;
      }

      await this.prisma.prospectAgentLog.create({
        data: {
          missionId,
          agentName: "FilterAgent",
          action: "Filtros Aplicados",
          status: "success",
          message: `${approvedCount} Aprovados, ${rejectedCount} Reprovados.`
        }
      });

      console.log(`[FilterAgent] Missão ${missionId} filtrada. ${approvedCount} aprovados.`);
      return true;
    } catch (error: any) {
      console.error(`[FilterAgent] Erro nos filtros:`, error);
      await this.prisma.prospectAgentLog.create({
        data: {
          missionId,
          agentName: "FilterAgent",
          action: "Erro nos Filtros",
          status: "error",
          message: error.message
        }
      });
      return false;
    }
  }
}
