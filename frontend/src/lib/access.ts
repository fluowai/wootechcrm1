import { useMemo } from 'react';

export function useAccess(user: any) {
  return useMemo(() => {
    const plan = user?.plan;
    const planFeatures = plan?.planFeatures || [];
    const userPermissions = user?.permissions || {};
    const role = user?.role;
    const subscriptionStatus = user?.subscriptionStatus || 'TRIAL';
    const moduleAliases: Record<string, string[]> = {
      whatsapp_funnels: ['whatsapp_funnels', 'prospecting.funnels', 'prospecting'],
      prompt_architect: ['prompt_architect', 'ai.prompt_architect', 'ai'],
      landing_pages: ['landing_pages', 'marketing.landing_pages', 'marketing'],
      service_catalog: ['service_catalog', 'delivery.service_catalog', 'projects'],
      time_tracking: ['time_tracking', 'delivery.time_tracking', 'projects'],
      health_score: ['health_score', 'client_health', 'finance'],
      agenda: ['agenda', 'calendar', 'tasks'],
      ads: ['ads', 'marketing'],
      assets: ['assets', 'marketing'],
    };

    const candidatesFor = (moduleKey: string) => {
      const aliases = moduleAliases[moduleKey] || [];
      return Array.from(new Set([moduleKey, ...aliases]));
    };

    const isPlanFeatureEnabled = (key: string) => planFeatures.some((f: any) => {
      if (!f?.isEnabled || typeof f.featureKey !== 'string') return false;
      return f.featureKey === key || f.featureKey.startsWith(`${key}.`);
    });

    const hasPlanMatrix = planFeatures.length > 0;
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const isTenantAdmin = role === 'ORG_ADMIN' || role === 'AGENCY_ADMIN';

    const isModuleAllowedByPlan = (moduleKey: string) => {
      if (!hasPlanMatrix) return true;
      return candidatesFor(moduleKey).some((candidate) => isPlanFeatureEnabled(candidate));
    };

    const isFeatureAllowedByPlan = (featureKey: string) => {
      if (!hasPlanMatrix) return true;
      return isPlanFeatureEnabled(featureKey);
    };

    const hasModulePermission = (candidate: string) => {
      const [permissionModule, permissionAction] = candidate.split('.');
      const modulePermissions = userPermissions[permissionModule];
      if (modulePermissions === '*' || (Array.isArray(modulePermissions) && modulePermissions.length > 0)) return true;
      if (permissionAction && Array.isArray(modulePermissions) && modulePermissions.includes(permissionAction)) return true;
      return false;
    };

    return {
      hasModule: (moduleKey: string) => {
        if (isSuperAdmin) return true;
        if (!isModuleAllowedByPlan(moduleKey)) return false;
        if (isTenantAdmin) return true;

        return candidatesFor(moduleKey).some(hasModulePermission);
      },

      hasAnyModule: (moduleKeys: string[]) => moduleKeys.some((moduleKey) => {
        if (isSuperAdmin) return true;
        if (!isModuleAllowedByPlan(moduleKey)) return false;
        if (isTenantAdmin) return true;
        return candidatesFor(moduleKey).some(hasModulePermission);
      }),

      hasFeature: (featureKey: string) => {
        if (isSuperAdmin) return true;
        if (!isFeatureAllowedByPlan(featureKey)) return false;
        if (isTenantAdmin) return true;

        const [module, action] = featureKey.split('.');
        const modulePermissions = userPermissions[module];
        if (modulePermissions === '*' || (Array.isArray(modulePermissions) && modulePermissions.includes(action))) {
          return true;
        }

        return planFeatures.some((f: any) => f.featureKey === featureKey && f.isEnabled);
      },

      can: (permissionKey: string) => {
        if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN') return true;

        const [module, action] = permissionKey.split('.');
        const modulePermissions = userPermissions[module];
        return modulePermissions === '*' || modulePermissions?.includes(action);
      },

      canWrite: () => {
        return ['ACTIVE', 'TRIAL'].includes(subscriptionStatus);
      },

      subscriptionStatus,
      isReadOnly: subscriptionStatus === 'PAST_DUE',
      isBlocked: ['SUSPENDED', 'EXPIRED'].includes(subscriptionStatus),

      usage: user?.usage || {},
      planLimits: {
        maxLeads: plan?.maxLeads || 100,
        maxClients: plan?.maxClients || 10,
        maxUsers: plan?.maxUsers || 5,
        maxContacts: plan?.maxContacts || 1000,
        maxPipelines: plan?.maxPipelines || 3,
        maxDeals: plan?.maxDeals || 100,
        maxAutomations: plan?.maxAutomations || 5,
        maxLandingPages: plan?.maxLandingPages || 5,
        maxAIRequests: plan?.maxAIRequests || 1000,
      },
    };
  }, [user]);
}
