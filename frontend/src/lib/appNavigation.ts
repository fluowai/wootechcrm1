import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Building2,
  CalendarDays,
  CheckCircle,
  Clock,
  Cpu,
  CreditCard,
  FileText,
  FolderKanban,
  Globe,
  KanbanSquare,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  MapPinned,
  Megaphone,
  MessageCircle,
  Package,
  Palette,
  PlugZap,
  Rocket,
  Settings,
  Shield,
  Target,
  Ticket,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Zap
} from 'lucide-react';
import { apiFetch } from './api';
import { useAccess } from './access';
import { isCustomWorkspaceHost, workspacePath } from './workspaceRoute';
import type { User } from '../types';

export type IconComponent = ComponentType<{ size: number; className?: string }>;

export interface MenuItem {
  module: string;
  icon: IconComponent;
  label: string;
  path: string;
  startsWith?: boolean;
  isAi?: boolean;
  badge?: string;
}

export interface MenuGroupChild {
  module: string;
  icon: IconComponent;
  label: string;
  items: { path: string; label: string }[];
}

export interface MenuGroup {
  label: string;
  icon: IconComponent;
  modules: string[];
  items: MenuItem[];
  children?: MenuGroupChild[];
}

export interface VisibleMenuGroup extends MenuGroup {
  visibleItems: MenuItem[];
  visibleChildren: MenuGroupChild[];
  visibleCount: number;
  isActive: boolean;
}

export interface AdminMenuItem {
  icon: IconComponent;
  label: string;
  path: string;
  badge?: string;
  isAi?: boolean;
}

export interface AdminMenuCluster {
  label: string;
  icon: IconComponent;
  items: AdminMenuItem[];
}

export interface AppNavigationModel {
  currentSlug: string;
  visibleMenuGroups: VisibleMenuGroup[];
  adminClusters: AdminMenuCluster[];
  activeMenuGroup?: VisibleMenuGroup;
  activeAdminCluster?: AdminMenuCluster;
  getPath: (basePath: string) => string;
  isItemActive: (item: MenuItem) => boolean;
  isAdminItemActive: (item: AdminMenuItem) => boolean;
}

export const RESERVED_WORKSPACE_SEGMENTS = new Set([
  'admin',
  'site',
  'vendas',
  'login',
  'onboarding',
  'meet',
  'dashboard',
  'crm',
  'finance',
  'settings',
  'team',
  'projects',
  'reports',
  'api',
  'automations',
  'notifications',
  'delivery',
  'service-catalog',
  'time-tracking',
  'knowledge-base',
  'client-health',
  'whatsapp',
  'acp',
  'google-local',
  'clients',
  'sold-services',
  'ad-accounts',
  'assets',
  'landing-pages',
  'quiz',
  'content',
  'marketing',
  'sales-machine',
  'proposals',
  'agents-hub',
  'autopilot',
  'ai-settings',
  'prompt-architect',
  'billing',
  'p',
  'client-portal',
  'client-results',
  'legal',
  'whitelabel',
  'qualification'
]);

export const menuGroups: MenuGroup[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    modules: ['dashboard'],
    items: [
      { module: 'dashboard', icon: LayoutDashboard, label: 'Dashboard Executivo', path: '/dashboard' },
    ],
  },
  {
    label: 'Prospeccao',
    icon: Target,
    modules: ['prospecting', 'qualification', 'whatsapp_funnels', 'sales', 'google_local'],
    items: [
      { module: 'prospecting', icon: Target, label: 'Captacao de Leads', path: '/prospecting/capture' },
      { module: 'google_local', icon: MapPinned, label: 'Google Local', path: '/google-local' },
      { module: 'qualification', icon: CheckCircle, label: 'Qualificacao de Leads', path: '/qualification/forms' },
      { module: 'sales', icon: Zap, label: 'Sales Machine', path: '/sales-machine' },
      { module: 'whatsapp_funnels', icon: BarChart3, label: 'Funis IA WhatsApp', path: '/prospecting/funnels' },
    ],
  },
  {
    label: 'CRM',
    icon: UsersRound,
    modules: ['crm', 'clients', 'whatsapp'],
    items: [
      { module: 'crm', icon: Users, label: 'CRM & Pipelines', path: '/crm', startsWith: true },
      { module: 'clients', icon: Building2, label: 'Clientes', path: '/clients', startsWith: true },
      { module: 'whatsapp', icon: MessageCircle, label: 'Mensagens', path: '/whatsapp?tab=messages' },
      { module: 'whatsapp', icon: PlugZap, label: 'Conexoes WhatsApp', path: '/whatsapp?tab=instances' },
      { module: 'whatsapp', icon: KanbanSquare, label: 'Kanban', path: '/crm?tab=funil' },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    modules: ['ads', 'landing_pages', 'assets', 'proposals'],
    items: [
      { module: 'ads', icon: Megaphone, label: 'Trafego Pago', path: '/ad-accounts' },
      { module: 'assets', icon: Palette, label: 'Criativos & Assets', path: '/assets' },
      { module: 'landing_pages', icon: Globe, label: 'Landing Pages', path: '/landing-pages' },
      { module: 'proposals', icon: FileText, label: 'Propostas', path: '/proposals' },
    ],
  },
  {
    label: 'Operacao',
    icon: FolderKanban,
    modules: ['projects', 'delivery', 'time_tracking', 'service_catalog'],
    items: [
      { module: 'projects', icon: FolderKanban, label: 'Projetos', path: '/projects', startsWith: true },
      { module: 'delivery', icon: Truck, label: 'Entregas', path: '/delivery' },
      { module: 'time_tracking', icon: Clock, label: 'Apontamento de Horas', path: '/time-tracking' },
      { module: 'service_catalog', icon: Package, label: 'Catalogo de Servicos', path: '/service-catalog' },
    ],
  },
  {
    label: 'IA ACP',
    icon: Bot,
    modules: ['ai', 'prompt_architect', 'knowledge_base'],
    items: [
      { module: 'ai', icon: Bot, label: 'Agentes de IA', path: '/agents-hub', isAi: true },
      { module: 'ai', icon: Rocket, label: 'Autopilot', path: '/autopilot', isAi: true, badge: 'novo' },
      { module: 'prompt_architect', icon: Brain, label: 'Arquiteto de Prompts', path: '/prompt-architect', isAi: true },
      { module: 'ai', icon: Zap, label: 'Orquestrador ACP', path: '/acp', isAi: true, badge: 'v2' },
      { module: 'knowledge_base', icon: BookOpen, label: 'Base de Conhecimento', path: '/knowledge-base' },
    ],
  },
  {
    label: 'Gestao',
    icon: BarChart3,
    modules: ['reports', 'finance', 'health_score', 'agenda', 'notifications'],
    items: [
      { module: 'reports', icon: BarChart3, label: 'Relatorios', path: '/reports' },
      { module: 'finance', icon: Wallet, label: 'Financeiro', path: '/finance' },
      { module: 'health_score', icon: Activity, label: 'Health Score', path: '/client-health' },
      { module: 'agenda', icon: CalendarDays, label: 'Agenda', path: '/calendar' },
      { module: 'notifications', icon: Bell, label: 'Notificacoes', path: '/notifications' },
    ],
  },
  {
    label: 'Configuracoes',
    icon: Settings,
    modules: ['settings', 'team', 'integrations'],
    items: [
      { module: 'settings', icon: Settings, label: 'Administracao', path: '/settings' },
      { module: 'team', icon: UsersRound, label: 'Usuarios', path: '/team' },
      { module: 'team', icon: LockKeyhole, label: 'Permissoes', path: '/team?tab=permissions' },
      { module: 'settings', icon: KeyRound, label: 'Integracoes', path: '/settings?tab=integrations' },
    ],
  },
];

export const adminClusters: AdminMenuCluster[] = [
  {
    label: 'Visao Geral',
    icon: LayoutDashboard,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
      { icon: Zap, label: 'Monitoramento', path: '/admin/monitor' },
    ],
  },
  {
    label: 'SaaS & Suporte',
    icon: CreditCard,
    items: [
      { icon: Building2, label: 'Clientes', path: '/admin/agencies' },
      { icon: Ticket, label: 'Planos SaaS', path: '/admin/plans' },
      { icon: CreditCard, label: 'Faturas SaaS', path: '/admin/billing' },
      { icon: Ticket, label: 'Chamados Globais', path: '/admin/tickets' },
    ],
  },
  {
    label: 'Marca & Infra',
    icon: Palette,
    items: [
      { icon: Palette, label: 'White-label', path: '/admin/whitelabel' },
      { icon: Globe, label: 'Dominios', path: '/admin/domains' },
    ],
  },
  {
    label: 'Governanca',
    icon: Shield,
    items: [
      { icon: Users, label: 'Equipe Sistema', path: '/admin/team' },
      { icon: FileText, label: 'Log de Auditoria', path: '/admin/audit' },
      { icon: Rocket, label: 'Controle de Lancamento', path: '/admin/releases' },
    ],
  },
  {
    label: 'IA & ACP',
    icon: Brain,
    items: [
      { icon: Brain, label: 'Orquestrador ACP', path: '/acp', badge: 'v2', isAi: true },
      { icon: Cpu, label: 'AI Core', path: '/admin/ai', isAi: true },
      { icon: Brain, label: 'ACP - Liberacao', path: '/admin/acp', isAi: true },
    ],
  },
  {
    label: 'Prospeccao',
    icon: Target,
    items: [
      { icon: MapPinned, label: 'Google Local', path: '/admin/google-local' },
    ],
  },
];

function getSlugFromPath(pathname: string) {
  if (isCustomWorkspaceHost()) return '';

  const firstPart = pathname.split('/').filter(Boolean)[0] || '';
  if (firstPart && !RESERVED_WORKSPACE_SEGMENTS.has(firstPart)) return firstPart;

  return localStorage.getItem('nexus_org_slug') || '';
}

export function useAppNavigation(user: User | null): AppNavigationModel {
  const location = useLocation();
  const access = useAccess(user);
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [googleLocalEnabled, setGoogleLocalEnabled] = useState(isSuper);
  const [experienceModules, setExperienceModules] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (isSuper) {
      setGoogleLocalEnabled(true);
      return;
    }

    apiFetch('/api/google-local/access')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setGoogleLocalEnabled(Boolean(data?.enabled)))
      .catch(() => setGoogleLocalEnabled(false));
  }, [isSuper, user?.id]);

  useEffect(() => {
    if (!user?.id || isSuper) {
      setExperienceModules(null);
      return;
    }

    apiFetch('/api/experience/navigation')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const modules = Array.isArray(data?.modules) ? data.modules.filter(Boolean) : [];
        setExperienceModules(data?.provisioned && modules.length ? new Set(modules) : null);
      })
      .catch(() => setExperienceModules(null));
  }, [isSuper, user?.id]);

  const currentSlug = useMemo(() => getSlugFromPath(location.pathname), [location.pathname]);

  const getPath = useCallback((basePath: string) => {
    return workspacePath(basePath, currentSlug);
  }, [currentSlug]);

  const canSeeModule = useCallback((moduleKey: string) => {
    const enabledByExperience = !experienceModules || experienceModules.has(moduleKey);
    if (!enabledByExperience) return false;
    if (moduleKey === 'google_local') return googleLocalEnabled && (isSuper || access.hasModule(moduleKey));
    return isSuper || access.hasModule(moduleKey);
  }, [access, experienceModules, googleLocalEnabled, isSuper]);

  const isItemActive = useCallback((item: MenuItem) => {
    const path = getPath(item.path);
    const comparablePath = path.split('?')[0];

    if (item.path === '/dashboard') {
      return location.pathname === comparablePath ||
        location.pathname === '/' ||
        Boolean(currentSlug && location.pathname === `/${currentSlug}`);
    }

    if (item.path.includes('?')) {
      return `${location.pathname}${location.search}` === path;
    }

    if (item.startsWith) {
      return location.pathname === comparablePath || location.pathname.startsWith(`${comparablePath}/`);
    }

    return location.pathname === comparablePath;
  }, [currentSlug, getPath, location.pathname, location.search]);

  const isChildPathActive = useCallback((path: string) => {
    const resolvedPath = getPath(path);
    return `${location.pathname}${location.search}` === resolvedPath ||
      location.pathname === resolvedPath.split('?')[0];
  }, [getPath, location.pathname, location.search]);

  const visibleMenuGroups = useMemo(() => {
    return menuGroups
      .map((group) => {
        const visibleItems = group.items.filter((item) => canSeeModule(item.module));
        const visibleChildren = (group.children || []).filter((child) => canSeeModule(child.module));
        const visibleCount = visibleItems.length +
          visibleChildren.reduce((total, child) => total + child.items.length, 0);
        const isActive = visibleItems.some(isItemActive) ||
          visibleChildren.some((child) => child.items.some((subItem) => isChildPathActive(subItem.path)));

        return {
          ...group,
          visibleItems,
          visibleChildren,
          visibleCount,
          isActive,
        };
      })
      .filter((group) => group.visibleCount > 0);
  }, [canSeeModule, isChildPathActive, isItemActive]);

  const activeMenuGroup = useMemo(() => {
    return visibleMenuGroups.find((group) => group.isActive);
  }, [visibleMenuGroups]);

  const isAdminItemActive = useCallback((item: AdminMenuItem) => {
    return location.pathname === item.path;
  }, [location.pathname]);

  const activeAdminCluster = useMemo(() => {
    return adminClusters.find((cluster) => cluster.items.some(isAdminItemActive));
  }, [isAdminItemActive]);

  return {
    currentSlug,
    visibleMenuGroups,
    adminClusters,
    activeMenuGroup,
    activeAdminCluster,
    getPath,
    isItemActive,
    isAdminItemActive,
  };
}
