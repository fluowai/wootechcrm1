import { PrismaClient, ProspectLead } from "@prisma/client";

export class LeadValidatorAgent {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async run(missionId: string) {
    try {
      console.log(`[LeadValidatorAgent] Iniciando validação para a missão ${missionId}`);
      
      const unvalidatedLeads = await this.prisma.prospectLead.findMany({
        where: { missionId, status: "captado" }
      });

      let validatedCount = 0;

      for (const lead of unvalidatedLeads) {
        // Validação Heurística Base
        const phoneValid = this.validatePhone(lead.phone);
        const isAccountant = this.checkAccountantSuspect(lead);
        const { usesBot, botType } = this.checkBotSuspect(lead);

        await this.prisma.prospectValidation.create({
          data: {
            leadId: lead.id,
            phoneValid,
            whatsappValid: phoneValid, // Simplificação inicial
            websiteActive: !!lead.website,
            instagramFound: !!lead.instagram,
            companyActive: true,
            duplicate: false,
            accountantSuspect: isAccountant,
            usesBot: usesBot,
            detectedBotType: botType,
            digitalMaturity: this.calculateMaturity(lead)
          }
        });

        await this.prisma.prospectLead.update({
          where: { id: lead.id },
          data: { status: "validado" }
        });

        validatedCount++;
      }

      await this.prisma.prospectAgentLog.create({
        data: {
          missionId,
          agentName: "LeadValidatorAgent",
          action: "Validação Concluída",
          status: "success",
          message: `${validatedCount} leads validados.`
        }
      });

      console.log(`[LeadValidatorAgent] Missão ${missionId} finalizada. ${validatedCount} leads validados.`);
      return true;
    } catch (error: any) {
      console.error(`[LeadValidatorAgent] Erro na validação:`, error);
      await this.prisma.prospectAgentLog.create({
        data: {
          missionId,
          agentName: "LeadValidatorAgent",
          action: "Erro na Validação",
          status: "error",
          message: error.message
        }
      });
      return false;
    }
  }

  private validatePhone(phone: string | null): boolean {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 14;
  }

  private checkAccountantSuspect(lead: ProspectLead): boolean {
    if (!lead.companyName) return false;
    const nameLower = lead.companyName.toLowerCase();
    const suspectTerms = ["contabilidade", "contador", "escritório contábil", "contabil", "assessoria contábil"];
    return suspectTerms.some(term => nameLower.includes(term));
  }

  private checkBotSuspect(lead: ProspectLead): { usesBot: boolean; botType: string | null } {
    // Num sistema real, usaríamos Puppeteer para varrer o HTML do site
    // Por enquanto é heurístico para o escopo
    return { usesBot: false, botType: null };
  }

  private calculateMaturity(lead: ProspectLead): string {
    let score = 0;
    if (lead.website) score += 1;
    if (lead.instagram) score += 1;
    if (lead.googleReviewsCount && lead.googleReviewsCount > 50) score += 1;

    if (score >= 3) return "alta";
    if (score === 2) return "media";
    return "baixa";
  }
}
