import { PrismaClient } from "@prisma/client";
import { getInternalWorkspaceUrls } from "./domainConfig.js";
import { isCrmDomainProvider, verifyAndProvisionDomain } from "../services/domainProvisioning.js";

const RESERVED_WORKSPACE_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "onboarding",
  "site",
  "vendas",
  "meet",
  "p",
  "lp",
  "client-portal",
  "dashboard",
  "crm",
  "prospecting",
  "finance",
  "settings",
  "team",
  "projects",
  "reports",
  "clients",
  "sold-services",
  "ad-accounts",
  "assets",
  "landing-pages",
  "quiz",
  "content",
  "marketing",
  "sales-machine",
  "proposals",
  "agents-hub",
  "ai-settings",
  "prompt-architect",
  "billing",
  "automations",
  "notifications",
  "delivery",
  "service-catalog",
  "time-tracking",
  "knowledge-base",
  "client-health",
  "whatsapp",
  "acp",
]);

export function normalizeRequestHost(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];
}

export async function findVerifiedTenantDomain(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  if (!host) return null;

  try {
    const domain = await prisma.domain.findFirst({
      where: { name: host },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, type: true, settings: true, whiteLabelConfig: true },
        },
      },
    });

    if (!domain) return null;
    if (!isCrmDomainProvider(domain.provider)) return null;

    const resolvedDomain = domain.status === "verified"
      ? domain
      : (await verifyAndProvisionDomain(prisma, domain, domain.organization.slug)).domain;

    if (resolvedDomain.status !== "verified") return null;

    return {
      host,
      domain: resolvedDomain.name,
      status: resolvedDomain.status,
      organization: domain.organization,
    };
  } catch (error: any) {
    console.error("[TENANT_HOST_DOMAIN_ERROR]", {
      host,
      code: error?.code,
      message: error?.message || error,
    });
    return null;
  }
}

export async function findTenantHostContext(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const tenantDomain = await findVerifiedTenantDomain(prisma, hostValue);
  if (tenantDomain) {
    return {
      ...tenantDomain,
      kind: "custom-domain" as const,
      internalUrl: getInternalWorkspaceUrls(tenantDomain.organization.slug),
    };
  }

  return null;
}

export function normalizeWorkspaceSlug(value: unknown) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");

  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) return "";
  if (RESERVED_WORKSPACE_SLUGS.has(slug)) return "";
  return slug;
}

export async function findTenantSlugContext(prisma: PrismaClient, slugValue: unknown) {
  const slug = normalizeWorkspaceSlug(slugValue);
  if (!slug) return null;

  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, type: true, settings: true, whiteLabelConfig: true },
  });

  if (!organization) return null;

  return {
    kind: "workspace-slug" as const,
    domain: null,
    status: "verified",
    internalUrl: getInternalWorkspaceUrls(organization.slug),
    organization,
  };
}

export async function findTenantDomainStatus(prisma: PrismaClient, hostValue: string | string[] | undefined) {
  const host = normalizeRequestHost(hostValue);
  if (!host) return null;

  try {
    return await prisma.domain.findUnique({
      where: { name: host },
      select: { name: true, status: true, organizationId: true },
    });
  } catch (error: any) {
    console.error("[TENANT_HOST_STATUS_ERROR]", {
      host,
      code: error?.code,
      message: error?.message || error,
    });
    return null;
  }
}
