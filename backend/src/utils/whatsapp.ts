type NormalizedWhatsAppPhone = {
  digits: string;
  e164: string;
  jid: string;
  display: string;
  countryCode: string;
  areaCode: string;
  subscriber: string;
  isValid: boolean;
};

const BRAZIL_COUNTRY_CODE = "55";

function stripWhatsAppUserDevice(user?: string | null) {
  return String(user || "").split(":")[0].replace(/\D/g, "");
}

function jidServer(input?: string | null) {
  const raw = String(input || "").trim();
  const at = raw.indexOf("@");
  return at >= 0 ? raw.slice(at + 1).toLowerCase() : "";
}

export function normalizeWhatsAppPhone(input?: string | null): NormalizedWhatsAppPhone {
  const raw = String(input || "").trim();
  const user = raw.includes("@") ? raw.slice(0, raw.indexOf("@")) : raw;
  const digits = stripWhatsAppUserDevice(user);
  if (!digits) {
    return { digits: "", e164: "", jid: "", display: "", countryCode: "", areaCode: "", subscriber: "", isValid: false };
  }

  let normalized = digits;
  if (normalized.length === 10 || normalized.length === 11) {
    normalized = `${BRAZIL_COUNTRY_CODE}${normalized}`;
  }

  const countryCode = normalized.startsWith(BRAZIL_COUNTRY_CODE) ? BRAZIL_COUNTRY_CODE : "";
  const national = countryCode ? normalized.slice(2) : normalized;
  const areaCode = national.slice(0, 2);
  const subscriber = national.slice(2);
  const isValid = countryCode === BRAZIL_COUNTRY_CODE
    && areaCode.length === 2
    && (subscriber.length === 8 || subscriber.length === 9)
    && !/^(\d)\1+$/.test(national);

  return {
    digits: normalized,
    e164: `+${normalized}`,
    jid: `${normalized}@s.whatsapp.net`,
    display: formatBrazilianWhatsAppPhone(normalized),
    countryCode,
    areaCode,
    subscriber,
    isValid,
  };
}

export function normalizeWhatsAppJid(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  if (!raw.includes("@")) {
    return normalizeWhatsAppPhone(raw).jid;
  }

  const server = jidServer(raw);
  const user = raw.slice(0, raw.indexOf("@"));
  if (server === "s.whatsapp.net" || server === "c.us") {
    const normalized = normalizeWhatsAppPhone(user);
    return normalized.digits ? normalized.jid : raw;
  }

  return raw;
}

export function isWhatsAppGroupJid(input?: string | null) {
  return normalizeWhatsAppJid(input).endsWith("@g.us");
}

export function isWhatsAppNewsletterJid(input?: string | null) {
  const jid = normalizeWhatsAppJid(input).toLowerCase();
  const server = jidServer(jid);
  return server === "newsletter" || jid.includes("@newsletter") || jid.endsWith("@broadcast") || server === "broadcast";
}

export function formatBrazilianWhatsAppPhone(input?: string | null) {
  const digits = String(input || "").replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11 ? `${BRAZIL_COUNTRY_CODE}${digits}` : digits;
  if (!normalized.startsWith(BRAZIL_COUNTRY_CODE) || normalized.length < 12) {
    return normalized ? `+${normalized}` : "";
  }

  const areaCode = normalized.slice(2, 4);
  const subscriber = normalized.slice(4);
  if (subscriber.length === 9) {
    return `+55 ${areaCode} ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
  }
  if (subscriber.length === 8) {
    return `+55 ${areaCode} ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
  }
  return `+${normalized}`;
}

export function displayWhatsAppJid(input?: string | null) {
  const jid = normalizeWhatsAppJid(input);
  if (!jid) return "";
  if (isWhatsAppGroupJid(jid)) return "";
  return normalizeWhatsAppPhone(jid).display;
}

function looksLikeRawWhatsAppId(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  return raw.includes("@") || /^\+?\d{10,16}(:\d+)?$/.test(raw.replace(/\s/g, ""));
}

export function pickWhatsAppDisplayName(payload: any) {
  const candidates = [
    payload?.group?.name ||
    payload?.displayName ||
    payload?.pushName ||
    payload?.senderPushName ||
    payload?.leadName ||
    payload?.contactName ||
    payload?.phone
  ];

  const found = candidates
    .map((value) => String(value || "").trim())
    .find((value) => value && !looksLikeRawWhatsAppId(value));
  if (found) return found;

  const phone = displayWhatsAppJid(payload?.senderJid || payload?.chatJid || payload?.phone);
  return phone || "Contato WhatsApp";
}

export function mapWhatsAppMediaType(type?: string | null, mimeType?: string | null) {
  const mediaType = String(type || "").toLowerCase();
  const mime = String(mimeType || "").toLowerCase();

  if (mediaType.includes("reaction")) return "reaction";
  if (mediaType.includes("deleted") || mediaType.includes("revoked")) return "deleted";
  if (mediaType.includes("edited")) return "edited";
  if (mediaType.includes("poll")) return "poll";
  if (mediaType.includes("interactive") || mediaType.includes("button") || mediaType.includes("list") || mediaType.includes("template")) return "interactive";
  if (mediaType.includes("call")) return "call";
  if (mediaType.includes("event")) return "event";
  if (mediaType.includes("commerce") || mediaType.includes("product") || mediaType.includes("order")) return "commerce";
  if (mediaType.includes("live_location")) return "live_location";
  if (mediaType.includes("sticker") || mime.includes("webp")) return "sticker";
  if (mediaType.includes("location")) return "location";
  if (mediaType.includes("contact") || mediaType.includes("vcard")) return "contact";
  if (mediaType.includes("image") || mime.startsWith("image/")) return "image";
  if (mediaType.includes("audio") || mime.startsWith("audio/")) return "audio";
  if (mediaType.includes("video") || mime.startsWith("video/")) return "video";
  if (mime.includes("pdf")) return "document";
  if (mediaType.includes("document") || mime) return "document";
  return "text";
}

export function cleanWhatsAppMessageText(value?: string | null, mediaType = "text") {
  const text = String(value || "").trim();
  if (!text) return null;

  if (mediaType !== "text") {
    const normalized = text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const mediaLabels = new Set([
      "audio",
      "video",
      "image",
      "imagem",
      "pdf",
      "document",
      "documento",
      "arquivo",
      "file",
    ]);
    if (mediaLabels.has(normalized)) return null;
  }

  return text;
}

function firstNonRawName(values: Array<string | null | undefined>) {
  return values
    .map((value) => String(value || "").replace(/\([^)]*\)/g, "").trim())
    .find((value) => value && !looksLikeRawWhatsAppId(value)) || null;
}

export function buildWhatsAppParticipantDirectory(payload: any) {
  const directory = new Map<string, { name: string; phone: string; display: string }>();
  const participants = [
    ...(Array.isArray(payload?.participants) ? payload.participants : []),
    ...(Array.isArray(payload?.group?.participants) ? payload.group.participants : []),
  ];

  for (const participant of participants) {
    const jidValues = [participant?.jid, participant?.rawJid, participant?.phoneNumber, participant?.lid]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const phone = normalizeWhatsAppPhone(participant?.jid || participant?.phoneNumber || participant?.rawJid);
    const name = firstNonRawName([participant?.name, participant?.pushName, participant?.displayName]) || phone.display;
    const entry = { name, phone: phone.e164, display: name || phone.display };

    for (const value of jidValues) {
      directory.set(value, entry);
      const normalizedJid = normalizeWhatsAppJid(value);
      if (normalizedJid) directory.set(normalizedJid, entry);
      const digits = stripWhatsAppUserDevice(value);
      if (digits) directory.set(digits, entry);
    }
  }

  return directory;
}

export function resolveWhatsAppMentionLabel(mention: any, directory: Map<string, { name: string; phone: string; display: string }>) {
  const candidates = [
    mention?.jid,
    mention?.rawJid,
    mention?.phone,
    normalizeWhatsAppJid(mention?.jid),
    stripWhatsAppUserDevice(mention?.jid),
    stripWhatsAppUserDevice(mention?.rawJid),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const found = directory.get(String(candidate));
    if (found?.display) return found.display;
  }

  const fallbackPhone = normalizeWhatsAppPhone(mention?.jid || mention?.rawJid || mention?.phone);
  return fallbackPhone.display || "Contato";
}

export function normalizeWhatsAppMentions(content?: string | null, mentions: any[] = [], payload?: any) {
  if (!content) return content || null;
  if (!Array.isArray(mentions) || !mentions.length) return content;

  const directory = buildWhatsAppParticipantDirectory(payload);
  let output = content;

  for (const mention of mentions) {
    const label = resolveWhatsAppMentionLabel(mention, directory);
    const replacements = [
      mention?.rawJid,
      mention?.jid,
      stripWhatsAppUserDevice(mention?.jid),
      stripWhatsAppUserDevice(mention?.rawJid),
      stripWhatsAppUserDevice(mention?.phone),
    ].filter(Boolean);

    for (const raw of replacements) {
      const escaped = String(raw).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      output = output.replace(new RegExp(`@${escaped}`, "g"), `@${label}`);
    }
  }

  return output;
}
