import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { runAiCoreChat } from "./aiCoreClient.js";
import { logger } from "../utils/logger.js";

type EnrichmentResult = {
  cnpj: string | null;
  cnpjFormatted: string | null;
  legalName: string | null;
  tradeName: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  email: string | null;
  website: string | null;
  websiteUrl: string | null;
  instagram: string | null;
  instagramUrl: string | null;
  facebook: string | null;
  linkedin: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  owners: string[];
  partners: Array<{ name: string; role: string }>;
  registryStatus: string | null;
  source: string;
  rawData: any;
};

type CnpjLookupResult = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string;
  telefone_1: string;
  telefone_2: string;
  natureza_juridica: string;
  porte: string;
  qsa: Array<{
    nome_socio: string;
    qualificacao_socio: string;
    percentual_capital_social: number;
  }>;
  atividade_principal: Array<{ code: string; text: string }>;
  atividades_secundarias: Array<{ code: string; text: string }>;
};

export class LeadEnrichmentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async enrichLead(leadId: string, orgId: string): Promise<EnrichmentResult | null> {
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      logger.warn("LeadEnrichment", "Lead não encontrado", { leadId });
      return null;
    }

    logger.info("LeadEnrichment", "Iniciando enriquecimento", {
      leadId,
      businessName: lead.businessName,
    });

    const result: EnrichmentResult = {
      cnpj: lead.cnpj,
      cnpjFormatted: null,
      legalName: null,
      tradeName: null,
      phone: lead.phone,
      phoneSecondary: null,
      email: lead.email,
      website: lead.website,
      websiteUrl: null,
      instagram: lead.instagram,
      instagramUrl: null,
      facebook: lead.facebook,
      linkedin: lead.linkedin,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      segment: lead.category,
      owners: [],
      partners: [],
      registryStatus: null,
      source: "enrichment",
      rawData: {},
    };

    // 1. Buscar CNPJ se não tem
    if (!result.cnpj) {
      const cnpjFound = await this.findCnpjFromGoogle(lead.businessName, lead.city, lead.state);
      if (cnpjFound) {
        result.cnpj = cnpjFound;
      }
    }

    // 2. Buscar dados do CNPJ em APIs públicas
    if (result.cnpj) {
      const cnpjData = await this.fetchCnpjData(result.cnpj);
      if (cnpjData) {
        result.legalName = cnpjData.razao_social;
        result.tradeName = cnpjData.nome_fantasia;
        result.registryStatus = cnpjData.situacao_cadastral;
        result.phone = cnpjData.telefone_1 || result.phone;
        result.phoneSecondary = cnpjData.telefone_2;
        result.email = cnpjData.email || result.email;
        result.address = cnpjData.logradouro
          ? `${cnpjData.logradouro}, ${cnpjData.numero} - ${cnpjData.bairro}`
          : result.address;
        result.city = cnpjData.municipio || result.city;
        result.state = cnpjData.uf || result.state;
        result.partners = cnpjData.qsa.map((s) => ({
          name: s.nome_socio,
          role: s.qualificacao_socio,
        }));
        result.owners = cnpjData.qsa.map((s) => `${s.nome_socio} (${s.qualificacao_socio})`);
        result.segment =
          cnpjData.atividade_principal?.[0]?.text || result.segment;
        result.rawData.cnpjApi = cnpjData;
      }
    }

    // 3. Buscar Instagram e redes sociais via Google
    const socialData = await this.findSocialProfiles(lead.businessName, lead.city, lead.state);
    if (socialData.instagram) {
      result.instagram = socialData.instagram;
      result.instagramUrl = socialData.instagramUrl;
    }
    if (socialData.facebook) result.facebook = socialData.facebook;
    if (socialData.linkedin) result.linkedin = socialData.linkedin;

    // 4. Verificar website e buscar email se não tem
    if (result.website && !result.email) {
      const emailFromSite = await this.extractEmailFromWebsite(result.website);
      if (emailFromSite) {
        result.email = emailFromSite;
      }
    }

    // 5. Buscar telefone adicional se não tem
    if (!result.phoneSecondary) {
      const extraPhone = await this.findAdditionalPhone(lead.businessName, lead.city, lead.state);
      if (extraPhone && extraPhone !== result.phone) {
        result.phoneSecondary = extraPhone;
      }
    }

    // 6. Montar URLs
    if (result.instagram) {
      const handle = result.instagram.replace(/^@/, "").replace(/^https?:\/\/instagram\.com\//, "");
      result.instagramUrl = `https://www.instagram.com/${handle}/`;
    }
    if (result.website && !result.website.startsWith("http")) {
      result.websiteUrl = `https://${result.website}`;
    } else {
      result.websiteUrl = result.website;
    }
    result.cnpjFormatted = this.formatCnpj(result.cnpj || "");

    // 7. Salvar dados enriquecidos no lead
    await this.saveEnrichmentData(leadId, result);

    logger.info("LeadEnrichment", "Enriquecimento concluído", {
      leadId,
      hasCnpj: !!result.cnpj,
      hasPhone: !!result.phone,
      hasInstagram: !!result.instagram,
      hasEmail: !!result.email,
      partnersCount: result.partners.length,
    });

    return result;
  }

  private async findCnpjFromGoogle(
    businessName: string,
    city?: string | null,
    state?: string | null
  ): Promise<string | null> {
    try {
      const org = await this.getOrgKeys();
      if (!org?.serperApiKey) return null;

      const query = `"${businessName}" ${city || ""} ${state || ""} CNPJ site:cnpj.info OR site:casadosdados.com.br OR site:receitaws.com.br`;
      const { data } = await axios.post(
        "https://google.serper.dev/search",
        { q: query, gl: "br", hl: "pt-br", num: 5 },
        { headers: { "X-API-KEY": org.serperApiKey } }
      );

      const results = data?.organic || [];
      for (const r of results) {
        const url = r.link || "";
        const snippet = r.snippet || "";
        const title = r.title || "";

        // Extrair CNPJ do snippet ou título
        const cnpjMatch = (snippet + " " + title).match(
          /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/
        );
        if (cnpjMatch) return cnpjMatch[0].replace(/\D/g, "");

        // Buscar na URL
        const urlMatch = url.match(/(\d{14})/);
        if (urlMatch) return urlMatch[1];
      }

      return null;
    } catch (error: any) {
      logger.warn("LeadEnrichment", "Erro ao buscar CNPJ no Google", {
        error: error?.message,
      });
      return null;
    }
  }

  private async fetchCnpjData(cnpj: string): Promise<CnpjLookupResult | null> {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;

    const apis = [
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
      `https://receitaws.com.br/v1/cnpj/${cleanCnpj}`,
    ];

    for (const url of apis) {
      try {
        const { data } = await axios.get(url, {
          timeout: 10000,
          headers: {
            "User-Agent": "Nexus360-Enrichment/1.0",
          },
        });

        if (data && (data.razao_social || data.situacao_cadastral)) {
          return {
            cnpj: cleanCnpj,
            razao_social: data.razao_social || data.nome || "",
            nome_fantasia: data.nome_fantasia || "",
            situacao_cadastral:
              data.situacao_cadastral || data.situacao || "ATIVA",
            logradouro: data.logradouro || data.endereco || "",
            numero: data.numero || "",
            complemento: data.complemento || "",
            bairro: data.bairro || "",
            municipio: data.municipio || data.cidade || "",
            uf: data.uf || data.estado || "",
            cep: data.cep || "",
            email: data.email || "",
            telefone_1: data.telefone || data.telefone_1 || "",
            telefone_2: data.telefone_2 || "",
            natureza_juridica: data.natureza_juridica || "",
            porte: data.porte || "",
            qsa: (data.qsa || []).map((s: any) => ({
              nome_socio: s.nome_socio || "",
              qualificacao_socio: s.qualificacao_socio || "",
              percentual_capital_social: s.percentual_capital_social || 0,
            })),
            atividade_principal: data.atividade_principal || [],
            atividades_secundarias: data.atividades_secundarias || [],
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private async findSocialProfiles(
    businessName: string,
    city?: string | null,
    state?: string | null
  ): Promise<{ instagram: string | null; instagramUrl: string | null; facebook: string | null; linkedin: string | null }> {
    try {
      const org = await this.getOrgKeys();
      if (!org?.serperApiKey) return { instagram: null, instagramUrl: null, facebook: null, linkedin: null };

      const query = `"${businessName}" ${city || ""} ${state || ""}`;
      const { data } = await axios.post(
        "https://google.serper.dev/search",
        { q: query, gl: "br", hl: "pt-br", num: 10 },
        { headers: { "X-API-KEY": org.serperApiKey } }
      );

      const results = data?.organic || [];
      let instagram: string | null = null;
      let instagramUrl: string | null = null;
      let facebook: string | null = null;
      let linkedin: string | null = null;

      for (const r of results) {
        const url = r.link || "";
        const snippet = r.snippet || "";

        // Instagram
        if (!instagram && /instagram\.com/.test(url)) {
          const match = url.match(/instagram\.com\/([^/?]+)/);
          if (match) {
            instagram = match[1];
            instagramUrl = url;
          }
        }

        // Instagram no snippet
        if (!instagram) {
          const igMatch = snippet.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
          if (igMatch) {
            instagram = igMatch[1];
            instagramUrl = `https://www.instagram.com/${igMatch[1]}/`;
          }
        }

        // Facebook
        if (!facebook && /facebook\.com/.test(url)) {
          const match = url.match(/facebook\.com\/([^/?]+)/);
          if (match) facebook = url;
        }

        // LinkedIn
        if (!linkedin && /linkedin\.com/.test(url)) {
          linkedin = url;
        }
      }

      return { instagram, instagramUrl, facebook, linkedin };
    } catch (error: any) {
      logger.warn("LeadEnrichment", "Erro ao buscar redes sociais", {
        error: error?.message,
      });
      return { instagram: null, instagramUrl: null, facebook: null, linkedin: null };
    }
  }

  private async extractEmailFromWebsite(website: string): Promise<string | null> {
    try {
      const url = website.startsWith("http") ? website : `https://${website}`;
      const { data: html } = await axios.get(url, {
        timeout: 10000,
        headers: { "User-Agent": "Nexus360-Enrichment/1.0" },
        maxRedirects: 3,
      });

      // Buscar emails no HTML
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = (html.match(emailRegex) || []).filter(
        (e: string) =>
          !e.includes("sentry.io") &&
          !e.includes("example.com") &&
          !e.includes("test.com") &&
          !e.endsWith(".png") &&
          !e.endsWith(".jpg")
      );

      // Priorizar emails info@ ou contato@
      const preferred = emails.find(
        (e: string) => e.startsWith("contato@") || e.startsWith("info@") || e.startsWith("adm@")
      );

      return preferred || emails[0] || null;
    } catch {
      return null;
    }
  }

  private async findAdditionalPhone(
    businessName: string,
    city?: string | null,
    state?: string | null
  ): Promise<string | null> {
    try {
      const org = await this.getOrgKeys();
      if (!org?.serperApiKey) return null;

      const query = `"${businessName}" ${city || ""} ${state || ""} telefone OR contato OR phone`;
      const { data } = await axios.post(
        "https://google.serper.dev/search",
        { q: query, gl: "br", hl: "pt-br", num: 5 },
        { headers: { "X-API-KEY": org.serperApiKey } }
      );

      const results = data?.organic || [];
      for (const r of results) {
        const text = `${r.snippet || ""} ${r.title || ""}`;
        // Buscar números de telefone brasileiros
        const phoneMatch = text.match(
          /\(?\d{2}\)?\s*\d{4,5}[\s-]?\d{4}/
        );
        if (phoneMatch) {
          const cleaned = phoneMatch[0].replace(/\D/g, "");
          if (cleaned.length >= 10) {
            return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async saveEnrichmentData(leadId: string, data: EnrichmentResult): Promise<void> {
    const updateData: any = {
      cnpj: data.cnpj,
      cnpjStatus: data.registryStatus === "ATIVA" ? "validated" : data.registryStatus ? "needs_review" : "unverified",
      email: data.email,
      website: data.website,
      instagram: data.instagram,
      facebook: data.facebook,
      linkedin: data.linkedin,
      owners: data.owners.join("\n"),
      rawData: data.rawData,
    };

    if (data.phone && !leadExists(data.phone)) {
      // Não sobrescrever telefone existente, apenas adicionar secundário
    }

    try {
      await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: updateData,
      });
    } catch (error: any) {
      logger.warn("LeadEnrichment", "Erro ao salvar dados enriquecidos", {
        leadId,
        error: error?.message,
      });
    }

    function leadExists(_phone: string): boolean {
      return false; // Placeholder - o phone já vem do lead original
    }
  }

  private async getOrgKeys() {
    // Buscar chaves de API de qualquer organização (para enriquecimento)
    const org = await this.prisma.organization.findFirst({
      where: { isActive: true },
      select: { serperApiKey: true, serpApiKey: true },
    });
    return org;
  }

  private formatCnpj(cnpj: string): string {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length === 14) {
      return digits.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
      );
    }
    return cnpj;
  }
}
