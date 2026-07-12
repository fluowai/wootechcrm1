import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    name?: string;
    agencyId?: string;
    orgId: string;
    orgSlug?: string;
    orgType?: string;
    workspaceId?: string;
    role: string;
    permissions?: Record<string, string | string[]>;
    whitelabelOnboarding?: { complete: boolean; step: number };
  };
}

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return process.env.JWT_SECRET;
};

export const getRefreshSecret = () => {
  // Usa JWT_SECRET + sufixo para diferenciar do access token
  return getJwtSecret() + "_refresh";
};

/**
 * Gera um access token curto (15 min)
 */
export function generateAccessToken(payload: Record<string, any>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "15m" });
}

/**
 * Gera um refresh token longo (30 dias)
 */
export function generateRefreshToken(payload: Record<string, any>): string {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: "30d" });
}

/**
 * Middleware de autenticação JWT.
 * Valida o access token e injeta user no request.
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  jwt.verify(token, getJwtSecret(), (err: any, user: any) => {
    if (err) {
      console.error("[AUTH_TOKEN_ERROR]", {
        error: err.name,
        message: err.message,
        tokenPrefix: token.substring(0, 10) + "..."
      });
      // Diferencia entre token expirado e inválido
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "TOKEN_EXPIRED",
          message: "Token expirado. Use o refresh token para obter um novo.",
        });
      }
      return res.status(401).json({ error: "Token inválido." }); // Alterado de 403 para 401 para consistência com o frontend
    }

    // Se for Super Admin, permitir trocar o contexto da organização via header
    // Removido daqui para centralizar no resolveTenant

    req.user = user;
    next();
  });
};

/**
 * Middleware para checar permissões granulares (RBAC).
 * Ex: requirePermission('leads', 'delete')
 */
export const requirePermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Não autenticado." });
    }

    // Super Admin e Org Admin têm acesso total
    if (user.role === "SUPER_ADMIN" || user.role === "ORG_ADMIN" || user.role === "AGENCY_ADMIN") {
      return next();
    }

    const permissions = user.permissions;

    // Se não tiver permissões definidas
    if (!permissions || !permissions[resource]) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: `Você não tem permissão para acessar '${resource}'.`,
      });
    }

    // Se a permissão for '*' (acesso total ao recurso) ou se a ação estiver na lista
    const resourcePermissions = permissions[resource];
    if (
      resourcePermissions === "*" ||
      (Array.isArray(resourcePermissions) && resourcePermissions.includes(action))
    ) {
      return next();
    }

    return res.status(403).json({
      error: "FORBIDDEN",
      message: `Sem permissão para '${action}' em '${resource}'.`,
    });
  };
};

/**
 * Middleware que exige papel mínimo.
 * Ex: requireRole('ORG_ADMIN')
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Não autenticado." });
    }

    // Super Admin sempre passa
    if (user.role === "SUPER_ADMIN") {
      return next();
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: "ROLE_REQUIRED",
        message: `Papel necessário: ${allowedRoles.join(" ou ")}. Seu papel: ${user.role}.`,
      });
    }

    next();
  };
};
