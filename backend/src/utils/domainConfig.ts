import dns from "node:dns/promises";

export const DOMAIN_REGEX = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;
export const DEFAULT_WHITELABEL_IP = "207.58.153.219";

export function normalizeDomain(value: unknown) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0]
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  }
}

export function getPanelHost() {
  const panelUrl = process.env.FRONTEND_URL || process.env.APP_URL || "https://nexus360.consultio.com.br";

  try {
    return new URL(panelUrl).hostname;
  } catch {
    return "nexus360.consultio.com.br";
  }
}

export function getExpectedWhitelabelIp() {
  return process.env.WHITELABEL_DOCKER_IP || DEFAULT_WHITELABEL_IP;
}

export function getInternalWorkspaceUrls(slug?: string | null) {
  const panelHost = getPanelHost();
  const normalizedSlug = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
  if (!normalizedSlug) return null;

  return {
    slug: normalizedSlug,
    primary: `https://${panelHost}/${normalizedSlug}`,
    legacy: `https://${panelHost}/whitelabel/${normalizedSlug}`,
  };
}

export function getDnsInstructions(domain: string, slug?: string | null) {
  const panelHost = getPanelHost();
  const expectedIp = getExpectedWhitelabelIp();
  const internalUrl = getInternalWorkspaceUrls(slug);
  const cnameTarget = process.env.WHITELABEL_CNAME_TARGET || panelHost;

  return {
    domain,
    type: "A",
    host: domain,
    value: expectedIp,
    cname: {
      type: "CNAME",
      host: domain,
      value: cnameTarget,
    },
    www: {
      type: "CNAME",
      host: "www",
      value: domain,
    },
    internalUrl,
  };
}

export async function verifyDomainDns(domain: string, slug?: string | null) {
  const expectedIp = getExpectedWhitelabelIp();
  const expectedCnames = [
    process.env.WHITELABEL_CNAME_TARGET || getPanelHost(),
  ]
    .filter(Boolean)
    .map(item => String(item).replace(/\.$/, "").toLowerCase());
  const result: {
    verified: boolean;
    expected: { ip: string; cname: string[] };
    records: { a: string[]; cname: string[] };
    message: string;
  } = {
    verified: false,
    expected: { ip: expectedIp, cname: expectedCnames },
    records: { a: [], cname: [] },
    message: `DNS ainda nao aponta para ${expectedIp} nem para ${expectedCnames.join(" ou ")}.`,
  };

  try {
    const addresses = await dns.resolve4(domain);
    result.records.a = addresses;
    if (addresses.includes(expectedIp)) {
      result.verified = true;
      result.message = `Dominio apontando corretamente para o IP ${expectedIp}.`;
      return result;
    }
  } catch {
    // DNS A record not found or resolution failed; fall through to CNAME check.
  }

  try {
    const cnames = await dns.resolveCname(domain);
    result.records.cname = cnames.map(item => item.replace(/\.$/, "").toLowerCase());
    if (result.records.cname.some(record => expectedCnames.includes(record))) {
      result.verified = true;
      result.message = "Dominio apontando corretamente via CNAME.";
      return result;
    }
  } catch {
    // DNS CNAME record not found or resolution failed.
  }

  return result;
}
