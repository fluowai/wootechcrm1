import { PrismaClient, ProspectMission } from "@prisma/client";

export interface LeadSourceProvider {
  extract(niche: string, city: string, state: string, quantity: number): Promise<any[]>;
}

// Implementação Mock para testes/desenvolvimento (Pronto para ser trocado por API real como SerpAPI ou Google Places)
export class GooglePlacesProviderMock implements LeadSourceProvider {
  async extract(niche: string, city: string, state: string, quantity: number): Promise<any[]> {
    const leads = [];
    for (let i = 0; i < quantity; i++) {
      leads.push({
        companyName: `${niche} ${i + 1} ${city}`,
        category: niche,
        phone: `551199999000${i}`,
        website: i % 2 === 0 ? `https://www.${niche.replace(/\s+/g, '').toLowerCase()}${i}.com.br` : null,
        instagram: i % 3 === 0 ? `@${niche.replace(/\s+/g, '').toLowerCase()}_${i}` : null,
        address: `Rua das Flores, ${i * 10}, ${city} - ${state}`,
        city: city,
        state: state,
        googleRating: 4.0 + (Math.random()),
        googleReviewsCount: Math.floor(Math.random() * 500) + 10,
        dataSource: 'GooglePlacesMock'
      });
    }
    return leads;
  }
}

export class LeadExtractorAgent {
  private prisma: PrismaClient;
  private provider: LeadSourceProvider;

  constructor(prisma: PrismaClient, provider: LeadSourceProvider = new GooglePlacesProviderMock()) {
    this.prisma = prisma;
    this.provider = provider;
  }

  async run(mission: ProspectMission) {
    try {
      console.log(`[LeadExtractorAgent] Iniciando extração para a missão ${mission.id}`);
      
      const rawLeads = await this.provider.extract(
        mission.niche, 
        mission.city, 
        mission.state, 
        mission.leadQuantity
      );

      let savedCount = 0;
      for (const raw of rawLeads) {
        // Evita duplicados básicos na mesma missão
        const exists = await this.prisma.prospectLead.findFirst({
          where: { missionId: mission.id, phone: raw.phone }
        });

        if (!exists) {
          await this.prisma.prospectLead.create({
            data: {
              missionId: mission.id,
              companyName: raw.companyName,
              category: raw.category,
              phone: raw.phone,
              website: raw.website,
              instagram: raw.instagram,
              address: raw.address,
              city: raw.city,
              state: raw.state,
              googleRating: raw.googleRating,
              googleReviewsCount: raw.googleReviewsCount,
              dataSource: raw.dataSource,
              status: "captado"
            }
          });
          savedCount++;
        }
      }

      await this.prisma.prospectAgentLog.create({
        data: {
          missionId: mission.id,
          agentName: "LeadExtractorAgent",
          action: "Extração Concluída",
          status: "success",
          message: `Captados ${savedCount} novos leads (Solicitados: ${mission.leadQuantity})`
        }
      });

      console.log(`[LeadExtractorAgent] Missão ${mission.id} finalizada. ${savedCount} leads salvos.`);
      return true;
    } catch (error: any) {
      console.error(`[LeadExtractorAgent] Erro na extração:`, error);
      await this.prisma.prospectAgentLog.create({
        data: {
          missionId: mission.id,
          agentName: "LeadExtractorAgent",
          action: "Erro na Extração",
          status: "error",
          message: error.message
        }
      });
      return false;
    }
  }
}
