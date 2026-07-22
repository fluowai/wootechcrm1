import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware que gera um requestId único para cada request.
 * Usado para correlação de logs, traces e debugging.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  next();
}

/**
 * Middleware de logging estruturado com correlação de request.
 * Registra método, path, status, duração e requestId.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.requestId || "unknown";

  res.on("finish", () => {
    const duration = Date.now() - start;
    const entry = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      module: "HTTP",
      message: `${req.method} ${req.path}`,
      data: {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"]?.slice(0, 120),
        orgId: (req as any).orgId,
        userId: (req as any).user?.id,
      },
    };

    const stream = res.statusCode >= 400 ? process.stderr : process.stdout;
    stream.write(JSON.stringify(entry) + "\n");
  });

  next();
}
