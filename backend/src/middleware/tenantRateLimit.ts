import { Request, Response, NextFunction } from "express";
import { cache } from "../utils/cache.js";

interface TenantRateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_OPTIONS: TenantRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyPrefix: "rl:tenant:",
  message: "Muitas requisições desta organização. Tente novamente mais tarde.",
};

/**
 * Rate limiter por tenant (organizationId).
 * Usa Redis quando disponível, fallback em memória.
 */
export function tenantRateLimit(options: Partial<TenantRateLimitOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const memStore = new Map<string, RateLimitEntry>();

  function getMemEntry(key: string): RateLimitEntry {
    const now = Date.now();
    let entry = memStore.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      memStore.set(key, entry);
    }
    return entry;
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const orgId = (req as any).orgId || (req as any).user?.orgId;
    if (!orgId) return next();

    const key = `${opts.keyPrefix}${orgId}`;
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const compositeKey = `${key}:${ip}`;

    let currentCount = 0;
    let resetAt = Date.now() + opts.windowMs;

    try {
      const cached = await cache.get<{ count: number; resetAt: number }>(compositeKey);
      const now = Date.now();

      if (cached && now < cached.resetAt) {
        currentCount = cached.count;
        resetAt = cached.resetAt;
      } else {
        currentCount = 0;
        resetAt = now + opts.windowMs;
      }

      currentCount += 1;

      await cache.set(compositeKey, { count: currentCount, resetAt }, opts.windowMs);
    } catch {
      const entry = getMemEntry(compositeKey);
      entry.count += 1;
      currentCount = entry.count;
      resetAt = entry.resetAt;
    }

    res.setHeader("X-RateLimit-Limit", String(opts.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, opts.max - currentCount)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (currentCount > opts.max) {
      return res.status(429).json({
        error: "RATE_LIMITED",
        message: opts.message,
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      });
    }

    next();
  };
}

/**
 * Rate limiter para endpoints de IA (mais restritivo).
 */
export const aiRateLimit = tenantRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "rl:ai:",
  message: "Limite de requisições de IA atingido. Aguarde um momento.",
});

/**
 * Rate limiter para endpoints de WhatsApp (mais restritivo).
 */
export const whatsappRateLimit = tenantRateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: "rl:wa:",
  message: "Limite de requisições WhatsApp atingido.",
});
