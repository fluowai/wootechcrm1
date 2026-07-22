import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type Resolver = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const defaultResolver: Resolver = async (hostname) => {
  const result = await lookup(hostname, { all: true, verbatim: true });
  return result.map(({ address, family }) => ({ address, family }));
};

function isBlockedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0) ||
    (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

function isBlockedIp(address: string): boolean {
  let normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) {
    normalized = normalized.replace("::ffff:", "");
  }
  const family = isIP(normalized);
  if (family === 4) return isBlockedIpv4(normalized);
  if (family !== 6) return true;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized)) return true;
  return false;
}

export async function assertSafeExternalUrl(rawUrl: string, resolver: Resolver = defaultResolver): Promise<URL> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("URL_INVALID"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("URL_PROTOCOL_NOT_ALLOWED");
  if (url.username || url.password) throw new Error("URL_CREDENTIALS_NOT_ALLOWED");

  let hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }
  const mappedMatch = rawUrl.match(/:\/\/\[::ffff:([^\]]+)\]/i);
  if (mappedMatch) {
    hostname = mappedMatch[1];
  } else if (hostname.startsWith("::ffff:")) {
    hostname = hostname.replace("::ffff:", "");
  }

  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("URL_HOST_NOT_ALLOWED");
  }
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("URL_PRIVATE_ADDRESS_NOT_ALLOWED");
    return url;
  }
  const addresses = await resolver(hostname);
  if (!addresses.length || addresses.some(({ address }) => isBlockedIp(address))) {
    throw new Error("URL_PRIVATE_ADDRESS_NOT_ALLOWED");
  }
  return url;
}

export async function safeExternalFetch(rawUrl: string, options: RequestInit = {}, maxRedirects = 0): Promise<Response> {
  let current = await assertSafeExternalUrl(rawUrl);
  let requestOptions: RequestInit = { ...options, redirect: "manual" };
  for (let redirects = 0; ; redirects += 1) {
    const response = await fetch(current, requestOptions);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirects >= maxRedirects) throw new Error("URL_REDIRECT_NOT_ALLOWED");
    const location = response.headers.get("location");
    if (!location) throw new Error("URL_REDIRECT_WITHOUT_LOCATION");
    current = await assertSafeExternalUrl(new URL(location, current).toString());
    if (response.status === 303) requestOptions = { method: "GET", headers: requestOptions.headers, redirect: "manual" };
  }
}
