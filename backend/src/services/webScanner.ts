import axios from "axios";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import { runAiCoreChat } from "./aiCoreClient.js";
import { runGovernedAiText } from "./aiExecution.js";

export interface ScanInput {
  companyName: string;
  website?: string | null;
  instagram?: string | null;
  cnpj?: string | null;
  segment?: string | null;
}

export interface ScanResult {
  companyName: string;
  website: string | null;
  instagram: string | null;
  cnpj: string | null;
  segment: string | null;
  googleResults: Array<{ title: string; url: string; snippet: string }>;
  websiteContent: string | null;
  instagramInfo: string | null;
  productsServices: string[];
  socialProfiles: string[];
  newsMentions: string[];
  dossier: string;
  rawData: {
    serperResponse: any;
    jinaContent: string | null;
    websiteHtml?: string;
  };
}

async function searchGoogle(serperKey: string, query: string) {
  const { data } = await axios.post(
    "https://google.serper.dev/search",
    { q: query, num: 10 },
    { headers: { "X-API-KEY": serperKey } }
  );
  return data;
}

async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const { data } = await axios.get(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`, {
      headers: {
        "X-Return-Format": "markdown",
        "User-Agent": "Mozilla/5.0 (compatible; Nexus360Scanner/1.0)"
      },
      timeout: 20000,
    });
    return typeof data === "string" ? data.slice(0, 15000) : null;
  } catch {
    return null;
  }
}

async function fetchViaCheerio(url: string): Promise<{ text: string; products: string[] }> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const { data: html } = await axios.get(fullUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 15000,
    });
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, iframe").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 10000);

    const productKeywords = ["produto", "serviço", "solução", "catalogo", "produtos", "servicos", "solucoes", "planos", "preços", "precos", "comprar"];
    const products: string[] = [];
    productKeywords.forEach(kw => {
      $(`a[href*="${kw}"], h2, h3, h4, li, p`).each((_, el) => {
        const t = $(el).text().trim();
        if (t.toLowerCase().includes(kw) && t.length < 200) products.push(t);
      });
    });

    return { text, products: [...new Set(products)] };
  } catch {
    return { text: "", products: [] };
  }
}

export async function scanClient(input: ScanInput, serperKey: string, groqKey?: string, orgId?: string, prisma?: PrismaClient): Promise<ScanResult> {
  const { companyName, website, instagram, cnpj, segment } = input;

  const googleQuery = `${companyName} ${segment || ""} ${cnpj ? `CNPJ ${cnpj}` : ""}`.trim();

  const [serperResponse, jinaContent, cheerioResult] = await Promise.all([
    searchGoogle(serperKey, googleQuery).catch(() => null),
    website ? fetchViaJina(website) : Promise.resolve(null),
    website ? fetchViaCheerio(website) : Promise.resolve({ text: "", products: [] }),
  ]);

  const googleResults: Array<{ title: string; url: string; snippet: string }> =
    serperResponse?.organic?.map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })) || [];

  const socialProfiles = googleResults
    .filter(r => /instagram\.com|facebook\.com|linkedin\.com|youtube\.com/.test(r.url))
    .map(r => r.url);

  const newsMentions = (serperResponse?.news || [])
    .map((r: any) => `${r.title}: ${r.link}`);

  const productsServices = [
    ...(cheerioResult.products || []),
    ...extractProductsFromText(jinaContent || cheerioResult.text || ""),
  ];

  const websiteContent = jinaContent || cheerioResult.text || null;

  // Busca e valida CNPJ e Sócios sem gastar token extra
  let discoveredCnpj = cnpj;
  let qsaData: any[] = [];
  let razaoSocial = "";
  
  if (!discoveredCnpj) {
    // Procura o CNPJ nos resultados que já vieram do Serper (sem gastar nova consulta)
    const googleText = googleResults.map(r => `${r.title} ${r.snippet}`).join(" ");
    let match = googleText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    
    // Se não achou no Google, procura no texto do site da empresa (rodapé, contato, etc)
    if (!match && websiteContent) {
      match = websiteContent.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    }
    
    if (match) discoveredCnpj = match[0];
  }

  if (discoveredCnpj) {
    const cleanCnpj = discoveredCnpj.replace(/\D/g, "");
    if (cleanCnpj.length === 14) {
      try {
        const { data: cnpjInfo } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, { timeout: 10000 });
        if (cnpjInfo) {
          qsaData = cnpjInfo.qsa || [];
          razaoSocial = cnpjInfo.razao_social || "";
        }
      } catch { /* CNPJ fetch failed silently */ }
    }
  }

  const decisoresText = qsaData.length > 0 
    ? qsaData.map(s => `- ${s.nome_socio} (${s.qualificacao_socio})`).join("\n") 
    : "Não foi possível identificar o quadro societário automaticamente.";

  const groqPrompt = `Com base nos dados abaixo sobre a empresa "${companyName}", gere um dossiê executivo com:

1. **Resumo da empresa** (atuação, porte aparente, segmento)
2. **Decisores e Sócios (IMPORTANTÍSSIMO)** (Identifique quem são os sócios ou administradores listados e como abordá-los)
3. **Presença digital** (site, redes sociais encontradas, qualidade)
4. **Produtos/Serviços identificados** (liste tudo que parece ser vendido)
5. **Concorrência e mercado** (menções de concorrentes, notícias)
6. **Oportunidades comerciais** (gaps que identificou para vender nossos serviços)

Seja direto e analítico. Use apenas os dados fornecidos, não invente nomes de sócios se não estiverem na lista.

Dados da empresa:
- Nome: ${companyName}
- Razão Social (Receita Federal): ${razaoSocial || "N/A"}
- Website: ${website || "N/A"}
- Instagram: ${instagram || "N/A"}
- CNPJ: ${discoveredCnpj || "N/A"}
- Segmento: ${segment || "N/A"}

Quadro de Sócios e Administradores (Decisores):
${decisoresText}

Resultados do Google (${googleResults.length} encontrados):
${googleResults.slice(0, 8).map(r => `- ${r.title}: ${r.snippet} (${r.url})`).join("\n")}

Notícias:
${newsMentions.slice(0, 5).join("\n") || "Nenhuma encontrada"}

Conteúdo do site:
${(websiteContent || "Não foi possível acessar o site").slice(0, 4000)}

Produtos/Serviços identificados:
${productsServices.slice(0, 20).join("\n") || "Não foi possível identificar produtos específicos."}`;

  let dossier = "";
  try {
    const result = await runAiCoreChat({
      system: "Você é um analista de inteligência de mercado e vendas B2B. Sua função é analisar empresas, identificar os decisores reais e gerar dossiês para a equipe comercial abordar.",
      message: groqPrompt,
      model: "gpt-4o-mini",
      temperature: 0.4,
      maxTokens: 4096,
      clientId: orgId,
      agent: "web-scanner",
    });
    dossier = result.response || "Dossiê não gerado.";
  } catch {
    dossier = "Falha ao gerar dossiê com IA.";
  }

  const instagramInfo = instagram
    ? `Perfil informado: ${instagram}. Para análise detalhada do Instagram, é necessário configurar integração com API do Meta ou fornecer acesso manual.`
    : null;

  return {
    companyName,
    website: website || null,
    instagram: instagram || null,
    cnpj: cnpj || null,
    segment: segment || null,
    googleResults,
    websiteContent,
    instagramInfo,
    productsServices: [...new Set(productsServices)],
    socialProfiles: [...new Set(socialProfiles)],
    newsMentions,
    dossier,
    rawData: {
      serperResponse,
      jinaContent,
      websiteHtml: cheerioResult.text,
    },
  };
}

function extractProductsFromText(text: string): string[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const keywords = ["produto", "serviço", "solução", "plano", "preço", "comprar", "catálogo", "catalogo", "pacote", "kit", "curso", "consultoria", "assinatura", "mensalidade"];
  const found: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (keywords.some(k => lower.includes(k)) && lines[i].length < 200) {
      found.push(lines[i]);
    }
  }
  return found;
}
