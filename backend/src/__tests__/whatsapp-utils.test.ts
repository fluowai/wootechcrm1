import { describe, it, expect } from "vitest";
import {
  normalizeWhatsAppPhone,
  normalizeWhatsAppJid,
  isWhatsAppGroupJid,
  isWhatsAppNewsletterJid,
  formatBrazilianWhatsAppPhone,
  displayWhatsAppJid,
  pickWhatsAppDisplayName,
  mapWhatsAppMediaType,
  cleanWhatsAppMessageText,
} from "../utils/whatsapp.js";

describe("normalizeWhatsAppPhone", () => {
  it("normalizes phone with DDD only", () => {
    const result = normalizeWhatsAppPhone("11999998888");
    expect(result.digits).toBe("5511999998888");
    expect(result.e164).toBe("+5511999998888");
    expect(result.jid).toBe("5511999998888@s.whatsapp.net");
    expect(result.isValid).toBe(true);
  });

  it("normalizes phone with DDI", () => {
    const result = normalizeWhatsAppPhone("5521988887777");
    expect(result.digits).toBe("5521988887777");
    expect(result.isValid).toBe(true);
  });

  it("formats phone with country code + DDI", () => {
    const result = normalizeWhatsAppPhone("+55 (21) 98888-7777");
    expect(result.digits).toBe("5521988887777");
    expect(result.display).toBe("+55 21 98888-7777");
    expect(result.isValid).toBe(true);
  });

  it("returns invalid for short numbers", () => {
    const result = normalizeWhatsAppPhone("123");
    expect(result.isValid).toBe(false);
    expect(result.digits).toBe("123");
  });

  it("returns invalid for empty", () => {
    const result = normalizeWhatsAppPhone("");
    expect(result.isValid).toBe(false);
    expect(result.digits).toBe("");
  });

  it("returns invalid for null", () => {
    const result = normalizeWhatsAppPhone(null);
    expect(result.isValid).toBe(false);
  });

  it("handles 8-digit landline (no 9)", () => {
    const result = normalizeWhatsAppPhone("2133334444");
    expect(result.digits).toBe("552133334444");
    expect(result.isValid).toBe(true);
    expect(result.display).toBe("+55 21 3333-4444");
  });

  it("detects repeated digits as invalid", () => {
    const result = normalizeWhatsAppPhone("11111111111");
    expect(result.isValid).toBe(false);
  });
});

describe("normalizeWhatsAppJid", () => {
  it("returns jid for raw phone", () => {
    expect(normalizeWhatsAppJid("11999998888")).toBe("5511999998888@s.whatsapp.net");
  });

  it("keeps valid jid", () => {
    expect(normalizeWhatsAppJid("5511999998888@s.whatsapp.net")).toBe("5511999998888@s.whatsapp.net");
  });

  it("converts c.us server to s.whatsapp.net", () => {
    expect(normalizeWhatsAppJid("5511999998888@c.us")).toBe("5511999998888@s.whatsapp.net");
  });

  it("keeps group jid", () => {
    expect(normalizeWhatsAppJid("120363123456@g.us")).toBe("120363123456@g.us");
  });

  it("returns empty for null", () => {
    expect(normalizeWhatsAppJid(null)).toBe("");
  });
});

describe("isWhatsAppGroupJid", () => {
  it("detects group jid", () => {
    expect(isWhatsAppGroupJid("120363123456@g.us")).toBe(true);
  });

  it("rejects user jid", () => {
    expect(isWhatsAppGroupJid("5511999998888@s.whatsapp.net")).toBe(false);
  });

  it("rejects null", () => {
    expect(isWhatsAppGroupJid(null)).toBe(false);
  });
});

describe("isWhatsAppNewsletterJid", () => {
  it("detects newsletter server", () => {
    expect(isWhatsAppNewsletterJid("123456@newsletter")).toBe(true);
  });

  it("detects broadcast", () => {
    expect(isWhatsAppNewsletterJid("123456@broadcast")).toBe(true);
  });

  it("rejects user jid", () => {
    expect(isWhatsAppNewsletterJid("5511999998888@s.whatsapp.net")).toBe(false);
  });
});

describe("formatBrazilianWhatsAppPhone", () => {
  it("formats 9-digit mobile", () => {
    expect(formatBrazilianWhatsAppPhone("11999998888")).toBe("+55 11 99999-8888");
  });

  it("formats 8-digit landline", () => {
    expect(formatBrazilianWhatsAppPhone("2133334444")).toBe("+55 21 3333-4444");
  });

  it("formats already normalized", () => {
    expect(formatBrazilianWhatsAppPhone("5511999998888")).toBe("+55 11 99999-8888");
  });

  it("returns empty for empty input", () => {
    expect(formatBrazilianWhatsAppPhone("")).toBe("");
  });
});

describe("displayWhatsAppJid", () => {
  it("returns display phone for user jid", () => {
    const result = displayWhatsAppJid("5511999998888@s.whatsapp.net");
    expect(result).toBe("+55 11 99999-8888");
  });

  it("returns empty for group jid", () => {
    expect(displayWhatsAppJid("120363123456@g.us")).toBe("");
  });

  it("returns empty for null", () => {
    expect(displayWhatsAppJid(null)).toBe("");
  });
});

describe("pickWhatsAppDisplayName", () => {
  it("picks group name over pushName", () => {
    const name = pickWhatsAppDisplayName({
      group: { name: "Equipe Vendas" },
      pushName: "João",
      displayName: "João Silva",
    });
    expect(name).toBe("Equipe Vendas");
  });

  it("picks displayName if no group name", () => {
    const name = pickWhatsAppDisplayName({
      displayName: "Maria Souza",
      pushName: "Maria",
    });
    expect(name).toBe("Maria Souza");
  });

  it("formats phone when only jid-like value is available", () => {
    const name = pickWhatsAppDisplayName({
      phone: "5511999998888@s.whatsapp.net",
    });
    expect(name).toBe("+55 11 99999-8888");
  });

  it("returns Contato WhatsApp fallback", () => {
    const name = pickWhatsAppDisplayName({});
    expect(name).toBe("Contato WhatsApp");
  });
});

describe("mapWhatsAppMediaType", () => {
  it("maps image type", () => {
    expect(mapWhatsAppMediaType("image", "image/jpeg")).toBe("image");
  });

  it("maps audio type", () => {
    expect(mapWhatsAppMediaType("audio", "audio/ogg")).toBe("audio");
  });

  it("maps video type", () => {
    expect(mapWhatsAppMediaType("video", "video/mp4")).toBe("video");
  });

  it("maps document type", () => {
    expect(mapWhatsAppMediaType("document", "application/pdf")).toBe("document");
  });

  it("maps reaction type", () => {
    expect(mapWhatsAppMediaType("reaction", "")).toBe("reaction");
  });

  it("maps text as default", () => {
    expect(mapWhatsAppMediaType("", "")).toBe("text");
  });

  it("maps null as text", () => {
    expect(mapWhatsAppMediaType(null, null)).toBe("text");
  });

  it("maps sticker via mime", () => {
    expect(mapWhatsAppMediaType("", "image/webp")).toBe("sticker");
  });

  it("maps location", () => {
    expect(mapWhatsAppMediaType("location", "")).toBe("location");
  });

  it("maps poll", () => {
    expect(mapWhatsAppMediaType("poll_creation", "")).toBe("poll");
  });

  it("maps interactive", () => {
    expect(mapWhatsAppMediaType("buttons_message", "")).toBe("interactive");
  });
});

describe("cleanWhatsAppMessageText", () => {
  it("returns trimmed text", () => {
    expect(cleanWhatsAppMessageText("  Hello  ")).toBe("Hello");
  });

  it("returns null for empty", () => {
    expect(cleanWhatsAppMessageText("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(cleanWhatsAppMessageText(null)).toBeNull();
  });

  it("strips media labels for non-text media", () => {
    expect(cleanWhatsAppMessageText("imagem", "image")).toBeNull();
    expect(cleanWhatsAppMessageText("audio", "audio")).toBeNull();
    expect(cleanWhatsAppMessageText("video", "video")).toBeNull();
    expect(cleanWhatsAppMessageText("documento", "document")).toBeNull();
  });

  it("keeps actual text for media messages", () => {
    expect(cleanWhatsAppMessageText("Olá, tudo bem?", "image")).toBe("Olá, tudo bem?");
  });
});
