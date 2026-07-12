import { PrismaClient } from "@prisma/client";
import { getDnsInstructions, verifyDomainDns } from "../utils/domainConfig.js";
import { writeTraefikDomainConfig } from "./traefikDomainConfig.js";

export function isLandingDomainProvider(provider?: string | null) {
  return String(provider || "").toLowerCase() === "landing";
}

export function isCrmDomainProvider(provider?: string | null) {
  const normalized = String(provider || "").toLowerCase();
  return !normalized || normalized === "docker" || normalized === "crm";
}

export async function verifyAndProvisionDomain(
  prisma: PrismaClient,
  domain: any,
  slug?: string | null
) {
  const verification = await verifyDomainDns(domain.name, slug);
  const nextStatus = verification.verified ? "verified" : "pending";
  const updated = domain.status === nextStatus
    ? domain
    : await prisma.domain.update({
        where: { id: domain.id },
        data: { status: nextStatus },
      });

  return {
    domain: { ...domain, ...updated, status: nextStatus },
    verification,
    dns: getDnsInstructions(domain.name, slug),
    traefik: await writeTraefikDomainConfig(domain.name),
  };
}

export async function refreshPendingDomainList(prisma: PrismaClient, domains: any[]) {
  const refreshed = await Promise.all(domains.map(async (domain) => {
    if (domain.status === "verified") return domain;

    try {
      const result = await verifyAndProvisionDomain(prisma, domain, domain.organization?.slug);
      return {
        ...domain,
        ...result.domain,
        verification: result.verification,
        traefik: result.traefik,
      };
    } catch (error: any) {
      return {
        ...domain,
        autoVerificationError: error?.message || "Falha ao validar dominio automaticamente",
      };
    }
  }));

  return refreshed;
}
