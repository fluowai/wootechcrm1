import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import {
  executeGoogleLocalScan,
  generateGrid,
  discoverProfilesWithOutscraper,
  discoverProfilesWithSerper,
  getProfileDiscovery,
  normalizeProfileCandidate,
  auditGoogleProfile,
  buildGoogleProfileDiagnosis,
  profileCandidateFromGoogleMapsUrl,
  resolveGoogleLocalAccess,
  startProfileDiscovery,
} from "../services/googleLocal.js";
import { emitAutomationEvent } from "../workers/automationWorker.js";

export function googleLocalRoutes(prisma: PrismaClient) {
  const router = Router();

  async function accessFor(req: AuthRequest) {
    if (!req.user?.id || !req.user?.orgId) return null;
    return resolveGoogleLocalAccess(prisma, req.user.orgId, req.user.id, req.user.role);
  }

  router.get("/access", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access) return res.status(401).json({ error: "Unauthorized" });
    res.json(access);
  });

  router.get("/profiles", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    const profiles = await prisma.googleLocalProfile.findMany({
      where: { organizationId: req.user!.orgId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ profiles });
  });

  router.post("/discover", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    try {
      const url = String(req.body?.url || "").trim();
      const query = url || [
        String(req.body?.name || req.body?.query || "").trim(),
        String(req.body?.city || "").trim(),
        String(req.body?.state || "").trim(),
      ].filter(Boolean).join(" ");
      if (!query) return res.status(400).json({ error: "Informe o nome do perfil ou a URL do Google Maps." });
      // Tenta resolver links curtos (g.page, maps.app.goo.gl) antes de enviar para o scraper para evitar falhas no headless browser
      let finalQuery = query;
      if (url) {
        if (url.includes("goo.gl") || url.includes("g.page") || url.includes("maps.app")) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const redirectRes = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
            clearTimeout(timeoutId);
            if (redirectRes.url) finalQuery = redirectRes.url;
          } catch (e) {
            console.error("[URL_RESOLVE_ERROR]", e);
          }
        }

        // Se a URL for um link de Rota (/dir/) ou Local (/place/), o scraper pode se confundir ou dar timeout.
        // Extraímos o nome limpo da URL para garantir que o scraper faça uma busca perfeita.
        const extracted = profileCandidateFromGoogleMapsUrl(finalQuery, req.body?.name || req.body?.query);
        if (extracted && extracted.name && extracted.name !== "Perfil do Google Maps") {
          return res.json({
            status: "COMPLETED",
            candidates: [extracted],
            source: "URL",
            message: "Perfil localizado pelo link. O mapa de posicionamento continua disponível após importar.",
          });
        }
      }

      let serperError: string | null = null;
      if (!url || !finalQuery.includes("google.com/maps")) {
        const orgKeys = await prisma.organization.findUnique({
          where: { id: req.user!.orgId },
          select: { serperApiKey: true, outscraperKey: true },
        });

        try {
          const serperCandidates = await discoverProfilesWithSerper(
            finalQuery,
            orgKeys?.serperApiKey || process.env.SERPER_API_KEY,
          );

          if (serperCandidates.length) {
            return res.json({
              status: "COMPLETED",
              candidates: serperCandidates,
              source: "SERPER_PLACES",
              message: "Perfis localizados no Google Places.",
            });
          }
        } catch (error) {
          serperError = error instanceof Error ? error.message : String(error);
          console.warn("[GOOGLE_LOCAL_SERPER_DISCOVER_FALLBACK]", serperError);
        }

        try {
          const outscraperCandidates = await discoverProfilesWithOutscraper(
            finalQuery,
            orgKeys?.outscraperKey || process.env.OUTSCRAPER_API_KEY || process.env.OUTSCRAPER_KEY,
          );

          if (outscraperCandidates.length) {
            return res.json({
              status: "COMPLETED",
              candidates: outscraperCandidates,
              source: "OUTSCRAPER_MAPS",
              message: "Perfis localizados no Google Maps.",
            });
          }
        } catch (error) {
          const outscraperError = error instanceof Error ? error.message : String(error);
          console.warn("[GOOGLE_LOCAL_OUTSCRAPER_DISCOVER_FALLBACK]", outscraperError);
          serperError = [serperError, outscraperError].filter(Boolean).join(" | ") || null;
        }
      }

      const jobId = await startProfileDiscovery(finalQuery);
      res.status(202).json({ jobId, status: "RUNNING", serperError });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      console.error("[GOOGLE_LOCAL_DISCOVER_ERROR]", details);
      res.status(502).json({
        error: "Não foi possível conectar ao coletor do Google Maps. Verifique se o serviço google-maps-scraper está rodando na stack.",
        details,
      });
    }
  });

  router.get("/discover/:jobId", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    try {
      res.json(await getProfileDiscovery(req.params.jobId));
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      console.error("[GOOGLE_LOCAL_DISCOVER_STATUS_ERROR]", details);
      res.status(502).json({
        error: "Não foi possível consultar o coletor do Google Maps.",
        details,
      });
    }
  });

  router.post("/profiles", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    const { name, placeId, cid, address, latitude, longitude, sourceUrl, category, phone, website, rating, reviewsCount, rawData, competitors = [] } = req.body;
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: "Nome e coordenadas válidas são obrigatórios." });
    }
    const candidate = normalizeProfileCandidate(rawData || req.body);
    const audit = auditGoogleProfile({ ...candidate, ...req.body });
    const competitorCandidates = Array.isArray(competitors)
      ? competitors.map((item) => normalizeProfileCandidate(item.rawData || item))
      : [];
    const analyzer = buildGoogleProfileDiagnosis({ ...candidate, ...req.body }, audit, competitorCandidates);
    const profile = await prisma.googleLocalProfile.create({
      data: {
        organizationId: req.user!.orgId,
        createdById: req.user!.id,
        name: String(name).trim(),
        placeId: placeId ? String(placeId).trim() : null,
        cid: cid ? String(cid).trim() : null,
        address: address ? String(address).trim() : null,
        sourceUrl: sourceUrl ? String(sourceUrl).trim() : null,
        category: category ? String(category).trim() : null,
        phone: phone ? String(phone).trim() : null,
        website: website ? String(website).trim() : null,
        rating: rating === null || rating === undefined ? null : Number(rating),
        reviewsCount: reviewsCount === null || reviewsCount === undefined ? null : Number(reviewsCount),
        latitude: lat,
        longitude: lon,
        rawData: rawData || req.body,
        auditScore: audit.score,
        auditData: { ...audit, ...analyzer },
        lastAuditedAt: new Date(),
      },
    });
    res.status(201).json({ profile });
  });

  router.post("/profiles/:id/send-to-crm", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    const orgId = req.user!.orgId;
    const profile = await prisma.googleLocalProfile.findFirst({
      where: { id: req.params.id, organizationId: orgId },
    });
    if (!profile) return res.status(404).json({ error: "Perfil não encontrado." });

    const auditData = (profile.auditData || {}) as any;
    const score = Math.round(Number(auditData.opportunityScore || profile.auditScore || 0));
    const notes = [
      "[Nexus GBP Analyzer]",
      `Perfil: ${profile.name}`,
      profile.category ? `Categoria: ${profile.category}` : null,
      profile.address ? `Endereço: ${profile.address}` : null,
      profile.website ? `Site: ${profile.website}` : null,
      profile.sourceUrl ? `Google Maps: ${profile.sourceUrl}` : null,
      `Score GBP: ${profile.auditScore ?? "N/A"}/100`,
      `Score oportunidade: ${score}/100`,
      auditData.diagnosis ? `\nDiagnóstico:\n${auditData.diagnosis}` : null,
    ].filter(Boolean).join("\n");

    const existing = await prisma.lead.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { name: profile.name },
          ...(profile.phone ? [{ phone: profile.phone }] : []),
          ...(profile.website ? [{ notes: { contains: profile.website } }] : []),
        ],
      },
    });

    const lead = existing || await prisma.lead.create({
      data: {
        name: profile.name,
        email: `gbp-${profile.id}@nexus360.local`,
        phone: profile.phone || undefined,
        status: "novo",
        organizationId: orgId,
        assignedToId: req.user?.id,
        source: "Nexus GBP Analyzer",
        channel: "Google Maps",
        tags: profile.category || "GBP",
        score,
        temperature: score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD",
        notes,
        aiDiagnosis: auditData.diagnosis || undefined,
      },
    });

    if (!existing) {
      emitAutomationEvent("lead.created", { organizationId: orgId, leadId: lead.id, lead });
    }
    res.json({ lead, duplicated: Boolean(existing) });
  });

  router.post("/profiles/:id/audit", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    const existing = await prisma.googleLocalProfile.findFirst({
      where: { id: req.params.id, organizationId: req.user!.orgId },
    });
    if (!existing) return res.status(404).json({ error: "Perfil não encontrado." });
    const candidate = normalizeProfileCandidate(req.body?.rawData || req.body);
    const audit = auditGoogleProfile({ ...candidate, ...req.body });
    const competitorCandidates = Array.isArray(req.body?.competitors)
      ? req.body.competitors.map((item: any) => normalizeProfileCandidate(item.rawData || item))
      : [];
    const analyzer = buildGoogleProfileDiagnosis({ ...candidate, ...req.body }, audit, competitorCandidates);
    const profile = await prisma.googleLocalProfile.update({
      where: { id: existing.id },
      data: {
        name: candidate.name || existing.name,
        placeId: candidate.placeId || existing.placeId,
        cid: candidate.cid || existing.cid,
        address: candidate.address || existing.address,
        sourceUrl: candidate.sourceUrl || existing.sourceUrl,
        category: candidate.category || existing.category,
        phone: candidate.phone || existing.phone,
        website: candidate.website || existing.website,
        rating: candidate.rating,
        reviewsCount: candidate.reviewsCount === null ? null : Math.round(candidate.reviewsCount),
        latitude: candidate.latitude ?? existing.latitude,
        longitude: candidate.longitude ?? existing.longitude,
        rawData: req.body?.rawData || req.body,
        auditScore: audit.score,
        auditData: { ...audit, ...analyzer },
        lastAuditedAt: new Date(),
      },
    });
    res.json({ profile });
  });

  router.delete("/profiles/:id", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    const deleted = await prisma.googleLocalProfile.deleteMany({
      where: { id: req.params.id, organizationId: req.user!.orgId },
    });
    if (!deleted.count) return res.status(404).json({ error: "Perfil não encontrado." });
    res.json({ success: true });
  });

  router.get("/scans", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    const scans = await prisma.googleLocalScan.findMany({
      where: { organizationId: req.user!.orgId },
      include: { profile: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ scans });
  });

  router.get("/scans/:id", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    const scan = await prisma.googleLocalScan.findFirst({
      where: { id: req.params.id, organizationId: req.user!.orgId },
      include: {
        profile: true,
        points: { orderBy: [{ rowIndex: "asc" }, { columnIndex: "asc" }] },
      },
    });
    if (!scan) return res.status(404).json({ error: "Análise não encontrada." });
    res.json({ scan });
  });

  router.post("/scans", async (req: AuthRequest, res) => {
    const access = await accessFor(req);
    if (!access?.enabled) return res.status(403).json({ error: "Módulo Google Local não liberado." });
    const { profileId, keyword, gridSize = 5, radiusKm = 5, zoom = 15 } = req.body;
    const size = Number(gridSize);
    const radius = Number(radiusKm);
    const zoomLevel = Number(zoom);
    if (![3, 5, 7].includes(size) || !keyword || radius <= 0 || radius > 50 || zoomLevel < 10 || zoomLevel > 21) {
      return res.status(400).json({ error: "Configuração da grade inválida." });
    }
    const profile = await prisma.googleLocalProfile.findFirst({
      where: { id: profileId, organizationId: req.user!.orgId },
    });
    if (!profile) return res.status(404).json({ error: "Perfil não encontrado." });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const usage = await prisma.googleLocalScan.aggregate({
      where: { organizationId: req.user!.orgId, createdById: req.user!.id, createdAt: { gte: monthStart } },
      _sum: { totalPoints: true },
    });
    const requestedPoints = size * size;
    if ((usage._sum.totalPoints || 0) + requestedPoints > access.monthlyLimit) {
      return res.status(429).json({
        error: "Limite mensal de pontos atingido.",
        used: usage._sum.totalPoints || 0,
        limit: access.monthlyLimit,
      });
    }

    const coordinates = generateGrid(profile.latitude, profile.longitude, size, radius);
    const scan = await prisma.googleLocalScan.create({
      data: {
        organizationId: req.user!.orgId,
        createdById: req.user!.id,
        profileId: profile.id,
        keyword: String(keyword).trim(),
        gridSize: size,
        radiusKm: radius,
        zoom: zoomLevel,
        totalPoints: coordinates.length,
        points: { create: coordinates },
      },
      include: { profile: true, points: true },
    });

    setImmediate(() => {
      executeGoogleLocalScan(prisma, scan.id).catch((error) => {
        console.error("[GOOGLE_LOCAL_SCAN_ERROR]", error);
      });
    });
    res.status(202).json({ scan });
  });

  router.get("/admin/access", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Apenas SUPER_ADMIN." });
    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        users: { select: { id: true, name: true, email: true, role: true, status: true } },
        googleLocalAccesses: true,
      },
      orderBy: { name: "asc" },
    });
    res.json({ organizations });
  });

  router.post("/admin/access", async (req: AuthRequest, res) => {
    if (req.user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "Apenas SUPER_ADMIN." });
    const { organizationId, userId = null, enabled, monthlyLimit = 200, expiresAt = null } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId é obrigatório." });
    if (userId) {
      const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
      if (!user) return res.status(404).json({ error: "Usuário não pertence à organização." });
    }
    const existing = await prisma.googleLocalAccess.findFirst({ where: { organizationId, userId } });
    const data = {
      enabled: Boolean(enabled),
      monthlyLimit: Math.max(Number(monthlyLimit) || 0, 0),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      grantedById: req.user.id,
      grantedAt: enabled ? new Date() : null,
    };
    const grant = existing
      ? await prisma.googleLocalAccess.update({ where: { id: existing.id }, data })
      : await prisma.googleLocalAccess.create({ data: { organizationId, userId, ...data } });
    res.json({ grant });
  });

  return router;
}
