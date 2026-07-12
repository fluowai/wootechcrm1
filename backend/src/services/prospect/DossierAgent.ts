import { PrismaClient } from "@prisma/client";

export class DossierAgent {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async run(missionId: string) {
    try {
      console.log(`[DossierAgent] Iniciando geração de dossiês para a missão ${missionId}`);
      
      const leads = await this.prisma.prospectLead.findMany({
        where: { missionId, status: "validado" },
        include: { validation: true }
      });

      let processedCount = 0;

      for (const lead of leads) {
        // Cálculo do Score de Oportunidade
        let score = 0;
        
        if (lead.validation?.whatsappValid) score += 20;
        if (lead.validation?.companyActive) score += 15;
        if (lead.validation?.digitalMaturity === "baixa") score += 15;
        if (!lead.website) score += 10;
        if ((lead.googleReviewsCount || 0) < 50) score += 10;
        if (!lead.validation?.usesBot) score += 10;
        
        if (lead.validation?.accountantSuspect) score -= 30;
        if (lead.validation?.duplicate) score -= 20;
        if (!lead.validation?.whatsappValid) score -= 15;
        if (!lead.validation?.companyActive) score -= 10;

        // Classificação baseada no score
        let classification = "frio";
        if (score >= 85) classification = "prioridade";
        else if (score >= 70) classification = "quente";
        else if (score >= 40) classification = "morno";

        // Simulação de chamada de LLM (Gemini/Groq)
        // Em um ambiente real, aqui injetaríamos os dados do lead num prompt 
        // e faríamos fetch() na API do provedor de IA da Organização
        const aiSummary = `Percebemos que a empresa ${lead.companyName} possui boa avaliação no Google, mas ainda pode estar perdendo oportunidades por falta de uma triagem automática no WhatsApp. A abordagem ideal é iniciar com um diagnóstico rápido de atendimento.`;

        await this.prisma.prospectDossier.create({
          data: {
            leadId: lead.id,
            companySummary: `Resumo gerado via IA para ${lead.companyName}`,
            digitalPresenceDiagnosis: "Presença digital requer otimização de conversão.",
            recommendedApproach: aiSummary,
            opportunityScore: score,
            classification,
            classificationReason: "Calculado baseado nas métricas de maturidade digital e validações"
          }
        });

        processedCount++;
      }

      await this.prisma.prospectAgentLog.create({
        data: {
          missionId,
          agentName: "DossierAgent",
          action: "Geração de Dossiês",
          status: "success",
          message: `${processedCount} dossiês gerados.`
        }
      });

      console.log(`[DossierAgent] Missão ${missionId} finalizada. ${processedCount} dossiês gerados.`);
      return true;
    } catch (error: any) {
      console.error(`[DossierAgent] Erro na geração de dossiês:`, error);
      await this.prisma.prospectAgentLog.create({
        data: {
          missionId,
          agentName: "DossierAgent",
          action: "Erro nos Dossiês",
          status: "error",
          message: error.message
        }
      });
      return false;
    }
  }
}
