import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type TraefikSyncResult = {
  enabled: boolean;
  action: "written" | "removed" | "skipped";
  file?: string;
  error?: string;
  message?: string;
};

function getDynamicDir() {
  const value = String(process.env.TRAEFIK_DYNAMIC_DIR || "").trim();
  return value || null;
}

function getSyncMode() {
  return String(process.env.TRAEFIK_SYNC_MODE || "docker-service").trim().toLowerCase();
}

function getServiceUrl(envName: string, fallbackUrl: string) {
  return String(process.env[envName] || "").trim() || fallbackUrl;
}

function getDockerSocketPath() {
  return String(process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock").trim();
}

function getRouterServiceName() {
  return String(process.env.TRAEFIK_ROUTER_SERVICE || "nexus360_frontend").trim();
}

function getRouterLabelPrefix() {
  return String(process.env.TRAEFIK_ROUTER_LABEL_PREFIX || "nexus360_custom").trim();
}

function getDockerNetwork() {
  return String(process.env.TRAEFIK_DOCKER_NETWORK || "consultio1").trim();
}

function normalizeDomains(domains: string[]) {
  return [...new Set(domains.map(domain => domain.trim().toLowerCase()).filter(Boolean))].sort();
}

function buildHostRule(domains: string[]) {
  const safeDomains = normalizeDomains(domains);
  if (!safeDomains.length) return "Host(`nexus360-disabled.localhost`)";
  return safeDomains.map(domain => `Host(\`${domain}\`)`).join(" || ");
}

function parseHostRule(rule?: string) {
  if (!rule) return [];
  const domains: string[] = [];
  const matches = rule.matchAll(/`([^`]+)`/g);
  for (const match of matches) {
    if (match[1] && match[1] !== "nexus360-disabled.localhost") domains.push(match[1]);
  }
  return normalizeDomains(domains);
}

function dockerRequest<T>(method: string, requestPath: string, body?: unknown): Promise<T> {
  const payload = body === undefined ? undefined : JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: getDockerSocketPath(),
        path: requestPath,
        method,
        headers: payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
            }
          : undefined,
      },
      res => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", chunk => {
          raw += chunk;
        });
        res.on("end", () => {
          if ((res.statusCode || 500) >= 400) {
            return reject(new Error(`Docker API ${method} ${requestPath} retornou ${res.statusCode}: ${raw}`));
          }

          if (!raw.trim()) return resolve({} as T);

          try {
            resolve(JSON.parse(raw) as T);
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function formatDockerSyncError(error: any) {
  const message = error?.message || "Falha ao atualizar labels do servico Docker";
  if (error?.code === "ENOENT" || message.includes("ENOENT")) {
    return `${message}. O Docker socket nao esta montado no container da API; reaplique a stack com o bind /var/run/docker.sock:/var/run/docker.sock.`;
  }
  if (error?.code === "EACCES" || message.includes("permission denied")) {
    return `${message}. A API nao tem permissao para acessar /var/run/docker.sock.`;
  }
  return message;
}

async function updateRouterServiceDomains(domains: string[]): Promise<TraefikSyncResult> {
  const serviceName = getRouterServiceName();
  const labelPrefix = getRouterLabelPrefix();
  const service = await dockerRequest<any>("GET", `/services/${encodeURIComponent(serviceName)}`);
  const version = service?.Version?.Index;
  const spec = service?.Spec;

  if (!version || !spec) {
    throw new Error(`Servico Docker ${serviceName} nao encontrado ou sem versao.`);
  }

  const labels = { ...(spec.Labels || {}) };
  const routerKey = `traefik.http.routers.${labelPrefix}`;
  const serviceKey = `traefik.http.services.${labelPrefix}`;
  const nextDomains = normalizeDomains(domains);

  labels["traefik.enable"] = nextDomains.length ? "true" : "false";
  labels["traefik.docker.network"] = getDockerNetwork();
  labels[`${routerKey}.rule`] = buildHostRule(nextDomains);
  labels[`${routerKey}.entrypoints`] = "websecure";
  labels[`${routerKey}.tls.certresolver`] = String(process.env.TRAEFIK_CERT_RESOLVER || "letsencryptresolver").trim();
  labels[`${routerKey}.priority`] = "200";
  labels[`${routerKey}.service`] = labelPrefix;
  labels[`${serviceKey}.loadbalancer.server.port`] = "80";

  spec.Labels = labels;

  await dockerRequest("POST", `/services/${encodeURIComponent(serviceName)}/update?version=${version}`, spec);

  return {
    enabled: true,
    action: "written",
    message: `Docker service ${serviceName} atualizado com ${nextDomains.length} dominio(s).`,
  };
}

async function getRouterServiceDomains() {
  const serviceName = getRouterServiceName();
  const labelPrefix = getRouterLabelPrefix();
  const service = await dockerRequest<any>("GET", `/services/${encodeURIComponent(serviceName)}`);
  const labels = service?.Spec?.Labels || {};
  return parseHostRule(labels[`traefik.http.routers.${labelPrefix}.rule`]);
}

async function writeDockerRouterDomain(domain: string): Promise<TraefikSyncResult> {
  const domains = await getRouterServiceDomains();
  return updateRouterServiceDomains([...domains, domain]);
}

async function removeDockerRouterDomain(domain: string): Promise<TraefikSyncResult> {
  const normalized = domain.trim().toLowerCase();
  const domains = await getRouterServiceDomains();
  return updateRouterServiceDomains(domains.filter(item => item !== normalized));
}

function getSafeDomainFile(domain: string) {
  const safeName = domain
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/\.+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `nexus360-domain-${safeName}.yml`;
}

function getRouterName(domain: string, suffix = "") {
  const safeName = domain
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `nexus360-${safeName}${suffix}`;
}

function buildDynamicConfig(domain: string) {
  const frontendService = getRouterName(domain, "-frontend-service");
  const apiService = getRouterName(domain, "-api-service");
  const frontendUrl = getServiceUrl("TRAEFIK_FRONTEND_URL", "http://nexus360_frontend:80");
  const apiUrl = getServiceUrl("TRAEFIK_API_URL", "http://nexus360_api:10000");
  const certResolver = String(process.env.TRAEFIK_CERT_RESOLVER || "letsencryptresolver").trim();
  const frontendRouter = getRouterName(domain);
  const apiRouter = getRouterName(domain, "-api");

  return [
    "http:",
    "  routers:",
    `    ${apiRouter}:`,
    `      rule: "Host(\`${domain}\`) && (PathPrefix(\`/api\`) || PathPrefix(\`/lp\`))"`,
    "      entryPoints:",
    "        - websecure",
    `      service: ${apiService}`,
    "      tls:",
    `        certResolver: ${certResolver}`,
    "        domains:",
    `          - main: "${domain}"`,
    "      priority: 100",
    `    ${frontendRouter}:`,
    `      rule: "Host(\`${domain}\`)"`,
    "      entryPoints:",
    "        - websecure",
    `      service: ${frontendService}`,
    "      tls:",
    `        certResolver: ${certResolver}`,
    "        domains:",
    `          - main: "${domain}"`,
    "      priority: 90",
    "  services:",
    `    ${apiService}:`,
    "      loadBalancer:",
    "        servers:",
    `          - url: "${apiUrl}"`,
    `    ${frontendService}:`,
    "      loadBalancer:",
    "        servers:",
    `          - url: "${frontendUrl}"`,
    "",
  ].join("\n");
}

export async function writeTraefikDomainConfig(domain: string): Promise<TraefikSyncResult> {
  if (getSyncMode() === "docker-service") {
    try {
      return await writeDockerRouterDomain(domain);
    } catch (error: any) {
      return {
        enabled: true,
        action: "skipped",
        error: formatDockerSyncError(error),
      };
    }
  }

  const dynamicDir = getDynamicDir();
  if (!dynamicDir) {
    return {
      enabled: false,
      action: "skipped",
      message: "TRAEFIK_DYNAMIC_DIR nao configurado; defina TRAEFIK_SYNC_MODE=docker-service ou monte o provider file do Traefik.",
    };
  }

  const file = path.join(dynamicDir, getSafeDomainFile(domain));
  const tempFile = `${file}.${Date.now()}.tmp`;

  try {
    await fs.mkdir(dynamicDir, { recursive: true });
    await fs.writeFile(tempFile, buildDynamicConfig(domain), "utf8");
    await fs.rename(tempFile, file);
    return { enabled: true, action: "written", file };
  } catch (error: any) {
    try {
      await fs.rm(tempFile, { force: true });
    } catch {
      // Best effort cleanup only.
    }
    return { enabled: true, action: "skipped", file, error: error?.message || "Falha ao escrever arquivo do Traefik" };
  }
}

export async function removeTraefikDomainConfig(domain: string): Promise<TraefikSyncResult> {
  if (getSyncMode() === "docker-service") {
    try {
      return await removeDockerRouterDomain(domain);
    } catch (error: any) {
      return {
        enabled: true,
        action: "skipped",
        error: formatDockerSyncError(error),
      };
    }
  }

  const dynamicDir = getDynamicDir();
  if (!dynamicDir) {
    return {
      enabled: false,
      action: "skipped",
      message: "TRAEFIK_DYNAMIC_DIR nao configurado; defina TRAEFIK_SYNC_MODE=docker-service ou monte o provider file do Traefik.",
    };
  }

  const file = path.join(dynamicDir, getSafeDomainFile(domain));

  try {
    await fs.rm(file, { force: true });
    return { enabled: true, action: "removed", file };
  } catch (error: any) {
    return { enabled: true, action: "skipped", file, error: error?.message || "Falha ao remover arquivo do Traefik" };
  }
}

export async function syncTraefikDomainConfig(domain: string, _verified: boolean): Promise<TraefikSyncResult> {
  // Keep pending domains routed too. When DNS starts pointing to the stack,
  // Traefik can issue the certificate and the app can auto-promote the DB
  // status from pending to verified without support touching the stack.
  return writeTraefikDomainConfig(domain);
}

export async function syncVerifiedTraefikDomains(prisma: PrismaClient) {
  const domains = await prisma.domain.findMany({
    where: { status: { in: ["verified", "pending"] } },
    select: { name: true },
  });

  if (getSyncMode() === "docker-service") {
    const result = await updateRouterServiceDomains(domains.map(domain => domain.name));
    return { enabled: result.enabled, total: domains.length, written: domains.length, failed: 0 };
  }

  if (!getDynamicDir()) return { enabled: false, total: 0, written: 0, failed: 0 };

  const results = await Promise.allSettled(
    domains.map(domain => writeTraefikDomainConfig(domain.name))
  );

  const written = results.filter(result => result.status === "fulfilled" && result.value.action === "written").length;
  const failed = results.length - written;

  return { enabled: true, total: domains.length, written, failed };
}
