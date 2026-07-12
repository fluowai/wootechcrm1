import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./lib/prisma.js";
import { authenticateToken } from "./middleware/auth.js";
import { resolveTenant } from "./middleware/tenant.js";
import { findTenantDomainStatus, findTenantHostContext, findTenantSlugContext, normalizeRequestHost } from "./utils/tenantHost.js";
import { syncVerifiedTraefikDomains } from "./services/traefikDomainConfig.js";
import { MissionScheduler } from "./services/prospect/MissionScheduler.js";
import { emitAutomationEvent } from "./workers/automationWorker.js";
import { logger } from "./utils/logger.js";
import { cache } from "./utils/cache.js";

process.on("uncaughtException", (err) => {
  logger.error("Process", "UNCAUGHT_EXCEPTION", { error: err.message, stack: err.stack });
  gracefulShutdown(1);
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error("Process", "UNHANDLED_REJECTION", { error: message, stack });
  gracefulShutdown(1);
});

// Import Rotas
import { authRoutes } from "./routes/auth.js";
import { orgSettingsRoutes } from "./routes/orgSettings.js";
import { crmRoutes } from "./routes/crm.js";
import { marketingRoutes } from "./routes/marketing.js";
import { financeRoutes } from "./routes/finance.js";
import { opsRoutes } from "./routes/ops.js";
import { adminRoutes } from "./routes/admin.js";
import { adminPlansRoutes } from "./routes/admin/plans.js";
import { adminWhitelabelSyncRoutes } from "./routes/admin/whitelabelSync.js";
import { adsRoutes } from "./routes/ads.js";
import { clientRoutes } from "./routes/clients.js";
import { aiRoutes } from "./routes/ai.js";
import { calendarRoutes } from "./routes/calendar.js";
import { leadCaptureRoutes } from "./routes/leadCapture.js";
import { prospectingFunnelRoutes } from "./routes/prospectingFunnels.js";
import { taskRoutes } from "./routes/tasks.js";
import { creativeRoutes } from "./routes/creatives.js";
import { domainRoutes } from "./routes/domains.js";
import { projectRoutes } from "./routes/projects.js";
import { promptRoutes } from "./routes/prompts.js";
import { salesRoutes } from "./routes/sales.js";
import { systemRoutes } from "./routes/system.js";
import { livekitRoutes } from "./routes/livekit.js";
import { extraRoutes } from "./routes/extras.js";
import { teamRoutes } from "./routes/team.js";
import { accessProfileRoutes } from "./routes/accessProfiles.js";
import { clientPortalRoutes } from "./routes/clientPortal.js";
import { automationRoutes } from "./routes/automation.js";
import { notificationRoutes } from "./routes/notifications.js";
import { deliveryRoutes } from "./routes/delivery.js";
import { acpRoutes } from "./routes/acp.js";
import { agentQueueRoutes } from "./routes/agentQueue.js";
import { autopilotRoutes } from "./routes/autopilot.js";
import { serviceCatalogRoutes } from "./routes/serviceCatalog.js";
import { timeTrackingRoutes } from "./routes/timeTracking.js";
import { healthScoreRoutes } from "./routes/healthScore.js";
import { knowledgeBaseRoutes } from "./routes/knowledgeBase.js";
import { billingRoutes } from "./routes/billing.js";
import { snapshotRoutes } from "./routes/snapshots.js";
import { usageRoutes } from "./routes/usage.js";
import { reportsRoutes } from "./routes/reports.js";
import { proposalRoutes } from "./routes/proposals.js";
import { privacyRoutes } from "./routes/privacy.js";
import { prospectRoutes } from "./routes/prospect.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { onboardingWhitelabelRoutes } from "./routes/onboardingWhitelabel.js";
import { omnichannelRoutes } from "./routes/omnichannel.js";
import { whatsappRoutes, whatsappInternalRoutes } from "./routes/whatsapp.js";
import { outboundRoutes } from "./routes/outbound.js";
import { storageRoutes, adminStorageRoutes } from "./routes/storage.js";
import { landingPageRoutes, landingPagePublicRoutes } from "./routes/landingPages.js";
import { googleLocalRoutes } from "./routes/googleLocal.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { whatsappCallRoutes } from "./routes/whatsappCalls.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { experienceRoutes } from "./routes/experience.js";
import { qualificationRoutes, qualificationPublicRoutes, qualificationPublicPageRoutes } from "./routes/qualification.js";
import { closingRoutes } from "./routes/closing.js";
import { quizRoutes, quizPublicRoutes } from "./routes/quizzes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "..", "public");

// Necessario para Docker/Portainer atras de proxy reverso.
app.set('trust proxy', 1);

const panelUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://nexus360.consultio.com.br';
const panelOrigin = panelUrl.replace(/\/+$/, '');

let panelHostname = 'nexus360.consultio.com.br';
try { panelHostname = new URL(panelOrigin).hostname; } catch { /* fallback */ }

const configuredOrigins = (process.env.CORS_ORIGINS || panelUrl || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  panelOrigin,
  `https://www.${panelHostname}`,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
]);

function isLocalDevHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

async function isRegisteredTenantHost(hostname: string) {
  if (await findTenantHostContext(prisma, hostname)) return true;
  const host = normalizeRequestHost(hostname);
  if (!host) return false;
  return Boolean(await prisma.landingPage.findFirst({
    where: {
      status: "published",
      OR: [
        { customDomain: host },
        { domain: host },
      ],
    },
    select: { id: true },
  }));
}

async function enforceTenantDomain(req: any, res: any, next: any) {
  try {
    const tenantDomain = await findTenantHostContext(
      prisma,
      req.headers["x-forwarded-host"] || req.headers.host
    );

    if (!tenantDomain) return next();
    if (req.user?.role === "SUPER_ADMIN") return next();
    if (req.user?.orgId === tenantDomain.organization.id) return next();

    return res.status(403).json({
      error: "DOMAIN_ORG_MISMATCH",
      message: "Este dominio pertence a outra organizacao.",
    });
  } catch (error) {
    next(error);
  }
}

const corsOptions: cors.CorsOptions = {
  origin: async (origin, callback) => {
    if (!origin) return callback(null, true);

    try {
      const { hostname } = new URL(origin);
      const normalizedHost = normalizeRequestHost(hostname);
      const isAllowed =
        allowedOrigins.has(origin) ||
        isLocalDevHost(normalizedHost) ||
        await isRegisteredTenantHost(normalizedHost);

      return callback(null, isAllowed);
    } catch {
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id', 'X-Workspace-Id']
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente mais tarde.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login, tente novamente mais tarde.' }
});

// Middlewares Globais de Segurança e Utilidade
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(globalLimiter);
app.use(express.json({ limit: '5mb' }));
app.disable("x-powered-by");
app.use("/lp-assets", express.static(path.join(publicDir, "lp-assets"), {
  immutable: true,
  maxAge: "30d",
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ==================== ROTAS PÚBLICAS ====================

app.get("/api/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Backend Nexus360 Online' });
  } catch (error) {
    next(error);
  }
});

app.get("/api/ping", (req, res) => res.json({ message: "pong", timestamp: new Date().toISOString() }));

app.get("/api/domain/context", async (req, res, next) => {
  try {
    const host = normalizeRequestHost(req.headers["x-forwarded-host"] as string || req.headers.host);
    const slugContext = await findTenantSlugContext(prisma, req.query.slug);
    const serializeContextOnboarding = (organization: any) => {
      const settings = organization?.settings && typeof organization.settings === "object"
        ? organization.settings
        : {};
      return organization?.type === "WHITELABEL"
        ? {
            complete: Boolean(settings.whitelabelOnboardingComplete),
            step: Number(settings.whitelabelOnboardingStep) || 1,
          }
        : null;
    };
    const serializeContextOrganization = (organization: any) => {
      if (!organization) return null;
      const { settings: _settings, ...safeOrganization } = organization;
      return safeOrganization;
    };

    if (slugContext) {
      return res.json({
        customDomain: false,
        domain: null,
        status: slugContext.status,
        internalUrl: slugContext.internalUrl,
        organization: serializeContextOrganization(slugContext.organization),
        whitelabelOnboarding: serializeContextOnboarding(slugContext.organization),
      });
    }

    if (!host) return res.json({ customDomain: false });

    const landingPageDomain = await prisma.landingPage.findFirst({
      where: {
        status: "published",
        OR: [
          { customDomain: host },
          { domain: host },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        organization: {
          select: { id: true, name: true, slug: true, type: true, whiteLabelConfig: true },
        },
      },
    });

    if (landingPageDomain) {
      return res.json({
        customDomain: true,
        domain: host,
        status: "verified",
        kind: "landing-page",
        landingPage: {
          id: landingPageDomain.id,
          name: landingPageDomain.name,
          slug: landingPageDomain.slug,
          publicPath: "/",
          renderPath: `/lp/${landingPageDomain.slug}`,
          publicUrl: `https://${host}`,
        },
        organization: serializeContextOrganization(landingPageDomain.organization),
        whitelabelOnboarding: serializeContextOnboarding(landingPageDomain.organization),
      });
    }

    const tenantDomain = await findTenantHostContext(prisma, host);

    if (tenantDomain) {
      return res.json({
        customDomain: tenantDomain.kind === "custom-domain",
        domain: tenantDomain.domain,
        status: tenantDomain.status,
        internalUrl: tenantDomain.internalUrl,
        organization: serializeContextOrganization(tenantDomain.organization),
        whitelabelOnboarding: serializeContextOnboarding(tenantDomain.organization),
      });
    }

    const domainStatus = await findTenantDomainStatus(prisma, host);

    res.json({
      customDomain: false,
      domain: domainStatus?.name || null,
      status: domainStatus?.status || null,
      organization: null,
    });
  } catch (error) {
    next(error);
  }
});



// Propostas Públicas
app.get("/api/public/proposals/:slug", async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { slug: req.params.slug },
      include: { 
        organization: { select: { name: true } },
        client: { select: { corporateName: true, tradeName: true } }
      }
    });
    if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });
    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/proposals/:slug/accept", async (req, res, next) => {
  const { cnpj, corporateName, phone, email } = req.body;
  try {
    const proposal = await prisma.proposal.findUnique({ where: { slug: req.params.slug } });
    if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });

    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: 'accepted' } });
    emitAutomationEvent("proposal.accepted", { organizationId: proposal.organizationId, proposalId: proposal.id });

    if (proposal.leadId) {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({ where: { id: proposal.leadId! }, data: { status: 'fechado' } });
        await tx.client.create({
          data: {
            corporateName: corporateName || "Cliente via Proposta",
            cnpj, email: email || "", phone: phone || "",
            organizationId: proposal.organizationId, status: 'onboarding'
          }
        });
      });
    }
    res.json({ success: true, message: "Proposta aceita com sucesso!" });
  } catch (error) {
    next(error);
  }
});

// Rotas Públicas de Landing Pages (HTML + Lead Capture)
app.use("/", landingPagePublicRoutes(prisma));

// Rotas Públicas de Qualificação (formulários embedáveis)
app.use("/api/qualification", qualificationPublicRoutes(prisma));
app.use("/", qualificationPublicPageRoutes(prisma));

// Rotas Públicas de Quizzes (HTML interativo + captura de leads)
app.use("/", quizPublicRoutes(prisma));

// ==================== ROTAS DE AUTH (Público + Refresh) ====================
app.use("/api/auth", authLimiter, authRoutes(prisma));

// ==================== ROTAS PROTEGIDAS (Tenant Isolated) ====================
const protectedRoutes = [
  { path: "/api/admin", router: adminRoutes },
  { path: "/api/org", router: orgSettingsRoutes },
  { path: "/api/clients", router: clientRoutes },
  { path: "/api/ai", router: aiRoutes },
  { path: "/api/crm", router: crmRoutes },
  { path: "/api/marketing", router: marketingRoutes },
  { path: "/api/finance", router: financeRoutes },
  { path: "/api/ops", router: opsRoutes },
  { path: "/api/ads", router: adsRoutes },
  { path: "/api/calendar", router: calendarRoutes },
  { path: "/api/lead-capture", router: leadCaptureRoutes },
  { path: "/api/prospecting-funnels", router: prospectingFunnelRoutes },
  { path: "/api/tasks", router: taskRoutes },
  { path: "/api/creatives", router: creativeRoutes },
  { path: "/api/domains", router: domainRoutes },
  { path: "/api/projects", router: projectRoutes },
  { path: "/api/prompts", router: promptRoutes },
  { path: "/api/sales", router: salesRoutes },
  { path: "/api/system", router: systemRoutes },
  { path: "/api/extras", router: extraRoutes },
  { path: "/api/team", router: teamRoutes },
  { path: "/api/access-profiles", router: accessProfileRoutes },
  { path: "/api/automation", router: automationRoutes },
  { path: "/api/notifications", router: notificationRoutes },
  { path: "/api/delivery", router: deliveryRoutes },
  { path: "/api/service-catalog", router: serviceCatalogRoutes },
  { path: "/api/time-tracking", router: timeTrackingRoutes },
  { path: "/api/health-score", router: healthScoreRoutes },
  { path: "/api/knowledge-base", router: knowledgeBaseRoutes },
  { path: "/api/snapshots", router: snapshotRoutes },
  { path: "/api/usage", router: usageRoutes },
  { path: "/api/reports", router: reportsRoutes },
  { path: "/api/proposals", router: proposalRoutes },
  { path: "/api/privacy", router: privacyRoutes },
  { path: "/api/nexus-prospect", router: prospectRoutes },
  { path: "/api/onboarding", router: onboardingRoutes },
  { path: "/api/onboarding/whitelabel", router: onboardingWhitelabelRoutes },
  { path: "/api/omnichannel", router: omnichannelRoutes },
  { path: "/api/whatsapp", router: whatsappRoutes },
  { path: "/api/outbound", router: outboundRoutes },
  { path: "/api/acp", router: acpRoutes },
  { path: "/api/agent-queue", router: agentQueueRoutes },
  { path: "/api/autopilot", router: autopilotRoutes },
  { path: "/api/storage", router: storageRoutes },
  { path: "/api/landing-pages", router: landingPageRoutes },
  { path: "/api/google-local", router: googleLocalRoutes },
  { path: "/api/webhooks", router: webhookRoutes },
  { path: "/api/dashboard", router: dashboardRoutes },
  { path: "/api/experience", router: experienceRoutes },
  { path: "/api/qualification", router: qualificationRoutes },
  { path: "/api/whatsapp/calls", router: whatsappCallRoutes },
  { path: "/api/admin/storage", router: adminStorageRoutes },
  { path: "/api/closing", router: closingRoutes },
  { path: "/api", router: quizRoutes },
];

// Rotas Administrativas de Planos
app.use("/api/admin/plans", authenticateToken, adminPlansRoutes(prisma));

// Rotas Administrativas de Whitelabel Sync
app.use("/api/admin/whitelabel-sync", authenticateToken, adminWhitelabelSyncRoutes(prisma));

protectedRoutes.forEach(route => {
  app.use(route.path, authenticateToken, enforceTenantDomain, resolveTenant, route.router(prisma));
});

// Rotas Externas / Portais
app.use("/api/billing", billingRoutes(prisma));
app.use("/api/livekit", livekitRoutes(prisma));
app.use("/api/client-portal", clientPortalRoutes(prisma));
app.use("/api/internal/whatsapp", whatsappInternalRoutes(prisma));

// ==================== DASHBOARD (extracted to routes/dashboard.ts) ====================

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.originalUrl });
});

// Global Error Handler
import { errorHandler } from "./middleware/errorHandler.js";
app.use(errorHandler);

const PORT = process.env.PORT || 10000;

// Inicialização dos Serviços em Background (Agentes)
const missionScheduler = new MissionScheduler(prisma);
missionScheduler.start();

// Workers de Automação e Follow-up
import { AutomationWorker } from "./workers/automationWorker.js";
import { FollowUpWorker } from "./workers/followUpWorker.js";
import { SdrAgentWorker } from "./workers/sdrAgentWorker.js";
import { ProspectingDispatchWorker } from "./workers/prospectingDispatchWorker.js";
import { SmartFollowUpWorker } from "./workers/smartFollowUpWorker.js";

const automationWorker = new AutomationWorker(prisma);
automationWorker.start();
const followUpWorker = new FollowUpWorker(prisma);
followUpWorker.start();
const prospectingDispatchWorker = new ProspectingDispatchWorker(prisma);
prospectingDispatchWorker.start();
const sdrAgentWorker = new SdrAgentWorker(prisma);
sdrAgentWorker.start();
const smartFollowUpWorker = new SmartFollowUpWorker(prisma);
smartFollowUpWorker.start();

// Socket.io para eventos em tempo real
import { createServer } from "http";
import { initSocketManager } from "./services/socketManager.js";
const httpServer = createServer(app);
initSocketManager(httpServer);

syncVerifiedTraefikDomains(prisma)
  .then(result => {
    if (result.enabled) {
      logger.info('TraefikSync', `dominios=${result.total} escritos=${result.written} falhas=${result.failed}`);
    }
  })
  .catch(error => {
    logger.error('TraefikSync', 'Sync error', { error: error?.message || error });
  });

const serverInstance = httpServer.listen(PORT, () => {
  logger.info('Server', `Nexus360 Core rodando na porta ${PORT}`);
  logger.info('Server', `API: http://localhost:${PORT}/api`);
});

export function gracefulShutdown(exitCode = 0) {
  logger.info("Server", "Iniciando shutdown graceful...");
  serverInstance.close();

  missionScheduler.stop();
  automationWorker.stop();
  followUpWorker.stop();
  prospectingDispatchWorker.stop();
  sdrAgentWorker.stop();
  smartFollowUpWorker.stop();

  prisma.$disconnect().catch(() => {});
  cache.disconnect().catch(() => {});

  setTimeout(() => {
    logger.info("Server", "Shutdown completo.");
    process.exit(exitCode);
  }, 5000).unref();
}

process.on("SIGTERM", () => gracefulShutdown(0));
process.on("SIGINT", () => gracefulShutdown(0));
