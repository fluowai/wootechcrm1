import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { runGovernedAiText } from "../services/aiExecution.js";
import { sanitizeStoredHtml } from "../utils/security.js";

export function marketingRoutes(prisma: PrismaClient) {
  const router = Router();


  // Landing Pages CRUD
  router.get("/landing-pages", async (req: any, res, next) => {
    try {
      const pages = await prisma.landingPage.findMany({
        where: { organizationId: req.user.orgId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(pages);
    } catch (error) {
      next(error);
    }
  });

  router.post("/landing-pages", async (req: any, res, next) => {
    try {
      const { name, slug, templateId } = req.body;
      
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

      // Generate slug if not provided
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 7);

      const page = await prisma.landingPage.create({
        data: {
          name,
          slug: finalSlug,
          templateId,
          organizationId: req.user.orgId,
          status: 'draft'
        }
      });
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/landing-pages/:id", async (req: any, res, next) => {
    try {
      // Prevent updating sensitive fields via body
      const { id, organizationId, createdAt, ...updateData } = req.body;

      const page = await prisma.landingPage.update({
        where: { 
          id: req.params.id,
          organizationId: req.user.orgId // Security: ensure it belongs to the org
        },
        data: updateData
      });
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/landing-pages/:id", async (req: any, res, next) => {
    try {
      await prisma.landingPage.delete({ 
        where: { 
          id: req.params.id,
          organizationId: req.user.orgId 
        } 
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // LP Forms CRUD
  router.get("/lp-forms", async (req: any, res) => {
    try {
      const forms = await prisma.lPForm.findMany();
      res.json(forms);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar formulários" });
    }
  });

  // Campaigns
  router.get("/campaigns", async (req: any, res) => {
    try {
      const { clientId } = req.query;
      const campaigns = await prisma.campaign.findMany({
        where: { 
          organizationId: req.user.orgId,
          ...(clientId ? { clientId: clientId as string } : {})
        }
      });
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar campanhas" });
    }
  });

  // ============================================================
  // GERADOR DE LANDING PAGE COM IA (COMPLETO)
  // ============================================================
  router.post("/generate-lp-ia", async (req: any, res) => {
    try {
      const {
        companyName,
        description,
        targetAudience,
        goal,
        ctaText,
        phone,
        email,
        whatsapp,
        instagram,
        website,
        colorPrimary,
        colorSecondary,
        tone,
        sectionsCount,
        provider,
        services,
        differentials,
        testimonials,
        logoUrl
      } = req.body;

      const orgId = req.user.orgId;

      // ---- STEP 1: Gerar o conteúdo da LP via IA ----
      const prompt = `Você é um copywriter e web designer sênior especializado em landing pages de alta conversão.

INFORMAÇÕES DA EMPRESA:
- Nome: ${companyName || 'Empresa'}
- Sobre: ${description}
- Público-alvo: ${targetAudience}
- Objetivo da página: ${goal}
- Tom de voz: ${tone || 'profissional e persuasivo'}
- CTA principal: ${ctaText || 'Quero Saber Mais'}
- Serviços/Produtos: ${services || 'Não informado'}
- Diferenciais: ${differentials || 'Não informado'}
- Depoimentos: ${testimonials || 'Não informado'}

REGRAS:
1. Crie exatamente ${sectionsCount || 5} seções.
2. Cada seção deve ter: title, content (texto persuasivo), type (hero|features|benefits|social_proof|pricing|cta|faq|about).
3. Use linguagem do público-alvo.
4. Inclua palavras de poder e gatilhos mentais.

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "headline": "Título principal matador",
  "subheadline": "Subtítulo complementar",
  "heroSearchTerm": "palavra-chave em inglês para imagem de fundo (ex: modern-office, bakery, gym)",
  "sections": [
    { "title": "...", "content": "...", "type": "hero" },
    { "title": "...", "content": "...", "type": "features" }
  ],
  "ctaText": "${ctaText || 'Quero Saber Mais'}",
  "metaTitle": "Título SEO",
  "metaDescription": "Descrição SEO"
}`;

      const groqResponse = await runGovernedAiText(prisma, {
        system: "lp-generator",
        organizationId: orgId,
        userId: req.user?.id,
        agentKey: "lp-generator",
        message: prompt,
        temperature: 0.7,
        maxTokens: 8192,
      });

      const aiContent = JSON.parse(groqResponse.result.response);

      // ---- STEP 2: Gerar o HTML completo da Landing Page ----
      const primaryColor = colorPrimary || '#2563eb';
      const secondaryColor = colorSecondary || '#1e40af';
      
      const sectionsHtml = (aiContent.sections || []).map((section: any, idx: number) => {
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        switch (section.type) {
          case 'hero':
            return `
    <section class="hero-section" style="background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});">
      <div class="container">
        <div class="hero-content">
          <h1 class="hero-title">${aiContent.headline}</h1>
          <p class="hero-subtitle">${aiContent.subheadline}</p>
          <a href="#contato" class="cta-button">${aiContent.ctaText || ctaText || 'Quero Saber Mais'}</a>
        </div>
        <div class="hero-image">
          <img src="https://images.unsplash.com/photo-1?auto=format&fit=crop&w=800&q=80&utm_source=nexus360&query=${encodeURIComponent(aiContent.heroSearchTerm || 'business')}" alt="${companyName}" />
        </div>
      </div>
    </section>`;
          case 'features':
          case 'benefits': {
            const items = section.content.split('\n').filter((l: string) => l.trim());
            return `
    <section class="section ${bgClass}">
      <div class="container">
        <h2 class="section-title">${section.title}</h2>
        <div class="features-grid">
          ${items.slice(0, 4).map((item: string, i: number) => `
          <div class="feature-card">
            <div class="feature-icon">${['🚀', '⚡', '🎯', '💎', '🔥', '✨'][i % 6]}</div>
            <p class="feature-text">${item.replace(/^[-•*]\s*/, '')}</p>
          </div>`).join('')}
        </div>
      </div>
    </section>`;
          }
          case 'social_proof':
            return `
    <section class="section bg-gray-50">
      <div class="container">
        <h2 class="section-title">${section.title}</h2>
        <div class="testimonials-grid">
          <div class="testimonial-card">
            <p class="testimonial-text">"${section.content.substring(0, 200)}"</p>
            <div class="testimonial-author">— Cliente Satisfeito</div>
          </div>
        </div>
      </div>
    </section>`;
          case 'faq': {
            const faqs = section.content.split('\n').filter((l: string) => l.trim());
            return `
    <section class="section ${bgClass}">
      <div class="container">
        <h2 class="section-title">${section.title}</h2>
        <div class="faq-list">
          ${faqs.slice(0, 5).map((faq: string) => `
          <div class="faq-item">
            <p>${faq.replace(/^[-•*]\s*/, '')}</p>
          </div>`).join('')}
        </div>
      </div>
    </section>`;
          }
          case 'cta':
            return `
    <section class="cta-section" id="contato" style="background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});">
      <div class="container">
        <h2 class="cta-title">${section.title}</h2>
        <p class="cta-description">${section.content}</p>
        ${whatsapp ? `<a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" class="cta-button cta-whatsapp" target="_blank">📱 Falar no WhatsApp</a>` : ''}
        ${email ? `<a href="mailto:${email}" class="cta-button cta-email">✉️ Enviar E-mail</a>` : ''}
        ${!whatsapp && !email ? `<a href="#" class="cta-button">${aiContent.ctaText || 'Entre em Contato'}</a>` : ''}
      </div>
    </section>`;
          default:
            return `
    <section class="section ${bgClass}">
      <div class="container">
        <h2 class="section-title">${section.title}</h2>
        <div class="section-content">${section.content}</div>
      </div>
    </section>`;
        }
      }).join('\n');

      const socialLinksHtml = [
        whatsapp ? `<a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" target="_blank">WhatsApp</a>` : '',
        instagram ? `<a href="https://instagram.com/${instagram.replace('@', '')}" target="_blank">Instagram</a>` : '',
        email ? `<a href="mailto:${email}">E-mail</a>` : '',
        website ? `<a href="${website}" target="_blank">Site</a>` : ''
      ].filter(Boolean).join(' | ');

      const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${aiContent.metaTitle || companyName}</title>
  <meta name="description" content="${aiContent.metaDescription || description}" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a2e; line-height: 1.7; }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    
    /* NAV */
    .navbar { background: #fff; padding: 16px 0; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 100; }
    .navbar .container { display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { font-weight: 900; font-size: 1.4rem; color: ${primaryColor}; text-decoration: none; }
    .nav-logo img { height: 40px; margin-right: 8px; vertical-align: middle; border-radius: 8px; }
    .nav-cta { background: ${primaryColor}; color: #fff; padding: 10px 24px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 0.875rem; transition: all 0.3s; }
    .nav-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 20px ${primaryColor}44; }
    
    /* HERO */
    .hero-section { padding: 80px 0; color: #fff; }
    .hero-section .container { display: flex; align-items: center; gap: 60px; }
    .hero-content { flex: 1; }
    .hero-title { font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 900; line-height: 1.1; margin-bottom: 20px; }
    .hero-subtitle { font-size: 1.15rem; opacity: 0.9; margin-bottom: 32px; line-height: 1.6; }
    .hero-image { flex: 1; }
    .hero-image img { width: 100%; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    
    /* CTA BUTTON */
    .cta-button { display: inline-block; background: #fff; color: ${primaryColor}; padding: 16px 40px; border-radius: 999px; font-weight: 800; font-size: 1.1rem; text-decoration: none; transition: all 0.3s; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    .cta-button:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.25); }
    .cta-whatsapp { background: #25D366; color: #fff; margin-right: 12px; }
    .cta-email { background: #fff; color: ${primaryColor}; }
    
    /* SECTIONS */
    .section { padding: 80px 0; }
    .bg-gray-50 { background: #f8fafc; }
    .section-title { font-size: 2rem; font-weight: 900; text-align: center; margin-bottom: 48px; color: #1a1a2e; }
    .section-content { text-align: center; max-width: 700px; margin: 0 auto; font-size: 1.05rem; color: #555; }
    
    /* FEATURES */
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
    .feature-card { background: #fff; border: 1px solid #eee; border-radius: 20px; padding: 32px; text-align: center; transition: all 0.3s; }
    .feature-card:hover { transform: translateY(-6px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); border-color: ${primaryColor}33; }
    .feature-icon { font-size: 2.5rem; margin-bottom: 16px; }
    .feature-text { color: #555; font-size: 0.95rem; line-height: 1.6; }
    
    /* TESTIMONIALS */
    .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .testimonial-card { background: #fff; border-radius: 20px; padding: 32px; border: 1px solid #eee; }
    .testimonial-text { font-style: italic; color: #555; margin-bottom: 16px; line-height: 1.7; }
    .testimonial-author { font-weight: 700; color: ${primaryColor}; }
    
    /* FAQ */
    .faq-list { max-width: 700px; margin: 0 auto; }
    .faq-item { background: #fff; border: 1px solid #eee; border-radius: 16px; padding: 20px 24px; margin-bottom: 12px; font-size: 0.95rem; color: #444; }
    
    /* CTA SECTION */
    .cta-section { padding: 80px 0; color: #fff; text-align: center; }
    .cta-title { font-size: 2.2rem; font-weight: 900; margin-bottom: 16px; }
    .cta-description { font-size: 1.1rem; opacity: 0.9; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto; }
    
    /* FOOTER */
    .footer { background: #1a1a2e; color: #999; padding: 40px 0; text-align: center; font-size: 0.875rem; }
    .footer a { color: #ccc; text-decoration: none; margin: 0 8px; }
    .footer a:hover { color: #fff; }
    .footer-brand { font-weight: 700; color: #fff; margin-bottom: 12px; font-size: 1.1rem; }
    .footer-links { margin: 16px 0; }
    .footer-copy { margin-top: 20px; font-size: 0.75rem; color: #666; }
    
    /* RESPONSIVE */
    @media (max-width: 768px) {
      .hero-section .container { flex-direction: column; text-align: center; }
      .hero-image { order: -1; }
      .hero-title { font-size: 2rem; }
      .features-grid { grid-template-columns: 1fr; }
      .cta-button { display: block; margin: 8px 0; text-align: center; }
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="container">
      <a href="#" class="nav-logo">
        ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" />` : ''}
        ${companyName || 'Minha Empresa'}
      </a>
      <a href="#contato" class="nav-cta">${aiContent.ctaText || ctaText || 'Fale Conosco'}</a>
    </div>
  </nav>
  
  ${sectionsHtml}
  
  <footer class="footer">
    <div class="container">
      <div class="footer-brand">${companyName || 'Minha Empresa'}</div>
      ${phone ? `<p>📞 ${phone}</p>` : ''}
      <div class="footer-links">${socialLinksHtml}</div>
      <div class="footer-copy">© ${new Date().getFullYear()} ${companyName || 'Minha Empresa'}. Todos os direitos reservados.</div>
    </div>
  </footer>
</body>
</html>`;

      // ---- STEP 3: Salvar no banco de dados ----
      const slug = (companyName || 'lp')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') 
        + '-' + Date.now().toString(36);

      const savedPage = await prisma.landingPage.create({
        data: {
          name: companyName ? `LP - ${companyName}` : 'Landing Page IA',
          slug,
          headline: aiContent.headline,
          subheadline: aiContent.subheadline,
          content: sanitizeStoredHtml(fullHtml),
          status: 'published',
          metaTitle: aiContent.metaTitle || companyName,
          metaDescription: aiContent.metaDescription || description,
          organizationId: orgId,
        }
      });

      // Return complete data
      res.json({
        ...aiContent,
        pageId: savedPage.id,
        slug: savedPage.slug,
        url: `/lp/${savedPage.slug}`,
        htmlPreview: fullHtml,
        status: 'published'
      });

    } catch (error) {
      console.error("[LP_IA_GEN_ERROR]", error);
      res.status(500).json({ error: "Erro ao gerar landing page com IA: " + (error as Error).message });
    }
  });

  return router;
}
