import { prisma } from "../lib/prisma.js";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT"
  | "PUBLISH"
  | "UNPUBLISH"
  | "DUPLICATE"
  | "PERMISSION_CHANGE"
  | "PLAN_CHANGE"
  | "STAGE_CHANGE"
  | "PROPOSAL_SENT"
  | "DEAL_WON"
  | "DEAL_LOST"
  | "OWNER_CHANGE"
  | "PASSWORD_CHANGE"
  | "API_KEY_CREATED"
  | "WEBHOOK_TRIGGERED";

export interface AuditLogInput {
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Registra uma ação de auditoria no banco de dados.
 * Executa de forma assíncrona para não bloquear a resposta.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId || undefined,
        userId: input.userId || undefined,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId || undefined,
        metadata: input.metadata || undefined,
        ip: input.ip || undefined,
        userAgent: input.userAgent || undefined,
      },
    });
  } catch (error) {
    // Nunca deve quebrar o fluxo principal
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}

/**
 * Helper para extrair IP do request
 */
export function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Helper para extrair User-Agent do request
 */
export function getClientUA(req: any): string {
  return req.headers["user-agent"] || "unknown";
}

/**
 * Cria um audit log a partir do request (atalho)
 */
export function auditFromRequest(
  req: any,
  action: AuditAction,
  resource: string,
  resourceId?: string | null,
  metadata?: Record<string, any> | null
): void {
  // Fire-and-forget — não await
  logAudit({
    organizationId: req.user?.orgId,
    userId: req.user?.id,
    action,
    resource,
    resourceId,
    metadata,
    ip: getClientIp(req),
    userAgent: getClientUA(req),
  });
}
