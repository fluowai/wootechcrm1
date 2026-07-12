export interface MetricCards {
  leads: number;
  conversions: number;
  revenue: number;
  contentCount: number;
}

export type LeadStatus = 'novo' | 'contato' | 'qualificado' | 'proposta' | 'fechado';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  value: number;
  tags: string | string[];
  source?: string;
  notes?: string;
  cnpj?: string;
  owners?: string;
  managementTeam?: string;
  aiDiagnosis?: string;
  score?: number;
  clientId?: string;
  pipelineId?: string;
  stageId?: string;
  assignedToId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  deadline: string;
  status: 'planejamento' | 'execucao' | 'revisao' | 'concluido';
  tasks: { id: string; title: string; completed: boolean }[];
}

export interface ContentItem {
  id: string;
  title: string;
  type: 'instagram' | 'blog' | 'email' | 'linkedin';
  status: 'rascunho' | 'aprovacao' | 'publicado';
  date: string;
  content?: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  role: 'SUPER_ADMIN' | 'AGENCY_ADMIN' | 'ORG_ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  avatarUrl?: string;
  organizationId?: string;
  orgId?: string;
  orgName?: string;
  orgSlug?: string;
  orgType?: string;
  agencyId?: string;
  department?: string;
  permissions?: Record<string, string[]>;
  accessProfileId?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  contactVerification?: {
    required: boolean;
    complete: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    verifiedContactAt?: string | null;
  };
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  plan?: any;
  usage?: any;
  whitelabelOnboarding?: { complete?: boolean; step?: number };
  organization?: Organization;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  plan: string;
  planId?: string;
  subscriptionStatus: string;
  isActive: boolean;
  agencyId?: string;
  businessType?: string;
  businessDescription?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description?: string;
  pipelineId?: string;
  stageId?: string;
  stage: string;
  probability: number;
  value: number;
  estimatedValue?: number;
  expectedCloseDate?: string;
  closedAt?: string;
  status: 'OPEN' | 'WON' | 'LOST' | 'FROZEN';
  lostReason?: string;
  lostReasonId?: string;
  wonReasonId?: string;
  temperature: 'COLD' | 'WARM' | 'HOT';
  score: number;
  organizationId: string;
  clientId: string;
  assignedToId?: string;
  nextActionAt?: string;
  lastInteractionAt?: string;
  objections?: any;
  customFields?: any;
  client?: Client;
  assignedTo?: User;
  pipeline?: Pipeline;
  stageObj?: PipelineStage;
  tasks?: Task[];
  proposals?: Proposal[];
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  corporateName: string;
  tradeName?: string;
  cnpj?: string;
  cpf?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  segment?: string;
  porte?: string;
  employees?: number;
  revenue?: number;
  responsibleName?: string;
  responsibleCpf?: string;
  responsibleEmail?: string;
  responsiblePhone?: string;
  responsibleRole?: string;
  status: 'prospect' | 'onboarding' | 'ativo' | 'inativo' | 'churned';
  renewalDate?: string;
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastNpsScore?: number;
  source?: string;
  sourceDetail?: string;
  portalAccess: boolean;
  organizationId: string;
  assignedToId?: string;
  notes?: string;
  tags?: string;
  opportunities?: Opportunity[];
  proposals?: Proposal[];
  projects?: Project[];
  leads?: Lead[];
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  type: 'SALES' | 'SUCCESS' | 'RETENTION';
  organizationId: string;
  stages: PipelineStage[];
  opportunities?: Opportunity[];
  leads?: Lead[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  description?: string;
  pipelineId: string;
  sla?: number;
  probability?: number;
  isDefault: boolean;
  requiredFields?: any;
  checklist?: any;
  automationConfig?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'cancelled';
  clientId?: string;
  leadId?: string;
  opportunityId?: string;
  organizationId: string;
  logoUrl?: string;
  footerText?: string;
  content: any;
  items: ProposalItem[];
  client?: Client;
  opportunity?: Opportunity;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  service: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  dueDate?: string;
  completedAt?: string;
  organizationId: string;
  assignedToId?: string;
  leadId?: string;
  opportunityId?: string;
  proposalId?: string;
  projectId?: string;
  assignedTo?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  inboxId: string;
  leadId?: string;
  clientId?: string;
  assignedToId?: string;
  subject: string;
  status: 'OPEN' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  channel: string;
  channelContactId: string;
  channelContactName: string;
  lastMessageAt?: string;
  metadata?: any;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'template';
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentById?: string;
  channelMessageId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Inbox {
  id: string;
  name: string;
  type: 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | 'TELEGRAM' | 'CHAT' | 'EMAIL';
  organizationId: string;
  config: any;
  isActive: boolean;
  sla?: InboxSla;
  createdAt: string;
  updatedAt: string;
}

export interface InboxSla {
  id: string;
  inboxId: string;
  firstResponseTime: number;
  resolutionTime: number;
  businessHoursOnly: boolean;
  workingHours?: any;
  createdAt: string;
  updatedAt: string;
}

export interface QuickReply {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig?: any;
  actions: any;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationLog {
  id: string;
  automationId: string;
  triggerType: string;
  entityType: string;
  entityId: string;
  action: string;
  result: string;
  metadata?: any;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  type: string;
  content: string;
  status: 'pending' | 'completed' | 'cancelled';
  scheduledAt?: string;
  userId?: string;
  user?: User;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  type: string;
  status: string;
  reminder?: number;
  organizationId: string;
  userId?: string;
  leadId?: string;
  taskId?: string;
  projectId?: string;
  meetingRoom?: string;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  organizationId: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  leadsGenerated: number;
  conversions: number;
  revenue: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  description?: string;
  organizationId: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  clientId: string;
  organizationId: string;
  title?: string;
  contractNumber?: string;
  status: 'draft' | 'sent' | 'signed' | 'active' | 'expired';
  contractData?: any;
  fileUrl?: string;
  signedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoldProduct {
  id: string;
  clientId: string;
  name: string;
  setupValue: number;
  monthlyValue: number;
  commissionValue: number;
  paymentMethod?: string;
  billingDay?: number;
  contractTerm?: number;
  startDate: string;
  deliveryDate?: string;
  status: string;
  closerId?: string;
  sdrId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type: string;
  setupValue: number;
  monthlyValue: number;
  commissionValue: number;
  estimatedHours?: number;
  deliveryDays?: number;
  requiresApproval: boolean;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingData {
  businessName: string;
  businessType: string;
  targetAudience: string;
  averageTicket: string;
  salesCycle: string;
  needsMeeting: boolean;
  needsProposal: boolean;
  needsContract: boolean;
  hasRecurrence: boolean;
  leadChannels: string[];
  hasSdr: boolean;
  hasCloser: boolean;
  hasPostSales: boolean;
  painPoints: string;
  biggestProblem: string;
  deliveryProcess: string;
  hasOnboarding: boolean;
  hasChecklist: boolean;
  hasRenewal: boolean;
  hasUpsell: boolean;
}

export interface OnboardingGeneratedItem {
  id: string;
  organizationId: string;
  step: string;
  itemType: string;
  label: string;
  content: any;
  order: number;
  createdAt: string;
}

export interface BusinessTemplate {
  id: string;
  slug: string;
  name: string;
  description?: string;
  industry: string;
  operatingModel: string;
  stages: any[];
  customFields: any[];
  tasks: any[];
  scripts: any[];
  playbook: any[];
  automations: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category?: string;
  content: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unitPrice: number;
  unit?: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: string;
  paidAt?: string;
  supplier?: string;
  isRecurring: boolean;
  recurringType?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdAccount {
  id: string;
  accountId: string;
  accountName: string;
  platform: string;
  accountStatus: string;
  accountCurrency?: string;
  accountTimezone?: string;
  dailySpendLimit: number;
  currentSpend: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  mimeType?: string;
  size?: number;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  tags?: string;
  folderId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPage {
  id: string;
  name: string;
  slug: string;
  templateId?: string;
  headline?: string;
  subheadline?: string;
  heroImage?: string;
  heroVideo?: string;
  content?: string;
  status: string;
  views: number;
  submissions: number;
  conversionRate: number;
  domain?: string;
  customDomain?: string;
  metaTitle?: string;
  metaDescription?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  order: number;
  text: string;
  type: 'text' | 'multiple_choice' | 'single_choice';
  options?: any;
  createdAt: string;
}

export interface AiLog {
  id: string;
  organizationId: string;
  agentType: string;
  prompt: string;
  response: string;
  model?: string;
  tokens?: number;
  durationMs?: number;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  dueDate?: string;
  deliveredAt?: string;
  fileUrl?: string;
  version: number;
  isFinal: boolean;
  projectId?: string;
  clientId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string;
  isPublished: boolean;
  organizationId: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId?: string;
  clientId?: string;
  description: string;
  duration: number;
  date: string;
  billable: boolean;
  hourlyRate?: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientHealthScore {
  id: string;
  clientId: string;
  overallScore: number;
  npsScore?: number;
  engagementScore?: number;
  deliveryScore?: number;
  communicationScore?: number;
  lastCalculatedAt: string;
  factors?: any;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
