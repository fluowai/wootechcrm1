import { Router } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { signMediaUrl, verifyMediaUrl } from "../utils/security.js";
import { safeExternalFetch } from "../utils/externalUrl.js";

const ALLOWED_MEDIA_HOSTS = (process.env.MEDIA_ALLOWED_HOSTS || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

const MEDIA_MAX_AGE_SECONDS = 3600;

function isMediaHostAllowed(hostname: string): boolean {
  if (ALLOWED_MEDIA_HOSTS.length === 0) return true;
  return ALLOWED_MEDIA_HOSTS.some((allowed) => hostname.toLowerCase() === allowed || hostname.toLowerCase().endsWith(`.${allowed}`));
}

export function mediaRoutes() {
  const router = Router();

  router.get("/sign", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });

      const rawUrl = req.query.url as string;
      if (!rawUrl) return res.status(400).json({ error: "url query parameter is required" });

      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return res.status(400).json({ error: "Only HTTP(S) URLs are allowed" });
      }

      if (!isMediaHostAllowed(parsed.hostname)) {
        return res.status(403).json({ error: "Host not in allowlist" });
      }

      const signed = signMediaUrl(rawUrl, MEDIA_MAX_AGE_SECONDS);
      res.json({ signedUrl: `/api/media/proxy/${signed}`, expiresInSeconds: MEDIA_MAX_AGE_SECONDS });
    } catch (error) {
      next(error);
    }
  });

  router.get("/proxy/*", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user?.orgId;
      if (!orgId) return res.status(403).json({ error: "TENANT_MISSING" });

      const signed = (req.params as any)[0] as string;
      if (!signed) return res.status(400).json({ error: "Missing signed URL" });

      const { url, valid, reason } = verifyMediaUrl(signed);
      if (!valid) {
        const status = reason === "EXPIRED" ? 410 : 403;
        return res.status(status).json({ error: "Invalid or expired media URL", reason });
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid original URL" });
      }

      if (!isMediaHostAllowed(parsed.hostname)) {
        return res.status(403).json({ error: "Host not in allowlist" });
      }

      const upstream = await safeExternalFetch(url, { method: "GET" }, 2);
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
      }

      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      const contentLength = upstream.headers.get("content-length");
      const cacheControl = upstream.headers.get("cache-control");

      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Cache-Control", cacheControl || "private, max-age=3600");
      res.setHeader("X-Content-Type-Options", "nosniff");

      if (upstream.body) {
        const reader = (upstream.body as any).getReader?.();
        if (reader) {
          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read();
            if (done) { res.end(); return; }
            res.write(value);
            return pump();
          };
          await pump();
        } else {
          const buffer = Buffer.from(await upstream.arrayBuffer());
          res.end(buffer);
        }
      } else {
        res.end();
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}
