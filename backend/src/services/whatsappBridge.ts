const WHATSAPP_PROVIDER = "WHATS_MEOW";

export function whatsappProvider() {
  return WHATSAPP_PROVIDER;
}

export function bridgeBaseUrl() {
  return process.env.WHATSAPP_BRIDGE_URL || "http://localhost:8091";
}

export function bridgeSecret() {
  return process.env.WHATSAPP_BRIDGE_SECRET || "dev-whatsapp-bridge-secret";
}

export function normalizeInstanceName(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function instanceIdentifier(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `instance:${slug || "whatsmeow"}`;
}

export async function callBridge(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${bridgeBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-whatsapp-bridge-secret": bridgeSecret(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `WhatsApp bridge error ${res.status}`);
  }
  return data;
}

export async function callBridgeGet(path: string) {
  const res = await fetch(`${bridgeBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-whatsapp-bridge-secret": bridgeSecret(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `WhatsApp bridge error ${res.status}`);
  }
  return data;
}
