import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { getTenantAccess, AccessConfig } from "../lib/access.js";

export function requireAccess(config: AccessConfig) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const orgId = req.user?.orgId;

    if (!userId || !orgId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Usuário não autenticado." });
    }

    try {
      const access = await getTenantAccess(orgId, userId);

      if (!access) {
        return res.status(404).json({ error: "TENANT_NOT_FOUND", message: "Organização não encontrada." });
      }

      // 1. Verificar Status da Organização
      if (!access.org.isActive) {
        return res.status(403).json({ error: "TENANT_SUSPENDED", message: "Esta conta está suspensa. Entre em contato com o suporte." });
      }

      // Super Admin opera a plataforma; admins da organizacao ainda respeitam plano e assinatura.
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
      const isOrgAdmin = req.user?.role === 'ORG_ADMIN' || req.user?.role === 'AGENCY_ADMIN';

      // 2. Verificar Assinatura (se exigido)
      if (config.requireActiveSubscription && !isSuperAdmin) {
        if (!access.subscription || (access.subscription.status !== 'ACTIVE' && access.subscription.status !== 'TRIAL')) {
          return res.status(402).json({ 
            error: "PAYMENT_REQUIRED", 
            message: "Assinatura pendente ou expirada.",
            status: access.subscription?.status || 'NONE'
          });
        }
      }

      // 3. Verificar Feature no Plano
      if (config.feature && !isSuperAdmin) {
        if (!access.hasFeature(config.feature)) {
          return res.status(402).json({ 
            error: "FEATURE_NOT_IN_PLAN", 
            message: `Seu plano atual não inclui a funcionalidade: ${config.feature}. Faça um upgrade para liberar.`,
            feature: config.feature
          });
        }
      }

      // 4. Verificar Limite de Uso
      if (config.checkUsageLimit) {
        const isUnder = await access.isUnderLimit(config.checkUsageLimit);
        if (!isUnder) {
          return res.status(429).json({ 
            error: "LIMIT_REACHED", 
            message: `Você atingiu o limite de ${config.checkUsageLimit} do seu plano.`,
            limit: config.checkUsageLimit
          });
        }
      }

      // 5. Verificar Permissão do Usuário (RBAC)
      // Por enquanto validamos apenas o role básico se não houver permissão granular definida
      if (config.permission) {
        // Simplificação: se for ADMIN da org, tem acesso a tudo da org (exceto limites do plano)
        if (!isOrgAdmin && !isSuperAdmin) {
           // Lógica de check de permissão granular aqui
           // Ex: userPermissions['crm']?.includes('view')
        }
      }

      // Tudo OK
      next();
    } catch (error) {
      console.error("[AccessMiddleware] Error:", error);
      res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Erro ao validar permissões." });
    }
  };
}
