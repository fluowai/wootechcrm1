import { PrismaClient } from "@prisma/client";

type GridCoordinate = {
  rowIndex: number;
  columnIndex: number;
  latitude: number;
  longitude: number;
};

type ScraperRow = Record<string, string>;

const activeExecutions = new Set<string>();
const COMPLETED_JOB_STATUSES = new Set(["ok", "completed", "complete", "done", "finished", "success", "succeeded"]);
const FAILED_JOB_STATUSES = new Set(["failed", "fail", "error", "errored", "canceled", "cancelled"]);

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function generateGrid(
  centerLat: number,
  centerLon: number,
  gridSize: number,
  radiusKm: number,
): GridCoordinate[] {
  const half = (gridSize - 1) / 2;
  const latStep = radiusKm / Math.max(half, 1) / 110.574;
  const lonKm = Math.max(111.320 * Math.cos((centerLat * Math.PI) / 180), 0.01);
  const lonStep = radiusKm / Math.max(half, 1) / lonKm;
  const points: GridCoordinate[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      points.push({
        rowIndex: row,
        columnIndex: column,
        latitude: centerLat + (half - row) * latStep,
        longitude: centerLon + (column - half) * lonStep,
      });
    }
  }

  return points;
}

function parseCsv(input: string): ScraperRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = (rows.shift() || []).map((header) => header.replace(/^\uFEFF/, "").trim());
  return rows.map((values) =>
    headers.reduce<ScraperRow>((result, header, index) => {
      result[header] = (values[index] || "").trim();
      return result;
    }, {}),
  );
}

function scraperConfig() {
  return {
    baseUrl: (process.env.GOOGLE_MAPS_SCRAPER_URL || "http://google-maps-scraper:8080").replace(/\/$/, ""),
    pollMs: Math.max(Number(process.env.GOOGLE_MAPS_SCRAPER_POLL_MS) || 2500, 500),
    timeoutMs: Math.max(Number(process.env.GOOGLE_MAPS_SCRAPER_JOB_TIMEOUT_MS) || 180000, 30000),
  };
}

async function scraperRequest(path: string, options: RequestInit = {}) {
  const { baseUrl } = scraperConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Scraper indisponível em ${baseUrl}: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Scraper HTTP ${response.status}: ${details.slice(0, 500)}`);
  }

  return response;
}

export async function startProfileDiscovery(query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) throw new Error("Informe o nome do perfil, cidade ou URL do Google Maps.");
  const created = await scraperRequest("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify({
      name: `Nexus Profile Discovery - ${cleanQuery.slice(0, 80)}`,
      keywords: [cleanQuery],
      lang: "pt",
      zoom: 15,
      fast_mode: false,
      radius: 50000,
      depth: 1,
      email: false,
      max_time: 180,
    }),
  });
  const { id } = await created.json() as { id: string };
  if (!id) throw new Error("O scraper não retornou o identificador da busca.");
  return id;
}

function numberValue(value: unknown) {
  if (value && typeof value === "object") return null;
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstValue(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function coordinatesFromRaw(row: Record<string, any>) {
  const gps = row.gps_coordinates || row.gpsCoordinates || row.coordinates || {};
  return {
    latitude: numberValue(firstValue(row.latitude, row.lat, gps.latitude, gps.lat)),
    longitude: numberValue(firstValue(row.longitude, row.longtitude, row.lng, row.lon, gps.longitude, gps.lng, gps.lon)),
  };
}

export function profileCandidateFromGoogleMapsUrl(url: string, fallbackName?: string) {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl) return null;

  const destinationCoordinates = cleanUrl.match(/!1d(-?\d+(?:\.\d+)?)!2d(-?\d+(?:\.\d+)?)/);
  const atCoordinates = cleanUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const queryCoordinates = cleanUrl.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const latitude = destinationCoordinates
    ? Number(destinationCoordinates[2])
    : Number((atCoordinates || queryCoordinates)?.[1]);
  const longitude = destinationCoordinates
    ? Number(destinationCoordinates[1])
    : Number((atCoordinates || queryCoordinates)?.[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  let name = String(fallbackName || "").trim();
  let address: string | null = null;
  let decodedUrl = cleanUrl.replace(/\+/g, " ");
  try {
    decodedUrl = decodeURIComponent(decodedUrl);
  } catch {
    decodedUrl = cleanUrl.replace(/\+/g, " ");
  }
  if (!name) {
    const placeMatch = decodedUrl.match(/\/place\/([^/@?]+)/);
    const directionsMatch = decodedUrl.match(/\/dir\/(?:[^/]*\/)?([^/@?]+)/);
    const profileText = (placeMatch?.[1] || directionsMatch?.[1] || "").trim();
    if (profileText) {
      const parts = profileText.split(",").map((part) => part.trim()).filter(Boolean);
      name = parts.shift() || "";
      address = parts.join(", ") || null;
    }
  }
  const placeDataId = cleanUrl.match(/!1s([^!/?&]+)/)?.[1] || null;
  const cidHex = placeDataId?.split(":").at(-1);
  let cid: string | null = null;
  if (cidHex?.startsWith("0x")) {
    try {
      cid = BigInt(cidHex).toString();
    } catch {
      cid = cidHex;
    }
  }

  return {
    name: name || "Perfil do Google Maps",
    placeId: placeDataId,
    cid,
    address,
    sourceUrl: cleanUrl,
    category: null,
    phone: null,
    website: null,
    rating: null,
    reviewsCount: null,
    latitude,
    longitude,
    description: null,
    openHours: null,
    thumbnail: null,
    rawData: {
      title: name || "Perfil do Google Maps",
      link: cleanUrl,
      address,
      cid,
      place_id: placeDataId,
      latitude: String(latitude),
      longitude: String(longitude),
      source: "GOOGLE_MAPS_URL_FALLBACK",
    },
  };
}

export function normalizeProfileCandidate(row: Record<string, any>) {
  const { latitude, longitude } = coordinatesFromRaw(row);
  const cid = firstValue(row.cid, row.data_cid, row.place_cid);
  const placeId = firstValue(row.place_id, row.placeId, row.google_id, row.googleId);
  const sourceUrl = firstValue(row.link, row.google_maps_url, row.location_link, row.mapsUrl, cid ? `https://www.google.com/maps?cid=${cid}` : null);
  return {
    name: String(firstValue(row.title, row.name, row.business_name) || "").trim(),
    placeId: placeId ? String(placeId).trim() : null,
    cid: cid ? String(cid).trim() : null,
    address: firstValue(row.address, row.full_address, row.formattedAddress) ? String(firstValue(row.address, row.full_address, row.formattedAddress)) : null,
    sourceUrl: sourceUrl ? String(sourceUrl) : null,
    category: firstValue(row.category, row.type, row.subtype, Array.isArray(row.categories) ? row.categories[0] : null) ? String(firstValue(row.category, row.type, row.subtype, Array.isArray(row.categories) ? row.categories[0] : null)) : null,
    phone: firstValue(row.phone, row.phoneNumber, row.phone_number) ? String(firstValue(row.phone, row.phoneNumber, row.phone_number)) : null,
    website: firstValue(row.website, row.web_site, row.site) ? String(firstValue(row.website, row.web_site, row.site)) : null,
    rating: numberValue(firstValue(row.review_rating, row.rating)),
    reviewsCount: numberValue(firstValue(row.review_count, row.ratingCount, row.reviews, row.reviews_count)),
    latitude,
    longitude,
    description: firstValue(row.descriptions, row.description) ? String(firstValue(row.descriptions, row.description)) : null,
    openHours: firstValue(row.open_hours, row.opening_hours, row.working_hours) || null,
    thumbnail: firstValue(row.thumbnail, row.imageUrl, row.image_url) ? String(firstValue(row.thumbnail, row.imageUrl, row.image_url)) : null,
    rawData: row,
  };
}

export async function discoverProfilesWithSerper(query: string, apiKey?: string | null) {
  const cleanQuery = query.trim();
  if (!cleanQuery || !apiKey) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("https://google.serper.dev/places", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        q: cleanQuery,
        gl: "br",
        hl: "pt-br",
        num: 20,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error || data.message) {
      const details = data.error || data.message || `HTTP ${response.status}`;
      throw new Error(`Serper Places: ${details}`);
    }

    const places = Array.isArray(data.places) ? data.places : [];
    return places
      .map((place: Record<string, any>) => normalizeProfileCandidate(place))
      .filter((item: GoogleProfileCandidate) => item.name && item.latitude !== null && item.longitude !== null)
      .slice(0, 20);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function discoverProfilesWithOutscraper(query: string, apiKey?: string | null) {
  const cleanQuery = query.trim();
  if (!cleanQuery || !apiKey) return [];

  const endpoint = process.env.OUTSCRAPER_GOOGLE_MAPS_ENDPOINT || "https://api.app.outscraper.com/maps/search-v3";
  const url = new URL(endpoint);
  url.searchParams.set("query", cleanQuery);
  url.searchParams.set("limit", "20");
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "BR");
  url.searchParams.set("async", "false");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "X-API-KEY": apiKey },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error || data.message) {
      const details = data.error || data.message || `HTTP ${response.status}`;
      throw new Error(`Outscraper Maps: ${details}`);
    }

    const results = Array.isArray(data.results?.[0])
      ? data.results[0]
      : Array.isArray(data.data?.[0])
        ? data.data[0]
        : Array.isArray(data.results)
          ? data.results
          : [];

    return results
      .map((place: Record<string, any>) => normalizeProfileCandidate(place))
      .filter((item: GoogleProfileCandidate) => item.name && item.latitude !== null && item.longitude !== null)
      .slice(0, 20);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getProfileDiscovery(jobId: string) {
  const statusResponse = await scraperRequest(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
  const job = await statusResponse.json() as { status?: string };
  const status = String(job.status || "").toLowerCase();
  if (FAILED_JOB_STATUSES.has(status)) return { status: "FAILED", candidates: [] };
  if (!COMPLETED_JOB_STATUSES.has(status)) return { status: "RUNNING", candidates: [] };
  const csvResponse = await scraperRequest(`/api/v1/jobs/${encodeURIComponent(jobId)}/download`);
  const rows = parseCsv(await csvResponse.text());
  return {
    status: "COMPLETED",
    candidates: rows.map(normalizeProfileCandidate).filter((item) =>
      item.name && item.latitude !== null && item.longitude !== null,
    ).slice(0, 20),
  };
}

function hasJsonContent(value: unknown) {
  const text = String(value || "").trim();
  return text !== "" && text !== "{}" && text !== "[]" && text !== "null";
}

type GoogleProfileCandidate = ReturnType<typeof normalizeProfileCandidate>;

export function opportunityScore(candidate: GoogleProfileCandidate, competitors: GoogleProfileCandidate[] = []) {
  const rating = candidate.rating || 0;
  const reviews = candidate.reviewsCount || 0;
  const competitorReviews = competitors
    .filter((item) => item.name !== candidate.name)
    .map((item) => item.reviewsCount || 0)
    .filter((value) => value > 0);
  const avgCompetitorReviews = competitorReviews.length
    ? competitorReviews.reduce((sum, value) => sum + value, 0) / competitorReviews.length
    : 0;

  let score = 25;
  if (!candidate.website) score += 18;
  if (!candidate.phone) score += 12;
  if (!candidate.category) score += 8;
  if (!candidate.description) score += 8;
  if (!hasJsonContent(candidate.openHours)) score += 7;
  if (rating > 0 && rating < 4) score += 10;
  if (reviews < 20) score += 12;
  if (avgCompetitorReviews && reviews < avgCompetitorReviews * 0.5) score += 15;
  if (avgCompetitorReviews && reviews > avgCompetitorReviews * 1.5 && rating >= 4.5) score -= 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function analyzeCompetition(candidate: GoogleProfileCandidate, competitors: GoogleProfileCandidate[] = []) {
  const comparable = competitors
    .filter((item) => item.name && item.name !== candidate.name)
    .slice(0, 10);
  const ratings = comparable.map((item) => item.rating || 0).filter(Boolean);
  const reviews = comparable.map((item) => item.reviewsCount || 0).filter(Boolean);
  const avgRating = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
  const avgReviews = reviews.length ? reviews.reduce((sum, value) => sum + value, 0) / reviews.length : null;
  const stronger = comparable.filter((item) =>
    (item.rating || 0) >= (candidate.rating || 0) && (item.reviewsCount || 0) > (candidate.reviewsCount || 0),
  );

  return {
    totalCompetitors: comparable.length,
    avgRating,
    avgReviews,
    strongerCompetitors: stronger.slice(0, 5).map((item) => ({
      name: item.name,
      rating: item.rating,
      reviewsCount: item.reviewsCount,
      website: item.website,
    })),
    insights: [
      avgRating && (candidate.rating || 0) < avgRating ? "Avaliação abaixo da média local." : null,
      avgReviews && (candidate.reviewsCount || 0) < avgReviews ? "Volume de avaliações abaixo dos concorrentes." : null,
      !candidate.website ? "Perfil sem site vinculado: oportunidade clara para oferta de presença digital." : null,
      !candidate.phone ? "Perfil sem telefone visível: oportunidade de correção básica de conversão." : null,
    ].filter(Boolean),
  };
}

export function buildGoogleProfileDiagnosis(candidate: GoogleProfileCandidate, audit: ReturnType<typeof auditGoogleProfile>, competitors: GoogleProfileCandidate[] = []) {
  const competition = analyzeCompetition(candidate, competitors);
  const opportunity = opportunityScore(candidate, competitors);
  const diagnosis = [
    `${candidate.name || "Este perfil"} tem score de auditoria ${audit.score}/100 e oportunidade comercial ${opportunity}/100.`,
    audit.recommendations.length
      ? `Prioridades: ${audit.recommendations.slice(0, 3).join(" ")}`
      : "O perfil tem boa base cadastral; foque em diferenciação, fotos recentes e rotina de avaliações.",
    competition.insights.length
      ? `Concorrência local: ${competition.insights.join(" ")}`
      : "Na amostra local, não há desvantagem crítica evidente contra os concorrentes capturados.",
  ].join("\n\n");

  return {
    opportunityScore: opportunity,
    commercialTemperature: opportunity >= 70 ? "HOT" : opportunity >= 40 ? "WARM" : "COLD",
    competition,
    diagnosis,
  };
}

export function auditGoogleProfile(candidate: GoogleProfileCandidate) {
  const checks = [
    { key: "identity", label: "Nome e identidade do perfil", weight: 10, passed: Boolean(candidate.name) },
    { key: "category", label: "Categoria principal configurada", weight: 12, passed: Boolean(candidate.category) },
    { key: "address", label: "Endereço completo", weight: 10, passed: Boolean(candidate.address) },
    { key: "phone", label: "Telefone disponível", weight: 10, passed: Boolean(candidate.phone) },
    { key: "website", label: "Site vinculado", weight: 12, passed: Boolean(candidate.website) },
    { key: "description", label: "Descrição do negócio", weight: 10, passed: Boolean(candidate.description) },
    { key: "hours", label: "Horários de funcionamento", weight: 10, passed: hasJsonContent(candidate.openHours) },
    { key: "rating", label: "Avaliação igual ou superior a 4,0", weight: 10, passed: (candidate.rating || 0) >= 4 },
    { key: "reviews", label: "Volume mínimo de 20 avaliações", weight: 10, passed: (candidate.reviewsCount || 0) >= 20 },
    { key: "image", label: "Imagem principal disponível", weight: 6, passed: Boolean(candidate.thumbnail) },
  ];
  const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);
  const recommendations = checks
    .filter((check) => !check.passed)
    .map((check) => {
      const actions: Record<string, string> = {
        category: "Revise a categoria principal e adicione categorias secundárias relevantes.",
        address: "Complete e valide o endereço exibido no Google.",
        phone: "Adicione um telefone local e mantenha-o atualizado.",
        website: "Vincule o site oficial com uma página específica para a localidade.",
        description: "Escreva uma descrição clara com serviços, diferenciais e região atendida.",
        hours: "Cadastre horários regulares e horários especiais.",
        rating: "Crie uma rotina de solicitação e resposta de avaliações.",
        reviews: "Aumente o volume de avaliações recentes e autênticas.",
        image: "Adicione logo, capa, fachada e fotos recentes.",
      };
      return actions[check.key] || `Complete o item: ${check.label}.`;
    });
  return {
    score,
    level: score >= 85 ? "EXCELENTE" : score >= 70 ? "BOM" : score >= 50 ? "REGULAR" : "CRÍTICO",
    checks,
    recommendations,
    summary: {
      rating: candidate.rating,
      reviewsCount: candidate.reviewsCount,
      category: candidate.category,
      website: candidate.website,
      phone: candidate.phone,
    },
  };
}

async function scrapePoint(keyword: string, latitude: number, longitude: number, zoom: number) {
  const created = await scraperRequest("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify({
      name: `Nexus Geo Grid - ${keyword}`,
      keywords: [keyword],
      lang: "pt",
      zoom,
      lat: String(latitude),
      lon: String(longitude),
      fast_mode: true,
      radius: 50000,
      depth: 1,
      email: false,
      max_time: 180,
    }),
  });
  const { id } = await created.json() as { id: string };
  if (!id) throw new Error("O scraper não retornou o identificador do trabalho.");

  const startedAt = Date.now();
  const { pollMs, timeoutMs } = scraperConfig();
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    const statusResponse = await scraperRequest(`/api/v1/jobs/${id}`);
    const job = await statusResponse.json() as { status?: string };
    const status = String(job.status || "").toLowerCase();
    if (FAILED_JOB_STATUSES.has(status)) throw new Error("O scraper falhou ao processar o ponto.");
    if (COMPLETED_JOB_STATUSES.has(status)) {
      const csvResponse = await scraperRequest(`/api/v1/jobs/${id}/download`);
      return { jobId: id, rows: parseCsv(await csvResponse.text()) };
    }
  }

  throw new Error("Tempo limite excedido ao consultar o Google Maps.");
}

function findProfile(rows: ScraperRow[], profile: { name: string; placeId: string | null; cid: string | null }) {
  const expectedName = normalize(profile.name);
  return rows.find((row) => {
    if (profile.placeId && row.place_id === profile.placeId) return true;
    if (profile.cid && row.cid === profile.cid) return true;
    const title = normalize(row.title || row.name);
    return title === expectedName ||
      (expectedName.length >= 6 && title.includes(expectedName)) ||
      (title.length >= 6 && expectedName.includes(title));
  });
}

async function processPoint(prisma: PrismaClient, scan: any, point: any) {
  try {
    const { jobId, rows } = await scrapePoint(
      scan.keyword,
      point.latitude,
      point.longitude,
      scan.zoom,
    );
    const matched = findProfile(rows, scan.profile);
    const rankValue = matched ? Number(matched.rank || rows.indexOf(matched) + 1) : null;
    const rank = rankValue && Number.isFinite(rankValue) ? rankValue : null;

    await prisma.googleLocalGridPoint.update({
      where: { id: point.id },
      data: {
        scraperJobId: jobId,
        status: "COMPLETED",
        found: Boolean(matched),
        rank,
        matchedTitle: matched?.title || null,
        matchedPlaceId: matched?.place_id || null,
        matchedCid: matched?.cid || null,
        rawResult: matched || undefined,
      },
    });
  } catch (error) {
    await prisma.googleLocalGridPoint.update({
      where: { id: point.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
  } finally {
    await prisma.googleLocalScan.update({
      where: { id: scan.id },
      data: { processedPoints: { increment: 1 } },
    });
  }
}

export async function executeGoogleLocalScan(prisma: PrismaClient, scanId: string) {
  if (activeExecutions.has(scanId)) return;
  activeExecutions.add(scanId);

  try {
    const scan = await prisma.googleLocalScan.findUnique({
      where: { id: scanId },
      include: { profile: true, points: { orderBy: [{ rowIndex: "asc" }, { columnIndex: "asc" }] } },
    });
    if (!scan || ["COMPLETED", "RUNNING"].includes(scan.status)) return;

    await prisma.googleLocalScan.update({
      where: { id: scanId },
      data: { status: "RUNNING", startedAt: new Date(), error: null },
    });

    const concurrency = Math.min(Math.max(Number(process.env.GOOGLE_MAPS_SCRAPER_CONCURRENCY) || 2, 1), 5);
    let cursor = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < scan.points.length) {
        const point = scan.points[cursor];
        cursor += 1;
        await processPoint(prisma, scan, point);
      }
    });
    await Promise.all(workers);

    const points = await prisma.googleLocalGridPoint.findMany({ where: { scanId } });
    const ranks = points.flatMap((point) => point.rank ? [point.rank] : []);
    const found = ranks.length;
    const total = points.length || 1;
    await prisma.googleLocalScan.update({
      where: { id: scanId },
      data: {
        status: found > 0 ? "COMPLETED" : "FAILED",
        averageRank: found ? ranks.reduce((sum, rank) => sum + rank, 0) / found : null,
        top3Percent: (ranks.filter((rank) => rank <= 3).length / total) * 100,
        top10Percent: (ranks.filter((rank) => rank <= 10).length / total) * 100,
        foundPercent: (found / total) * 100,
        completedAt: new Date(),
        error: found > 0 ? null : "O perfil não foi encontrado em nenhum ponto da grade.",
      },
    });
  } catch (error) {
    await prisma.googleLocalScan.update({
      where: { id: scanId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    }).catch(() => undefined);
  } finally {
    activeExecutions.delete(scanId);
  }
}

export async function enrichLeadWithGBPContext(
  prisma: PrismaClient,
  organizationId: string,
  lead: { name?: string | null; phone?: string | null; website?: string | null },
): Promise<{
  gbpProfile: GoogleProfileCandidate | null;
  audit: ReturnType<typeof auditGoogleProfile> | null;
  diagnosis: ReturnType<typeof buildGoogleProfileDiagnosis> | null;
  agentContext: string;
  weaknesses: string[];
  opportunities: string[];
} | null> {
  const where: any[] = [{ organizationId }];
  if (lead.phone) {
    const digits = String(lead.phone).replace(/\D/g, "");
    if (digits.length >= 8) where.push({ phone: { contains: digits } });
  }
  if (lead.website) {
    const domain = String(lead.website).replace(/https?:\/\//, "").split("/")[0];
    if (domain) where.push({ website: { contains: domain } });
  }
  if (lead.name) {
    const nameParts = String(lead.name).toLowerCase().slice(0, 30).split(/\s+/).filter((p) => p.length > 3);
    if (nameParts.length) {
      where.push({ name: { contains: nameParts[0] } });
    }
  }

  const profile = await prisma.googleLocalProfile.findFirst({
    where: { OR: where },
    orderBy: { lastAuditedAt: "desc" },
  });

  if (!profile) return null;

  const candidate = normalizeProfileCandidate((profile.rawData as ScraperRow) || {});
  if (profile.name) candidate.name = profile.name;
  if (profile.rating) candidate.rating = profile.rating;
  if (profile.reviewsCount) candidate.reviewsCount = profile.reviewsCount;
  if (profile.category) candidate.category = profile.category;
  if (profile.website) candidate.website = profile.website;
  if (profile.phone) candidate.phone = profile.phone;

  const audit = auditGoogleProfile(candidate);
  const diagnosis = buildGoogleProfileDiagnosis(candidate, audit);

  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  for (const check of audit.checks) {
    if (!check.passed) {
      weaknesses.push(check.label);
    }
  }
  if (diagnosis.competition.insights.length) {
    opportunities.push(...diagnosis.competition.insights.filter((i): i is string => i !== null));
  }
  if (diagnosis.competition.strongerCompetitors.length) {
    const top = diagnosis.competition.strongerCompetitors[0];
    opportunities.push(`Concorrente ${top.name} está melhor posicionado (rating ${top.rating}, ${top.reviewsCount} avaliações)`);
  }
  if (opportunityScore(candidate) >= 40) {
    opportunities.push("Perfil com alto potencial de melhoria — oportunidade comercial clara");
  }

  const auditFailures = audit.checks.filter((c) => !c.passed);

  const agentContext = [
    `[GBP Audit - ${candidate.name}]`,
    `Score GBP: ${audit.score}/100 (${audit.level})`,
    `Score Oportunidade: ${diagnosis.opportunityScore}/100 (${diagnosis.commercialTemperature})`,
    auditFailures.length ? `Falhas detectadas: ${auditFailures.map((c) => c.label).join(", ")}` : null,
    !candidate.website ? "SEM SITE VINCULADO — perde visibilidade e credibilidade" : null,
    (candidate.rating || 0) < 4 ? `Avaliação ${candidate.rating}/5 — abaixo do ideal` : null,
    (candidate.reviewsCount || 0) < 20 ? `Apenas ${candidate.reviewsCount || 0} avaliações — volume baixo` : null,
    diagnosis.competition.strongerCompetitors.length ? `Concorrentes mais fortes: ${diagnosis.competition.strongerCompetitors.map((c) => c.name).join(", ")}` : null,
    diagnosis.diagnosis,
  ].filter(Boolean).join("\n");

  return {
    gbpProfile: candidate,
    audit,
    diagnosis,
    agentContext,
    weaknesses,
    opportunities,
  };
}

export async function resolveGoogleLocalAccess(
  prisma: PrismaClient,
  organizationId: string,
  userId: string,
  role?: string,
) {
  if (role === "SUPER_ADMIN") return { enabled: true, monthlyLimit: 100000, source: "SUPER_ADMIN" };

  const now = new Date();
  const [userGrant, orgGrant] = await Promise.all([
    prisma.googleLocalAccess.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    }),
    prisma.googleLocalAccess.findFirst({
      where: { organizationId, userId: null },
    }),
  ]);
  const grant = userGrant || orgGrant;
  const enabled = Boolean(grant?.enabled && (!grant.expiresAt || grant.expiresAt > now));
  return {
    enabled,
    monthlyLimit: grant?.monthlyLimit || 0,
    source: userGrant ? "USER" : orgGrant ? "ORGANIZATION" : "NONE",
    expiresAt: grant?.expiresAt || null,
  };
}
