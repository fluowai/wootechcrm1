import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { runAiCoreChat } from "./aiCoreClient.js";

type ResolvedPartner = {
  name: string;
  role: string | null;
  source: "qsa" | "web_search";
};

type ResolvedCompany = {
  cnpj: string;
  cnpjFormatted: string;
  legalName: string;
  tradeName: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  registryStatus: string | null;
  phone: string | null;
  email: string | null;
  partners: ResolvedPartner[];
  score: number;
  matchReason: string;
};

type ResolvedDecisionMaker = {
  name: string;
  role: string | null;
  source: "qsa" | "web_search" | "linkedin";
  confidenceScore: number;
};

type ResolveResult = {
  company: ResolvedCompany | null;
  decisionMakers: ResolvedDecisionMaker[];
  searchMethod: "cnpj_direct" | "name_search" | "not_found";
  candidates: Array<{ cnpj: string; legalName: string | null; score: number; reason: string }>;
};

export class CompanyResolverService {
  constructor(
    private deps: {
      serperApiKey?: string | null;
      prisma?: PrismaClient;
    },
    private orgId?: string
  ) {}

  async resolve(input: { name?: string | null; cnpj?: string | null }): Promise<ResolveResult> {
    const cleanCnpj = input.cnpj ? this.cleanCnpj(input.cnpj) : null;

    if (cleanCnpj) {
      const registry = await this.fetchCnpjRegistry(cleanCnpj);
      if (registry) {
        const company = this.buildCompany(registry, cleanCnpj, 100, "Consulta direta por CNPJ");
        const qsaDecisores = this.partnersToDecisionMakers(registry.partners, "qsa", 85);
        return {
          company,
          decisionMakers: qsaDecisores,
          searchMethod: "cnpj_direct",
          candidates: [{ cnpj: cleanCnpj, legalName: registry.legalName, score: 100, reason: "Consulta direta por CNPJ" }],
        };
      }
      return {
        company: null,
        decisionMakers: [],
        searchMethod: "cnpj_direct",
        candidates: [],
      };
    }

    if (!input.name) {
      return { company: null, decisionMakers: [], searchMethod: "not_found", candidates: [] };
    }

    return this.resolveByName(input.name);
  }

  private async resolveByName(name: string): Promise<ResolveResult> {
    const candidates = await this.findCnpjCandidates(name);

    if (!candidates.length) {
      return { company: null, decisionMakers: [], searchMethod: "name_search", candidates: [] };
    }

    const evaluated: Array<{ cnpj: string; registry: any; score: number; reason: string }> = [];

    for (const candidate of candidates) {
      const registry = await this.fetchCnpjRegistry(candidate.cnpj);
      if (!registry) continue;
      const score = this.scoreMatch(name, registry);
      evaluated.push({ cnpj: candidate.cnpj, registry, score: score.total, reason: score.reason });
    }

    const best = evaluated.sort((a, b) => b.score - a.score)[0];
    if (!best || best.score < 50) {
      return {
        company: null,
        decisionMakers: [],
        searchMethod: "name_search",
        candidates: evaluated.map(e => ({ cnpj: e.cnpj, legalName: e.registry.legalName, score: e.score, reason: e.reason })),
      };
    }

    const company = this.buildCompany(best.registry, best.cnpj, best.score, best.reason);
    const qsaDecisores = this.partnersToDecisionMakers(best.registry.partners, "qsa", 85);

    const webDecisores: ResolvedDecisionMaker[] = await this.searchDecisionMakersWeb(name, best.registry.legalName || name);

    return {
      company,
      decisionMakers: [...this.deduplicateDecisionMakers([...qsaDecisores, ...webDecisores])],
      searchMethod: "name_search",
      candidates: evaluated.map(e => ({ cnpj: e.cnpj, legalName: e.registry.legalName, score: e.score, reason: e.reason })),
    };
  }

  private async findCnpjCandidates(name: string): Promise<Array<{ cnpj: string; source: string }>> {
    const candidates: Array<{ cnpj: string; source: string }> = [];
    const seen = new Set<string>();

    if (!this.deps.serperApiKey) return candidates;

    const queries = [
      `"${name}" CNPJ`,
      `"${name}" "CNPJ"`,
    ];

    for (const query of queries) {
      try {
        const { data } = await axios.post(
          "https://google.serper.dev/search",
          { q: query, gl: "br", hl: "pt-br", num: 10 },
          { headers: { "X-API-KEY": this.deps.serperApiKey } }
        );

        const items = [
          ...(data.organic || []),
          ...(data.places || []),
          ...(data.knowledgeGraph ? [data.knowledgeGraph] : []),
        ];

        for (const item of items) {
          const text = JSON.stringify({ title: item.title, snippet: item.snippet, attributes: item.attributes });
          const matches = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g) || [];
          for (const match of matches) {
            const clean = this.cleanCnpj(match);
            if (clean && !seen.has(clean)) {
              seen.add(clean);
              candidates.push({ cnpj: clean, source: item.link || "serper_search" });
            }
          }
        }
      } catch { /* ignore */ }
    }

    return candidates;
  }

  async fetchCnpjRegistry(cnpj: string) {
    const clean = this.cleanCnpj(cnpj);
    if (!clean) return null;

    const providers = [
      () => axios.get(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, { timeout: 10000 }),
      () => axios.get(`https://minhareceita.org/${clean}`, { timeout: 10000 }),
      () => axios.get(`https://api.muac.com.br/cnpj/${clean}`, {
        timeout: 10000,
        headers: process.env.MUAC_API_KEY ? { Authorization: `Bearer ${process.env.MUAC_API_KEY}` } : undefined,
      }),
    ];

    for (const provider of providers) {
      try {
        const { data } = await provider();
        const registry = this.normalizeRegistry(data);
        if (registry) return registry;
      } catch { /* ignore */ }
    }

    return null;
  }

  private normalizeRegistry(data: any) {
    const partners = (data?.qsa || data?.quadro_societario || [])
      .map((p: any) => ({
        name: p.nome_socio || p.nome || p.nome_socio_razao_social,
        role: p.qualificacao_socio || p.qualificacao || p.qualificacao_representante_legal,
      }))
      .filter((p: any) => p.name);

    return {
      cnpj: this.cleanCnpj(data?.cnpj || data?.identificacao?.cnpj),
      legalName: data?.razao_social || data?.identificacao?.razao_social,
      tradeName: data?.nome_fantasia || data?.identificacao?.nome_fantasia,
      city: data?.municipio || data?.localizacao?.municipio,
      state: data?.uf || data?.localizacao?.uf,
      address: [data?.logradouro || data?.localizacao?.logradouro, data?.numero || data?.localizacao?.numero, data?.bairro || data?.localizacao?.bairro]
        .filter(Boolean).join(", ") || null,
      registryStatus: data?.descricao_situacao_cadastral || data?.situacao_cadastral || data?.situacao,
      phone: data?.ddd_telefone_1 || data?.telefone || null,
      email: data?.email || null,
      partners,
    };
  }

  private buildCompany(registry: any, cnpj: string, score: number, reason: string): ResolvedCompany {
    return {
      cnpj,
      cnpjFormatted: this.formatCnpj(cnpj),
      legalName: registry.legalName || "",
      tradeName: registry.tradeName || null,
      city: registry.city || null,
      state: registry.state || null,
      address: registry.address || null,
      registryStatus: registry.registryStatus || null,
      phone: registry.phone || null,
      email: registry.email || null,
      partners: (registry.partners || []).map((p: any) => ({
        name: p.name,
        role: p.role || null,
        source: "qsa" as const,
      })),
      score,
      matchReason: reason,
    };
  }

  private scoreMatch(name: string, registry: any): { total: number; reason: string } {
    const cleanName = this.normalizeText(name);
    const cleanLegal = this.normalizeText(registry.legalName);
    const cleanTrade = this.normalizeText(registry.tradeName);

    const legalSim = cleanLegal ? this.similarity(cleanName, this.normalizeCompanyName(cleanLegal)) : 0;
    const tradeSim = cleanTrade ? this.similarity(cleanName, this.normalizeCompanyName(cleanTrade)) : 0;
    const nameSim = Math.max(legalSim, tradeSim);

    if (nameSim > 0.9) return { total: 95 + Math.round(nameSim * 5), reason: `Nome confere (${Math.round(nameSim * 100)}% similaridade)` };
    if (nameSim > 0.75) return { total: 60 + Math.round(nameSim * 30), reason: `Nome similar (${Math.round(nameSim * 100)}% similaridade)` };
    if (nameSim > 0.5) return { total: 30 + Math.round(nameSim * 30), reason: `Nome parcial (${Math.round(nameSim * 100)}% similaridade)` };

    return { total: Math.round(nameSim * 50), reason: `Nome divergente (${Math.round(nameSim * 100)}% similaridade)` };
  }

  private async searchDecisionMakersWeb(companyName: string, legalName: string): Promise<ResolvedDecisionMaker[]> {
    if (!this.deps.serperApiKey) return [];

    try {
      const query = `"${companyName}" (CEO OR "sócio" OR "diretor" OR "proprietário" OR founder OR "gerente")`;
      const { data: searchRes } = await axios.post(
        "https://google.serper.dev/search",
        { q: query, gl: "br", hl: "pt-br", num: 10 },
        { headers: { "X-API-KEY": this.deps.serperApiKey } }
      );

      const searchText = JSON.stringify(searchRes).substring(0, 5000);

      const result = await runAiCoreChat({
        system: "Você extrai nomes de pessoas e cargos de resultados de busca. Responda APENAS JSON.",
        message: `Empresa: ${companyName} (${legalName})\n\nResultados da busca:\n${searchText}\n\nExtraia nomes de pessoas que parecem ser sócios, diretores, CEOs, proprietários ou gerentes desta empresa. Retorne JSON: { "people": [{ "name": string, "role": string | null }] }`,
        model: "gpt-4o-mini",
        temperature: 0.1,
        maxTokens: 500,
        clientId: this.orgId,
        agent: "company-resolver",
      });

      const content = result.response;
      if (!content) return [];

      const parsed = JSON.parse(content);
      const people = Array.isArray(parsed?.people) ? parsed.people : [];

      return people
        .filter((p: any) => p.name && p.name.length > 3)
        .map((p: any) => ({
          name: p.name.trim(),
          role: p.role?.trim() || null,
          source: "web_search" as const,
          confidenceScore: p.role ? 65 : 50,
        }));
    } catch {
      return [];
    }
  }

  private partnersToDecisionMakers(partners: Array<{ name: string; role?: string | null }>, source: "qsa", baseConfidence: number): ResolvedDecisionMaker[] {
    return partners.map((p) => ({
      name: p.name,
      role: p.role || null,
      source,
      confidenceScore: p.role ? baseConfidence : baseConfidence - 10,
    }));
  }

  private deduplicateDecisionMakers(items: ResolvedDecisionMaker[]): ResolvedDecisionMaker[] {
    const seen = new Map<string, ResolvedDecisionMaker>();
    for (const item of items) {
      const key = this.normalizeText(item.name);
      const existing = seen.get(key);
      if (!existing || item.confidenceScore > existing.confidenceScore) {
        seen.set(key, item);
      }
    }
    return Array.from(seen.values());
  }

  private normalizeCompanyName(value?: string | null): string {
    return this.normalizeText(value)
      .replace(/\b(LTDA|EIRELI|EPP|ME|S\/A|SA|S A|COMERCIO|SERVICOS|SERVICO|EMPRESA|MATRIZ|FILIAL|LIMITADA)\b/g, " ")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private similarity(a: string, b: string): number {
    const left = this.normalizeText(a);
    const right = this.normalizeText(b);
    if (!left || !right) return 0;
    if (left === right) return 1;

    const distance = this.levenshtein(left, right);
    const levRatio = 1 - distance / Math.max(left.length, right.length);
    const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
    const rightTokens = new Set(right.split(/\s+/).filter(Boolean));
    const intersection = [...leftTokens].filter((t) => rightTokens.has(t)).length;
    const tokenRatio = intersection ? (2 * intersection) / (leftTokens.size + rightTokens.size) : 0;

    return Math.max(0, Math.min(1, levRatio * 0.55 + tokenRatio * 0.45));
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

  cleanCnpj(cnpj?: string | null): string | null {
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
}
