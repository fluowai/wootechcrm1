import { PrismaClient } from "@prisma/client";
import { LeadSearchParams, NormalizedLead, LeadSearchFilters } from "./providers/lead-provider.interface.js";
import { getLeadProvider } from "./providers/lead-provider.factory.js";
import { CompanyResolverService } from "../../services/companyResolver.js";
import { upsertDecisionMakersFromLead } from "../../services/prospectingAutomation.js";

export class LeadCaptureService {
  constructor(private prisma: PrismaClient) {}

  async captureLeads(params: LeadSearchParams) {
    const { tenantId, userId, provider: providerName } = params;

    // 1. Fetch organization keys
    console.log(`[LEAD_CAPTURE] Iniciando busca para orgId: ${tenantId}, Provedor: ${providerName}`);
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { serpApiKey: true, serperApiKey: true, outscraperKey: true }
    });

    if (!organization) {
      console.error(`[LEAD_CAPTURE] Organização ${tenantId} não encontrada no banco.`);
      throw new Error(`Organização não encontrada: ${tenantId}`);
    }

    // 1b. Create source record
    const source = await this.prisma.leadCaptureSource.create({
      data: {
        organizationId: tenantId,
        userId,
        provider: providerName,
        query: this.buildQuery(params),
        keyword: params.keyword,
        city: params.city,
        state: params.state,
        country: params.country || 'Brasil',
        requestedLimit: params.limit || 100,
        status: 'processing'
      }
    });

    try {
      let apiKey: string | undefined;
      
      if (providerName === 'serper') {
        apiKey = organization.serperApiKey || process.env.SERPER_API_KEY || undefined;
      } else if (providerName === 'serpapi') {
        apiKey = organization.serpApiKey || process.env.SERPAPI_API_KEY || process.env.SERP_API_KEY || undefined;
      } else {
        apiKey = organization.outscraperKey || process.env.OUTSCRAPER_API_KEY || process.env.OUTSCRAPER_KEY || undefined;
      }
      
      console.log(`[LEAD_CAPTURE] Provedor: ${providerName}, Chave (mascarada): ${apiKey ? (apiKey.substring(0, 5) + '...' + apiKey.slice(-4)) : 'NÃO ENCONTRADA'}`);

      if (!apiKey) {
        throw new Error(`Chave de API do provedor ${providerName} não configurada para esta organização.`);
      }

      const provider = getLeadProvider(providerName);
      
      let rawResults: any[];
      try {
        console.log(`[LEAD_CAPTURE] Chamando API do provedor: ${providerName}`);
        rawResults = await provider.search({ ...params, apiKey });
      } catch (apiErr: unknown) {
        const message = apiErr instanceof Error ? apiErr.message : String(apiErr);
        console.error(`[LEAD_CAPTURE] Erro na resposta da API externa (${providerName}):`, message);
        throw new Error(`Erro no provedor ${providerName}: ${message}`);
      }

      // 2. Normalize and filter
      let normalizedLeads: NormalizedLead[];
      try {
        normalizedLeads = rawResults.map(raw => {
          const lead = provider.normalize(raw);
          lead.phone_normalized = this.normalizeBrazilianPhone(lead.phone);
          return lead;
        });
        normalizedLeads = this.applyFilters(normalizedLeads, params.filters);
      } catch (normErr: unknown) {
        const message = normErr instanceof Error ? normErr.message : String(normErr);
        console.error(`[LEAD_CAPTURE] Erro na normalização dos dados:`, message);
        throw new Error(`Erro ao processar dados recebidos: ${message}`);
      }

      // 3. Save leads with deduplication
      let importedCount = 0;
      const savedLeads = [];

      for (const leadData of normalizedLeads) {
        try {
          const score = this.calculateScore(leadData);
          
          if (!leadData.external_id) {
            console.warn(`[LEAD_CAPTURE] Lead sem ID externo ignorado: ${leadData.business_name}`);
            continue;
          }

          const saved = await this.prisma.capturedLead.upsert({
            where: {
              organizationId_provider_externalId: {
                organizationId: tenantId,
                provider: providerName,
                externalId: leadData.external_id
              }
            },
            update: {
              ...this.mapToPrisma(leadData, params),
              scoreOpportunity: score.value,
              opportunityLevel: score.level,
              sourceId: source.id
            },
            create: {
              ...this.mapToPrisma(leadData, params),
              organizationId: tenantId,
              sourceId: source.id,
              provider: providerName,
              scoreOpportunity: score.value,
              opportunityLevel: score.level
            }
          });

          savedLeads.push(saved);
          importedCount++;
        } catch (dbErr: unknown) {
          const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
          console.error(`[LEAD_CAPTURE] Erro ao salvar lead ${leadData.business_name}:`, message);
        }
      }

      // 4. Auto-enriquecer leads (CNPJ + decisores) em background
      if (savedLeads.length > 0) {
        this.autoEnrichLeads(savedLeads, tenantId).catch(err =>
          console.error("[LEAD_CAPTURE_AUTO_ENRICH_ERROR]", err.message)
        );
      }

      // 5. Update source and log usage
      await this.prisma.leadCaptureSource.update({
        where: { id: source.id },
        data: {
          status: 'completed',
          totalFound: rawResults.length,
          totalImported: importedCount
        }
      });

      return {
        sourceId: source.id,
        totalFound: rawResults.length,
        totalImported: importedCount,
        leads: savedLeads
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[LEAD_CAPTURE_CRITICAL]`, message);
      await this.prisma.leadCaptureSource.update({
        where: { id: source.id },
        data: {
          status: 'failed',
          errorMessage: message
        }
      });

      throw error;
    }

  }

  private normalizeBrazilianPhone(phone?: string | null): string | null {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    
    return '+' + cleaned;
  }

  private applyFilters(leads: NormalizedLead[], filters?: LeadSearchFilters): NormalizedLead[] {
    if (!filters) return leads;

    return leads.filter(lead => {
      if (filters.onlyWithPhone && !lead.phone) return false;
      if (filters.onlyWithWebsite && !lead.website) return false;
      if (filters.onlyWithoutWebsite && lead.website) return false;
      if (filters.minRating && (lead.rating || 0) < filters.minRating) return false;
      if (filters.minReviews && (lead.reviews_count || 0) < filters.minReviews) return false;
      return true;
    });
  }

  private calculateScore(lead: NormalizedLead): { value: number, level: string } {
    let score = 50;
    const hasWebsite = Boolean(lead.website);
    const hasPhone = Boolean(lead.phone);
    const hasSocial = Boolean(lead.instagram || lead.facebook || lead.linkedin);
    const rating = Number(lead.rating || 0);
    const reviews = Number(lead.reviews_count || 0);
    const goodReviews = rating >= 4.2 && reviews >= 10;
    const highDemandSegment = /imob|constr|adv|sa[uú]de|odont|clinic|medic|est[eé]t|academ|restaur|bar|lanch|auto|educ|farm/i.test(lead.category || "");
    const noDigitalPresence = !hasWebsite && !hasSocial;
    const verySmall = reviews > 0 && reviews < 8 && !hasWebsite;

    score += hasWebsite ? 20 : -20;
    score -= 20;
    score += hasPhone ? 15 : -15;
    score += goodReviews ? 10 : -5;
    score += highDemandSegment ? 20 : 0;
    score += noDigitalPresence ? -20 : 5;
    score += verySmall ? -15 : 0;

    const value = Math.max(0, Math.min(100, Math.round(score)));
    let level = 'Baixa';
    if (value >= 70) level = 'Alta';
    else if (value >= 45) level = 'Media';

    return { value, level };
  }

  private mapToPrisma(lead: NormalizedLead, params: LeadSearchParams) {
    const parsedLocation = this.parseBrazilianLocation(lead.address);
    const city = lead.city || parsedLocation.city || params.city || null;
    const state = this.normalizeState(lead.state || parsedLocation.state || params.state);

    return {
      externalId: lead.external_id!,
      placeId: lead.place_id,
      businessName: lead.business_name,
      category: lead.category,
      phone: lead.phone,
      phoneNormalized: lead.phone_normalized,
      website: lead.website,
      email: lead.email,
      instagram: lead.instagram,
      facebook: lead.facebook,
      linkedin: lead.linkedin,
      address: lead.address,
      neighborhood: lead.neighborhood,
      city,
      state,
      country: lead.country || 'Brasil',
      postalCode: lead.postal_code,
      latitude: lead.latitude,
      longitude: lead.longitude,
      rating: lead.rating,
      reviewsCount: lead.reviews_count,
      reviews: lead.reviews as any,
      openingHours: lead.opening_hours as any,
      googleMapsUrl: lead.google_maps_url,
      searchUrl: lead.search_url,
      hasPhone: !!lead.phone,
      hasWebsite: !!lead.website,
      hasEmail: !!lead.email,
      hasSocial: !!(lead.instagram || lead.facebook || lead.linkedin),
      rawData: lead.raw_data as any
    };
  }

  private buildQuery(params: LeadSearchParams): string {
    const parts = [];
    if (params.keyword) parts.push(params.keyword);
    if (params.neighborhood) parts.push(params.neighborhood);
    if (params.city) parts.push(params.city);
    if (params.state) parts.push(params.state);
    if (params.country) parts.push(params.country || 'Brasil');
    return parts.filter(Boolean).join(' ');
  }

  private normalizeState(value?: string | null): string | null {
    const normalized = this.normalizeText(value);
    if (!normalized) return null;

    const stateAliases: Record<string, string> = {
      ACRE: "AC",
      ALAGOAS: "AL",
      AMAPA: "AP",
      AMAZONAS: "AM",
      BAHIA: "BA",
      CEARA: "CE",
      "DISTRITO FEDERAL": "DF",
      "ESPIRITO SANTO": "ES",
      GOIAS: "GO",
      MARANHAO: "MA",
      "MATO GROSSO": "MT",
      "MATO GROSSO DO SUL": "MS",
      "MINAS GERAIS": "MG",
      PARA: "PA",
      PARAIBA: "PB",
      PARANA: "PR",
      PERNAMBUCO: "PE",
      PIAUI: "PI",
      "RIO DE JANEIRO": "RJ",
      "RIO GRANDE DO NORTE": "RN",
      "RIO GRANDE DO SUL": "RS",
      RONDONIA: "RO",
      RORAIMA: "RR",
      "SANTA CATARINA": "SC",
      "SAO PAULO": "SP",
      SERGIPE: "SE",
      TOCANTINS: "TO"
    };

    if (/^[A-Z]{2}$/.test(normalized)) return normalized;
    return stateAliases[normalized] || normalized;
  }

  private parseBrazilianLocation(address?: string | null): { city: string | null; state: string | null } {
    const raw = String(address || "").trim();
    if (!raw) return { city: null, state: null };

    const stateMatch = raw.match(/(?:^|[\s,/-])([A-Z]{2})(?:\s*,?\s*Brasil|\s*$)/i);
    const state = this.normalizeState(stateMatch?.[1] || null);
    let city: string | null = null;

    if (state) {
      const stateIndex = raw.toUpperCase().lastIndexOf(state);
      const beforeState = stateIndex >= 0 ? raw.slice(0, stateIndex) : raw;
      const parts = beforeState
        .split(/[,|-]/)
        .map(part => part.trim())
        .filter(Boolean);
      city = parts.length ? parts[parts.length - 1] : null;
    }

    return { city, state };
  }

  private normalizeText(value?: string | null): string {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  private async autoEnrichLeads(leads: any[], orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { serperApiKey: true }
    });

    const resolver = new CompanyResolverService({
      serperApiKey: org?.serperApiKey || process.env.SERPER_API_KEY,
    }, orgId);

    for (const lead of leads.slice(0, 10)) {
      try {
        const result = await resolver.resolve({ name: lead.businessName });

        if (result.company && result.company.score >= 80) {
          const owners = result.company.partners
            .map(p => p.role ? `${p.name} (${p.role})` : p.name)
            .join(", ");

          await this.prisma.capturedLead.update({
            where: { id: lead.id },
            data: {
              cnpj: result.company.cnpjFormatted,
              cnpjStatus: "validated",
              cnpjMatchScore: result.company.score,
              cnpjMatchReason: result.company.matchReason,
              matchedLegalName: result.company.legalName,
              matchedTradeName: result.company.tradeName,
              matchedCity: result.company.city,
              matchedState: result.company.state,
              matchedAddress: result.company.address,
              owners: owners || null,
            }
          });

          if (result.company.phone) {
             const cleanAlt = result.company.phone.replace(/\D/g, "");
             const cleanLeadPhone = (lead.phone || "").replace(/\D/g, "");
             if (cleanAlt.length >= 10 && cleanAlt !== cleanLeadPhone) {
                const currentLead = await this.prisma.capturedLead.findUnique({ where: { id: lead.id } });
                if (currentLead) {
                   const rawData = typeof currentLead.rawData === 'object' && currentLead.rawData !== null ? currentLead.rawData : {};
                   await this.prisma.capturedLead.update({
                      where: { id: lead.id },
                      data: {
                         rawData: {
                            ...rawData,
                            altPhone: result.company.phone
                         }
                      }
                   });
                }
             }
          }

          if (result.decisionMakers.length > 0) {
            const updatedLead = await this.prisma.capturedLead.findUnique({ where: { id: lead.id } });
            if (updatedLead) {
              await upsertDecisionMakersFromLead(this.prisma, updatedLead).catch(() => {});
            }
          }
        } else if (result.candidates.length > 0) {
          await this.prisma.capturedLead.update({
            where: { id: lead.id },
            data: {
              cnpjStatus: "needs_review",
              cnpjMatchReason: `Candidatos encontrados, mas nenhum com score suficiente: ${result.candidates.map(c => `${c.cnpj} (${c.score}%)`).join(", ")}`,
            }
          });
        }
      } catch (err: any) {
        console.warn(`[AUTO_ENRICH] Falha ao enriquecer lead ${lead.id}:`, err.message);
      }
    }
  }
}
