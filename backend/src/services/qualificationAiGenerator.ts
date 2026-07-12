import { PrismaClient } from "@prisma/client";
import { getOrgAIKeys } from "../utils/aiKeys.js";

type IcpFieldType = "text" | "email" | "phone" | "number" | "select" | "multi_select" | "boolean" | "textarea";
type RoutingTarget = "SDR" | "BDR" | "CLOSER";
type RoutingOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";

type IcpField = {
  key: string;
  label: string;
  type: IcpFieldType;
  required: boolean;
  options?: string[];
  order: number;
  weight?: number;
  scoreMap?: Record<string, number>;
};

type RoutingRule = {
  field: string;
  operator: RoutingOperator;
  value: any;
  target: RoutingTarget;
  scoreMin?: number;
  scoreMax?: number;
};

type GenerateQualificationInput = {
  niche: string;
  targetAudience?: string;
  offer?: string;
  ticket?: string;
  objective?: string;
  fieldCount?: number;
};

export type GeneratedQualificationForm = {
  name: string;
  description: string;
  icpFields: IcpField[];
  routingRules: RoutingRule[];
  allowScheduling: boolean;
  schedulingMessage: string;
  schedulingLeadTime: number;
  createLead: boolean;
  createFunnelLead: boolean;
};

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = process.env.GROQ_QUALIFICATION_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const FIELD_TYPES: IcpFieldType[] = ["text", "email", "phone", "number", "select", "multi_select", "boolean", "textarea"];
const ROUTING_TARGETS: RoutingTarget[] = ["SDR", "BDR", "CLOSER"];
const ROUTING_OPERATORS: RoutingOperator[] = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"];

function slugifyKey(text: string, fallback: string) {
  const key = String(text || fallback)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);
  return key || fallback;
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseGroqJson(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("A IA retornou um JSON invalido.");
  }
}

function fallbackFields(input: GenerateQualificationInput): IcpField[] {
  const niche = String(input.niche || "seu mercado").trim();
  const offer = String(input.offer || "a solucao").trim();
  const ticket = String(input.ticket || "").trim();
  const budgetLabel = ticket ? `investir cerca de ${ticket} em ${offer}` : `contratar ${offer}`;

  return [
    {
      key: "perfil_decisor",
      label: `Qual e seu papel na decisao sobre ${offer}?`,
      type: "select",
      required: true,
      order: 1,
      weight: 20,
      options: ["Sou decisor final", "Sou socio ou diretor", "Influencio a decisao", "Estou apenas pesquisando"],
      scoreMap: {
        "Sou decisor final": 20,
        "Sou socio ou diretor": 18,
        "Influencio a decisao": 12,
        "Estou apenas pesquisando": 3,
      },
    },
    {
      key: "maior_desafio",
      label: `Qual e o maior desafio da sua empresa hoje que te faria avaliar ${offer}?`,
      type: "textarea",
      required: true,
      order: 2,
      weight: 18,
    },
    {
      key: "processo_atual",
      label: `Como a sua operacao em ${niche} resolve esse ponto hoje?`,
      type: "select",
      required: true,
      options: ["Processo manual ou planilhas", "Ferramentas separadas", "Ja temos solucao, mas queremos melhorar", "Ainda nao existe processo claro"],
      order: 3,
      weight: 18,
      scoreMap: {
        "Processo manual ou planilhas": 18,
        "Ferramentas separadas": 15,
        "Ja temos solucao, mas queremos melhorar": 14,
        "Ainda nao existe processo claro": 6,
      },
    },
    {
      key: "urgencia",
      label: `Quando voces pretendem avaliar ou implementar ${offer}?`,
      type: "select",
      required: true,
      options: ["Imediatamente", "Nos proximos 30 dias", "Nos proximos 90 dias", "Ainda pesquisando"],
      order: 4,
      weight: 18,
      scoreMap: {
        "Imediatamente": 18,
        "Nos proximos 30 dias": 15,
        "Nos proximos 90 dias": 8,
        "Ainda pesquisando": 3,
      },
    },
    {
      key: "orcamento_disponivel",
      label: `Existe budget para ${budgetLabel}?`,
      type: "select",
      required: true,
      options: ["Sim, ja esta previsto", "Depende da proposta", "Ainda nao tenho budget", "Nao sei informar"],
      order: 5,
      weight: 26,
      scoreMap: {
        "Sim, ja esta previsto": 26,
        "Depende da proposta": 16,
        "Ainda nao tenho budget": 4,
        "Nao sei informar": 2,
      },
    },
  ];
}

function sanitizeOptions(options: unknown): string[] | undefined {
  if (!Array.isArray(options)) return undefined;
  const clean = options
    .map((option) => String(option || "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return clean.length >= 2 ? clean : undefined;
}

function sanitizeScoreMap(scoreMap: unknown, options?: string[], weight = 10): Record<string, number> | undefined {
  if (!scoreMap || typeof scoreMap !== "object" || Array.isArray(scoreMap) || !options?.length) return undefined;
  const raw = scoreMap as Record<string, unknown>;
  const clean: Record<string, number> = {};
  for (const option of options) {
    if (raw[option] === undefined) continue;
    clean[option] = clampInt(raw[option], 0, 0, weight);
  }
  return Object.keys(clean).length ? clean : undefined;
}

function sanitizeGeneratedForm(parsed: any, input: GenerateQualificationInput): GeneratedQualificationForm {
  const usedKeys = new Set<string>();
  const rawFields = Array.isArray(parsed?.icpFields) ? parsed.icpFields : [];
  const fields = rawFields
    .map((field: any, index: number): IcpField | null => {
      const label = String(field?.label || "").trim();
      if (!label) return null;

      const labelNorm = slugifyKey(label, "");
      if (["nome", "name", "email", "e_mail", "telefone", "phone", "celular", "whatsapp"].includes(labelNorm)) {
        return null;
      }

      let key = slugifyKey(field?.key || label, `campo_${index + 1}`);
      while (usedKeys.has(key)) key = `${key}_${index + 1}`;
      usedKeys.add(key);

      const type = FIELD_TYPES.includes(field?.type) ? field.type as IcpFieldType : "text";
      const options = type === "select" || type === "multi_select" ? sanitizeOptions(field?.options) : undefined;
      const weight = clampInt(field?.weight, 10, 0, 30);

      return {
        key,
        label,
        type: options ? type : type === "select" || type === "multi_select" ? "text" : type,
        required: field?.required !== false,
        options,
        order: index + 1,
        weight,
        scoreMap: sanitizeScoreMap(field?.scoreMap, options, weight),
      };
    })
    .filter((field: IcpField | null): field is IcpField => Boolean(field));

  const icpFields: IcpField[] = (fields.length >= 3 ? fields : fallbackFields(input))
    .slice(0, 10)
    .map((field: IcpField, index: number): IcpField => ({ ...field, order: index + 1 }));

  const fieldKeys = new Set(icpFields.map((field) => field.key));
  const rawRules = Array.isArray(parsed?.routingRules) ? parsed.routingRules : [];
  const routingRules = rawRules
    .map((rule: any): RoutingRule | null => {
      const field = String(rule?.field || "").trim();
      const target = ROUTING_TARGETS.includes(rule?.target) ? rule.target as RoutingTarget : "SDR";
      const operator = ROUTING_OPERATORS.includes(rule?.operator) ? rule.operator as RoutingOperator : "gte";
      if (field && !fieldKeys.has(field)) return null;
      return {
        field: field || icpFields[0].key,
        operator,
        value: rule?.value ?? "",
        target,
        scoreMin: rule?.scoreMin !== undefined ? clampInt(rule.scoreMin, 0, 0, 100) : undefined,
        scoreMax: rule?.scoreMax !== undefined ? clampInt(rule.scoreMax, 100, 0, 100) : undefined,
      };
    })
    .filter((rule: RoutingRule | null): rule is RoutingRule => Boolean(rule))
    .slice(0, 6);

  const niche = String(input.niche || "publico-alvo").trim();
  const offer = String(input.offer || "oferta").trim();
  const ticket = String(input.ticket || "").trim();

  return {
    name: String(parsed?.name || `Qualificacao ${niche} - ${offer}`).trim(),
    description: String(
      parsed?.description || `Formulario para qualificar ${niche} como compradores de ${offer}${ticket ? ` com ticket ${ticket}` : ""}.`,
    ).trim(),
    icpFields,
    routingRules: routingRules.length ? routingRules : [{ field: icpFields[0].key, operator: "contains", value: "", target: "SDR", scoreMin: 60 }],
    allowScheduling: parsed?.allowScheduling !== false,
    schedulingMessage: String(parsed?.schedulingMessage || "Seu perfil foi qualificado. Escolha o melhor horario para falar com nosso time comercial.").trim(),
    schedulingLeadTime: clampInt(parsed?.schedulingLeadTime, 60, 15, 1440),
    createLead: true,
    createFunnelLead: false,
  };
}

export async function generateQualificationFormWithGroq(
  prisma: PrismaClient,
  organizationId: string,
  input: GenerateQualificationInput,
): Promise<GeneratedQualificationForm> {
  const niche = String(input.niche || "").trim();
  const targetAudience = String(input.targetAudience || "").trim();
  const offer = String(input.offer || "").trim();
  const ticket = String(input.ticket || "").trim();
  if (!niche) throw new Error("Informe o nicho para gerar o formulario.");
  if (!offer) throw new Error("Informe o que voce vende para esse publico-alvo.");

  const keys = await getOrgAIKeys(prisma, organizationId);
  if (!keys.groqKey) {
    throw new Error("Configure a Groq API Key em Configuracoes > Conectores de API antes de usar a IA.");
  }

  const fieldCount = clampInt(input.fieldCount, 6, 4, 10);
  const system = `Voce e um especialista em marketing, CRM e qualificacao ICP para vendas consultivas B2B/B2C.
Responda sempre em JSON puro, sem markdown.
Gere formularios objetivos, com campos de ICP que ajudem vendas a separar lead frio, morno e quente.
Trate "nicho" como o mercado-alvo e "oferta" como o produto/servico vendido.
O respondente e um potencial comprador da oferta, nao o consumidor final do produto do nicho dele.
Se o nicho for "imobiliarias" e a oferta for marketing/CRM, gere perguntas sobre captacao, atendimento, conversao, CRM e maturidade comercial da imobiliaria; nunca sobre comprar apartamento ou escolher imovel.
Nao inclua campos de contato como nome, email ou telefone, pois eles ja existem no formulario publico.`;

  const user = `Crie um formulario de qualificacao de leads para:
- Nicho do publico-alvo: ${niche}
- Quem deve responder: ${targetAudience || "decisor, socio, gestor ou influenciador da compra"}
- Oferta que sera vendida: ${offer}
- Ticket medio: ${ticket || "nao informado"}
- Objetivo adicional: ${input.objective || "captar e qualificar leads para abordagem comercial"}
- Quantidade desejada de campos ICP: ${fieldCount}

Retorne exatamente este formato JSON:
{
  "name": "Nome curto do formulario",
  "description": "Descricao clara do objetivo",
  "icpFields": [
    {
      "key": "snake_case_sem_acentos",
      "label": "Pergunta ao lead",
      "type": "text|number|select|multi_select|boolean|textarea",
      "required": true,
      "options": ["opcao 1", "opcao 2"],
      "order": 1,
      "weight": 10,
      "scoreMap": { "opcao 1": 10, "opcao 2": 3 }
    }
  ],
  "routingRules": [
    { "field": "key_do_campo", "operator": "eq|contains|gte|lte", "value": "valor", "target": "SDR|BDR|CLOSER", "scoreMin": 60 }
  ],
  "allowScheduling": true,
  "schedulingMessage": "Mensagem pos-qualificacao",
  "schedulingLeadTime": 60
}

Regras:
1. Use perguntas para qualificar a compra da oferta, nao o interesse do lead no produto final do proprio nicho.
2. Inclua dor ligada a oferta, processo/ferramentas atuais, volume ou maturidade, urgencia, budget e autoridade de decisao.
3. Para select/multi_select, gere 3 a 5 opcoes e scoreMap coerente com a oferta e o ticket.
4. Pesos devem somar aproximadamente 100.
5. Crie pelo menos uma regra para CLOSER quando scoreMin >= 75 e outra para SDR quando scoreMin >= 45.
6. Tudo em portugues do Brasil.`;

  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${keys.groqKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.35,
      max_completion_tokens: 2500,
      response_format: { type: "json_object" },
    }),
  });

  const rawText = await response.text();
  let payload: any = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = { raw: rawText };
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || rawText || "Groq indisponivel.";
    throw new Error(`Erro ao gerar formulario com Groq: ${message}`);
  }

  const content = payload?.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("A Groq nao retornou conteudo para o formulario.");

  return sanitizeGeneratedForm(parseGroqJson(content), { ...input, niche, targetAudience, offer, ticket });
}
