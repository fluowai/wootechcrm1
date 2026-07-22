import crypto from "crypto";
import { Request, Response } from "express";

const REFRESH_COOKIE_NAME = "nexus_refresh_token";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getRefreshCookieName(): string {
  return REFRESH_COOKIE_NAME;
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return cookies;
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
  return bodyToken || parseCookies(req)[REFRESH_COOKIE_NAME];
}

export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  const maxAgeSeconds = 30 * 24 * 60 * 60;
  const sameSite = isProduction() ? "SameSite=None; Secure" : "SameSite=Lax";
  res.setHeader(
    "Set-Cookie",
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}; HttpOnly; ${sameSite}; Path=/api/auth; Max-Age=${maxAgeSeconds}`
  );
}

export function clearRefreshTokenCookie(res: Response): void {
  const sameSite = isProduction() ? "SameSite=None; Secure" : "SameSite=Lax";
  res.setHeader(
    "Set-Cookie",
    `${REFRESH_COOKIE_NAME}=; HttpOnly; ${sameSite}; Path=/api/auth; Max-Age=0`
  );
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeStoredHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

export function assertStrongPassword(password: string): string | null {
  if (typeof password !== "string" || password.length < 10) {
    return "A senha deve ter no mínimo 10 caracteres.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "A senha deve conter letras maiúsculas, minúsculas e números.";
  }
  return null;
}

export function verifyHmacSignature(payload: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const normalizedSignature = signature.replace(/^sha256=/i, "");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(normalizedSignature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function getMediaSignSecret(): string {
  return process.env.MEDIA_SIGN_SECRET || process.env.JWT_SECRET || "";
}

export function signMediaUrl(url: string, expiresInSeconds = 3600): string {
  const secret = getMediaSignSecret();
  if (!secret) throw new Error("MEDIA_SIGN_SECRET or JWT_SECRET must be set");
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${url}|${expires}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const encoded = Buffer.from(url).toString("base64url");
  return `${encoded}?sig=${sig}&exp=${expires}`;
}

export function verifyMediaUrl(signed: string): { url: string; valid: boolean; reason?: string } {
  const secret = getMediaSignSecret();
  if (!secret) return { url: "", valid: false, reason: "NO_SECRET" };

  const sigMatch = signed.match(/[?&]sig=([a-f0-9]+)/);
  const expMatch = signed.match(/[?&]exp=(\d+)/);
  if (!sigMatch || !expMatch) return { url: "", valid: false, reason: "MISSING_PARAMS" };

  const encoded = signed.split("?")[0].split("&")[0];
  const url = Buffer.from(encoded, "base64url").toString("utf8");
  const expires = parseInt(expMatch[1], 10);
  const sig = sigMatch[1];

  if (Math.floor(Date.now() / 1000) > expires) return { url, valid: false, reason: "EXPIRED" };

  const payload = `${url}|${expires}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    return { url, valid, reason: valid ? undefined : "INVALID_SIG" };
  } catch {
    return { url, valid: false, reason: "INVALID_SIG" };
  }
}
