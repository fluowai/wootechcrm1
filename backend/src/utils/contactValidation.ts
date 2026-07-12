const DEFAULT_BLOCKED_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "anonaddy.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "maildrop.cc",
  "mailinator.com",
  "mohmal.com",
  "sharklasers.com",
  "tempmail.com",
  "temp-mail.org",
  "trashmail.com",
  "yopmail.com",
]);

function envDomains(key: string) {
  return String(process.env[key] || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function emailDomain(email: string) {
  return normalizeEmail(email).split("@")[1] || "";
}

export function validateEmailAddress(value: unknown) {
  const email = normalizeEmail(value);
  const blockedDomains = new Set([
    ...DEFAULT_BLOCKED_EMAIL_DOMAINS,
    ...envDomains("BLOCKED_EMAIL_DOMAINS"),
    ...envDomains("DISPOSABLE_EMAIL_DOMAINS"),
  ]);

  if (!email) return { ok: false, email, error: "E-mail obrigatorio." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, email, error: "Informe um e-mail valido." };
  }

  const domain = emailDomain(email);
  if (blockedDomains.has(domain)) {
    return {
      ok: false,
      email,
      error: "E-mails temporarios ou descartaveis nao sao aceitos.",
    };
  }

  return { ok: true, email, domain };
}

export function normalizeBrazilianPhone(value: unknown) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { ok: false, raw, normalized: "", error: "Telefone obrigatorio." };

  let national = digits;
  if (digits.startsWith("55") && digits.length >= 12) {
    national = digits.slice(2);
  }

  if (national.length < 10 || national.length > 11) {
    return {
      ok: false,
      raw,
      normalized: digits,
      error: "Informe um telefone brasileiro valido com DDD.",
    };
  }

  const ddd = Number(national.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { ok: false, raw, normalized: digits, error: "DDD do telefone invalido." };
  }

  return {
    ok: true,
    raw,
    normalized: `55${national}`,
    display: `+55${national}`,
  };
}

export function hasVerifiedContact(user: {
  emailVerified?: boolean | null;
  phoneVerified?: boolean | null;
}) {
  return Boolean(user.emailVerified || user.phoneVerified);
}
