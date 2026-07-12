import { PrismaClient } from "@prisma/client";
import { getOrgAIKeys } from "../../utils/aiKeys.js";
import axios from "axios";

type CnpjSearchCandidate = {
  cnpj: string;
  source: string;
  sourceUrl?: string | null;
  evidence?: Record<string, any>;
};

type NormalizedRegistry = {
  cnpj?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  registryStatus?: string | null;
  phone?: string | null;
  email?: string | null;
  partners: Array<{ name: string; role?: string | null }>;
  rawData?: any;
};

type MatchScore = {
  total: number;
  gatesPassed: boolean;
  reason: string;
  rejectionReason?: string;
};

type CaptureClassification = "Alta" | "Média" | "Media" | "Baixa";

type CaptureCard = {
  score: {
    valor: number;
    classificacao: CaptureClassification;
    justificativa: string[];
  };
  recomendacao_ia: string;
  oportunidade: {
    nivel: CaptureClassification;
    ticket_estimado: string;
    maturidade_digital: CaptureClassification;
    fit_icp: "Alto" | "Médio" | "Medio" | "Baixo";
  };
  diagnostico: {
    resumo: string;
    dores: string[];
    oportunidades: string[];
  };
  decisores: Array<{
    nome: string;
    cargo: string;
    nivel_influencia: "Alto" | "Médio" | "Medio" | "Baixo";
  }>;
  estrategia_abordagem: {
    canal_prioritario: "WhatsApp" | "Ligação" | "Ligacao" | "Instagram";
    melhor_horario: string;
    angulo: string;
    gatilho: string;
  };
  script_sdr: {
    abertura: string;
    conexao: string;
    oferta: string;
    cta: string;
  };
  acoes_recomendadas: string[];
};

export class LeadAiService {
  constructor(private prisma: PrismaClient) {}

  async runDiagnosis(leadId: string, orgId: string) {
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    return this.generateCaptureCardForLead(lead, orgId);
  }


  private async generateCaptureCardForLead(lead: any, orgId: string) {
    let card = this.buildFallbackCaptureCard(lead);

    try {
      const response = await this.runGroqChat(orgId, {
        system: "Voce e uma IA especialista em inteligencia comercial, prospeccao B2B e analise de empresas locais. Responda somente JSON valido.",
        message: this.buildCaptureCardPrompt(lead),
        temperature: 0.2,
        maxTokens: 3500,
      });

      const parsed = this.parseJsonObject(response);
      if (parsed) {
        card = this.normalizeCaptureCard(parsed, lead);
      }
    } catch (error: any) {
      console.warn("[LEAD_CAPTURE_CARD_GROQ_FALLBACK]", {
        leadId: lead.id,
        reason: error?.message || "Groq unavailable",
      });
    }

    const score = this.calculateCaptureScore(lead);
    card.score.valor = score.value;
    card.score.classificacao = score.classification;
    card.score.justificativa = score.justifications;
    card.oportunidade.nivel = score.classification;

    const aiDiagnosis = JSON.stringify(card, null, 2);
    const diagnosisData = {
      aiDiagnosis,
      aiWeaknesses: card.diagnostico.dores as any,
      aiOpportunities: card.diagnostico.oportunidades as any,
      suggestedOffer: card.recomendacao_ia,
      opportunityLevel: card.score.classificacao,
      scoreOpportunity: card.score.valor,
      coldCallScript: [
        card.script_sdr.abertura,
        card.script_sdr.conexao,
        card.script_sdr.oferta,
        card.script_sdr.cta,
      ].filter(Boolean).join("\n\n"),
      whatsappMessage: [
        card.script_sdr.abertura,
        card.script_sdr.conexao,
        card.script_sdr.cta,
      ].filter(Boolean).join(" "),
    };

    try {
      return await this.prisma.capturedLead.update({
        where: { id: lead.id },
        data: diagnosisData
      });
    } catch (error: any) {
      const message = error?.message || "";
      const mayBeOutdatedSchema =
        error?.code === "P2022" ||
        /column .* does not exist/i.test(message) ||
        /Unknown arg .*aiWeaknesses|Unknown argument .*aiWeaknesses/i.test(message);

      if (!mayBeOutdatedSchema) {
        throw error;
      }

      console.warn("[LEAD_CAPTURE_CARD_PARTIAL_SAVE]", {
        leadId: lead.id,
        reason: "Banco sem colunas auxiliares do diagnostico. Salvando campos principais.",
        error: message
      });

      return await this.prisma.capturedLead.update({
        where: { id: lead.id },
        data: {
          aiDiagnosis,
          suggestedOffer: diagnosisData.suggestedOffer,
          opportunityLevel: diagnosisData.opportunityLevel,
          scoreOpportunity: diagnosisData.scoreOpportunity,
        }
      });
    }
  }

  async generateScripts(leadId: string, orgId: string) {
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    const prompt = `
      Você é um especialista em SDR, BDR e cold call B2B.
      Crie um roteiro de ligação (Cold Call) e uma mensagem de WhatsApp para abordar a empresa abaixo.
      Objetivo real: chegar ao decisor (sócio, proprietário, administrador ou alguém da área comercial), abrir uma conversa humana e levar para uma call quando houver abertura.

      Nome: ${lead.businessName}
      Categoria: ${lead.category}
      Diagnóstico: ${lead.aiDiagnosis}

      REGRAS OBRIGATÓRIAS:
      - Nunca diga que somos agência.
      - Nunca comece falando de marketing, presença digital, site, diagnóstico ou avaliação da empresa.
      - A primeira mensagem deve apenas localizar o decisor ou responsável comercial.
      - Se perguntarem o assunto, explique como humano: "trabalho com estrutura comercial para ajudar empresas a vender melhor e colocar mais dinheiro no caixa".
      - Só fale da avaliação/diagnóstico depois de confirmar que está falando com quem decide e a pessoa deu abertura.
      - Escreva como conversa real de WhatsApp, curta, natural, sem tom robótico e sem texto longo.

      IMPORTANTE: O roteiro de Cold Call NÃO DEVE ser um único bloco de texto gigante. 
      Ele DEVE ser dividido e estruturado em partes (passo a passo) para que o vendedor não fale tudo de uma vez, permitindo a interação com o lead e confirmando se está falando com a pessoa certa.
      
      Exemplo de estrutura desejada (use quebras de linha):
      [Passo 1 - Filtro Inicial]: "Oi, tudo bem? Aqui é o Paulo. Quem cuida do comercial ou das decisões de crescimento por aí?"
      [Passo 2 - Se perguntar o assunto]: "É sobre estrutura comercial. Eu ajudo empresas a organizar melhor a entrada de oportunidades e vender mais. Queria entender se falo com você ou com outra pessoa."
      [Passo 3 - Confirmar decisor]: ...
      [Passo 4 - Sondagem curta]: ...
      [Passo 5 - Gancho para Call]: ...

      A mensagem de WhatsApp deve ser curta, humana, consultiva e terminar com uma pergunta que gere resposta.

      Responda EXCLUSIVAMENTE em JSON válido:
      {
        "coldCallScript": "string formatada com os passos separados por quebras de linha",
        "whatsappMessage": "string"
      }
    `;

    let result: any = {};
    try {
      const aiResponse = await this.runGroqChat(orgId, {
        system: "Voce e especialista em SDR B2B. Responda somente JSON valido.",
        message: prompt,
        temperature: 0.3,
        maxTokens: 4096,
      });
      result = this.parseJsonObject(aiResponse) || {};
    } catch (error: any) {
      console.warn("[LEAD_SCRIPTS_GROQ_FALLBACK]", { leadId, reason: error?.message });
    }
    const ownerCandidate = String(lead.owners || "")
      .split(/[,;|\n]+/)
      .map(item => item.replace(/\([^)]*\)/g, "").trim())
      .find(Boolean);
    const targetName = ownerCandidate
      ? ownerCandidate.split(/\s+/).find(part => part.length > 2)
      : null;
    const gatekeeperMessage = targetName
      ? `Oi, tudo bem? Aqui e o Paulo. Consegue me ajudar a falar com ${targetName.charAt(0).toUpperCase() + targetName.slice(1).toLowerCase()} ou com quem cuida do comercial por ai?`
      : "Oi, tudo bem? Aqui e o Paulo. Quem seria a pessoa que cuida do comercial ou das decisoes de crescimento por ai?";
    const gatekeeperScript = [
      `[Passo 1 - Pessoa certa]: "${gatekeeperMessage}"`,
      `[Passo 2 - Se perguntarem o assunto]: "E sobre estrutura comercial. Eu ajudo empresas a organizar melhor a entrada de oportunidades e vender mais. Queria entender se falo com voce ou com outra pessoa."`,
      `[Passo 3 - Se nao estiver]: "Perfeito. Com quem eu falo sobre isso?"`,
      targetName
        ? `[Passo 4 - Mapear responsavel]: "Certo. Alem de ${targetName.charAt(0).toUpperCase() + targetName.slice(1).toLowerCase()}, tem mais alguma pessoa que cuida do comercial?"`
        : `[Passo 4 - Mapear responsavel]: "Certo. Tem alguma pessoa especifica que cuida do comercial?"`,
      `[Passo 5 - Se estiver com a pessoa certa]: fazer uma pergunta objetiva de qualificacao, sem vender e sem abrir diagnostico ainda.`,
      `[Regra fixa]: so falar sobre avaliacao da empresa depois que o decisor der abertura.`
    ].join("\n");

    return await this.prisma.capturedLead.update({
      where: { id: leadId },
      data: {
        coldCallScript: gatekeeperScript || result.coldCallScript,
        whatsappMessage: gatekeeperMessage
      }
    });
  }

  async generateDossier(leadId: string, orgId: string) {
    const lead = await this.prisma.capturedLead.findFirst({ where: { id: leadId, organizationId: orgId } });

    if (!lead) throw new Error("Lead not found");
    return this.generateCaptureCardForLead(lead, orgId);
  }


  async enrichLead(leadId: string, orgId: string) {
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId },
      include: { source: true }
    });

    if (!lead) throw new Error("Lead not found");

    // 1. Fetch Serper API Key
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { serperApiKey: true }
    });

    const serperApiKey = org?.serperApiKey || process.env.SERPER_API_KEY;

    try {
      const location = this.resolveLeadLocation(lead);

      if (!location.city || !location.state) {
        return await this.rejectIdentity(lead, "Cidade/UF ausentes. CNPJ e socios nao foram validados automaticamente.", location);
      }

      if (!serperApiKey && !this.cleanCnpj(lead.cnpj)) {
        return await this.rejectIdentity(lead, "Configure SERPER_API_KEY ou informe um CNPJ para validar a identidade empresarial.", location);
      }

      const savedCnpj = this.cleanCnpj(lead.cnpj);
      const candidates: CnpjSearchCandidate[] = savedCnpj
        ? [{ cnpj: savedCnpj, source: "captured_lead", sourceUrl: null, evidence: { reason: "CNPJ previamente salvo no lead" } }]
        : await this.findCnpjCandidatesWithSearch(serperApiKey!, lead, { city: location.city, state: location.state });

      if (!candidates.length) {
        return await this.rejectIdentity(lead, "Nenhum candidato de CNPJ encontrado com evidencias suficientes.", location);
      }

      const evaluated = [];

      for (const candidate of candidates) {
        const registry = await this.fetchCnpjRegistry(candidate.cnpj);

        if (!registry) {
          await this.saveIdentityCandidate(lead, candidate, null, {
            total: 0,
            gatesPassed: false,
            reason: "Registro CNPJ nao encontrado nas fontes configuradas.",
            rejectionReason: "registry_not_found"
          });
          continue;
        }

        const score = this.scoreCompanyMatch(lead, registry, { city: location.city, state: location.state }, candidate);
        await this.saveIdentityCandidate(lead, candidate, registry, score);

        if (score.gatesPassed) {
          evaluated.push({ candidate, registry, score });
        }
      }

      const best = evaluated.sort((a, b) => b.score.total - a.score.total)[0];

      if (!best || best.score.total < 85) {
        return await this.rejectIdentity(lead, "Nenhum CNPJ atingiu score minimo de identidade empresarial. Socios nao foram usados.", {
          ...location,
          candidates: evaluated.map(item => ({
            cnpj: item.candidate.cnpj,
            score: item.score.total,
            reason: item.score.reason
          }))
        });
      }

      const owners = best.registry.partners?.length
        ? best.registry.partners.map((partner: any) => partner.role ? `${partner.name} (${partner.role})` : partner.name).join(", ")
        : null;

      const updated = await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          cnpj: this.formatCnpj(best.candidate.cnpj),
          cnpjStatus: "validated",
          cnpjMatchScore: best.score.total,
          cnpjMatchReason: best.score.reason,
          matchedLegalName: best.registry.legalName,
          matchedTradeName: best.registry.tradeName,
          matchedCity: best.registry.city,
          matchedState: best.registry.state,
          matchedAddress: best.registry.address,
          cnpjSourceUrl: best.candidate.sourceUrl,
          owners
        }
      });

      await this.logIdentityDecision(lead, "enrich_lead", "validated", best.candidate.cnpj, best.score.total, best.score.reason, {
        location,
        selected: best.candidate,
        registry: {
          legalName: best.registry.legalName,
          tradeName: best.registry.tradeName,
          city: best.registry.city,
          state: best.registry.state
        }
      });

      return updated;
    } catch (err: any) {
      console.error("[ENRICH_LEAD_ERROR]", err.message);
      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          notes: this.appendNote(
            lead.notes,
            `Enriquecimento pendente: ${err.message || "falha ao consultar dados externos."}`
          )
        }
      });
    }
  }

  private async findCnpjCandidatesWithSearch(serperApiKey: string, lead: any, location: { city: string; state: string }): Promise<CnpjSearchCandidate[]> {
    const searchQuery = `"${lead.businessName}" "${location.city}" ${location.state} CNPJ`;
    const searchRes = await axios.post('https://google.serper.dev/search', {
      q: searchQuery,
      gl: 'br',
      hl: 'pt-br'
    }, {
      headers: { 'X-API-KEY': serperApiKey }
    });

    const items = [
      ...(searchRes.data?.organic || []),
      ...(searchRes.data?.places || []),
      ...(searchRes.data?.knowledgeGraph ? [searchRes.data.knowledgeGraph] : [])
    ];

    const unique = new Map<string, CnpjSearchCandidate>();
    for (const item of items) {
      const text = JSON.stringify({
        title: item.title,
        snippet: item.snippet,
        attributes: item.attributes,
        address: item.address,
        link: item.link
      });
      const matches = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g) || [];

      for (const match of matches) {
        const cnpj = this.cleanCnpj(match);
        if (!cnpj || unique.has(cnpj)) continue;

        unique.set(cnpj, {
          cnpj,
          source: "serper_search",
          sourceUrl: item.link || item.url || null,
          evidence: {
            query: searchQuery,
            title: item.title,
            snippet: item.snippet,
            address: item.address
          }
        });
      }
    }

    return Array.from(unique.values()).slice(0, 10);
  }

  private async fetchCnpjRegistry(cnpj: string) {
    const clean = this.cleanCnpj(cnpj);
    if (!clean) return null;

    const providers = [
      () => axios.get(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, { timeout: 10000 }),
      () => axios.get(`https://minhareceita.org/${clean}`, { timeout: 10000 }),
      () => axios.get(`https://api.muac.com.br/cnpj/${clean}`, {
        timeout: 10000,
        headers: process.env.MUAC_API_KEY ? { Authorization: `Bearer ${process.env.MUAC_API_KEY}` } : undefined
      })
    ];

    for (const provider of providers) {
      try {
        const { data } = await provider();
        const registry = this.normalizeCnpjRegistry(data);
        if (registry) return registry;
      } catch (err: any) {
        console.warn("[CNPJ_REGISTRY_LOOKUP_FAILED]", err?.response?.status || err.message);
      }
    }

    return null;
  }

  private normalizeCnpjRegistry(data: any): NormalizedRegistry {
    const partners = (data?.qsa || data?.quadro_societario || [])
      .map((partner: any) => ({
        name: partner.nome_socio || partner.nome || partner.nome_socio_razao_social,
        role: partner.qualificacao_socio || partner.qualificacao || partner.qualificacao_representante_legal
      }))
      .filter((partner: any) => partner.name);

    return {
      cnpj: this.cleanCnpj(data?.cnpj || data?.identificacao?.cnpj),
      legalName: data?.razao_social || data?.identificacao?.razao_social,
      tradeName: data?.nome_fantasia || data?.identificacao?.nome_fantasia,
      city: data?.municipio || data?.localizacao?.municipio,
      state: data?.uf || data?.localizacao?.uf,
      address: [
        data?.logradouro || data?.localizacao?.logradouro,
        data?.numero || data?.localizacao?.numero,
        data?.bairro || data?.localizacao?.bairro
      ].filter(Boolean).join(", ") || null,
      registryStatus: data?.descricao_situacao_cadastral || data?.situacao_cadastral || data?.situacao,
      phone: data?.ddd_telefone_1 || data?.telefone || null,
      email: data?.email || null,
      partners,
      rawData: data
    };
  }

  private matchesLeadLocation(registry: any, lead: any): boolean {
    const leadState = this.normalizeText(lead.state);
    const registryState = this.normalizeText(registry.state);
    const leadCity = this.normalizeText(lead.city);
    const registryCity = this.normalizeText(registry.city);

    if (leadState && registryState && leadState !== registryState) return false;
    if (leadCity && registryCity && leadCity !== registryCity) return false;

    return true;
  }

  private resolveLeadLocation(lead: any): { city: string | null; state: string | null; source: string } {
    const parsed = this.parseBrazilianLocation(lead.address);
    const city = lead.city || parsed.city || lead.source?.city || null;
    const state = this.normalizeState(lead.state || parsed.state || lead.source?.state || null);

    return {
      city: city ? this.toTitleCase(city) : null,
      state,
      source: lead.city || lead.state ? "lead" : parsed.city || parsed.state ? "address" : "source"
    };
  }

  private async rejectIdentity(lead: any, reason: string, input?: any) {
    const updated = await this.prisma.capturedLead.update({
      where: { id: lead.id },
      data: {
        cnpj: null,
        cnpjStatus: "needs_review",
        cnpjMatchScore: null,
        cnpjMatchReason: reason,
        matchedLegalName: null,
        matchedTradeName: null,
        matchedCity: null,
        matchedState: null,
        matchedAddress: null,
        cnpjSourceUrl: null,
        owners: null,
        notes: this.appendNote(lead.notes, `Enriquecimento: ${reason}`)
      }
    });

    await this.logIdentityDecision(lead, "enrich_lead", "needs_review", null, null, reason, input);
    return updated;
  }

  private async saveIdentityCandidate(lead: any, candidate: CnpjSearchCandidate, registry: NormalizedRegistry | null, score: MatchScore) {
    await this.prisma.companyIdentityCandidate.create({
      data: {
        organizationId: lead.organizationId,
        capturedLeadId: lead.id,
        cnpj: this.formatCnpj(candidate.cnpj),
        legalName: registry?.legalName,
        tradeName: registry?.tradeName,
        city: registry?.city,
        state: registry?.state,
        address: registry?.address,
        registryStatus: registry?.registryStatus,
        source: candidate.source,
        sourceUrl: candidate.sourceUrl,
        evidence: candidate.evidence as any,
        rawData: registry?.rawData as any,
        score: score.total,
        status: score.gatesPassed && score.total >= 85 ? "accepted" : "rejected",
        rejectionReason: score.gatesPassed && score.total >= 85 ? null : score.rejectionReason || score.reason
      }
    });
  }

  private async logIdentityDecision(
    lead: any,
    action: string,
    decision: string,
    selectedCnpj: string | null,
    score: number | null,
    reason: string,
    input?: any
  ) {
    await this.prisma.companyIdentityAuditLog.create({
      data: {
        organizationId: lead.organizationId,
        capturedLeadId: lead.id,
        action,
        decision,
        selectedCnpj: selectedCnpj ? this.formatCnpj(selectedCnpj) : null,
        score,
        reason,
        input: input as any
      }
    });
  }

  private scoreCompanyMatch(
    lead: any,
    registry: NormalizedRegistry,
    location: { city: string; state: string },
    candidate: CnpjSearchCandidate
  ): MatchScore {
    const cleanCnpj = this.cleanCnpj(candidate.cnpj);
    if (!cleanCnpj || !this.isValidCnpj(cleanCnpj)) {
      return { total: 0, gatesPassed: false, reason: "CNPJ candidato tem digito verificador invalido.", rejectionReason: "invalid_cnpj" };
    }

    const leadState = this.normalizeState(location.state);
    const registryState = this.normalizeState(registry.state);
    if (!leadState || !registryState || leadState !== registryState) {
      return { total: 0, gatesPassed: false, reason: `UF divergente: alvo ${leadState || "N/A"} x registro ${registryState || "N/A"}.`, rejectionReason: "state_mismatch" };
    }

    const citySimilarity = this.similarity(location.city, registry.city);
    if (citySimilarity < 0.9) {
      return { total: Math.round(citySimilarity * 25) + 20, gatesPassed: false, reason: `Cidade divergente: alvo ${location.city} x registro ${registry.city || "N/A"}.`, rejectionReason: "city_mismatch" };
    }

    const leadName = this.normalizeCompanyName(lead.businessName);
    const tradeSimilarity = this.similarity(leadName, this.normalizeCompanyName(registry.tradeName));
    const legalSimilarity = this.similarity(leadName, this.normalizeCompanyName(registry.legalName));
    const nameSimilarity = Math.max(tradeSimilarity, legalSimilarity);
    if (nameSimilarity < 0.72) {
      return { total: 45 + Math.round(nameSimilarity * 30), gatesPassed: false, reason: `Nome divergente: ${lead.businessName} x ${registry.tradeName || registry.legalName || "N/A"}.`, rejectionReason: "name_mismatch" };
    }

    let total = 0;
    total += 20;
    total += Math.round(citySimilarity * 25);
    total += Math.round(tradeSimilarity * 25);
    total += Math.round(legalSimilarity * 20);
    total += this.addressLooksCompatible(lead.address, registry.address) ? 5 : 0;
    total += this.phoneLooksCompatible(lead.phoneNormalized || lead.phone, registry.phone) ? 5 : 0;
    total += this.evidenceMentionsLocation(candidate.evidence, location) ? 5 : 0;

    const status = this.normalizeText(registry.registryStatus);
    if (status.includes("ATIVA") || status === "2") total += 5;

    total = Math.min(100, total);
    return {
      total,
      gatesPassed: true,
      reason: `CNPJ validado por UF, cidade e nome. Score ${total}. Nome ${Math.round(nameSimilarity * 100)}%, cidade ${Math.round(citySimilarity * 100)}%.`
    };
  }

  private normalizeCompanyName(value?: string | null): string {
    return this.normalizeText(value)
      .replace(/\b(LTDA|EIRELI|EPP|ME|S\/A|SA|S A|COMERCIO|SERVICOS|SERVICO|EMPRESA|MATRIZ|FILIAL)\b/g, " ")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private similarity(a?: string | null, b?: string | null): number {
    const left = this.normalizeText(a);
    const right = this.normalizeText(b);
    if (!left || !right) return 0;
    if (left === right) return 1;

    const distance = this.levenshtein(left, right);
    const levRatio = 1 - distance / Math.max(left.length, right.length);
    const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
    const rightTokens = new Set(right.split(/\s+/).filter(Boolean));
    const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
    const tokenRatio = intersection ? (2 * intersection) / (leftTokens.size + rightTokens.size) : 0;

    return Math.max(0, Math.min(1, (levRatio * 0.55) + (tokenRatio * 0.45)));
  }

  private levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }

    return dp[a.length][b.length];
  }

  private isValidCnpj(cnpj: string): boolean {
    const digits = this.cleanCnpj(cnpj);
    if (!digits || /^(\d)\1+$/.test(digits)) return false;

    const calc = (base: string, weights: number[]) => {
      const sum = base.split("").reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const first = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = calc(digits.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digits.endsWith(`${first}${second}`);
  }

  private addressLooksCompatible(leadAddress?: string | null, registryAddress?: string | null): boolean {
    const lead = this.normalizeText(leadAddress);
    const registry = this.normalizeText(registryAddress);
    if (!lead || !registry) return false;
    return lead.includes(registry.slice(0, 12)) || registry.includes(lead.slice(0, 12));
  }

  private phoneLooksCompatible(leadPhone?: string | null, registryPhone?: string | null): boolean {
    const lead = String(leadPhone || "").replace(/\D/g, "");
    const registry = String(registryPhone || "").replace(/\D/g, "");
    if (lead.length < 8 || registry.length < 8) return false;
    return lead.endsWith(registry.slice(-8)) || registry.endsWith(lead.slice(-8));
  }

  private evidenceMentionsLocation(evidence: any, location: { city: string; state: string }): boolean {
    const text = this.normalizeText(JSON.stringify(evidence || {}));
    return text.includes(this.normalizeText(location.city)) && text.includes(this.normalizeText(location.state));
  }

  private normalizeState(value?: string | null): string | null {
    const normalized = this.normalizeText(value);
    if (!normalized) return null;
    const aliases: Record<string, string> = {
      "SANTA CATARINA": "SC",
      "SAO PAULO": "SP",
      PARANA: "PR",
      "RIO GRANDE DO SUL": "RS",
      "RIO DE JANEIRO": "RJ",
      "MINAS GERAIS": "MG",
      BAHIA: "BA",
      GOIAS: "GO"
    };
    if (/^[A-Z]{2}$/.test(normalized)) return normalized;
    return aliases[normalized] || normalized;
  }

  private parseBrazilianLocation(address?: string | null): { city: string | null; state: string | null } {
    const raw = String(address || "").trim();
    const stateMatch = raw.match(/(?:^|[\s,/-])([A-Z]{2})(?:\s*,?\s*Brasil|\s*$)/i);
    const state = this.normalizeState(stateMatch?.[1] || null);
    if (!state) return { city: null, state: null };

    const stateIndex = raw.toUpperCase().lastIndexOf(state);
    const beforeState = stateIndex >= 0 ? raw.slice(0, stateIndex) : raw;
    const parts = beforeState.split(/[,|-]/).map(part => part.trim()).filter(Boolean);
    return { city: parts.length ? parts[parts.length - 1] : null, state };
  }

  private toTitleCase(value: string): string {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private appendNote(existing: string | null | undefined, note: string): string {
    return [existing, note].filter(Boolean).join("\n\n");
  }

  private cleanCnpj(cnpj?: string | null): string | null {
    const digits = String(cnpj || "").replace(/\D/g, "");
    return digits.length === 14 ? digits : null;
  }

  private formatCnpj(cnpj: string): string {
    const digits = this.cleanCnpj(cnpj) || cnpj;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  private normalizeText(value?: string | null): string {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  }

  private parseJsonObject(content?: string | null) {
    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  private async runGroqChat(
    orgId: string,
    input: { system: string; message: string; temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const keys = await getOrgAIKeys(this.prisma, orgId);
    const apiKey = keys.groqKey;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY nao configurada para a organizacao.");
    }

    const baseUrl = (process.env.GROQ_API_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
    const model = process.env.GROQ_CAPTURE_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.message },
        ],
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxTokens ?? 2048,
      }),
    });

    const rawText = await response.text();
    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      const details = data?.error?.message || data?.message || rawText || "Groq indisponivel";
      throw Object.assign(new Error(details), { status: response.status, details: data });
    }

    return data?.choices?.[0]?.message?.content || "";
  }

  private buildCaptureCardPrompt(lead: any): string {
    const input = {
      nome: lead.businessName || "",
      segmento: lead.category || "",
      cidade: [lead.city, lead.state].filter(Boolean).join(" - "),
      endereco: lead.address || "",
      tem_site: Boolean(lead.website),
      tem_whatsapp: Boolean(lead.phone || lead.phoneNormalized),
      instagram: lead.instagram || "",
      google_reviews: Number.isFinite(Number(lead.reviewsCount)) ? Number(lead.reviewsCount) : null,
      tem_trafego_pago: this.detectPaidTraffic(lead),
      cnpj_encontrado: Boolean(lead.cnpj && lead.cnpjStatus === "validated"),
      decisores: this.getLeadDecisionMakers(lead).map(decisor => ({
        nome: decisor.nome,
        cargo: decisor.cargo,
      })),
      observacoes: lead.notes || "",
    };

    return `
Voce e uma IA especialista em inteligencia comercial, prospeccao B2B e analise de empresas locais.

Sua funcao e analisar dados de uma empresa (lead) e gerar um CARD DE CAPTACAO altamente estrategico, objetivo e acionavel para um SDR ou Closer.

O objetivo NAO e descrever a empresa, mas sim:
-> Ajudar a decidir se vale abordar
-> Mostrar como abordar
-> Gerar oportunidade de venda

DADOS DE ENTRADA:
${JSON.stringify(input, null, 2)}

SAIDA OBRIGATORIA:
Retorne SOMENTE JSON valido no seguinte formato:
{
  "score": {
    "valor": 0,
    "classificacao": "Alta | Media | Baixa",
    "justificativa": ["", "", ""]
  },
  "recomendacao_ia": "",
  "oportunidade": {
    "nivel": "Alta | Media | Baixa",
    "ticket_estimado": "R$ faixa",
    "maturidade_digital": "Alta | Media | Baixa",
    "fit_icp": "Alto | Medio | Baixo"
  },
  "diagnostico": {
    "resumo": "",
    "dores": ["", "", ""],
    "oportunidades": ["", "", ""]
  },
  "decisores": [
    {
      "nome": "",
      "cargo": "",
      "nivel_influencia": "Alto | Medio | Baixo"
    }
  ],
  "estrategia_abordagem": {
    "canal_prioritario": "WhatsApp | Ligacao | Instagram",
    "melhor_horario": "",
    "angulo": "",
    "gatilho": ""
  },
  "script_sdr": {
    "abertura": "",
    "conexao": "",
    "oferta": "",
    "cta": ""
  },
  "acoes_recomendadas": ["", "", ""]
}

REGRAS IMPORTANTES:
- Seja DIRETO, nada de textos longos
- Linguagem comercial, pratica e agressiva (modo vendedor)
- Foque em gerar DINHEIRO e oportunidade
- Se nao houver dados, inferir com base no segmento
- Penalizar score se nao tem site, nao tem trafego pago ou baixa presenca digital
- Aumentar score se tem decisor identificado e estrutura minima digital

LOGICA DO SCORE:
+20 tem site
+20 tem trafego pago
+15 tem WhatsApp
+15 tem decisor
+10 boas avaliacoes
-20 sem presenca digital
-15 negocio muito pequeno

TOM:
Errado: "A empresa parece ter algumas oportunidades..."
Certo: "Alta chance de fechamento - empresa sem geracao previsivel de leads."
`;
  }

  private normalizeCaptureCard(input: any, lead: any): CaptureCard {
    const fallback = this.buildFallbackCaptureCard(lead);
    const score = input?.score || {};
    const oportunidade = input?.oportunidade || {};
    const diagnostico = input?.diagnostico || {};
    const estrategia = input?.estrategia_abordagem || {};
    const script = input?.script_sdr || {};

    return {
      score: {
        valor: this.toScoreNumber(score.valor, fallback.score.valor),
        classificacao: this.toClassification(score.classificacao, fallback.score.classificacao),
        justificativa: this.toStringArray(score.justificativa, fallback.score.justificativa, 3),
      },
      recomendacao_ia: this.toCleanString(input?.recomendacao_ia, fallback.recomendacao_ia),
      oportunidade: {
        nivel: this.toClassification(oportunidade.nivel, fallback.oportunidade.nivel),
        ticket_estimado: this.toCleanString(oportunidade.ticket_estimado, fallback.oportunidade.ticket_estimado),
        maturidade_digital: this.toClassification(oportunidade.maturidade_digital, fallback.oportunidade.maturidade_digital),
        fit_icp: this.toInfluence(oportunidade.fit_icp, fallback.oportunidade.fit_icp),
      },
      diagnostico: {
        resumo: this.toCleanString(diagnostico.resumo, fallback.diagnostico.resumo),
        dores: this.toStringArray(diagnostico.dores, fallback.diagnostico.dores, 4),
        oportunidades: this.toStringArray(diagnostico.oportunidades, fallback.diagnostico.oportunidades, 4),
      },
      decisores: Array.isArray(input?.decisores) && input.decisores.length
        ? input.decisores.slice(0, 5).map((item: any) => ({
            nome: this.toCleanString(item?.nome, "Decisor nao identificado"),
            cargo: this.toCleanString(item?.cargo, "Socio / responsavel comercial"),
            nivel_influencia: this.toInfluence(item?.nivel_influencia, "Alto"),
          }))
        : fallback.decisores,
      estrategia_abordagem: {
        canal_prioritario: this.toChannel(estrategia.canal_prioritario, fallback.estrategia_abordagem.canal_prioritario),
        melhor_horario: this.toCleanString(estrategia.melhor_horario, fallback.estrategia_abordagem.melhor_horario),
        angulo: this.toCleanString(estrategia.angulo, fallback.estrategia_abordagem.angulo),
        gatilho: this.toCleanString(estrategia.gatilho, fallback.estrategia_abordagem.gatilho),
      },
      script_sdr: {
        abertura: this.toCleanString(script.abertura, fallback.script_sdr.abertura),
        conexao: this.toCleanString(script.conexao, fallback.script_sdr.conexao),
        oferta: this.toCleanString(script.oferta, fallback.script_sdr.oferta),
        cta: this.toCleanString(script.cta, fallback.script_sdr.cta),
      },
      acoes_recomendadas: this.toStringArray(input?.acoes_recomendadas, fallback.acoes_recomendadas, 4),
    };
  }

  private buildFallbackCaptureCard(lead: any): CaptureCard {
    const score = this.calculateCaptureScore(lead);
    const hasWebsite = Boolean(lead.website);
    const hasPhone = Boolean(lead.phone || lead.phoneNormalized);
    const hasDecisionMaker = this.getLeadDecisionMakers(lead).length > 0;
    const segment = lead.category || "empresa local";
    const city = [lead.city, lead.state].filter(Boolean).join("/") || "regiao";
    const maturity = this.digitalMaturity(lead);
    const decisores = this.getLeadDecisionMakers(lead);

    return {
      score: {
        valor: score.value,
        classificacao: score.classification,
        justificativa: score.justifications,
      },
      recomendacao_ia: `${score.classification} chance de fechamento - ${hasWebsite ? "empresa com estrutura minima digital" : "empresa sem site claro"} e oportunidade de gerar demanda previsivel.`,
      oportunidade: {
        nivel: score.classification,
        ticket_estimado: this.estimateTicket(segment),
        maturidade_digital: maturity,
        fit_icp: score.value >= 70 ? "Alto" : score.value >= 45 ? "Medio" : "Baixo",
      },
      diagnostico: {
        resumo: `${lead.businessName} atua em ${segment} em ${city}. Oportunidade principal: transformar buscas locais em conversas comerciais e previsibilidade de leads.`,
        dores: [
          hasWebsite ? "Site existe, mas precisa provar geracao previsivel de demanda." : "Sem site institucional forte para converter buscas em leads.",
          hasPhone ? "WhatsApp disponivel, mas sem esteira comercial clara." : "Contato direto nao apareceu na captacao.",
          hasDecisionMaker ? "Decisor mapeado, abordagem pode ser direta." : "Decisor ainda precisa ser localizado antes da venda.",
        ],
        oportunidades: [
          "Criar funil de captacao previsivel com WhatsApp como canal de conversao.",
          "Usar reputacao local para abrir conversa com proposta de crescimento.",
          "Mapear concorrentes investindo em trafego e posicionar oferta de resposta rapida.",
        ],
      },
      decisores: decisores.length ? decisores : [{
        nome: "Decisor nao identificado",
        cargo: "Socio / responsavel comercial",
        nivel_influencia: "Alto",
      }],
      estrategia_abordagem: {
        canal_prioritario: hasPhone ? "WhatsApp" : lead.instagram ? "Instagram" : "Ligacao",
        melhor_horario: "09h - 11h / 14h - 16h",
        angulo: "Geracao previsivel de leads e dinheiro no caixa",
        gatilho: hasWebsite ? "Concorrentes investindo em aquisicao local" : "Baixa presenca digital travando conversao",
      },
      script_sdr: {
        abertura: `Ola, tudo bem? Aqui e o Paulo. Falo com quem cuida do comercial da ${lead.businessName}?`,
        conexao: `Vi que a ${lead.businessName} tem demanda local em ${city} e queria entender como voces geram oportunidades hoje.`,
        oferta: "Ajudamos empresas locais a organizar entrada de leads e converter mais conversas em vendas, sem depender so de indicacao.",
        cta: "Posso te mostrar em 15 minutos onde esta a oportunidade mais rapida?",
      },
      acoes_recomendadas: [
        "Iniciar abordagem via WhatsApp com script sugerido.",
        "Confirmar decisor antes de apresentar diagnostico.",
        "Agendar reuniao curta de diagnostico comercial.",
      ],
    };
  }

  private calculateCaptureScore(lead: any): { value: number; classification: CaptureClassification; justifications: string[] } {
    const hasWebsite = Boolean(lead.website);
    const hasPhone = Boolean(lead.phone || lead.phoneNormalized);
    const hasDecisionMaker = this.getLeadDecisionMakers(lead).length > 0;
    const hasPaidTraffic = this.detectPaidTraffic(lead) === true;
    const reviews = Number(lead.reviewsCount || 0);
    const rating = Number(lead.rating || 0);
    const goodReviews = rating >= 4.2 && reviews >= 10;
    const highDemand = this.isHighDemandSegment(lead.category);
    const noDigitalPresence = !hasWebsite && !lead.instagram && !lead.facebook && !lead.linkedin;
    const verySmall = reviews > 0 && reviews < 8 && !hasWebsite;

    const parts = [
      { label: hasWebsite ? "Tem site institucional" : "Nao tem site institucional", value: hasWebsite ? 20 : -20 },
      { label: hasPaidTraffic ? "Trafego pago detectado" : "Sem trafego pago detectado", value: hasPaidTraffic ? 20 : -20 },
      { label: hasPhone ? "WhatsApp/telefone disponivel" : "Sem WhatsApp/telefone claro", value: hasPhone ? 15 : -15 },
      { label: hasDecisionMaker ? "Decisor identificado" : "Decisor nao identificado", value: hasDecisionMaker ? 15 : -10 },
      { label: goodReviews ? "Avaliacoes fortes no Google" : "Pouca prova social no Google", value: goodReviews ? 10 : -5 },
      { label: highDemand ? "Segmento com alta demanda local" : "Demanda do segmento precisa ser validada", value: highDemand ? 20 : 0 },
      { label: noDigitalPresence ? "Baixa presenca digital" : "Presenca digital minima", value: noDigitalPresence ? -20 : 5 },
      { label: verySmall ? "Negocio aparenta ser muito pequeno" : "Porte minimo comercial aceitavel", value: verySmall ? -15 : 0 },
    ];

    const total = parts.reduce((acc, item) => acc + item.value, 50);
    const value = Math.max(0, Math.min(100, Math.round(total)));
    const classification: CaptureClassification = value >= 70 ? "Alta" : value >= 45 ? "Media" : "Baixa";
    const justifications = parts
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 3)
      .map(item => `${item.label} (${item.value > 0 ? "+" : ""}${item.value})`);

    return { value, classification, justifications };
  }

  private detectPaidTraffic(lead: any): boolean | null {
    const raw = JSON.stringify(lead.rawData || {}).toLowerCase();
    if (!raw || raw === "{}") return null;
    if (/patrocinado|sponsored|google_ads|paid_traffic|trafego_pago|ad_position|anuncio|ads?_/i.test(raw)) {
      return true;
    }
    return null;
  }

  private getLeadDecisionMakers(lead: any): CaptureCard["decisores"] {
    const owners = String(lead.owners || "")
      .split(/[,;|\n]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const roleMatch = item.match(/\(([^)]+)\)/);
        return {
          nome: item.replace(/\([^)]*\)/g, "").trim(),
          cargo: roleMatch?.[1] || "Socio / administrador",
          nivel_influencia: "Alto" as const,
        };
      });

    const managers = String(lead.managementTeam || "")
      .split(/[,;|\n]+/)
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const parts = item.split(/\s+-\s+|\s+\|\s+|:/);
        return {
          nome: parts[0]?.trim() || item,
          cargo: parts[1]?.trim() || "Gestao / comercial",
          nivel_influencia: "Alto" as const,
        };
      });

    const unique = new Map<string, CaptureCard["decisores"][number]>();
    [...owners, ...managers].forEach(item => {
      if (item.nome) unique.set(this.normalizeText(item.nome), item);
    });
    return Array.from(unique.values()).slice(0, 5);
  }

  private digitalMaturity(lead: any): CaptureClassification {
    const hasWebsite = Boolean(lead.website);
    const hasSocial = Boolean(lead.instagram || lead.facebook || lead.linkedin);
    const reviews = Number(lead.reviewsCount || 0);
    if (hasWebsite && hasSocial && reviews >= 30) return "Alta";
    if (hasWebsite || hasSocial || reviews >= 10) return "Media";
    return "Baixa";
  }

  private estimateTicket(segment?: string | null): string {
    const normalized = this.normalizeText(segment);
    if (/IMOB|CONSTR|ADV|SAUDE|ODONT|CLINIC|MEDIC/.test(normalized)) return "R$ 1.500 - R$ 3.000/mes";
    if (/RESTAUR|BAR|LANCH|ESTET|ACADEM|AUTO/.test(normalized)) return "R$ 900 - R$ 2.000/mes";
    return "R$ 800 - R$ 1.800/mes";
  }

  private isHighDemandSegment(segment?: string | null): boolean {
    return /IMOB|CONSTR|ADV|SAUDE|ODONT|CLINIC|MEDIC|ESTET|ACADEM|RESTAUR|BAR|LANCH|AUTO|EDUC|FARM/.test(this.normalizeText(segment));
  }

  private toScoreNumber(value: unknown, fallback: number): number {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  private toCleanString(value: unknown, fallback: string): string {
    const text = typeof value === "string" ? value.trim() : "";
    return text || fallback;
  }

  private toStringArray(value: unknown, fallback: string[], limit: number): string[] {
    const source = Array.isArray(value) ? value : fallback;
    const cleaned = source
      .map(item => typeof item === "string" ? item.trim() : "")
      .filter(Boolean)
      .slice(0, limit);
    return cleaned.length ? cleaned : fallback.slice(0, limit);
  }

  private toClassification(value: unknown, fallback: CaptureClassification): CaptureClassification {
    const normalized = this.normalizeText(typeof value === "string" ? value : "");
    if (normalized === "ALTA") return "Alta";
    if (normalized === "MEDIA" || normalized === "MEDIO") return "Media";
    if (normalized === "BAIXA" || normalized === "BAIXO") return "Baixa";
    return fallback;
  }

  private toInfluence(value: unknown, fallback: "Alto" | "Médio" | "Medio" | "Baixo"): "Alto" | "Medio" | "Baixo" {
    const normalized = this.normalizeText(typeof value === "string" ? value : "");
    if (normalized === "ALTO" || normalized === "ALTA") return "Alto";
    if (normalized === "MEDIO" || normalized === "MEDIA") return "Medio";
    if (normalized === "BAIXO" || normalized === "BAIXA") return "Baixo";
    return fallback === "Médio" ? "Medio" : fallback;
  }

  private toChannel(value: unknown, fallback: CaptureCard["estrategia_abordagem"]["canal_prioritario"]): CaptureCard["estrategia_abordagem"]["canal_prioritario"] {
    const normalized = this.normalizeText(typeof value === "string" ? value : "");
    if (normalized.includes("WHATS")) return "WhatsApp";
    if (normalized.includes("INST")) return "Instagram";
    if (normalized.includes("LIG")) return "Ligacao";
    return fallback;
  }

  private buildFallbackDiagnosis(lead: any) {
    const hasWebsite = Boolean(lead.website);
    const hasPhone = Boolean(lead.phone || lead.phoneNormalized);
    const rating = Number(lead.rating || 0);
    const reviewsCount = Number(lead.reviewsCount || 0);
    const opportunities = [
      "Localizar o decisor comercial antes de qualquer apresentacao.",
      "Mapear como entram novos clientes hoje e onde ha perda de oportunidades.",
      "Organizar uma estrutura comercial mais previsivel para aumentar receita."
    ];
    const weaknesses = [
      !hasPhone ? "Telefone nao identificado na captacao." : null,
      !hasWebsite ? "Site nao identificado na captacao." : null,
      reviewsCount < 20 ? "Baixo volume de avaliacoes publicas pode limitar prova social." : null,
      rating > 0 && rating < 4 ? "Nota publica abaixo do ideal pode prejudicar conversao." : null
    ].filter(Boolean);

    return {
      diagnosis: `Analise comercial preliminar de ${lead.businessName}. O foco recomendado e confirmar quem decide pelo comercial, entender como a empresa gera oportunidades hoje e avaliar se existe espaco para uma estrutura comercial que aumente previsibilidade e caixa.`,
      weaknesses: weaknesses.length ? weaknesses : ["Diagnostico limitado ate conversar com o decisor."],
      opportunities,
      suggested_offer: "Estruturacao comercial para melhorar aquisicao, conversao e previsibilidade de receita.",
      priority_level: lead.opportunityLevel || (lead.scoreOpportunity >= 70 ? "Alta" : lead.scoreOpportunity >= 40 ? "Media" : "Baixa"),
      main_argument: "Conversa sobre estrutura comercial para vender melhor e colocar mais dinheiro no caixa.",
      probable_objections: ["Nao sou eu que cuido disso", "Ja temos alguem olhando comercial", "Pode mandar por mensagem"],
      next_action: "Falar primeiro com socio, proprietario, administrador ou responsavel comercial."
    };
  }

  async researchManagement(leadId: string, orgId: string) {
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { serperApiKey: true }
    });

    const serperApiKey = org?.serperApiKey || process.env.SERPER_API_KEY;

    if (!serperApiKey) {
      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          notes: this.appendNote(
            lead.notes,
            "Pesquisa de decisores pendente: configure SERPER_API_KEY ou a chave Serper da organizacao para buscar gestores automaticamente."
          )
        }
      });
    }

    const searchQuery = `site:linkedin.com/in "${lead.businessName}" (CEO OR Diretor OR Gerente OR Proprietário OR Founder)`;
    
    try {
      const searchRes = await axios.post('https://google.serper.dev/search', {
        q: searchQuery,
        gl: 'br',
        hl: 'pt-br'
      }, {
        headers: { 'X-API-KEY': serperApiKey }
      });

      const searchData = JSON.stringify(searchRes.data);

      const prompt = `
        Abaixo estão resultados de busca do LinkedIn para a empresa "${lead.businessName}".
        Extraia nomes de pessoas e seus respectivos cargos de gestão (CEO, Diretor, Gerente, etc).
        Ignore resultados que não pareçam ser perfis individuais claros.

        Resultados da Busca:
        ${searchData.substring(0, 5000)}

        Responda EXCLUSIVAMENTE em JSON:
        {
          "management": "string com nomes e cargos separados por vírgula ou null"
        }
      `;

      const aiResponse = await this.runGroqChat(orgId, {
        system: "Voce extrai decisores de resultados de busca. Responda somente JSON valido.",
        message: prompt,
        temperature: 0.2,
        maxTokens: 2048,
      });

      const result = this.parseJsonObject(aiResponse) || {};

      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          managementTeam: result.management
        }
      });
    } catch (err: any) {
      console.error("[RESEARCH_MANAGEMENT_ERROR]", err.message);
      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          notes: this.appendNote(
            lead.notes,
            `Pesquisa de decisores pendente: ${err.message || "falha ao consultar dados externos."}`
          )
        }
      });
    }
  }
}
