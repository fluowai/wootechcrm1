import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";

/**
 * Middleware OBRIGATÓRIO de resolução de tenant.
 * BLOQUEIA a request se não houver orgId válido.
 * Garante isolamento multi-tenant real.
 */
export const resolveTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Usuário não autenticado." });
  }

  // Resolve orgId — obrigatório para todas rotas protegidas
  let orgId = user.orgId;

  // Se for Super Admin, permitir trocar orgId via header (X-Org-Id)
  const impersonatedOrgId = req.headers["x-org-id"];
  if (user.role === 'SUPER_ADMIN' && impersonatedOrgId && typeof impersonatedOrgId === "string") {
    orgId = impersonatedOrgId;
    user.orgId = impersonatedOrgId; // Atualiza no objeto user para os handlers
  }

  if (!orgId) {
    return res.status(403).json({
      error: "TENANT_MISSING",
      message: "Contexto de organização não encontrado. Faça login novamente.",
    });
  }

  // Se for Super Admin, permitir trocar workspace via header (X-Workspace-Id)
  const impersonatedWorkspaceId = req.headers["x-workspace-id"];
  if (impersonatedWorkspaceId && typeof impersonatedWorkspaceId === "string") {
    user.workspaceId = impersonatedWorkspaceId;
  }

  // Monta filtro de tenant para uso nas queries Prisma
  const tenantFilter: Record<string, any> = {
    organizationId: orgId,
  };

  // Adiciona agencyId se existir
  if (user.agencyId) {
    tenantFilter.agencyId = user.agencyId;
  }

  // Adiciona workspaceId se existir
  if (user.workspaceId) {
    tenantFilter.workspaceId = user.workspaceId;
  }

  // Injeta filtro no request
  (req as any).tenantFilter = tenantFilter;
  (req as any).orgId = orgId;

  next();
};

/**
 * Utilitário para injetar o filtro de tenant em queries Prisma.
 * USO: const query = withTenant({ where: { status: 'open' } }, req);
 */
export const withTenant = (query: any, req: AuthRequest) => {
  const orgId = req.user?.orgId;
  if (!orgId) {
    throw new Error("TENANT_CONTEXT_MISSING: orgId obrigatório");
  }

  return {
    ...query,
    where: {
      ...query.where,
      organizationId: orgId,
    },
  };
};

/**
 * Valida que um recurso pertence ao tenant do usuário.
 * Retorna true se pertence, false se não.
 */
export function belongsToTenant(resource: any, req: AuthRequest): boolean {
  if (!resource) return false;
  const orgId = req.user?.orgId;
  if (!orgId) return false;
  return resource.organizationId === orgId;
}
