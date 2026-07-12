import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { getPagination } from "../utils/pagination.js";
import { sanitizeBody } from "../utils/sanitizer.js";
import { sanitizeStoredHtml } from "../utils/security.js";
import { auditFromRequest } from "../utils/auditLogger.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";
import { runGovernedAiText } from "../services/aiExecution.js";
import { getOrgAIKeys } from "../utils/aiKeys.js";
import { normalizeRequestHost } from "../utils/tenantHost.js";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isValidFutureDate(date: Date): boolean {
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now() + 5 * 60 * 1000;
}

async function resolveLandingScheduleOwner(prisma: PrismaClient, organizationId: string) {
  const [agenda, user] = await Promise.all([
    prisma.agenda.findFirst({
      where: {
        organizationId,
        OR: [
          { name: { contains: "Closer", mode: "insensitive" } },
          { name: { contains: "V5", mode: "insensitive" } },
          { name: { contains: "TGA", mode: "insensitive" } },
          { name: { contains: "SDR", mode: "insensitive" } },
          { name: { contains: "Comercial", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findFirst({
      where: {
        organizationId,
        status: "ACTIVE",
        OR: [
          { name: { contains: "Closer", mode: "insensitive" } },
          { department: { contains: "Closer", mode: "insensitive" } },
          { department: { contains: "Comercial", mode: "insensitive" } },
          { name: { contains: "Ana Cristina", mode: "insensitive" } },
          { department: { contains: "SDR", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  const resolvedAgenda = agenda || await prisma.agenda.create({
    data: {
      name: "Agenda Closer - Landing Pages",
      color: "#7b2cff",
      organizationId,
    },
  });

  return {
    agendaId: resolvedAgenda.id,
    userId: user?.id || null,
  };
}

function ensureUniqueSlug(prisma: PrismaClient, baseSlug: string, orgId: string, excludeId?: string): Promise<string> {
  const trySlug = async (slug: string, attempt: number): Promise<string> => {
    const existing = await prisma.landingPage.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) return slug;
    const newSlug = `${baseSlug}-${attempt}`;
    return trySlug(newSlug, attempt + 1);
  };
  return trySlug(baseSlug, 1);
}

function buildLPPrompt(wizardData: any, themeInput: any): string {
  return `Você é um copywriter especialista em landing pages de alta conversão. Gere uma landing page completa em JSON.

DADOS DA OFERTA:
- Empresa: ${wizardData.companyName || "Não informado"}
- Segmento: ${wizardData.segment || "Não informado"}
- Produto/Serviço: ${wizardData.product || "Não informado"}
- Público-alvo: ${wizardData.targetAudience || "Não informado"}
- Cidade/Região: ${wizardData.city || "Não informado"}
- Principal dor: ${wizardData.painPoint || "Não informado"}
- Promessa principal: ${wizardData.promise || "Não informado"}
- Benefícios: ${wizardData.benefits || "Não informado"}
- Provas sociais: ${wizardData.socialProof || "Não informado"}
- Diferenciais: ${wizardData.differentials || "Não informado"}
- Objeções: ${wizardData.objections || "Não informado"}
- CTA principal: ${wizardData.cta || "Não informado"}
- Tom de voz: ${wizardData.tone || "persuasivo profissional"}
- Objetivo: ${wizardData.objective || "captar lead"}

CORES DA MARCA:
- Primária: ${themeInput?.primaryColor || "#3B82F6"}
- Secundária: ${themeInput?.secondaryColor || "#1E40AF"}

IMPORTANTE: gere imagens hero com placeholders realistas usando https://picsum.photos/seed/{palavra-chave}/1200/600. Escolha seeds relacionadas ao tema.

Retorne APENAS um JSON válido com esta estrutura exata (sem markdown, sem \`\`\`json):
{
  "metaTitle": "SEO title otimizada (máx 60 chars)",
  "metaDescription": "Meta description otimizada (máx 160 chars)",
  "sections": [
    {
      "type": "HeroBlock",
      "props": {
        "headline": "Headline forte e persuasiva",
        "subheadline": "Subheadline complementar",
        "ctaText": "Texto do botão CTA",
        "ctaUrl": "#form",
        "imageUrl": "https://picsum.photos/seed/{palavra-chave}/1200/600",
        "alignment": "center",
        "visible": true
      }
    },
    {
      "type": "ProblemBlock",
      "props": { "title": "Título do problema", "description": "Descrição da dor do cliente", "visible": true }
    },
    {
      "type": "SolutionBlock",
      "props": { "title": "Título da solução", "description": "Descrição da solução", "visible": true }
    },
    {
      "type": "BenefitsBlock",
      "props": {
        "title": "Benefícios",
        "items": [
          { "icon": "Check", "title": "Benefício 1", "description": "Descrição" },
          { "icon": "Check", "title": "Benefício 2", "description": "Descrição" },
          { "icon": "Check", "title": "Benefício 3", "description": "Descrição" }
        ],
        "visible": true
      }
    },
    {
      "type": "HowItWorksBlock",
      "props": {
        "title": "Como funciona",
        "steps": [
          { "step": "1", "title": "Passo 1", "description": "Descrição" },
          { "step": "2", "title": "Passo 2", "description": "Descrição" },
          { "step": "3", "title": "Passo 3", "description": "Descrição" }
        ],
        "visible": true
      }
    },
    {
      "type": "SocialProofBlock",
      "props": {
        "title": "Quem já confia",
        "testimonials": [
          { "name": "Nome", "role": "Cargo", "text": "Depoimento real", "photoUrl": "" }
        ],
        "visible": true
      }
    },
    {
      "type": "FAQBlock",
      "props": {
        "title": "Perguntas frequentes",
        "items": [
          { "question": "Pergunta?", "answer": "Resposta" },
          { "question": "Pergunta?", "answer": "Resposta" }
        ],
        "visible": true
      }
    },
    {
      "type": "CTABlock",
      "props": {
        "headline": "CTA final persuasivo",
        "subheadline": "Texto de apoio",
        "ctaText": "Quero contratar",
        "ctaUrl": "#form",
        "visible": true
      }
    },
    {
      "type": "FormBlock",
      "props": {
        "title": "Solicite um contato",
        "description": "Preencha o formulário",
        "buttonText": "Enviar",
        "fields": ["nome", "telefone", "email", "mensagem"],
        "visible": true
      }
    }
  ],
  "seoSlug": "${generateSlug(wizardData.companyName || wizardData.product || "landing-page")}"
}`;
}

function cleanJSONResponse(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseGeneratedContent(rawContent: string): any {
  const cleaned = cleanJSONResponse(rawContent);
  return JSON.parse(cleaned);
}

async function callGemini(prompt: string, geminiKey: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini: ${response.status} ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAiCore(prisma: PrismaClient, prompt: string, orgId: string, userId?: string): Promise<string> {
  const result = await runGovernedAiText(prisma, {
    system: "lp-copywriter",
    organizationId: orgId,
    userId,
    agentKey: "lp-copywriter",
    message: prompt,
    temperature: 0.7,
    maxTokens: 8192,
  });
  return result.result.response || "";
}

async function callOpenAI(prompt: string, openaiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um copywriter especialista em landing pages. Responda apenas com JSON válido." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI: ${response.status} ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateWithFallback(prisma: PrismaClient, prompt: string, keys: any, orgId: string, userId?: string): Promise<string> {
  const provider = keys.aiProvider || "gemini";
  const errors: string[] = [];

  const ordered: { name: string; fn: () => Promise<string> }[] = [];

  ordered.push({ name: "AI Core", fn: () => callAiCore(prisma, prompt, orgId, userId) });
  if (keys.geminiKey) ordered.push({ name: "Gemini", fn: () => callGemini(prompt, keys.geminiKey) });
  if ((keys.openaiKey || keys.chatgptKey) && provider !== "openai") ordered.push({ name: "OpenAI", fn: () => callOpenAI(prompt, keys.openaiKey || keys.chatgptKey) });

  for (const { name, fn } of ordered) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err: any) {
      errors.push(`${name}: ${err.message}`);
      console.warn(`[LP_FALLBACK] ${name} falhou, tentando próximo...`, err.message);
    }
  }

  throw new Error(`Todos os providers falharam: ${errors.join(" | ")}`);
}

export function landingPageRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post("/generate-content", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { wizardData, theme: themeInput } = req.body;
      if (!wizardData) return res.status(400).json({ error: "Dados do wizard são obrigatórios" });

      const keys = await getOrgAIKeys(prisma, orgId);
      const prompt = buildLPPrompt(wizardData, themeInput);

      const rawContent = await generateWithFallback(prisma, prompt, keys, orgId, req.user?.id);

      let parsed: any;
      try {
        parsed = parseGeneratedContent(rawContent);
      } catch {
        return res.status(500).json({ error: "Resposta da IA em formato inválido. Tente novamente.", raw: rawContent.slice(0, 500) });
      }

      const slug = await ensureUniqueSlug(prisma, parsed.seoSlug || generateSlug(wizardData.companyName || "lp"), orgId);
      const companyName = wizardData.companyName || wizardData.product || "Landing Page";
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const heroSection = (parsed.sections || []).find((s: any) => s.type === "HeroBlock");
      const heroImage = heroSection?.props?.imageUrl || "";

      const page = await prisma.landingPage.create({
        data: {
          name: companyName,
          slug,
          organizationId: orgId,
          status: "draft",
          metaTitle: parsed.metaTitle || companyName,
          metaDescription: parsed.metaDescription || "",
          headline: heroSection?.props?.headline || "",
          heroImage,
          sections: parsed.sections || [],
          wizardData,
          theme: themeInput || {},
        },
      });

      res.json({
        id: page.id,
        name: page.name,
        slug: page.slug,
        url: `${baseUrl}/lp/${page.slug}`,
        metaTitle: parsed.metaTitle || "",
        metaDescription: parsed.metaDescription || "",
        sections: parsed.sections || [],
        heroImage,
      });
    } catch (error: any) {
      console.error("[LP_GENERATE_ERROR]", error.message || error);
      res.status(500).json({ error: error.message || "Erro interno ao gerar landing page" });
    }
  });

  router.get("/", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { skip, take } = getPagination(req.query);
      const [pages, total] = await Promise.all([
        prisma.landingPage.findMany({
          where: { organizationId: orgId },
          orderBy: { updatedAt: "desc" },
          skip,
          take,
          select: {
            id: true, name: true, slug: true, status: true,
            views: true, submissions: true, conversionRate: true,
            metaTitle: true, metaDescription: true,
            theme: true, tracking: true,
            publishedAt: true, createdAt: true, updatedAt: true,
            headline: true, heroImage: true,
          },
        }),
        prisma.landingPage.count({ where: { organizationId: orgId } }),
      ]);

      res.json({ pages, total });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const { name, wizardData, sections, theme, tracking, metaTitle, metaDescription, formFields } = req.body;

      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

      const baseSlug = generateSlug(name);
      const slug = await ensureUniqueSlug(prisma, baseSlug, orgId);

      const page = await prisma.landingPage.create({
        data: {
          name,
          slug,
          organizationId: orgId,
          status: "draft",
          metaTitle: metaTitle || name,
          metaDescription: metaDescription || "",
          sections: sections || undefined,
          wizardData: wizardData || undefined,
          theme: theme || undefined,
          tracking: tracking || undefined,
          formFields: formFields || undefined,
        },
      });

      auditFromRequest(req, "CREATE", "LandingPage", page.id);
      res.status(201).json(page);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const page = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { form: true },
      });

      if (!page) return res.status(404).json({ error: "Landing page não encontrada" });
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Landing page não encontrada" });

      const { name, sections, theme, tracking, metaTitle, metaDescription, formFields, status, headline, subheadline, heroImage } = req.body;

      const data: any = {};
      if (name !== undefined) data.name = name;
      if (sections !== undefined) data.sections = sections;
      if (theme !== undefined) data.theme = theme;
      if (tracking !== undefined) data.tracking = tracking;
      if (metaTitle !== undefined) data.metaTitle = metaTitle;
      if (metaDescription !== undefined) data.metaDescription = metaDescription;
      if (formFields !== undefined) data.formFields = formFields;
      if (headline !== undefined) data.headline = headline;
      if (subheadline !== undefined) data.subheadline = subheadline;
      if (heroImage !== undefined) data.heroImage = heroImage;
      if (status !== undefined) data.status = status;

      if (name !== undefined && name !== existing.name) {
        data.slug = await ensureUniqueSlug(prisma, generateSlug(name), orgId, existing.id);
      }

      const page = await prisma.landingPage.update({
        where: { id: req.params.id },
        data,
      });

      auditFromRequest(req, "UPDATE", "LandingPage", page.id);
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Landing page não encontrada" });

      await prisma.landingPage.delete({ where: { id: req.params.id } });
      auditFromRequest(req, "DELETE", "LandingPage", req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/publish", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Landing page não encontrada" });

      if (!existing.sections) {
        return res.status(400).json({ error: "A página precisa ter seções antes de publicar" });
      }

      const page = await prisma.landingPage.update({
        where: { id: req.params.id },
        data: {
          status: "published",
          publishedAt: new Date(),
        },
      });

      auditFromRequest(req, "PUBLISH", "LandingPage", page.id);
      emitAutomationEvent("landing_page.published", { organizationId: orgId, pageId: page.id, slug: page.slug });
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/unpublish", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const existing = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Landing page não encontrada" });

      const page = await prisma.landingPage.update({
        where: { id: req.params.id },
        data: { status: "draft", publishedAt: null },
      });

      auditFromRequest(req, "UNPUBLISH", "LandingPage", page.id);
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/duplicate", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(401).json({ error: "Unauthorized" });

      const original = await prisma.landingPage.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!original) return res.status(404).json({ error: "Landing page não encontrada" });

      const baseSlug = generateSlug(`${original.name}-copia`);
      const slug = await ensureUniqueSlug(prisma, baseSlug, orgId);

      const page = await prisma.landingPage.create({
        data: {
          name: `${original.name} (cópia)`,
          slug,
          organizationId: orgId,
          status: "draft",
          headline: original.headline,
          subheadline: original.subheadline,
          heroImage: original.heroImage,
          metaTitle: original.metaTitle,
          metaDescription: original.metaDescription,
          sections: original.sections as any,
          wizardData: original.wizardData as any,
          theme: original.theme as any,
          tracking: original.tracking as any,
          formFields: original.formFields as any,
        },
      });

      auditFromRequest(req, "DUPLICATE", "LandingPage", page.id);
      res.status(201).json(page);
    } catch (error) {
      next(error);
    }
  });

  // Public page data endpoint (no auth required)
  router.get("/public/:slug", async (req, res, next) => {
    try {
      const page = await prisma.landingPage.findUnique({
        where: { slug: req.params.slug },
        select: {
          id: true, name: true, slug: true, headline: true, subheadline: true,
          heroImage: true, sections: true, theme: true, tracking: true,
          metaTitle: true, metaDescription: true, formFields: true,
          status: true, views: true, organizationId: true,
        },
      });

      if (!page || page.status !== "published") {
        return res.status(404).json({ error: "Página não encontrada" });
      }

      await prisma.landingPage.update({
        where: { id: page.id },
        data: { views: { increment: 1 } },
      });

      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

// ===== ROTAS PÚBLICAS (sem autenticação) =====

function renderSectionsToHtml(sections: any[], theme: any, pageSlug: string = ""): string {
  const t = theme || {};
  const primary = t.primaryColor || "#3B82F6";
  const secondary = t.secondaryColor || "#1E40AF";
  const accent = t.accentColor || "#10B981";
  const fontFamily = t.fontFamily || "'Inter', system-ui, sans-serif";

  let html = `<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { font-family:${fontFamily}; color:#172033; background:#f7f7f3; line-height:1.6; -webkit-font-smoothing:antialiased; }
    a { color:inherit; }
    img { max-width:100%; display:block; }
    .container { max-width:1160px; margin:0 auto; padding:0 24px; }
    .section { padding:86px 0; background:#f7f7f3; }
    .section-soft { background:#eef7f5; }
    .section-white { background:#fff; }
    .eyebrow { color:${primary}; font-size:.75rem; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
    h1 { font-size:clamp(2.55rem,6vw,5.45rem); font-weight:900; line-height:.98; letter-spacing:0; color:#101827; }
    h2 { font-size:clamp(2rem,3.8vw,3.45rem); font-weight:900; line-height:1.04; letter-spacing:0; color:#101827; margin-bottom:18px; }
    h3 { font-size:1.2rem; font-weight:850; color:#101827; }
    .lead { color:#526072; font-size:1.1rem; line-height:1.85; }
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; padding:15px 24px; border-radius:12px; font-weight:850; font-size:1rem; text-decoration:none; transition:all .2s; cursor:pointer; border:none; min-height:52px; }
    .btn-primary { background:${primary}; color:#fff; box-shadow:0 18px 38px ${primary}26; }
    .btn-primary:hover { transform:translateY(-2px); filter:saturate(1.08); }
    .btn-secondary { background:#fff; color:#172033; border:1px solid #dde5ec; }
    .text-center { text-align:center; }
    .grid-3 { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px; }
    .card { background:#fff; border-radius:8px; padding:28px; box-shadow:0 18px 50px rgba(15,23,42,.07); border:1px solid #e8eef2; }
    .icon-wrap { width:46px; height:46px; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:18px; font-size:24px; }
    .testimonial { font-size:1.05rem; color:#475569; position:relative; padding:28px; background:#fff; border-radius:8px; border:1px solid #e8eef2; box-shadow:0 18px 50px rgba(15,23,42,.06); }
    .faq-item { border-bottom:1px solid #dde5ec; padding:22px 0; }
    .faq-question { font-weight:850; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:18px; color:#101827; }
    .faq-answer { margin-top:12px; color:#64748b; }
    .step-num { width:44px; height:44px; border-radius:8px; background:${primary}14; color:${primary}; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.05rem; flex-shrink:0; }
    .form-input { width:100%; padding:15px 16px; border:1px solid #dbe3ea; border-radius:8px; font-size:1rem; outline:none; transition:border-color .2s, box-shadow .2s; background:#fff; }
    .form-input:focus { border-color:${primary}; box-shadow:0 0 0 3px ${primary}20; }
    .hero-section { position:relative; overflow:hidden; min-height:720px; padding:26px 0 80px; background:radial-gradient(circle at 15% 10%, ${primary}18, transparent 32%), linear-gradient(135deg,#ffffff 0%,#f6faf8 48%,${secondary}12 100%); }
    .lp-nav { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:70px; }
    .brand { display:flex; align-items:center; gap:12px; min-width:0; }
    .brand-logo { width:52px; height:52px; border-radius:8px; background:#fff; border:1px solid #dde5ec; object-fit:contain; padding:5px; box-shadow:0 10px 28px rgba(15,23,42,.08); }
    .brand-mark { width:52px; height:52px; border-radius:8px; display:flex; align-items:center; justify-content:center; background:${primary}; color:#fff; font-weight:900; font-size:1rem; box-shadow:0 12px 30px ${primary}2d; }
    .brand-name { font-weight:900; color:#101827; line-height:1.1; }
    .brand-sub { font-size:.72rem; font-weight:850; color:#6b7788; text-transform:uppercase; letter-spacing:.14em; margin-top:3px; }
    .hero-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(360px,.86fr); gap:52px; align-items:center; }
    .hero-copy { max-width:650px; }
    .hero-copy .lead { margin-top:24px; max-width:610px; }
    .hero-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:34px; }
    .hero-meta { display:flex; flex-wrap:wrap; gap:10px; margin-top:28px; color:#526072; font-weight:750; font-size:.92rem; }
    .hero-meta span { display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #e3e9ee; border-radius:999px; padding:8px 12px; }
    .hero-media { position:relative; }
    .hero-photo { width:100%; aspect-ratio:4/5; object-fit:cover; border-radius:8px; box-shadow:0 34px 80px rgba(15,23,42,.22); border:1px solid rgba(255,255,255,.8); }
    .hero-photo-placeholder { width:100%; aspect-ratio:4/5; border-radius:8px; background:linear-gradient(135deg,${primary},${secondary}); display:flex; align-items:center; justify-content:center; color:#fff; font-size:4rem; font-weight:900; box-shadow:0 34px 80px rgba(15,23,42,.22); }
    .hero-badge { position:absolute; left:-22px; bottom:24px; background:#fff; border-radius:8px; padding:16px 18px; box-shadow:0 18px 45px rgba(15,23,42,.18); min-width:180px; border:1px solid #e8eef2; }
    .hero-badge strong { display:block; color:#101827; font-size:1.5rem; line-height:1; }
    .hero-badge span { color:#64748b; font-weight:750; font-size:.82rem; }
    .mini-gallery { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:12px; }
    .mini-gallery img { height:86px; width:100%; object-fit:cover; border-radius:8px; border:3px solid #fff; box-shadow:0 12px 30px rgba(15,23,42,.12); }
    .trustbar { margin-top:-34px; position:relative; z-index:2; }
    .trustbar-grid { display:grid; grid-template-columns:repeat(4,1fr); background:#fff; border:1px solid #e3e9ee; border-radius:8px; box-shadow:0 24px 70px rgba(15,23,42,.1); overflow:hidden; }
    .trustbar-item { padding:22px; border-right:1px solid #edf1f5; }
    .trustbar-item:last-child { border-right:0; }
    .trustbar-value { font-weight:900; color:#101827; font-size:1.28rem; line-height:1.15; }
    .trustbar-label { color:#64748b; font-size:.82rem; font-weight:750; margin-top:5px; }
    .split-text { display:grid; grid-template-columns:.82fr 1fr; gap:48px; align-items:center; }
    .gallery-grid { display:grid; grid-template-columns:1.25fr repeat(2,1fr); gap:14px; margin-top:34px; }
    .gallery-grid img { width:100%; height:230px; object-fit:cover; border-radius:8px; }
    .gallery-grid img:first-child { grid-row:span 2; height:474px; }
    .contact-strip { background:#101827; color:#fff; border-radius:8px; padding:34px; display:flex; justify-content:space-between; gap:24px; align-items:center; box-shadow:0 26px 70px rgba(15,23,42,.24); }
    .contact-strip h2 { color:#fff; font-size:clamp(1.7rem,3vw,2.55rem); margin-bottom:8px; }
    .contact-strip p, .contact-strip span { color:#cbd5e1; }
    .footer-note { background:#101827; color:#cbd5e1; padding:34px 0; font-size:.9rem; }
    @media(max-width:900px) {
      .hero-section { min-height:auto; padding:18px 0 56px; }
      .lp-nav { margin-bottom:44px; align-items:flex-start; }
      .hero-grid, .split-text { grid-template-columns:1fr; gap:34px; }
      .hero-photo, .hero-photo-placeholder { aspect-ratio:16/11; }
      .hero-badge { left:16px; bottom:16px; }
      .trustbar { margin-top:0; }
      .trustbar-grid { grid-template-columns:repeat(2,1fr); }
      .trustbar-item:nth-child(2) { border-right:0; }
      .gallery-grid { grid-template-columns:1fr 1fr; }
      .gallery-grid img:first-child { grid-column:1/-1; grid-row:auto; height:260px; }
      .contact-strip { flex-direction:column; align-items:flex-start; }
    }
    @media(max-width:640px) {
      .container { padding:0 18px; }
      .section { padding:58px 0; }
      .lp-nav .btn { display:none; }
      h1 { font-size:clamp(2.25rem,13vw,3.7rem); }
      .hero-actions { flex-direction:column; }
      .btn { width:100%; }
      .trustbar-grid, .gallery-grid { grid-template-columns:1fr; }
      .trustbar-item { border-right:0; border-bottom:1px solid #edf1f5; }
      .trustbar-item:last-child { border-bottom:0; }
      .gallery-grid img, .gallery-grid img:first-child { height:235px; }
    }
  </style>`;

  for (const section of sections || []) {
    if (section.props?.visible === false) continue;
    const p = section.props || {};
    const sh = (v: any) => sanitizeStoredHtml(String(v ?? ""));
    const safeUrl = (v: any) => sh(v);
    const logo = p.logoUrl
      ? `<img src="${safeUrl(p.logoUrl)}" alt="${sh(p.brandName || "Logo")}" class="brand-logo" />`
      : `<div class="brand-mark">${sh(p.logoInitials || "N")}</div>`;

    switch (section.type) {
      case "HeroBlock":
        html += `<section class="hero-section"><div class="container">
          <div class="lp-nav">
            <div class="brand">
              ${logo}
              <div style="min-width:0">
                <div class="brand-name">${sh(p.brandName || p.headline || "Site profissional")}</div>
                <div class="brand-sub">${sh(p.eyebrow || "Atendimento local")}</div>
              </div>
            </div>
            ${p.ctaText ? `<a class="btn btn-primary" href="${safeUrl(p.ctaUrl || "#form")}">${sh(p.ctaText)}</a>` : ""}
          </div>
          <div class="hero-grid">
            <div class="hero-copy">
              ${p.eyebrow ? `<div class="eyebrow">${sh(p.eyebrow)}</div>` : ""}
              <h1>${sh(p.headline)}</h1>
              ${p.subheadline ? `<p class="lead">${sh(p.subheadline)}</p>` : ""}
              <div class="hero-actions">
                ${p.ctaText ? `<a class="btn btn-primary" href="${safeUrl(p.ctaUrl || "#form")}">${sh(p.ctaText)}</a>` : ""}
                ${p.secondaryCtaText ? `<a class="btn btn-secondary" href="${safeUrl(p.secondaryCtaUrl || "#form")}">${sh(p.secondaryCtaText)}</a>` : ""}
              </div>
              <div class="hero-meta">
                ${p.rating ? `<span>${Number(p.rating).toFixed(1)}/5 no Google</span>` : ""}
                ${p.reviewsCount ? `<span>${sh(p.reviewsCount)} avaliacoes</span>` : ""}
                ${p.phone ? `<span>${sh(p.phone)}</span>` : ""}
                ${p.address ? `<span>${sh(p.address)}</span>` : ""}
              </div>
            </div>
            <div class="hero-media">
              ${p.imageUrl ? `<img src="${safeUrl(p.imageUrl)}" alt="${sh(p.brandName || p.headline)}" class="hero-photo" />` : `<div class="hero-photo-placeholder">${sh(p.logoInitials || "N")}</div>`}
              ${(p.rating || p.reviewsCount) ? `<div class="hero-badge"><strong>${p.rating ? Number(p.rating).toFixed(1) : "Google"}</strong><span>${p.reviewsCount ? `${sh(p.reviewsCount)} avaliacoes` : "perfil verificado"}</span></div>` : ""}
              ${Array.isArray(p.galleryImages) && p.galleryImages.length > 1 ? `<div class="mini-gallery">${p.galleryImages.slice(0, 3).map((img: string) => `<img src="${safeUrl(img)}" alt="" />`).join("")}</div>` : ""}
            </div>
          </div>
        </div></section>`;
        break;

      case "TrustBarBlock":
        html += `<section class="trustbar"><div class="container"><div class="trustbar-grid">
          ${(p.items || []).map((item: any) => `<div class="trustbar-item"><div class="trustbar-value">${sh(item.value)}</div><div class="trustbar-label">${sh(item.label)}</div></div>`).join("")}
        </div></div></section>`;
        break;

      case "ProblemBlock":
        html += `<section class="section section-white"><div class="container split-text">
          <div><div class="eyebrow">Primeira impressao</div><h2>${sh(p.title)}</h2></div>
          <p class="lead">${sh(p.description)}</p>
        </div></section>`;
        break;

      case "SolutionBlock":
        html += `<section class="section section-soft"><div class="container text-center" style="max-width:760px;margin-inline:auto">
          <h2>${sh(p.title)}</h2>
          <p class="lead">${sh(p.description)}</p>
        </div></section>`;
        break;

      case "BenefitsBlock":
        html += `<section id="${sh(p.id || "")}" class="section section-soft"><div class="container">
          <h2 class="text-center">${sh(p.title)}</h2>
          <div class="grid-3" style="margin-top:40px">${(p.items || []).map((item: any) => `
            <div class="card">
              <div class="icon-wrap" style="background:${primary}15;color:${primary}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
              <h3>${sh(item.title)}</h3>
              <p style="color:#64748b;margin-top:10px;font-size:.98rem;line-height:1.7">${sh(item.description)}</p>
            </div>`).join("")}
          </div>
        </div></section>`;
        break;

      case "GalleryBlock":
        html += `<section class="section section-white"><div class="container">
          <div style="max-width:720px"><div class="eyebrow">Fotos reais</div><h2>${sh(p.title)}</h2>${p.description ? `<p class="lead">${sh(p.description)}</p>` : ""}</div>
          <div class="gallery-grid">${(p.images || []).slice(0, 5).map((img: string) => `<img src="${safeUrl(img)}" alt="${sh(p.title)}" loading="lazy" />`).join("")}</div>
        </div></section>`;
        break;

      case "HowItWorksBlock":
        html += `<section class="section section-white"><div class="container">
          <h2 class="text-center">${sh(p.title)}</h2>
          <div style="margin-top:48px;display:flex;flex-direction:column;gap:24px;max-width:640px;margin-inline:auto">${(p.steps || []).map((step: any, i: number) => `
            <div style="display:flex;gap:16px;align-items:flex-start">
              <div class="step-num">${sh(step.step || String(i + 1))}</div>
              <div><h3>${sh(step.title)}</h3><p style="color:#64748b;margin-top:4px">${sh(step.description)}</p></div>
            </div>`).join("")}
          </div>
        </div></section>`;
        break;

      case "SocialProofBlock":
        html += `<section class="section section-soft"><div class="container">
          <h2 class="text-center">${sh(p.title)}</h2>
          <div class="grid-3" style="margin-top:40px">${(p.testimonials || []).map((t: any) => `
            <div class="testimonial">
              <p>"${sh(t.text)}"</p>
              <div style="margin-top:16px;display:flex;align-items:center;gap:12px;border-top:1px solid #f1f5f9;padding-top:16px">
                ${t.photoUrl ? `<img src="${sh(t.photoUrl)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />` : ""}
                <div><strong>${sh(t.name)}</strong>${t.role ? `<span style="color:#94a3b8;font-size:.875rem;display:block">${sh(t.role)}</span>` : ""}</div>
              </div>
            </div>`).join("")}
          </div>
        </div></section>`;
        break;

      case "ContactStripBlock":
        html += `<section class="section section-white"><div class="container">
          <div class="contact-strip">
            <div>
              <h2>${sh(p.title)}</h2>
              ${p.description ? `<p>${sh(p.description)}</p>` : ""}
              <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:18px;font-weight:750">
                ${p.phone ? `<span>${sh(p.phone)}</span>` : ""}
                ${p.address ? `<span>${sh(p.address)}</span>` : ""}
              </div>
            </div>
            ${p.ctaText ? `<a class="btn" style="background:${accent};color:#fff" href="${safeUrl(p.ctaUrl || "#form")}">${sh(p.ctaText)}</a>` : ""}
          </div>
        </div></section>`;
        break;

      case "FAQBlock":
        html += `<section class="section section-white"><div class="container" style="max-width:760px;margin-inline:auto">
          <h2 class="text-center">${sh(p.title)}</h2>
          <div style="margin-top:32px">${(p.items || []).map((item: any) => `
            <div class="faq-item">
              <div class="faq-question">${sh(item.question)} <span style="font-size:1.25rem;color:#94a3b8">+</span></div>
              <div class="faq-answer">${sh(item.answer)}</div>
            </div>`).join("")}
          </div>
        </div></section>`;
        break;

      case "CTABlock":
        html += `<section class="section" style="background:linear-gradient(135deg,${primary},${secondary});color:#fff">
          <div class="container text-center">
            <h2 style="color:#fff">${sh(p.headline)}</h2>
            ${p.subheadline ? `<p style="font-size:1.125rem;opacity:.9;margin-top:12px">${sh(p.subheadline)}</p>` : ""}
            ${p.ctaText ? `<div style="margin-top:32px"><a class="btn" style="background:#fff;color:${primary}" href="${sh(p.ctaUrl || "#form")}">${sh(p.ctaText)}</a></div>` : ""}
          </div>
        </section>`;
        break;

      case "FormBlock":
        html += `<section id="form" class="section section-soft"><div class="container" style="max-width:620px;margin-inline:auto">
          <h2 class="text-center">${sh(p.title || "Solicite um contato")}</h2>
          ${p.description ? `<p class="text-center lead" style="margin-bottom:32px">${sh(p.description)}</p>` : ""}
          <form id="lp-form-${pageSlug}" class="card" style="display:flex;flex-direction:column;gap:16px">
            ${(p.fields || ["nome", "telefone", "email", "mensagem"]).map((f: string) => {
              const labelMap: Record<string, string> = { nome:"Nome", name:"Nome", telefone:"Telefone", phone:"Telefone", email:"E-mail", mensagem:"Mensagem", message:"Mensagem", empresa:"Empresa" };
              const nameMap: Record<string, string> = { nome:"name", telefone:"phone", mensagem:"message", empresa:"company" };
              const typeMap: Record<string, string> = { email:"email", telefone:"tel", phone:"tel" };
              const isTextarea = f === "mensagem" || f === "message";
              const placeholder = labelMap[f] || f;
              const inputName = nameMap[f] || f;
              if (isTextarea) {
                return `<textarea class="form-input" name="${inputName}" placeholder="${placeholder}" style="min-height:100px;resize:vertical"></textarea>`;
              }
              return `<input class="form-input" type="${typeMap[f] || "text"}" name="${inputName}" placeholder="${placeholder}" ${f === "email" || f === "nome" || f === "name" ? "required" : ""} />`;
            }).join("")}
            <input type="hidden" name="utmSource" />
            <input type="hidden" name="utmMedium" />
            <input type="hidden" name="utmCampaign" />
            <button type="submit" class="btn btn-primary" style="justify-content:center;font-size:1.1rem;padding:18px 32px">${sh(p.buttonText || "Enviar")}</button>
          </form>
          <div id="lp-form-success" style="display:none;text-align:center;padding:40px;background:#f0fdf4;border-radius:16px;margin-top:24px">
            <h3 style="color:#16a34a">Obrigado! Recebemos seu contato.</h3>
            <p style="color:#64748b;margin-top:8px">Entraremos em contato em breve.</p>
          </div>
        </div></section>`;
        break;
    }
  }

  return `${html}<footer class="footer-note"><div class="container">Pagina publicada para contato comercial e conversao de buscas locais.</div></footer>`;
}

async function findPublishedLandingPageByHost(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  if (!host) return null;

  return prisma.landingPage.findFirst({
    where: {
      status: "published",
      OR: [
        { customDomain: host },
        { domain: host },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function sendPublicLandingPage(prisma: PrismaClient, req: any, res: any, page: any) {
  if (!page || (page.status !== "published" && !page.content)) {
    return res.status(404).send(`<!DOCTYPE html><html><head><title>Página não encontrada</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b}h1{font-size:2rem}</style></head><body><h1>Página não encontrada</h1></body></html>`);
  }

  await prisma.landingPage.update({ where: { id: page.id }, data: { views: { increment: 1 } } });

  const theme = page.theme as any || {};
  const sections = page.sections as any[] || [];
  const pageContent = sections.length > 0
    ? renderSectionsToHtml(sections, theme, page.slug)
    : (page.content || "");

  const tracking = page.tracking as any || {};
  const gaId = tracking?.gaId || "";
  const pixelId = tracking?.pixelId || "";
  const apiUrl = `${req.protocol}://${req.get("host")}`;

  const gaScript = gaId ? `
        <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js',new Date());
          gtag('config','${gaId}');
        </script>` : "";

  const pixelScript = pixelId ? `
        <script>
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${pixelId}');
          fbq('track','PageView');
        </script>` : "";

  const shMeta = (v: any) => sanitizeStoredHtml(String(v ?? "")).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const html = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${shMeta(page.metaTitle || page.name)}</title>
    <meta name="description" content="${shMeta(page.metaDescription)}" />
    <meta property="og:title" content="${shMeta(page.metaTitle || page.name)}" />
    <meta property="og:description" content="${shMeta(page.metaDescription)}" />
    ${page.metaImage ? `<meta property="og:image" content="${shMeta(page.metaImage)}" />` : ""}
    <meta property="og:type" content="website" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"WebPage","name":"${shMeta(page.metaTitle || page.name)}","description":"${shMeta(page.metaDescription)}"}
    </script>
    ${gaScript}
    ${pixelScript}
    <style>
      .faq-answer { display:none; }
      .faq-item.open .faq-answer { display:block; }
      .faq-item.open .faq-question span { transform:rotate(45deg); display:inline-block; }
    </style>
  </head>
  <body>
    ${pageContent}
    <script>
      document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
      });

      const form = document.getElementById('lp-form-${page.slug}');
      if (form) {
        const params = new URLSearchParams(window.location.search);
        form.querySelectorAll('input[name^="utm"]').forEach(input => {
          input.value = params.get(input.name) || '';
        });

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = new FormData(form);
          const body = Object.fromEntries(data.entries());
          const normalizedBody = {
            ...body,
            name: body.name || body.nome,
            email: body.email,
            phone: body.phone || body.telefone,
            message: body.message || body.mensagem,
          };

          try {
            const res = await fetch('${apiUrl}/api/landing-pages/${page.slug}/lead', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(normalizedBody),
            });
            if (res.ok) {
              form.style.display = 'none';
              document.getElementById('lp-form-success').style.display = 'block';
              ${tracking?.gaId ? `gtag('event','conversion',{'send_to':'${gaId}','event_category':'lead','event_label':'${page.slug}'});` : ""}
              ${tracking?.pixelId ? `fbq('track','Lead');` : ""}
            }
          } catch(err) {
            console.error('Form error:', err);
          }
        });
      }
    </script>
  </body>
  </html>`;

  const csp = `default-src 'self' https: data:; script-src 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self' https:`;
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("Content-Type", "text/html; charset=utf-8").send(html);
}

export function landingPagePublicRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const page = await findPublishedLandingPageByHost(prisma, req.headers["x-forwarded-host"] || req.headers.host);
      if (!page) return next();
      return sendPublicLandingPage(prisma, req, res, page);
    } catch (error) {
      next(error);
    }
  });

  router.get("/lp/:slug", async (req, res, next) => {
    try {
      const page = await prisma.landingPage.findUnique({ where: { slug: req.params.slug } });

      if (!page || (page.status !== "published" && !page.content)) {
        return res.status(404).send(`<!DOCTYPE html><html><head><title>Página não encontrada</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b}h1{font-size:2rem}</style></head><body><h1>Página não encontrada</h1></body></html>`);
      }

      await prisma.landingPage.update({ where: { id: page.id }, data: { views: { increment: 1 } } });

      const theme = page.theme as any || {};
      const primary = theme.primaryColor || "#3B82F6";
      const secondary = theme.secondaryColor || "#1E40AF";
      const fontFamily = theme.fontFamily || "'Inter', system-ui, sans-serif";

      const sections = page.sections as any[] || [];
      const pageContent = sections.length > 0
        ? renderSectionsToHtml(sections, theme, page.slug)
        : (page.content || "");

      const tracking = page.tracking as any || {};
      const gaId = tracking?.gaId || "";
      const pixelId = tracking?.pixelId || "";
      const apiUrl = `${req.protocol}://${req.get("host")}`;

      const gaScript = gaId ? `
        <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js',new Date());
          gtag('config','${gaId}');
        </script>` : "";

      const pixelScript = pixelId ? `
        <script>
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${pixelId}');
          fbq('track','PageView');
        </script>` : "";

      const shMeta = (v: any) => sanitizeStoredHtml(String(v ?? "")).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

      const html = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${shMeta(page.metaTitle || page.name)}</title>
    <meta name="description" content="${shMeta(page.metaDescription)}" />
    <meta property="og:title" content="${shMeta(page.metaTitle || page.name)}" />
    <meta property="og:description" content="${shMeta(page.metaDescription)}" />
    ${page.metaImage ? `<meta property="og:image" content="${shMeta(page.metaImage)}" />` : ""}
    <meta property="og:type" content="website" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"WebPage","name":"${shMeta(page.metaTitle || page.name)}","description":"${shMeta(page.metaDescription)}"}
    </script>
    ${gaScript}
    ${pixelScript}
    <style>
      .faq-answer { display:none; }
      .faq-item.open .faq-answer { display:block; }
      .faq-item.open .faq-question span { transform:rotate(45deg); display:inline-block; }
    </style>
  </head>
  <body>
    ${pageContent}
    <script>
      // FAQ toggle
      document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
      });

      // Form submission
      const form = document.getElementById('lp-form-${page.slug}');
      if (form) {
        // Capture UTM params
        const params = new URLSearchParams(window.location.search);
        form.querySelectorAll('input[name^="utm"]').forEach(input => {
          input.value = params.get(input.name) || '';
        });

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = new FormData(form);
          const body = Object.fromEntries(data.entries());
          const normalizedBody = {
            ...body,
            name: body.name || body.nome,
            email: body.email,
            phone: body.phone || body.telefone,
            message: body.message || body.mensagem,
          };

          try {
            const res = await fetch('${apiUrl}/api/landing-pages/${page.slug}/lead', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(normalizedBody),
            });
            if (res.ok) {
              form.style.display = 'none';
              document.getElementById('lp-form-success').style.display = 'block';
              ${tracking?.gaId ? `gtag('event','conversion',{'send_to':'${gaId}','event_category':'lead','event_label':'${page.slug}'});` : ""}
              ${tracking?.pixelId ? `fbq('track','Lead');` : ""}
            }
          } catch(err) {
            console.error('Form error:', err);
          }
        });
      }
    </script>
  </body>
  </html>`;

      const csp = `default-src 'self' https: data:; script-src 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self' https:`;
      res.setHeader('Content-Security-Policy', csp);
      res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/landing-pages/:slug/lead", async (req, res, next) => {
    try {
      const page = await prisma.landingPage.findUnique({ where: { slug: req.params.slug } });
      if (!page) return res.status(404).json({ error: "Pagina nao encontrada" });

      const { name, email, phone, message, utmSource, utmMedium, utmCampaign, quiz, score, scheduledAt, qualified } = req.body;
      if (!name || !email) return res.status(400).json({ error: "Nome e e-mail sao obrigatorios" });

      const numericScore = Math.max(0, Math.min(100, Number(score) || 0));
      const quizData = quiz && typeof quiz === "object" ? quiz : {};
      const isQualified = Boolean(qualified) || numericScore >= 70;
      const requestedStart = scheduledAt ? new Date(scheduledAt) : null;
      const canSchedule = requestedStart && isValidFutureDate(requestedStart);
      const quizNotes = Object.keys(quizData).length
        ? `\n\nPre-diagnostico da landing page:\n${Object.entries(quizData).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join("\n")}\nScore: ${numericScore}/100`
        : numericScore > 0
          ? `\n\nScore de pre-diagnostico: ${numericScore}/100`
          : "";

      const lead = await prisma.lead.create({
        data: {
          name,
          email,
          phone: phone || "",
          source: `landing-page:${page.slug}`,
          channel: "Landing Page",
          notes: `${message || ""}${quizNotes}`,
          organizationId: page.organizationId,
          status: isQualified ? "qualificado" : "novo",
          tags: `landing-page,${page.name},score:${numericScore},${isQualified ? "qualificado" : "nutricao"}`,
          temperature: numericScore >= 80 ? "HOT" : numericScore >= 55 ? "WARM" : "COLD",
          score: numericScore,
        },
      });

      await prisma.landingPage.update({
        where: { id: page.id },
        data: {
          submissions: { increment: 1 },
          conversionRate: page.views > 0 ? ((page.submissions + 1) / (page.views + 1)) * 100 : 0,
        },
      });

      const opportunity = await (async () => {
        const tmpClient = await prisma.client.create({
          data: {
            corporateName: name,
            email: email || "",
            phone: phone || "",
            organizationId: page.organizationId,
            status: 'prospect',
          },
        }).catch(() => null);
        if (!tmpClient) return null;
        return prisma.opportunity.create({
          data: {
            title: `Lead: ${name} - ${page.name}`,
            description: `${message || ""}${quizNotes}`,
            organizationId: page.organizationId,
            clientId: tmpClient.id,
            stage: "qualificacao",
            probability: isQualified ? 70 : 25,
            temperature: numericScore >= 80 ? "HOT" : numericScore >= 55 ? "WARM" : "COLD",
            score: numericScore,
            value: 0,
          },
        }).catch(() => null);
      })();

      let calendarEvent = null;
      if (canSchedule && requestedStart) {
        const { agendaId, userId } = await resolveLandingScheduleOwner(prisma, page.organizationId);
        calendarEvent = await prisma.calendarEvent.create({
          data: {
            title: `Call de diagnostico - ${name}`,
            description: [
              `Lead qualificado pela landing page: ${page.name}`,
              `Score: ${numericScore}/100`,
              phone ? `WhatsApp: ${phone}` : null,
              email ? `E-mail: ${email}` : null,
              message ? `Observacao: ${message}` : null,
              Object.keys(quizData).length ? `Quiz: ${JSON.stringify(quizData)}` : null,
            ].filter(Boolean).join("\n"),
            startDate: requestedStart,
            endDate: addMinutes(requestedStart, 30),
            allDay: false,
            type: "reunion",
            status: "scheduled",
            reminder: 30,
            leadId: lead.id,
            userId: userId || undefined,
            agendaId,
            organizationId: page.organizationId,
          },
        });
      }

      emitAutomationEvent("landing_page.lead", {
        organizationId: page.organizationId,
        pageId: page.id,
        slug: page.slug,
        leadId: lead.id,
        opportunityId: opportunity?.id,
        calendarEventId: calendarEvent?.id,
        score: numericScore,
        qualified: isQualified,
        utmSource,
        utmMedium,
        utmCampaign,
      });

      res.json({
        success: true,
        message: calendarEvent ? "Diagnostico agendado com sucesso!" : "Lead cadastrado com sucesso!",
        leadId: lead.id,
        score: numericScore,
        qualified: isQualified,
        calendarEvent,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
