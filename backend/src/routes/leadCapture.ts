import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { LeadCaptureService } from "../modules/lead-capture/lead-capture.service.js";
import { LeadAiService } from "../modules/lead-capture/lead-ai.service.js";
import { CompanyResolverService } from "../services/companyResolver.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";
import { ensureDefaultSalesPipeline, getInitialSalesStage } from "../services/crmPipeline.js";
import { pickBestDecisionMaker, upsertDecisionMakersFromLead } from "../services/prospectingAutomation.js";
import { enrollCapturedLeadsInFunnel } from "./prospectingFunnels.js";
import { imageAI } from "../services/imageAI.js";

function normalizeDocument(value: unknown) {
  if (typeof value !== "string") return value;
  const digits = value.replace(/\D/g, "");
  return digits || null;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "site";
}

async function ensureUniqueLandingSlug(prisma: PrismaClient, baseSlug: string): Promise<string> {
  const trySlug = async (slug: string, attempt: number): Promise<string> => {
    const existing = await prisma.landingPage.findUnique({ where: { slug } });
    if (!existing) return slug;
    return trySlug(`${baseSlug}-${attempt}`, attempt + 1);
  };
  return trySlug(baseSlug, 1);
}

function appendNote(existing: string | null | undefined, note: string): string {
  return [existing, note].filter(Boolean).join("\n\n");
}

function cleanPhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function isLikelyImageUrl(value: string): boolean {
  const clean = value.trim();
  if (!/^https?:\/\//i.test(clean) && !/^data:image\//i.test(clean)) return false;
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(clean)
    || /googleusercontent|ggpht|gstatic|streetviewpixels|unsplash|images\.pexels|cloudinary|cdn/i.test(clean);
}

function collectImageUrls(input: unknown, parentKey = "", depth = 0): string[] {
  if (!input || depth > 5) return [];
  const keyHint = /logo|photo|foto|image|imagem|thumb|cover|capa|banner|avatar|picture/i.test(parentKey);

  if (typeof input === "string") {
    return keyHint && isLikelyImageUrl(input) ? [input.trim()] : [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => collectImageUrls(item, parentKey, depth + 1));
  }

  if (typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) =>
      collectImageUrls(value, `${parentKey}.${key}`, depth + 1)
    );
  }

  return [];
}

function dedupeUrls(urls: string[]): string[] {
  return [...new Set(urls.filter(Boolean).map((url) => url.trim()))];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "N";
}

function extractSalesSiteAssets(lead: any) {
  const raw = lead.rawData || {};
  const rawImages = dedupeUrls(collectImageUrls(raw));
  const logoUrls = dedupeUrls([
    ...collectImageUrls(raw.logo, "logo"),
    ...collectImageUrls(raw.logo_url, "logo_url"),
    ...collectImageUrls(raw.logoUrl, "logoUrl"),
    ...collectImageUrls(raw.business_logo, "business_logo"),
    ...collectImageUrls(raw.profile_photo, "profile_photo"),
  ]);
  const thumbnailUrls = dedupeUrls([
    ...collectImageUrls(raw.thumbnail, "thumbnail"),
    ...collectImageUrls(raw.imageUrl, "imageUrl"),
    ...collectImageUrls(raw.image_url, "image_url"),
    ...collectImageUrls(raw.photo, "photo"),
    ...collectImageUrls(raw.photo_url, "photo_url"),
    ...collectImageUrls(raw.photos, "photos"),
    ...collectImageUrls(raw.images, "images"),
  ]);
  const gallery = dedupeUrls([...thumbnailUrls, ...rawImages]).slice(0, 8);
  const logoUrl = logoUrls[0] || null;
  const heroImage = gallery.find((url) => url !== logoUrl) || gallery[0] || null;

  return {
    logoUrl,
    logoInitials: getInitials(lead.businessName),
    heroImage,
    gallery,
    source: gallery.length ? "google-business-profile" : "generated",
  };
}

function resolveSalesTheme(category?: string | null) {
  const normalized = String(category || "").toLowerCase();
  if (/psic|terap|sa[uú]de|clinic|medic|odont/.test(normalized)) {
    return { primaryColor: "#0f766e", secondaryColor: "#115e59", accentColor: "#f59e0b", fontFamily: "'Inter', system-ui, sans-serif" };
  }
  if (/adv|jur|direito/.test(normalized)) {
    return { primaryColor: "#1e293b", secondaryColor: "#b45309", accentColor: "#f59e0b", fontFamily: "'Inter', system-ui, sans-serif" };
  }
  if (/rest|bar|lanch|pizza|food|comida/.test(normalized)) {
    return { primaryColor: "#b91c1c", secondaryColor: "#7f1d1d", accentColor: "#f97316", fontFamily: "'Inter', system-ui, sans-serif" };
  }
  if (/imob|constr|arquitet|engenh/.test(normalized)) {
    return { primaryColor: "#2563eb", secondaryColor: "#0f172a", accentColor: "#14b8a6", fontFamily: "'Inter', system-ui, sans-serif" };
  }
  return { primaryColor: "#4f46e5", secondaryColor: "#111827", accentColor: "#10b981", fontFamily: "'Inter', system-ui, sans-serif" };
}

function buildProspectingSalesCopy(lead: any, publicUrl: string) {
  const category = lead.category ? ` (${lead.category})` : "";
  return [
    `Oi, tudo bem? Encontrei a ${lead.businessName}${category} no Google e vi uma oportunidade simples: ainda nao aparece um site vinculado.`,
    `Montei uma previa publicada para voce visualizar como ficaria uma pagina profissional com WhatsApp, provas de confianca e chamada para novos clientes: ${publicUrl}`,
    "A ideia e usar esse link no Perfil da Empresa do Google para transformar mais buscas em contatos. Posso ajustar textos, fotos, identidade visual e deixar com a cara da empresa."
  ].join("\n\n");
}

function buildProspectingSiteSections(lead: any, assets: any, heroImage: string, publicUrl: string) {
  const category = lead.category || "servicos profissionais";
  const location = [lead.city, lead.state].filter(Boolean).join("/") || "sua regiao";
  const ratingText = lead.rating ? `${Number(lead.rating).toFixed(1)} estrelas no Google` : "presenca local no Google";
  const reviewsText = lead.reviewsCount ? `${lead.reviewsCount} avaliacoes` : "historico de atendimento local";
  const phone = cleanPhone(lead.phoneNormalized || lead.phone);
  const waNumber = phone.startsWith("55") ? phone : `55${phone}`;
  const ctaUrl = phone
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Ola, vim pelo site ${publicUrl} e quero mais informacoes.`)}`
    : "#form";

  return [
    {
      type: "HeroBlock",
      props: {
        brandName: lead.businessName,
        logoUrl: assets.logoUrl,
        logoInitials: assets.logoInitials,
        eyebrow: `${category} em ${location}`,
        headline: `Atendimento profissional em ${category} com a confianca de quem ja esta no Google`,
        subheadline: `${lead.businessName} agora com uma pagina moderna para apresentar servicos, fotos, avaliacao, localizacao e contato rapido pelo WhatsApp.`,
        ctaText: "Falar pelo WhatsApp",
        ctaUrl,
        secondaryCtaText: "Ver diferenciais",
        secondaryCtaUrl: "#diferenciais",
        imageUrl: heroImage,
        rating: lead.rating,
        reviewsCount: lead.reviewsCount,
        address: lead.address,
        phone: lead.phoneNormalized || lead.phone,
        galleryImages: assets.gallery,
        alignment: "split",
        visible: true
      }
    },
    {
      type: "TrustBarBlock",
      props: {
        items: [
          { label: ratingText, value: lead.rating ? `${Number(lead.rating).toFixed(1)}/5` : "Google" },
          { label: "Avaliacoes", value: lead.reviewsCount ? String(lead.reviewsCount) : "Perfil local" },
          { label: "Atendimento", value: lead.phone ? "WhatsApp" : "Formulario" },
          { label: "Regiao", value: location }
        ],
        visible: true
      }
    },
    {
      type: "ProblemBlock",
      props: {
        title: "Clientes pesquisam, comparam e decidem em poucos segundos",
        description: `Esta pagina organiza o que o cliente precisa ver antes de chamar: quem e a ${lead.businessName}, onde atende, sinais de confianca, fotos do perfil e um caminho simples para contato.`,
        visible: true
      }
    },
    {
      type: "BenefitsBlock",
      props: {
        id: "diferenciais",
        title: "Por que escolher este atendimento",
        items: [
          { icon: "Check", title: "Credibilidade visivel", description: `${ratingText} e ${reviewsText} apresentados com linguagem clara e profissional.` },
          { icon: "Check", title: "Contato sem atrito", description: "Botao de WhatsApp, telefone e formulario para facilitar o primeiro contato." },
          { icon: "Check", title: "Presenca local forte", description: `Conteudo alinhado para quem busca ${category} em ${location}.` }
        ],
        visible: true
      }
    },
    ...(assets.gallery.length ? [{
      type: "GalleryBlock",
      props: {
        title: "Conheca o espaco e a estrutura",
        description: "Fotos recuperadas do perfil do Google Meu Negocio para deixar a pagina mais real e confiavel.",
        images: assets.gallery,
        visible: true
      }
    }] : []),
    {
      type: "HowItWorksBlock",
      props: {
        title: "Como o cliente chega ate o atendimento",
        steps: [
          { step: "1", title: "Encontra no Google", description: "O perfil local desperta o interesse na busca." },
          { step: "2", title: "Confere a pagina", description: "A pagina apresenta servicos, fotos, confianca e caminho de contato." },
          { step: "3", title: "Chama no WhatsApp", description: "A conversa comeca com menos duvida e mais intencao de compra." }
        ],
        visible: true
      }
    },
    {
      type: "SocialProofBlock",
      props: {
        title: "Sinais de confianca",
        testimonials: [
          {
            name: lead.businessName,
            role: lead.category || "Empresa local",
            text: `${lead.businessName} aparece com ${ratingText} e ${reviewsText}.`,
            photoUrl: assets.logoUrl || assets.gallery[0] || ""
          }
        ],
        visible: true
      }
    },
    {
      type: "ContactStripBlock",
      props: {
        title: "Pronto para agendar ou tirar duvidas?",
        description: "Use o WhatsApp para falar com a equipe agora.",
        ctaText: "Abrir WhatsApp",
        ctaUrl,
        phone: lead.phoneNormalized || lead.phone,
        address: lead.address,
        visible: true
      }
    },
    {
      type: "FAQBlock",
      props: {
        title: "Perguntas frequentes",
        items: [
          { question: "Este site pode ir no Perfil da Empresa do Google?", answer: "Sim. Ele foi pensado para ser usado como link oficial no perfil e em campanhas locais." },
          { question: "Da para trocar textos, cores e fotos?", answer: "Sim. A pagina e uma previa comercial e pode ser personalizada com identidade, fotos reais e servicos." },
          { question: "Preciso ter dominio proprio?", answer: "Nao para comecar. A previa ja fica publicada em URL temporaria, e depois pode receber dominio proprio." }
        ],
        visible: true
      }
    },
    {
      type: "CTABlock",
      props: {
        headline: "Uma pagina profissional muda a primeira impressao",
        subheadline: "Quando fotos, provas e contato aparecem juntos, a busca local vira conversa com mais facilidade.",
        ctaText: "Quero falar agora",
        ctaUrl,
        visible: true
      }
    },
    {
      type: "FormBlock",
      props: {
        title: "Solicite um contato",
        description: "Preencha seus dados e receba retorno.",
        buttonText: "Enviar mensagem",
        fields: ["nome", "telefone", "email", "mensagem"],
        visible: true
      }
    }
  ];
}

export function leadCaptureRoutes(prisma: PrismaClient) {
  const router = Router();
  const leadService = new LeadCaptureService(prisma);
  const aiService = new LeadAiService(prisma);

  const canViewCapturedLeads = (req: AuthRequest, res: any, next: any) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Nao autenticado." });

    if (["SUPER_ADMIN", "ORG_ADMIN", "AGENCY_ADMIN"].includes(user.role)) {
      return next();
    }

    const permissions = user.permissions || {};
    const hasLeadsView =
      permissions.leads === "*" ||
      (Array.isArray(permissions.leads) && permissions.leads.includes("view"));
    const hasProspectingAccess =
      permissions.prospecting === "*" ||
      (Array.isArray(permissions.prospecting) &&
        (permissions.prospecting.includes("view") || permissions.prospecting.includes("capture")));

    if (hasLeadsView || hasProspectingAccess) return next();

    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Sem permissao para visualizar leads capturados.",
    });
  };

  // Search Leads
  router.post("/search", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const {
        autoEnrollFunnel = false,
        autoDispatch = false,
        funnelId = "default",
        minScore = 0,
        requirePhone = true,
        requireValidatedCompany = false,
      } = req.body || {};
      const result = await leadService.captureLeads({
        ...req.body,
        tenantId: orgId,
        userId: req.user?.id
      });

      let prospecting = null;
      if (autoEnrollFunnel) {
        const candidateLeads = (result.leads || []).filter((lead: any) => {
          const hasPhone = Boolean(lead.phoneNormalized || lead.phone);
          const score = Number(lead.scoreOpportunity || 0);
          const companyAllowed = !requireValidatedCompany || lead.cnpjStatus === "validated";
          return (!requirePhone || hasPhone) && score >= Number(minScore || 0) && companyAllowed;
        });

        const enrollment = await enrollCapturedLeadsInFunnel(
          prisma,
          orgId,
          candidateLeads.map((lead: any) => lead.id),
          String(funnelId || "default")
        );

        if (autoDispatch) {
          await prisma.prospectingRun.updateMany({
            where: { organizationId: orgId, id: { in: enrollment.runs.map((run: any) => run.id) } },
            data: { nextAction: "ready_first_contact" }
          });
        }

        prospecting = {
          autoEnrollFunnel: true,
          autoDispatch: Boolean(autoDispatch),
          eligible: candidateLeads.length,
          enrolled: enrollment.enrolled,
          skipped: enrollment.skipped,
          funnelId: enrollment.funnelId,
          runIds: enrollment.runs.map((run: any) => run.id),
        };
      }

      res.json({ ...result, prospecting });
    } catch (error: any) {
      console.error("[LEAD_CAPTURE_ERROR] Falha na busca de leads:", error?.response?.data || error?.message || error);
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Erro desconhecido na captação';
      res.status(500).json({ 
        error: errorMsg,
        details: error?.response?.data || undefined
      });
    }
  });

  // Run AI Diagnosis
  router.post("/leads/:id/analyze", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });

    try {
      const result = await aiService.runDiagnosis(req.params.id, orgId);
      res.json(result);
    } catch (error: any) {
      if (error?.message === "Lead not found") {
        return res.status(404).json({ error: "Lead not found" });
      }

      console.error("[LEAD_DIAGNOSIS_ROUTE_ERROR]", {
        leadId: req.params.id,
        orgId,
        error: error?.message,
        code: error?.code,
        stack: error?.stack
      });

      res.status(500).json({ error: error.message });
    }
  });

  // Run AI Dossier
  router.post("/leads/:id/dossier", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.generateDossier(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Enrich Lead (CNPJ & Owners)
  router.post("/leads/:id/enrich", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.enrichLead(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/leads/:id/validate-company", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.enrichLead(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/leads/:id/decision-makers", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const lead = await prisma.capturedLead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      const decisionMakers = await prisma.prospectingDecisionMaker.findMany({
        where: { organizationId: orgId, capturedLeadId: lead.id },
        orderBy: [{ isSelected: "desc" }, { priority: "asc" }, { confidenceScore: "desc" }],
      });
      res.json(decisionMakers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/leads/:id/decision-makers/refresh", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const lead = await prisma.capturedLead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      const generated = await upsertDecisionMakersFromLead(prisma, lead);
      const selected = await pickBestDecisionMaker(prisma, lead);
      res.json({ generated, selected });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Scripts
  router.post("/leads/:id/scripts", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.generateScripts(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/leads/:id/generate-sales-site", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const lead = await prisma.capturedLead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      if (lead.website && !req.body?.force) {
        return res.status(409).json({
          error: "LEAD_ALREADY_HAS_WEBSITE",
          message: "Este lead ja tem site. Use force=true se quiser gerar uma previa mesmo assim."
        });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const slug = await ensureUniqueLandingSlug(prisma, generateSlug(`${lead.businessName}-site-pronto`));
      const publicUrl = `${baseUrl}/lp/${slug}`;
      const theme = resolveSalesTheme(lead.category);
      const logoConcept = `${lead.businessName} - logo textual provisoria, estilo profissional, simples e memoravel`;
      const assets = extractSalesSiteAssets(lead);
      const heroPrompt = [
        "professional website hero image",
        lead.category || "local business",
        lead.city || lead.state || "Brazil",
        "clean commercial photography, trustworthy, modern, no text, no watermark"
      ].join(", ");
      const heroImage = assets.heroImage || await imageAI.generate(heroPrompt, req.body?.imageApiKey);
      const sections = buildProspectingSiteSections(lead, assets, heroImage, publicUrl);
      const whatsappMessage = buildProspectingSalesCopy(lead, publicUrl);
      const salesSitePackage = {
        landingPageId: null as string | null,
        url: publicUrl,
        slug,
        logoConcept,
        logoUrl: assets.logoUrl,
        logoInitials: assets.logoInitials,
        gallery: assets.gallery,
        assetSource: assets.source,
        heroPrompt,
        heroImage,
        generatedAt: new Date().toISOString(),
        reason: "Lead sem site capturado na prospeccao."
      };

      const page = await prisma.landingPage.create({
        data: {
          name: `${lead.businessName} - Site Pronto`,
          slug,
          organizationId: orgId,
          status: "published",
          publishedAt: new Date(),
          metaTitle: `${lead.businessName} | ${lead.category || "Atendimento profissional"}`,
          metaDescription: `Conheca ${lead.businessName}, ${lead.category || "empresa local"} em ${[lead.city, lead.state].filter(Boolean).join("/") || "sua regiao"}.`,
          headline: `${lead.businessName}: ${lead.category || "Atendimento profissional"}`,
          heroImage,
          sections,
          wizardData: {
            source: "lead-capture-sales-site",
            capturedLeadId: lead.id,
            businessName: lead.businessName,
            category: lead.category,
            city: lead.city,
            state: lead.state,
            phone: lead.phoneNormalized || lead.phone,
            googleMapsUrl: lead.googleMapsUrl,
            rating: lead.rating,
            reviewsCount: lead.reviewsCount,
            logoUrl: assets.logoUrl,
            gallery: assets.gallery,
            assetSource: assets.source
          },
          theme: {
            ...theme,
            logoConcept,
            logoUrl: assets.logoUrl,
            logoInitials: assets.logoInitials,
            gallery: assets.gallery,
            assetSource: assets.source,
            generatedFor: "prospecting-sales-site"
          }
        }
      });

      salesSitePackage.landingPageId = page.id;
      const packageNote = [
        "[SITE PRONTO GERADO]",
        `URL: ${publicUrl}`,
        `LandingPageId: ${page.id}`,
        `Logo/conceito: ${logoConcept}`,
        assets.logoUrl ? `Logo importada: ${assets.logoUrl}` : `Logo fallback: monograma ${assets.logoInitials}`,
        assets.gallery.length ? `Fotos importadas do perfil: ${assets.gallery.length}` : "Fotos importadas do perfil: 0",
        `Imagem hero: ${assets.heroImage ? "perfil Google Meu Negocio" : heroPrompt}`,
        "Copy WhatsApp:",
        whatsappMessage
      ].join("\n");

      const updated = await prisma.capturedLead.update({
        where: { id: lead.id },
        data: {
          suggestedOffer: `Site pronto publicado: ${publicUrl}`,
          whatsappMessage,
          notes: appendNote(lead.notes, packageNote)
        }
      });

      emitAutomationEvent("landing_page.published", { organizationId: orgId, pageId: page.id, slug: page.slug, capturedLeadId: lead.id });
      res.json({ lead: updated, landingPage: page, salesSite: salesSitePackage });
    } catch (error: any) {
      console.error("[GENERATE_LEAD_SALES_SITE_ERROR]", {
        leadId: req.params.id,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: "Erro ao gerar site do lead", details: error.message });
    }
  });

  // Resolve Company by name or CNPJ
  router.post("/resolve-company", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { serperApiKey: true }
      });

      const resolver = new CompanyResolverService({
        serperApiKey: org?.serperApiKey || process.env.SERPER_API_KEY,
      }, orgId);

      const result = await resolver.resolve({
        name: req.body.name,
        cnpj: req.body.cnpj,
      });

      res.json(result);
    } catch (error: any) {
      console.error("[RESOLVE_COMPANY_ERROR]", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Research Management (LinkedIn)
  router.post("/leads/:id/research-management", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const result = await aiService.researchManagement(req.params.id, orgId!);
      res.json(result);
    } catch (error: any) {
      console.error("[RESEARCH_MANAGEMENT_ROUTE_FALLBACK]", {
        leadId: req.params.id,
        orgId,
        error: error?.message
      });

      if (!orgId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const lead = await prisma.capturedLead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const fallbackNote = [
        lead.notes,
        `Pesquisa de decisores pendente: ${error?.message || "falha inesperada ao consultar dados externos."}`
      ].filter(Boolean).join("\n\n");

      const updated = await prisma.capturedLead.update({
        where: { id: lead.id },
        data: { notes: fallbackNote }
      });

      res.json(updated);
    }
  });

  // Send to CRM
  router.post("/leads/:id/send-to-crm", async (req: AuthRequest, res) => {
    try {
      // 1. Localizar o lead capturado (sem depender exclusivamente do orgId do token, caso seja admin)
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });

      const capturedLead = await prisma.capturedLead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!capturedLead) return res.status(404).json({ error: "Lead não encontrado" });

      if (capturedLead.sentToCrm && capturedLead.crmLeadId) {
        return res.json(capturedLead);
      }

      if (capturedLead.cnpjStatus !== "validated") {
        return res.status(409).json({
          error: "CNPJ_NOT_VALIDATED",
          message: "Valide o CNPJ correto da empresa antes de enviar para o CRM.",
          cnpjStatus: capturedLead.cnpjStatus,
          cnpjMatchReason: capturedLead.cnpjMatchReason
        });
      }

      const targetOrgId = orgId;
      let { boardId, stageId } = req.body;

      const pipeline = await ensureDefaultSalesPipeline(prisma, targetOrgId, boardId || undefined);
      boardId = pipeline.id;
      if (!stageId || stageId === '') {
        stageId = getInitialSalesStage(pipeline)?.id;
      }
      if (!stageId) {
        return res.status(400).json({ error: "Pipeline sem etapa inicial configurada" });
      }

      // 3. Fallback para Estágio
      if (boardId) {
        const pipeline = await prisma.pipeline.findFirst({
          where: { id: boardId, organizationId: targetOrgId },
          select: { id: true }
        });
        if (!pipeline) return res.status(400).json({ error: "Pipeline invÃ¡lido para esta organizaÃ§Ã£o" });
      }

      if (stageId) {
        const stage = await prisma.pipelineStage.findFirst({
          where: { id: stageId, pipeline: { organizationId: targetOrgId, ...(boardId ? { id: boardId } : {}) } },
          select: { id: true }
        });
        if (!stage) return res.status(400).json({ error: "Etapa invÃ¡lida para esta organizaÃ§Ã£o" });
      }

      // 4. Criar o Lead no CRM
      const newLead = await prisma.lead.create({
        data: {
          name: capturedLead.businessName,
          email: capturedLead.email || "contato@empresa.com",
          phone: capturedLead.phoneNormalized || capturedLead.phone,
          status: "novo",
          organizationId: targetOrgId,
          pipelineId: boardId || undefined,
          stageId: stageId || undefined,
          cnpj: capturedLead.cnpj,
          owners: capturedLead.owners,
          managementTeam: capturedLead.managementTeam,
          aiDiagnosis: capturedLead.aiDiagnosis,
          score: Math.round(capturedLead.scoreOpportunity || 0),
          tags: capturedLead.category || undefined,
          source: capturedLead.provider || undefined,
          notes: `[Captação Elite - ${capturedLead.provider}]\n\nSITE: ${capturedLead.website || 'Não informado'}\n\nDIAGNÓSTICO IA:\n${capturedLead.aiDiagnosis || 'Não realizado'}\n\nEQUIPE DE GESTÃO (LINKEDIN):\n${capturedLead.managementTeam || 'Não pesquisado'}\n\nNOTAS ADICIONAIS:\n${capturedLead.notes || ''}`
        }
      });

      // 5. Criar cliente e oportunidade para aparecer no Kanban.
      const crmNotes = newLead.notes || "";
      const normalizedCnpj = normalizeDocument(capturedLead.cnpj) as string | null;
      let crmClient = normalizedCnpj
        ? await prisma.client.findFirst({ where: { organizationId: targetOrgId, cnpj: normalizedCnpj } })
        : null;

      if (!crmClient && capturedLead.email) {
        crmClient = await prisma.client.findFirst({
          where: { organizationId: targetOrgId, email: capturedLead.email, corporateName: capturedLead.businessName },
        });
      }

      if (!crmClient) {
        try {
          crmClient = await prisma.client.create({
            data: {
              corporateName: capturedLead.businessName,
              tradeName: capturedLead.businessName,
              cnpj: normalizedCnpj,
              email: capturedLead.email || "",
              phone: capturedLead.phoneNormalized || capturedLead.phone,
              website: capturedLead.website,
              address: capturedLead.address,
              city: capturedLead.city,
              state: capturedLead.state,
              segment: capturedLead.category,
              source: capturedLead.provider || "captacao",
              sourceDetail: capturedLead.sourceId || undefined,
              notes: crmNotes,
              tags: capturedLead.category || undefined,
              status: "prospect",
              organizationId: targetOrgId,
              assignedToId: req.user?.id,
            },
          });
        } catch (clientErr: any) {
          if (clientErr.code === 'P2002' && normalizedCnpj) {
            console.warn("[SEND_TO_CRM_CLIENT_CNPJ_CONFLICT]", { cnpj: normalizedCnpj, businessName: capturedLead.businessName });
            crmClient = await prisma.client.create({
              data: {
                corporateName: capturedLead.businessName,
                tradeName: capturedLead.businessName,
                cnpj: null,
                email: capturedLead.email || "",
                phone: capturedLead.phoneNormalized || capturedLead.phone,
                website: capturedLead.website,
                address: capturedLead.address,
                city: capturedLead.city,
                state: capturedLead.state,
                segment: capturedLead.category,
                source: capturedLead.provider || "captacao",
                sourceDetail: capturedLead.sourceId || undefined,
                notes: crmNotes + "\n\n[AVISO] CNPJ já cadastrado em outra organização. Criado sem CNPJ.",
                tags: capturedLead.category || undefined,
                status: "prospect",
                organizationId: targetOrgId,
                assignedToId: req.user?.id,
              },
            });
          } else {
            throw clientErr;
          }
        }
      }

      await prisma.lead.update({
        where: { id: newLead.id },
        data: { clientId: crmClient.id, assignedToId: req.user?.id },
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          title: capturedLead.businessName,
          description: crmNotes,
          value: 0,
          estimatedValue: 0,
          organizationId: targetOrgId,
          clientId: crmClient.id,
          pipelineId: boardId,
          stageId,
          assignedToId: req.user?.id,
          stage: "qualificacao",
          score: Math.round(capturedLead.scoreOpportunity || 0),
          temperature: (capturedLead.scoreOpportunity || 0) >= 70 ? "HOT" : (capturedLead.scoreOpportunity || 0) >= 40 ? "WARM" : "COLD",
          customFields: {
            capturedLeadId: capturedLead.id,
            crmLeadId: newLead.id,
            provider: capturedLead.provider,
            category: capturedLead.category,
            googleMapsUrl: capturedLead.googleMapsUrl,
          },
        },
      });

      await prisma.activity.create({
        data: {
          organizationId: targetOrgId,
          type: "SYSTEM",
          description: `Lead captado "${capturedLead.businessName}" enviado para o Kanban`,
          userId: req.user?.id,
          contactId: newLead.id,
          companyId: crmClient.id,
          dealId: opportunity.id,
        },
      });

      // 6. Atualizar status da captacao.
      const updatedCapturedLead = await prisma.capturedLead.update({
        where: { id: req.params.id },
        data: { sentToCrm: true, crmLeadId: newLead.id }
      });

      emitAutomationEvent("lead.created", { organizationId: targetOrgId, leadId: newLead.id, lead: newLead });
      emitAutomationEvent("opportunity.created", { organizationId: targetOrgId, opportunityId: opportunity.id, opportunity });

      res.json(updatedCapturedLead); // Retornamos o captured lead atualizado para o frontend manter o estado consistente
    } catch (error: any) {
      console.error("[SEND_TO_CRM_ERROR]", {
        leadId: req.params.id,
        error: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      res.status(500).json({ 
        error: "Erro ao enviar para o CRM", 
        details: error.message,
        code: error.code 
      });
    }
  });

  // List Sources (Histórico de buscas)
  router.get("/sources", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const sources = await prisma.leadCaptureSource.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(sources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  // List Captured Leads
  router.get("/leads", canViewCapturedLeads, async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const { sourceId } = req.query;
    
    try {
      const leads = await prisma.capturedLead.findMany({
        where: { 
          organizationId: orgId,
          ...(sourceId && sourceId !== 'all' ? { sourceId: String(sourceId) } : {})
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(Array.isArray(leads) ? leads : []);
    } catch (error: any) {
      console.error("[GET_LEADS_ERROR]", error.message);
      res.status(500).json({ error: "Erro ao buscar leads. Certifique-se de que as migrações do banco de dados foram aplicadas.", details: error.message });
    }
  });

  // Get Single Lead
  router.get("/leads/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const lead = await prisma.capturedLead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lead details" });
    }
  });

  // Update Lead Notes
  router.patch("/leads/:id/notes", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const { notes } = req.body;
    try {
      const updated = await prisma.capturedLead.update({
        where: { id: req.params.id, organizationId: orgId },
        data: { notes }
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Single Captured Lead (phone, email, businessName, whatsappMessage)
  router.patch("/leads/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const { phone, email, businessName, whatsappMessage } = req.body;
    try {
      const updated = await prisma.capturedLead.update({
        where: { id: req.params.id, organizationId: orgId },
        data: {
          phone: phone !== undefined ? phone : undefined,
          email: email !== undefined ? email : undefined,
          businessName: businessName !== undefined ? businessName : undefined,
          whatsappMessage: whatsappMessage !== undefined ? whatsappMessage : undefined
        }
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
