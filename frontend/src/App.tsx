import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import { 
  Menu,
  Monitor,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Building2
} from "lucide-react";
import { useEffect, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";

import { Sidebar } from "./components/sidebar/Sidebar";
import { SectionNav } from "./components/navigation/SectionNav";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./lib/useAuth";
import { isCustomWorkspaceHost, workspacePath } from "./lib/workspaceRoute";
import { RESERVED_WORKSPACE_SEGMENTS, useAppNavigation } from "./lib/appNavigation";

import Dashboard from "./pages/dashboard/Dashboard";
import { useWhitelabel } from "./lib/useWhitelabel";

const CRM = lazy(() => import("./pages/crm/CRM"));
const Content = lazy(() => import("./pages/marketing/Content"));
const Projects = lazy(() => import("./pages/operations/Projects"));
const Team = lazy(() => import("./pages/team/Team"));
const Reports = lazy(() => import("./pages/reports/Reports"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const SuperAdmin = lazy(() => import("./pages/super-admin/SuperAdmin"));
const MarketingOps = lazy(() => import("./pages/marketing/MarketingOps"));
const SalesMachine = lazy(() => import("./pages/sales/SalesMachine"));
const CloserDashboard = lazy(() => import("./pages/sales/CloserDashboard"));
const Proposals = lazy(() => import("./pages/proposals/Proposals"));
const ClientsPage = lazy(() => import("./pages/crm/Clients"));
const ClientDetailPage = lazy(() => import("./pages/crm/ClientDetail"));
const SoldServicesPage = lazy(() => import("./pages/crm/SoldServices"));
const MeetingRoom = lazy(() => import("./pages/communication/MeetingRoom"));
const Onboarding = lazy(() => import("./pages/auth/OnboardingWizard"));
const OnboardingPreview = lazy(() => import("./pages/auth/OnboardingPreview"));
const WhitelabelDomainOnboarding = lazy(() => import("./pages/auth/WhitelabelDomainOnboarding"));
const WhitelabelOnboarding = lazy(() => import("./pages/auth/WhitelabelOnboardingWizard"));
const WhitelabelOnboardingPreview = lazy(() => import("./pages/auth/WhitelabelOnboardingPreview"));
const AgentsHub = lazy(() => import("./pages/settings/AgentsHub"));
const Autopilot = lazy(() => import("./pages/settings/Autopilot"));
const AISettings = lazy(() => import("./pages/settings/AISettings"));
const Finance = lazy(() => import("./pages/finance/Finance"));
const Tasks = lazy(() => import("./pages/operations/Tasks"));
const Calendar = lazy(() => import("./pages/operations/Calendar"));
const AdAccounts = lazy(() => import("./pages/marketing/AdsAccounts"));
const AssetsLibrary = lazy(() => import("./pages/marketing/AssetsLibrary"));
const LandingPages = lazy(() => import("./pages/marketing/LandingPages"));
const QuizBuilder = lazy(() => import("./pages/marketing/QuizBuilder"));
const AdminAgencies = lazy(() => import("./pages/admin/Agencies"));
const SystemTeam = lazy(() => import("./pages/admin/SystemTeam"));
const AdminDomains = lazy(() => import("./pages/admin/Domains"));
const AdminMonitor = lazy(() => import("./pages/admin/Monitor"));
const AdminAudit = lazy(() => import("./pages/admin/AuditLog"));
const AdminPlans = lazy(() => import("./pages/admin/Plans"));
const AdminBilling = lazy(() => import("./pages/admin/Billing"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const WhiteLabel = lazy(() => import("./pages/admin/WhiteLabel"));
const ReleaseControl = lazy(() => import("./pages/admin/ReleaseControl"));
const AdminAcpManager = lazy(() => import("./pages/admin/AcpManager"));
const AdminGoogleLocalManager = lazy(() => import("./pages/admin/GoogleLocalManager"));
const AdminAIManager = lazy(() => import("./pages/admin/AIManager"));
const LandingPage = lazy(() => import("./pages/marketing/LandingPage"));
const LandingPageWizard = lazy(() => import("./pages/marketing/LandingPageWizard"));
const LandingPageEditor = lazy(() => import("./pages/marketing/LandingPageEditor"));
const PromptArchitect = lazy(() => import("./pages/settings/PromptArchitect"));
const LandingDemo = lazy(() => import("./pages/marketing/LandingDemo"));
const LandingEditor = lazy(() => import("./pages/marketing/LandingTemplates/LandingEditor"));
const PublicProposal = lazy(() => import("./pages/proposals/PublicProposal"));
const LeadCapture = lazy(() => import("./pages/prospecting/LeadCapture"));
const CapturedLists = lazy(() => import("./pages/prospecting/CapturedLists"));
const ProspectingFunnels = lazy(() => import("./pages/prospecting/ProspectingFunnels"));
const FunnelBuilder = lazy(() => import("./pages/prospecting/FunnelBuilder"));
const WhatsApp = lazy(() => import("./pages/communication/WhatsApp"));
const ClientPortal = lazy(() => import("./pages/client-portal/ClientPortal"));
const ClientResults = lazy(() => import("./pages/client-portal/ClientResults"));
const LegalPage = lazy(() => import("./pages/legal/LegalPage"));
const Login = lazy(() => import("./pages/auth/Login"));
const ContactVerification = lazy(() => import("./pages/auth/ContactVerification"));
const CRMSalesPage = lazy(() => import("./pages/crm/CRMSalesPage"));
const AcpHub = lazy(() => import("./pages/settings/AcpHub"));
const GoogleLocal = lazy(() => import("./pages/marketing/GoogleLocal"));

const QualificationForms = lazy(() => import("./pages/qualification/QualificationForms"));
const AutomationBuilder = lazy(() => import("./pages/settings/AutomationBuilder"));
const NotificationsCenter = lazy(() => import("./pages/settings/NotificationsCenter"));
const DeliveryKanban = lazy(() => import("./pages/operations/DeliveryKanban"));
const ServiceCatalog = lazy(() => import("./pages/operations/ServiceCatalog"));
const TimeTracking = lazy(() => import("./pages/operations/TimeTracking"));
const KnowledgeBase = lazy(() => import("./pages/operations/KnowledgeBase"));
const ClientHealthDashboard = lazy(() => import("./pages/reports/ClientHealthDashboard"));
const Billing = lazy(() => import("./pages/finance/Billing"));

function isPublicPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/verify-contact' ||
    pathname === '/onboarding' ||
    pathname === '/onboarding/whitelabel' ||
    pathname === '/onboarding/whitelabel/preview' ||
    pathname === '/site' ||
    pathname === '/vendas' ||
    pathname.startsWith('/meet') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/client-portal') ||
    pathname.startsWith('/client-results') ||
    pathname.startsWith('/legal')
  );
}

function hasUrlSlug(pathname: string) {
  const firstPart = pathname.split('/').filter(Boolean)[0] || '';
  return firstPart && !RESERVED_WORKSPACE_SEGMENTS.has(firstPart);
}

const Layout = ({ 
  children, 
  onLogout,
  user,
  selectedClientId,
  onSelectClient,
  whiteLabel
}: { 
  children: React.ReactNode; 
  onLogout: () => void; 
  user: any;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  whiteLabel?: any;
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();
  const navigation = useAppNavigation(user);

  useEffect(() => {
    if (isPublicPath(location.pathname)) return;
    setIsCollapsed(true);
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  if (isPublicPath(location.pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        isMobileOpen={isMobileMenuOpen} 
        setIsMobileOpen={setIsMobileMenuOpen} 
        collapsed={isCollapsed}
        setCollapsed={setIsCollapsed}
        selectedClientId={selectedClientId}
        onSelectClient={onSelectClient}
        navigation={navigation}
        whiteLabel={whiteLabel}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:pl-[var(--sidebar-collapsed-width)]' : 'md:pl-[var(--sidebar-width)]'}`}>
        <header className="hidden md:flex sticky top-0 z-40 h-[80px] items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-[240px]">
            {whiteLabel?.logoUrl ? (
              <img src={whiteLabel.logoUrl} alt={whiteLabel?.name || "Logo"} className="h-10 w-10 rounded-xl object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-[#5B5CF0] text-white flex items-center justify-center shadow-sm">
                <Monitor size={21} />
              </div>
            )}
            <div>
              <div className="text-[19px] font-bold leading-tight">{whiteLabel?.name || "Nexus360"}</div>
              <div className="text-[13px] font-medium text-[#64748B]">SaaS Performance Hub</div>
            </div>
          </div>

          <div className="relative w-full max-w-[620px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={20} />
            <input
              className="h-[52px] w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-12 pr-4 text-[16px] text-[#0F172A] outline-none transition-all duration-200 placeholder:text-[#94A3B8] focus:border-[#5B5CF0] focus:bg-white focus:ring-4 focus:ring-[#5B5CF0]/10"
              placeholder="Buscar leads, clientes, projetos, artigos..."
            />
          </div>

          <div className="flex min-w-[330px] items-center justify-end gap-3">
            <button className="relative h-11 w-11 rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
              <Bell size={20} className="mx-auto" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <button className="h-11 w-11 rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
              <HelpCircle size={20} className="mx-auto" />
            </button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[15px] font-semibold text-[#0F172A] transition-all duration-200 hover:bg-[#F4F5FF]">
              <Building2 size={18} className="text-[#5B5CF0]" />
              <span className="max-w-[145px] truncate">{whiteLabel?.name || "Empresa Atual"}</span>
            </button>
            <button className="flex h-12 items-center gap-3 rounded-xl px-2 transition-all duration-200 hover:bg-[#F4F5FF]">
              <div className="h-10 w-10 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[15px] font-bold">
                {user?.name?.substring(0, 1) || "U"}
              </div>
              <div className="text-left">
                <div className="max-w-[140px] truncate text-[15px] font-bold">{user?.name || "Usuario"}</div>
                <div className="text-[12px] font-medium text-[#64748B]">{user?.role || "Acesso"}</div>
              </div>
              <ChevronDown size={15} className="text-[#94A3B8]" />
            </button>
          </div>
        </header>

        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {whiteLabel?.logoUrl ? (
              <img src={whiteLabel.logoUrl} alt={whiteLabel?.name || "Logo"} className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Monitor size={18} />
              </div>
            )}
            <span className="font-black text-gray-900">{whiteLabel?.name || "Nexus360"}</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <Menu size={24} />
          </button>
        </div>

        <SectionNav
          navigation={navigation}
          user={user}
          selectedClientId={selectedClientId}
        />

        <div className="p-4 md:p-8 ">
          <ErrorBoundary>
            <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
          }>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

function useNavigationGuard(user: any, selectedClientId: string | null) {
  const location = useLocation();
  const navigate = useNavigate();

  const { pathname } = location;

  useEffect(() => {
    if (isPublicPath(pathname) && !(user && (pathname === '/login' || pathname === '/verify-contact'))) return;
    if (!user) return;

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const orgType = user?.orgType || localStorage.getItem('nexus_org_type');
    const whitelabelOnboardingComplete = user?.whitelabelOnboarding?.complete === true;
    const contactVerificationRequired = user?.contactVerification?.required === true;
    const subscriptionStatus = user?.subscriptionStatus || 'TRIAL';
    const trialExpired = subscriptionStatus === 'TRIAL' &&
      user?.trialEndsAt &&
      new Date(user.trialEndsAt).getTime() < Date.now();
    const subscriptionBlocked = ['EXPIRED', 'SUSPENDED', 'CANCELED'].includes(subscriptionStatus) || trialExpired;

    if (!isSuperAdmin && contactVerificationRequired && pathname !== '/verify-contact') {
      localStorage.setItem('nexus_contact_verification_required', 'true');
      navigate('/verify-contact', { replace: true });
      return;
    }

    if (orgType === 'WHITELABEL' && !whitelabelOnboardingComplete && !isSuperAdmin) {
      localStorage.removeItem('nexus_onboarding_done');
      navigate('/onboarding/whitelabel', { replace: true });
      return;
    }

    const billingPath = workspacePath('/billing', user?.orgSlug || localStorage.getItem('nexus_org_slug'));
    const isBillingPath = pathname === '/billing' || pathname === billingPath;
    if (!isSuperAdmin && subscriptionBlocked && !isBillingPath && pathname !== '/verify-contact') {
      navigate(billingPath, { replace: true });
      return;
    }

    if (orgType === 'WHITELABEL' && whitelabelOnboardingComplete) {
      localStorage.setItem('nexus_onboarding_done', 'true');
    }

    if (pathname === '/login') {
      if (isSuperAdmin && !selectedClientId) {
        navigate('/admin', { replace: true });
      } else {
        const targetPath = orgType === 'WHITELABEL'
          ? '/dashboard'
          : workspacePath('/dashboard', user?.orgSlug || localStorage.getItem('nexus_org_slug'));
        navigate(targetPath, { replace: true });
      }
      return;
    }

    if (hasUrlSlug(pathname)) return;

    const onboardingDone = localStorage.getItem('nexus_onboarding_done') === 'true';

      if (pathname === '/') {
        if (isSuperAdmin && !selectedClientId) {
          navigate('/admin', { replace: true });
        } else {
          const savedSlug = localStorage.getItem('nexus_org_slug');
          navigate(workspacePath('/dashboard', savedSlug || ''), { replace: true });
        }
        return;
      }

    if (isSuperAdmin && !selectedClientId && !pathname.startsWith('/admin') && pathname !== '/acp') {
      navigate('/admin', { replace: true });
      return;
    }

    const shouldEnforceOnboarding =
      !onboardingDone &&
      !isSuperAdmin &&
      pathname !== '/onboarding' &&
      pathname !== '/onboarding/whitelabel' &&
      (orgType === 'WHITELABEL' || !isCustomWorkspaceHost());

    if (shouldEnforceOnboarding) {
      if (orgType === 'WHITELABEL') {
        navigate('/onboarding/whitelabel', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [
    navigate,
    pathname,
    selectedClientId,
    user?.role,
    user?.orgType,
    user?.orgSlug,
    user?.trialEndsAt,
    user?.subscriptionStatus,
    user?.contactVerification?.required,
    user?.whitelabelOnboarding?.complete
  ]);
}

export default function App() {
  const { config: whiteLabel, customDomain, loading: whiteLabelLoading } = useWhitelabel();
  const { user, setUser, authLoading, handleLogout } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    localStorage.getItem('nexus_selected_client')
  );

  const handleSelectClient = (clientId: string | null) => {
    setSelectedClientId(clientId);
    if (clientId) {
      localStorage.setItem('nexus_selected_client', clientId);
    } else {
      localStorage.removeItem('nexus_selected_client');
    }
  };

  if (authLoading || whiteLabelLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white animate-pulse">
            <Monitor size={24} />
          </div>
          <p className="text-sm text-gray-500 font-medium animate-pulse">Validando acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Guard user={user} selectedClientId={selectedClientId} />
      <Layout 
        user={user} 
        onLogout={handleLogout}
        selectedClientId={selectedClientId}
        onSelectClient={handleSelectClient}
        whiteLabel={whiteLabel}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/prospecting/capture" element={<LeadCapture />} />
          <Route path="/prospecting/lists" element={<CapturedLists />} />
          <Route path="/prospecting/funnels" element={<ProspectingFunnels />} />
          <Route path="/prospecting/funnels/builder" element={<FunnelBuilder />} />
          <Route path="/prospecting/missions" element={<LegacyProspectingMissionsRedirect />} />
          <Route path="/qualification/forms" element={<QualificationForms />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/team" element={<Team />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/sold-services" element={<SoldServicesPage />} />
          <Route path="/ad-accounts" element={<AdAccounts />} />
          <Route path="/assets" element={<AssetsLibrary />} />
          <Route path="/landing-pages" element={<LandingPages />} />
          <Route path="/landing-pages/new" element={<LandingPageWizard />} />
          <Route path="/landing-pages/:id/edit" element={<LandingPageEditor />} />
          <Route path="/quiz" element={<QuizBuilder />} />
          <Route path="/content" element={<Content />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/marketing" element={<MarketingOps />} />
          <Route path="/sales-machine" element={<SalesMachine />} />
          <Route path="/closer" element={<CloserDashboard />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/agents-hub" element={<AgentsHub selectedClientId={selectedClientId} />} />
          <Route path="/autopilot" element={<Autopilot selectedClientId={selectedClientId} />} />
          <Route path="/acp" element={<AcpHub selectedClientId={selectedClientId} />} />
          <Route path="/ai-settings" element={<AISettings />} />
          <Route path="/prompt-architect" element={<PromptArchitect />} />
          <Route path="/site" element={<LandingPage />} />
          <Route path="/vendas" element={<CRMSalesPage />} />
          <Route path="/login" element={<Login onAuthenticated={setUser} />} />
          <Route path="/verify-contact" element={<ContactVerification />} />
          <Route
            path="/onboarding"
            element={customDomain ? <WhitelabelDomainOnboarding onAuthenticated={setUser} /> : <Onboarding />}
          />
          <Route path="/onboarding/preview" element={<OnboardingPreview />} />
          <Route path="/onboarding/whitelabel" element={<WhitelabelOnboarding />} />
          <Route path="/onboarding/whitelabel/preview" element={<WhitelabelOnboardingPreview />} />
          <Route path="/meet/:roomName" element={<MeetingRoom />} />
          <Route path="/landing-demo" element={<LandingDemo />} />
          <Route path="/landing-editor" element={<LandingEditor />} />
          <Route path="/p/:slug" element={<PublicProposal />} />
          <Route path="/client-portal" element={<ClientPortal />} />
          <Route path="/client-results/:token" element={<ClientResults />} />
          <Route path="/legal/:type" element={<LegalPage />} />

          <Route path="/admin" element={<SuperAdmin />} />
          <Route path="/admin/agencies" element={<AdminAgencies />} />
          <Route path="/admin/team" element={<SystemTeam />} />
          <Route path="/admin/domains" element={<AdminDomains />} />
          <Route path="/admin/monitor" element={<AdminMonitor />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/whitelabel" element={<WhiteLabel />} />
          <Route path="/admin/releases" element={<ReleaseControl />} />
          <Route path="/admin/acp" element={<AdminAcpManager />} />
          <Route path="/admin/google-local" element={<AdminGoogleLocalManager />} />
          <Route path="/admin/ai" element={<AdminAIManager />} />

          <Route path="/whitelabel/:slug/*" element={<WorkspaceAliasRedirect />} />

          <Route path="/:slug" element={<Dashboard />} /> 
          <Route path="/:slug/dashboard" element={<Dashboard />} />
          <Route path="/:slug/admin" element={<Dashboard />} />
          <Route path="/:slug/finance" element={<Finance />} />
          <Route path="/:slug/tasks" element={<Tasks />} />
          <Route path="/:slug/calendar" element={<Calendar />} />
          <Route path="/:slug/crm" element={<CRM />} />
          <Route path="/:slug/clients" element={<ClientsPage />} />
          <Route path="/:slug/clients/:id" element={<ClientDetailPage />} />
          <Route path="/:slug/sold-services" element={<SoldServicesPage />} />
          <Route path="/:slug/ad-accounts" element={<AdAccounts />} />
          <Route path="/:slug/assets" element={<AssetsLibrary />} />
          <Route path="/:slug/landing-pages" element={<LandingPages />} />
          <Route path="/:slug/landing-pages/new" element={<LandingPageWizard />} />
          <Route path="/:slug/landing-pages/:id/edit" element={<LandingPageEditor />} />
          <Route path="/:slug/prospecting/capture" element={<LeadCapture />} />
          <Route path="/:slug/prospecting/lists" element={<CapturedLists />} />
          <Route path="/:slug/prospecting/funnels" element={<ProspectingFunnels />} />
          <Route path="/:slug/prospecting/funnels/builder" element={<FunnelBuilder />} />
          <Route path="/:slug/prospecting/missions" element={<LegacyProspectingMissionsRedirect />} />
          <Route path="/:slug/qualification/forms" element={<QualificationForms />} />
          <Route path="/:slug/whatsapp" element={<WhatsApp />} />
          <Route path="/:slug/quiz" element={<QuizBuilder />} />
          <Route path="/:slug/content" element={<Content />} />
          <Route path="/:slug/projects" element={<Projects />} />
          <Route path="/:slug/team" element={<Team />} />
          <Route path="/:slug/settings" element={<Settings />} />
          <Route path="/:slug/reports" element={<Reports />} />
          <Route path="/:slug/marketing" element={<MarketingOps />} />
          <Route path="/:slug/sales-machine" element={<SalesMachine />} />
          <Route path="/:slug/closer" element={<CloserDashboard />} />
          <Route path="/:slug/proposals" element={<Proposals />} />
          <Route path="/:slug/agents-hub" element={<AgentsHub selectedClientId={selectedClientId} />} />
          <Route path="/:slug/autopilot" element={<Autopilot selectedClientId={selectedClientId} />} />
          <Route path="/:slug/acp" element={<AcpHub selectedClientId={selectedClientId} />} />
          <Route path="/:slug/google-local" element={<GoogleLocal />} />
          <Route path="/:slug/ai-settings" element={<AISettings />} />
          <Route path="/:slug/prompt-architect" element={<PromptArchitect />} />
          <Route path="/:slug/billing" element={<Billing />} />

          <Route path="/:slug/automations" element={<AutomationBuilder />} />
          <Route path="/:slug/notifications" element={<NotificationsCenter />} />
          <Route path="/:slug/delivery" element={<DeliveryKanban />} />
          <Route path="/:slug/service-catalog" element={<ServiceCatalog />} />
          <Route path="/:slug/time-tracking" element={<TimeTracking />} />
          <Route path="/:slug/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/:slug/client-health" element={<ClientHealthDashboard />} />

          <Route path="/automations" element={<AutomationBuilder />} />
          <Route path="/notifications" element={<NotificationsCenter />} />
          <Route path="/delivery" element={<DeliveryKanban />} />
          <Route path="/service-catalog" element={<ServiceCatalog />} />
          <Route path="/time-tracking" element={<TimeTracking />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/client-health" element={<ClientHealthDashboard />} />
          <Route path="/google-local" element={<GoogleLocal />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function Guard({ user, selectedClientId }: { user: any; selectedClientId: string | null }) {
  useNavigationGuard(user, selectedClientId);
  return null;
}

function WorkspaceAliasRedirect() {
  const { slug, "*": tail } = useParams();
  const target = `/${slug || ""}${tail ? `/${tail}` : ""}`;
  return <Navigate to={target || "/"} replace />;
}

function LegacyProspectingMissionsRedirect() {
  const { slug } = useParams();
  const target = slug ? `/${slug}/prospecting/funnels` : "/prospecting/funnels";
  return <Navigate to={target} replace />;
}
