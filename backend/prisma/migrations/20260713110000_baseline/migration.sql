-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#3B82F6',
    "secondaryColor" TEXT DEFAULT '#1E40AF',
    "whiteLabelConfig" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CLIENT',
    "slug" TEXT,
    "domain" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'Free',
    "planId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "agencyId" TEXT,
    "whiteLabelConfig" JSONB,
    "limitsUsage" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isTestAccount" BOOLEAN NOT NULL DEFAULT false,
    "betaAccess" BOOLEAN NOT NULL DEFAULT false,
    "geminiKey" TEXT,
    "groqKey" TEXT,
    "serpApiKey" TEXT,
    "serperApiKey" TEXT,
    "outscraperKey" TEXT,
    "aiProvider" TEXT NOT NULL DEFAULT 'gemini',
    "businessType" TEXT,
    "businessDescription" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyPlan" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "limits" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 'free',
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION,
    "priceYearly" DOUBLE PRECISION,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "maxContacts" INTEGER NOT NULL DEFAULT 100,
    "maxDeals" INTEGER NOT NULL DEFAULT 50,
    "maxPipelines" INTEGER NOT NULL DEFAULT 1,
    "maxAutomations" INTEGER NOT NULL DEFAULT 2,
    "maxLandingPages" INTEGER NOT NULL DEFAULT 1,
    "maxInboxes" INTEGER NOT NULL DEFAULT 1,
    "maxMessages" INTEGER NOT NULL DEFAULT 500,
    "maxAIRequests" INTEGER NOT NULL DEFAULT 10,
    "maxLeads" INTEGER NOT NULL DEFAULT 100,
    "maxClients" INTEGER NOT NULL DEFAULT 10,
    "maxReports" INTEGER NOT NULL DEFAULT 5,
    "maxIntegrations" INTEGER NOT NULL DEFAULT 2,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "limit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'AGENCY',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "moduleKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "crmPublic" BOOLEAN NOT NULL DEFAULT false,
    "salesMachinePublic" BOOLEAN NOT NULL DEFAULT false,
    "agentBuilderPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaaSSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "price" DECIMAL(18,2),
    "billingCycle" TEXT,
    "provider" TEXT,
    "providerSubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaaSSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaaSInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaaSInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedContactAt" TIMESTAMP(3),
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl" TEXT,
    "agencyId" TEXT,
    "organizationId" TEXT,
    "workspaceId" TEXT,
    "department" TEXT DEFAULT 'GERAL',
    "permissions" JSONB,
    "accessProfileId" TEXT,
    "roleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "cpf" TEXT,
    "jobTitle" TEXT,
    "birthDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'novo',
    "value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tags" TEXT,
    "source" TEXT,
    "channel" TEXT,
    "notes" TEXT,
    "cnpj" TEXT,
    "owners" TEXT,
    "managementTeam" TEXT,
    "aiDiagnosis" TEXT,
    "temperature" TEXT NOT NULL DEFAULT 'COLD',
    "score" INTEGER NOT NULL DEFAULT 0,
    "lgpdConsent" BOOLEAN NOT NULL DEFAULT false,
    "lgpdDate" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "assignedToId" TEXT,
    "clientId" TEXT,
    "pipelineId" TEXT,
    "stageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creative" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contentUrl" TEXT,
    "copyText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "feedback" TEXT,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planejamento',
    "deadline" TIMESTAMP(3),
    "clientId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "corporateName" TEXT NOT NULL,
    "tradeName" TEXT,
    "cnpj" TEXT,
    "cpf" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "segment" TEXT,
    "porte" TEXT,
    "employees" INTEGER,
    "revenue" DECIMAL(18,2),
    "responsibleName" TEXT,
    "responsibleCpf" TEXT,
    "responsibleEmail" TEXT,
    "responsiblePhone" TEXT,
    "responsibleRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "renewalDate" TIMESTAMP(3),
    "churnRisk" TEXT NOT NULL DEFAULT 'LOW',
    "lastNpsScore" INTEGER,
    "source" TEXT,
    "sourceDetail" TEXT,
    "portalAccess" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "organizationId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "closerStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAIContext" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAIContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGeneration" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT,
    "agentType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentQueueItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "phase" TEXT,
    "category" TEXT,
    "autonomy" TEXT NOT NULL DEFAULT 'semi_autonomo',
    "actionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "input" JSONB,
    "output" JSONB,
    "result" JSONB,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "dependsOnId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pipelineId" TEXT,
    "stageId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'qualificacao',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "estimatedValue" DECIMAL(18,2),
    "expectedCloseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lostReason" TEXT,
    "lostReasonId" TEXT,
    "wonReasonId" TEXT,
    "temperature" TEXT NOT NULL DEFAULT 'COLD',
    "score" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "lastInteractionAt" TIMESTAMP(3),
    "objections" JSONB,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "clientId" TEXT,
    "leadId" TEXT,
    "opportunityId" TEXT,
    "organizationId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "footerText" TEXT,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProposalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "spent" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "leadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "priority" TEXT NOT NULL DEFAULT 'media',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "leadId" TEXT,
    "opportunityId" TEXT,
    "proposalId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoldProduct" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setupValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "billingDay" INTEGER,
    "contractTerm" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'onboarding',
    "closerId" TEXT,
    "sdrId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoldProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "soldProductId" TEXT,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "contractData" JSONB,
    "aiComparison" TEXT,
    "fileUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "contractNumber" TEXT,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demand" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "clientId" TEXT NOT NULL,
    "soldProductId" TEXT,
    "assignedToId" TEXT,
    "aiAgentType" TEXT,
    "aiResult" JSONB,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceStep" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "waitDays" INTEGER,
    "condition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SequenceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "category" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "paidAt" TIMESTAMP(3),
    "supplier" TEXT,
    "document" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringType" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "reminder" INTEGER,
    "leadId" TEXT,
    "taskId" TEXT,
    "projectId" TEXT,
    "organizationId" TEXT NOT NULL,
    "meetingRoom" TEXT,
    "meetingLink" TEXT,
    "userId" TEXT,
    "agendaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "accountCurrency" TEXT,
    "accountTimezone" TEXT,
    "dailySpendLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncError" TEXT,
    "providerMetadata" JSONB,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAd" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paused',
    "biddingStrategy" TEXT NOT NULL DEFAULT 'lowest_cost',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budgetType" TEXT NOT NULL DEFAULT 'daily',
    "budgetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spendAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locations" TEXT,
    "ageMin" INTEGER NOT NULL DEFAULT 18,
    "ageMax" INTEGER NOT NULL DEFAULT 65,
    "genders" TEXT,
    "interests" TEXT,
    "pixelId" TEXT,
    "conversionEvent" TEXT,
    "adAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSet" (
    "id" TEXT NOT NULL,
    "adSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "targeting" TEXT,
    "budgetType" TEXT NOT NULL DEFAULT 'daily',
    "budgetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "campaignAdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "format" TEXT NOT NULL,
    "creativeId" TEXT,
    "adSetId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCreative" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "headline" TEXT,
    "primaryText" TEXT,
    "description" TEXT,
    "callToAction" TEXT,
    "displayLink" TEXT,
    "destinationUrl" TEXT,
    "platformData" TEXT,
    "adAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomAudience" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "description" TEXT,
    "audienceType" TEXT NOT NULL,
    "rule" TEXT,
    "sourceAudience" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "adAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdMetricSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "adAccountId" TEXT NOT NULL,
    "campaignAdId" TEXT,
    "platform" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'account',
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdsInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "adAccountId" TEXT,
    "agentId" TEXT NOT NULL DEFAULT 'ads_performance',
    "agentName" TEXT NOT NULL DEFAULT 'Agente Performance Ads',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdsInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdsRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "adAccountId" TEXT,
    "insightId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "impact" TEXT NOT NULL DEFAULT 'medium',
    "effort" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "estimatedLift" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdsRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReportShare" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientReportShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "tags" TEXT,
    "folderId" TEXT,
    "usedIn" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "templateId" TEXT,
    "headline" TEXT,
    "subheadline" TEXT,
    "heroImage" TEXT,
    "heroVideo" TEXT,
    "content" TEXT,
    "formId" TEXT,
    "formProvider" TEXT,
    "formConfig" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "views" INTEGER NOT NULL DEFAULT 0,
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "domain" TEXT,
    "customDomain" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaImage" TEXT,
    "config" TEXT,
    "organizationId" TEXT NOT NULL,
    "sections" JSONB,
    "wizardData" JSONB,
    "theme" JSONB,
    "tracking" JSONB,
    "formFields" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "thumbnail" TEXT,
    "htmlTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LPTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LPForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "submitAction" TEXT NOT NULL,
    "submitUrl" TEXT,
    "webhookUrl" TEXT,
    "emailTo" TEXT,
    "emailSubject" TEXT,
    "autoReply" BOOLEAN NOT NULL DEFAULT false,
    "replySubject" TEXT,
    "replyMessage" TEXT,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "gdprText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LPForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "quizType" TEXT,
    "scoringType" TEXT,
    "passScore" INTEGER,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "tracking" JSONB,
    "leadCapture" JSONB,
    "scoringRules" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaImage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "points" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSubmission" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "leadId" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "answers" JSONB NOT NULL,
    "score" INTEGER,
    "maxScore" INTEGER,
    "percentage" DOUBLE PRECISION,
    "qualified" BOOLEAN,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB,
    "actions" JSONB NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "percentage" INTEGER DEFAULT 100,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "promptStructure" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedPrompt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "projectName" TEXT NOT NULL,
    "promptType" TEXT NOT NULL,
    "inputData" JSONB NOT NULL,
    "generatedContent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "modelProvider" TEXT,
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'docker',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCaptureSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "niche" TEXT,
    "keyword" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Brasil',
    "neighborhood" TEXT,
    "requestedLimit" INTEGER NOT NULL DEFAULT 100,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "totalImported" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "errorMessage" TEXT,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCaptureSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapturedLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "placeId" TEXT,
    "businessName" TEXT NOT NULL,
    "category" TEXT,
    "businessType" TEXT,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "website" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "address" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Brasil',
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER,
    "reviews" JSONB,
    "openingHours" JSONB,
    "googleMapsUrl" TEXT,
    "searchUrl" TEXT,
    "hasPhone" BOOLEAN NOT NULL DEFAULT false,
    "hasWebsite" BOOLEAN NOT NULL DEFAULT false,
    "hasEmail" BOOLEAN NOT NULL DEFAULT false,
    "hasSocial" BOOLEAN NOT NULL DEFAULT false,
    "scoreOpportunity" INTEGER NOT NULL DEFAULT 0,
    "opportunityLevel" TEXT,
    "aiDiagnosis" TEXT,
    "aiWeaknesses" JSONB,
    "aiOpportunities" JSONB,
    "coldCallScript" TEXT,
    "whatsappMessage" TEXT,
    "suggestedOffer" TEXT,
    "crmStatus" TEXT NOT NULL DEFAULT 'novo',
    "sentToCrm" BOOLEAN NOT NULL DEFAULT false,
    "crmLeadId" TEXT,
    "responsibleId" TEXT,
    "notes" TEXT,
    "cnpj" TEXT,
    "cnpjStatus" TEXT NOT NULL DEFAULT 'unverified',
    "cnpjMatchScore" INTEGER,
    "cnpjMatchReason" TEXT,
    "matchedLegalName" TEXT,
    "matchedTradeName" TEXT,
    "matchedCity" TEXT,
    "matchedState" TEXT,
    "matchedAddress" TEXT,
    "cnpjSourceUrl" TEXT,
    "owners" TEXT,
    "managementTeam" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapturedLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyIdentityCandidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "capturedLeadId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "legalName" TEXT,
    "tradeName" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "registryStatus" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "evidence" JSONB,
    "rawData" JSONB,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyIdentityCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyIdentityAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "capturedLeadId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "selectedCnpj" TEXT,
    "score" INTEGER,
    "reason" TEXT NOT NULL,
    "input" JSONB,
    "candidates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyIdentityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingFunnel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "status" TEXT NOT NULL DEFAULT 'active',
    "objective" TEXT,
    "qualificationRules" JSONB,
    "handoffRules" JSONB,
    "safetyRules" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectingFunnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingFunnelStage" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "agentKey" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "successCriteria" JSONB,
    "nextAction" TEXT,
    "maxMessages" INTEGER NOT NULL DEFAULT 3,
    "isHumanHandoff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectingFunnelStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "stageId" TEXT,
    "capturedLeadId" TEXT,
    "crmLeadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "leadName" TEXT NOT NULL,
    "leadPhone" TEXT,
    "leadSnapshot" JSONB,
    "score" INTEGER NOT NULL DEFAULT 0,
    "qualification" JSONB,
    "firstMessage" TEXT,
    "lastAiSummary" TEXT,
    "nextAction" TEXT,
    "lastContactAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "handedOffAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCaptureUsageLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "sourceId" TEXT,
    "provider" TEXT NOT NULL,
    "query" TEXT,
    "requestedLimit" INTEGER,
    "returnedCount" INTEGER,
    "importedCount" INTEGER,
    "estimatedCost" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadCaptureUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SALES',
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "description" TEXT,
    "pipelineId" TEXT NOT NULL,
    "sla" INTEGER,
    "probability" INTEGER DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "requiredFields" JSONB,
    "checklist" JSONB,
    "automationConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GERAL',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "type" TEXT NOT NULL DEFAULT 'service',
    "setupValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedHours" INTEGER,
    "deliveryDays" INTEGER,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "thumbnailUrl" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "clientId" TEXT,
    "approvedById" TEXT,
    "createdById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "requestedChanges" TEXT,
    "requestedToId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deliverableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "deliverableId" TEXT,
    "taskId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "organizationId" TEXT NOT NULL,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientHealthScore" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "prevScore" INTEGER NOT NULL DEFAULT 0,
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "lastContactAt" TIMESTAMP(3),
    "paymentsInDay" BOOLEAN NOT NULL DEFAULT true,
    "npsResponse" INTEGER,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectStatus" TEXT NOT NULL DEFAULT 'good',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "flags" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientHealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inbox" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "config" JSONB,
    "inboxId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "inboxId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "contactId" TEXT,
    "leadId" TEXT,
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderType" TEXT NOT NULL,
    "content" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "fileUrl" TEXT,
    "metadata" JSONB,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingDecisionMaker" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "capturedLeadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "role" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 99,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "evidence" JSONB,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectingDecisionMaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingDispatchAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "capturedLeadId" TEXT,
    "channelId" TEXT,
    "consultantId" TEXT,
    "phone" TEXT,
    "displayPhone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "reason" TEXT,
    "bridgeMessageId" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectingDispatchAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectingOptOutContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "displayPhone" TEXT,
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "conversationId" TEXT,
    "messageId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectingOptOutContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappContactIdentity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "conversationId" TEXT,
    "jid" TEXT NOT NULL,
    "rawJid" TEXT,
    "phone" TEXT,
    "displayPhone" TEXT,
    "savedName" TEXT,
    "pushName" TEXT,
    "leadName" TEXT,
    "displayName" TEXT,
    "profilePictureUrl" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappContactIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappGroupParticipant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "conversationId" TEXT NOT NULL,
    "groupJid" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "rawJid" TEXT,
    "phone" TEXT,
    "displayPhone" TEXT,
    "name" TEXT,
    "pushName" TEXT,
    "displayName" TEXT,
    "pictureUrl" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappGroupParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMention" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mentionedJid" TEXT NOT NULL,
    "rawJid" TEXT,
    "phone" TEXT,
    "displayPhone" TEXT,
    "displayName" TEXT,
    "label" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappConnectionLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "event" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappConnectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappWebhookLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "channelId" TEXT,
    "eventType" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "status" TEXT NOT NULL DEFAULT 'received',
    "payload" JSONB,
    "result" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppCall" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channelId" TEXT,
    "callBridgeId" TEXT,
    "conversationId" TEXT,
    "leadId" TEXT,
    "direction" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "toJid" TEXT,
    "fromJid" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "contactId" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealStageHistory" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "fromStageName" TEXT,
    "toStageName" TEXT NOT NULL,
    "movedById" TEXT,
    "duration" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "contactId" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Taggable" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "taggableId" TEXT NOT NULL,
    "taggableType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Taggable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectMission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "leadQuantity" INTEGER NOT NULL,
    "executionDate" TIMESTAMP(3) NOT NULL,
    "executionTime" TEXT NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'unica',
    "dailyMessageLimit" INTEGER NOT NULL DEFAULT 50,
    "messageIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "minScore" INTEGER NOT NULL DEFAULT 50,
    "initialApproach" TEXT NOT NULL,
    "salesOwnerId" TEXT,
    "calendarId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "missionResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectLead" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "category" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleRating" DOUBLE PRECISION,
    "googleReviewsCount" INTEGER,
    "openingHours" JSONB,
    "googleMapsUrl" TEXT,
    "dataSource" TEXT,
    "captureDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'captado',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectBlockedContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectBlockedContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectLearningMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "approachType" TEXT NOT NULL,
    "leadsContacted" INTEGER NOT NULL DEFAULT 0,
    "responsesReceived" INTEGER NOT NULL DEFAULT 0,
    "appointmentsBooked" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bookingRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectLearningMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingResponse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "averageTicket" DOUBLE PRECISION,
    "salesCycle" TEXT,
    "needsMeeting" BOOLEAN NOT NULL DEFAULT false,
    "needsProposal" BOOLEAN NOT NULL DEFAULT false,
    "needsContract" BOOLEAN NOT NULL DEFAULT false,
    "hasRecurrence" BOOLEAN NOT NULL DEFAULT false,
    "leadChannels" JSONB NOT NULL,
    "hasSdr" BOOLEAN NOT NULL DEFAULT false,
    "hasCloser" BOOLEAN NOT NULL DEFAULT false,
    "hasPostSales" BOOLEAN NOT NULL DEFAULT false,
    "painPoints" TEXT,
    "biggestProblem" TEXT,
    "deliveryProcess" TEXT,
    "hasOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "hasChecklist" BOOLEAN NOT NULL DEFAULT false,
    "hasRenewal" BOOLEAN NOT NULL DEFAULT false,
    "hasUpsell" BOOLEAN NOT NULL DEFAULT false,
    "rawAnswers" JSONB NOT NULL,
    "recommendedTemplate" TEXT,
    "aiDiagnosis" JSONB,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pipelineConfig" JSONB NOT NULL,
    "customFields" JSONB NOT NULL,
    "tasks" JSONB NOT NULL,
    "scripts" JSONB NOT NULL,
    "playbook" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceBlueprint" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vertical" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationExperience" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "blueprintId" TEXT,
    "vertical" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'onboarding',
    "version" INTEGER NOT NULL DEFAULT 1,
    "answers" JSONB,
    "blueprint" JSONB NOT NULL,
    "moduleKeys" JSONB NOT NULL,
    "vocabulary" JSONB,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationModule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'experience',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvisioningRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'onboarding',
    "status" TEXT NOT NULL DEFAULT 'running',
    "input" JSONB,
    "output" JSONB,
    "createdItems" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProvisioningRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "model" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LostReason" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LostReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WonReason" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WonReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpsSurvey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NpsSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalOpportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "expectedDate" TIMESTAMP(3),
    "assignedToId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenewalOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "agentType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "runtime" TEXT NOT NULL DEFAULT 'ollama',
    "modelId" TEXT NOT NULL,
    "contextWindow" INTEGER NOT NULL DEFAULT 8192,
    "inputCostPer1k" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputCostPer1k" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "capabilities" JSONB,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
    "lastHealthAt" TIMESTAMP(3),
    "isSelfHosted" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT,
    "modelId" TEXT,
    "fallbackModelId" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "tools" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEntitlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "planId" TEXT,
    "agentId" TEXT,
    "modelId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'organization',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rebillingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "markupMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "monthlyPrice" DOUBLE PRECISION,
    "maxRequestsDaily" INTEGER,
    "maxRequestsMonthly" INTEGER,
    "maxTokensDaily" INTEGER,
    "maxTokensMonthly" INTEGER,
    "maxCreditsDaily" INTEGER,
    "maxCreditsMonthly" INTEGER,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLedger" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "agentId" TEXT,
    "agentKey" TEXT NOT NULL,
    "modelId" TEXT,
    "modelName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ai-core',
    "channel" TEXT NOT NULL DEFAULT 'nexus',
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiQuotaWindow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "agentKey" TEXT,
    "modelName" TEXT,
    "windowType" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiQuotaWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectValidation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "phoneValid" BOOLEAN NOT NULL DEFAULT false,
    "whatsappValid" BOOLEAN NOT NULL DEFAULT false,
    "websiteActive" BOOLEAN NOT NULL DEFAULT false,
    "instagramFound" BOOLEAN NOT NULL DEFAULT false,
    "companyActive" BOOLEAN NOT NULL DEFAULT false,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "accountantSuspect" BOOLEAN NOT NULL DEFAULT false,
    "usesBot" BOOLEAN NOT NULL DEFAULT false,
    "detectedBotType" TEXT,
    "digitalMaturity" TEXT,
    "validationNotes" TEXT,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectDossier" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "companySummary" TEXT,
    "digitalPresenceDiagnosis" TEXT,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "opportunities" JSONB,
    "possiblePains" JSONB,
    "recommendedApproach" TEXT,
    "personalizedArgument" TEXT,
    "opportunityScore" INTEGER NOT NULL DEFAULT 0,
    "classification" TEXT,
    "classificationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectOutreachMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "message" TEXT NOT NULL,
    "sendStatus" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "optOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectOutreachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectConversation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "externalConversationId" TEXT,
    "lastMessage" TEXT,
    "leadIntent" TEXT,
    "qualificationStatus" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectAppointment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "salesOwnerId" TEXT,
    "calendarEventId" TEXT,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "appointmentTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "meetingLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "qualificationSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingGeneratedItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "stage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingGeneratedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationId" TEXT,
    "event" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "action" TEXT NOT NULL,
    "result" JSONB,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickReply" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "shortcut" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxSla" (
    "id" TEXT NOT NULL,
    "inboxId" TEXT NOT NULL,
    "firstResponseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
    "workingDays" JSONB,
    "workingHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxSla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalStatusHistory" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectAgentLog" (
    "id" TEXT NOT NULL,
    "missionId" TEXT,
    "leadId" TEXT,
    "agentName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectAgentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpAccess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "acpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcpAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleLocalAccess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "monthlyLimit" INTEGER NOT NULL DEFAULT 200,
    "expiresAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleLocalAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleLocalProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placeId" TEXT,
    "cid" TEXT,
    "address" TEXT,
    "sourceUrl" TEXT,
    "category" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "rawData" JSONB,
    "auditScore" INTEGER,
    "auditData" JSONB,
    "lastAuditedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleLocalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleLocalScan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "gridSize" INTEGER NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL,
    "zoom" INTEGER NOT NULL DEFAULT 15,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalPoints" INTEGER NOT NULL,
    "processedPoints" INTEGER NOT NULL DEFAULT 0,
    "averageRank" DOUBLE PRECISION,
    "top3Percent" DOUBLE PRECISION,
    "top10Percent" DOUBLE PRECISION,
    "foundPercent" DOUBLE PRECISION,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleLocalScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleLocalGridPoint" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "columnIndex" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "matchedTitle" TEXT,
    "matchedPlaceId" TEXT,
    "matchedCid" TEXT,
    "scraperJobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "rawResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleLocalGridPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpDiagnosis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "segment" TEXT,
    "ticketMedio" DOUBLE PRECISION,
    "leadsMes" INTEGER,
    "vendasMes" INTEGER,
    "cacEstimado" DOUBLE PRECISION,
    "ltvEstimado" DOUBLE PRECISION,
    "canalPrincipal" TEXT,
    "ferramentas" TEXT,
    "timeComercial" INTEGER,
    "queixas" TEXT,
    "scoreMaturidade" DOUBLE PRECISION,
    "gargalos" JSONB,
    "topPrioridades" JSONB,
    "plano30_60_90" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcpDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpIcp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "diagnosisId" TEXT,
    "nome" TEXT NOT NULL,
    "criterios" JSONB NOT NULL,
    "mensagem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcpIcp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpOffer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "diagnosisId" TEXT,
    "icpId" TEXT,
    "titulo" TEXT NOT NULL,
    "elementos" JSONB NOT NULL,
    "valueStack" JSONB,
    "ancoragem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcpOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpAgentExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcpAgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpObjection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tratamento" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "icp" TEXT,
    "origem" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcpObjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpCompetitor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "icpAtendido" TEXT,
    "oferta" TEXT,
    "faixaPreco" TEXT,
    "diferenciais" JSONB,
    "pontosFracos" JSONB,
    "tendencia" TEXT,
    "swot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcpCompetitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpQuarterlyPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trimestre" TEXT NOT NULL,
    "metas" JSONB,
    "top5" JSONB,
    "checkpoints" JSONB,
    "revisao" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcpQuarterlyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcpChurnSignal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "signalType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcpChurnSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhitelabelSyncTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB,
    "orgFields" JSONB,
    "tags" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhitelabelSyncTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhitelabelSyncLog" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "appliedConfig" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhitelabelSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalExperience" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "companyName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationForm" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icpFields" JSONB NOT NULL,
    "routingRules" JSONB,
    "allowScheduling" BOOLEAN NOT NULL DEFAULT true,
    "schedulingMessage" TEXT,
    "schedulingLeadTime" INTEGER NOT NULL DEFAULT 60,
    "createLead" BOOLEAN NOT NULL DEFAULT true,
    "leadPipelineId" TEXT,
    "leadStageId" TEXT,
    "createFunnelLead" BOOLEAN NOT NULL DEFAULT false,
    "funnelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualificationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "leadName" TEXT NOT NULL,
    "leadEmail" TEXT NOT NULL,
    "leadPhone" TEXT,
    "leadNotes" TEXT,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "scorePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "routedTo" TEXT,
    "routedToUserId" TEXT,
    "routedAt" TIMESTAMP(3),
    "routeReason" TEXT,
    "scheduledTo" TIMESTAMP(3),
    "calendarEventId" TEXT,
    "schedulingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualificationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSignature" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerCpf" TEXT,
    "signerEmail" TEXT,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractId" TEXT,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'PIX',
    "amount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalId" TEXT,
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "pixCopiaECola" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloserChecklistItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedBy" TEXT,
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloserChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_domain_key" ON "Agency"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_organizationId_slug_key" ON "Workspace"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Module_key_key" ON "Module"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_planId_featureKey_key" ON "PlanFeature"("planId", "featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "Role_organizationId_key_key" ON "Role"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionKey_key" ON "RolePermission"("roleId", "permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_organizationId_permissionKey_key" ON "UserPermission"("userId", "organizationId", "permissionKey");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "SaaSSubscription_organizationId_idx" ON "SaaSSubscription"("organizationId");

-- CreateIndex
CREATE INDEX "SaaSInvoice_organizationId_idx" ON "SaaSInvoice"("organizationId");

-- CreateIndex
CREATE INDEX "SupportTicket_organizationId_idx" ON "SupportTicket"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNormalized_key" ON "User"("phoneNormalized");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_agencyId_idx" ON "User"("agencyId");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");

-- CreateIndex
CREATE INDEX "User_phoneNormalized_idx" ON "User"("phoneNormalized");

-- CreateIndex
CREATE INDEX "AccessProfile_organizationId_idx" ON "AccessProfile"("organizationId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- CreateIndex
CREATE INDEX "Lead_workspaceId_idx" ON "Lead"("workspaceId");

-- CreateIndex
CREATE INDEX "Creative_organizationId_idx" ON "Creative"("organizationId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_cnpj_key" ON "Client"("cnpj");

-- CreateIndex
CREATE INDEX "Client_organizationId_idx" ON "Client"("organizationId");

-- CreateIndex
CREATE INDEX "Client_assignedToId_idx" ON "Client"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAIContext_clientId_key" ON "ClientAIContext"("clientId");

-- CreateIndex
CREATE INDEX "AgentQueueItem_organizationId_idx" ON "AgentQueueItem"("organizationId");

-- CreateIndex
CREATE INDEX "AgentQueueItem_clientId_idx" ON "AgentQueueItem"("clientId");

-- CreateIndex
CREATE INDEX "AgentQueueItem_status_idx" ON "AgentQueueItem"("status");

-- CreateIndex
CREATE INDEX "AgentQueueItem_agentId_idx" ON "AgentQueueItem"("agentId");

-- CreateIndex
CREATE INDEX "AgentQueueItem_scheduledAt_idx" ON "AgentQueueItem"("scheduledAt");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");

-- CreateIndex
CREATE INDEX "Opportunity_clientId_idx" ON "Opportunity"("clientId");

-- CreateIndex
CREATE INDEX "Opportunity_assignedToId_idx" ON "Opportunity"("assignedToId");

-- CreateIndex
CREATE INDEX "Opportunity_pipelineId_idx" ON "Opportunity"("pipelineId");

-- CreateIndex
CREATE INDEX "Opportunity_stageId_idx" ON "Opportunity"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_slug_key" ON "Proposal"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_publicToken_key" ON "Proposal"("publicToken");

-- CreateIndex
CREATE INDEX "Proposal_organizationId_idx" ON "Proposal"("organizationId");

-- CreateIndex
CREATE INDEX "Proposal_slug_idx" ON "Proposal"("slug");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");

-- CreateIndex
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE INDEX "Contract_organizationId_idx" ON "Contract"("organizationId");

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "ContractTemplate_organizationId_idx" ON "ContractTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "Sequence_organizationId_idx" ON "Sequence"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");

-- CreateIndex
CREATE INDEX "Expense_organizationId_idx" ON "Expense"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE INDEX "CalendarEvent_organizationId_idx" ON "CalendarEvent"("organizationId");

-- CreateIndex
CREATE INDEX "AdAccount_organizationId_idx" ON "AdAccount"("organizationId");

-- CreateIndex
CREATE INDEX "AdAccount_clientId_idx" ON "AdAccount"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AdAccount_organizationId_platform_accountId_key" ON "AdAccount"("organizationId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "AdMetricSnapshot_organizationId_idx" ON "AdMetricSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX "AdMetricSnapshot_clientId_idx" ON "AdMetricSnapshot"("clientId");

-- CreateIndex
CREATE INDEX "AdMetricSnapshot_platform_idx" ON "AdMetricSnapshot"("platform");

-- CreateIndex
CREATE INDEX "AdMetricSnapshot_date_idx" ON "AdMetricSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AdMetricSnapshot_adAccountId_entityType_entityId_date_key" ON "AdMetricSnapshot"("adAccountId", "entityType", "entityId", "date");

-- CreateIndex
CREATE INDEX "AdsInsight_organizationId_idx" ON "AdsInsight"("organizationId");

-- CreateIndex
CREATE INDEX "AdsInsight_clientId_idx" ON "AdsInsight"("clientId");

-- CreateIndex
CREATE INDEX "AdsInsight_adAccountId_idx" ON "AdsInsight"("adAccountId");

-- CreateIndex
CREATE INDEX "AdsInsight_periodEnd_idx" ON "AdsInsight"("periodEnd");

-- CreateIndex
CREATE INDEX "AdsRecommendation_organizationId_idx" ON "AdsRecommendation"("organizationId");

-- CreateIndex
CREATE INDEX "AdsRecommendation_clientId_idx" ON "AdsRecommendation"("clientId");

-- CreateIndex
CREATE INDEX "AdsRecommendation_status_idx" ON "AdsRecommendation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientReportShare_token_key" ON "ClientReportShare"("token");

-- CreateIndex
CREATE INDEX "ClientReportShare_organizationId_idx" ON "ClientReportShare"("organizationId");

-- CreateIndex
CREATE INDEX "ClientReportShare_clientId_idx" ON "ClientReportShare"("clientId");

-- CreateIndex
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");

-- CreateIndex
CREATE INDEX "AssetFolder_organizationId_idx" ON "AssetFolder"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "LandingPage"("slug");

-- CreateIndex
CREATE INDEX "LandingPage_organizationId_idx" ON "LandingPage"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_slug_key" ON "Quiz"("slug");

-- CreateIndex
CREATE INDEX "Quiz_organizationId_idx" ON "Quiz"("organizationId");

-- CreateIndex
CREATE INDEX "Quiz_slug_idx" ON "Quiz"("slug");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "QuizSubmission_quizId_idx" ON "QuizSubmission"("quizId");

-- CreateIndex
CREATE INDEX "QuizSubmission_leadId_idx" ON "QuizSubmission"("leadId");

-- CreateIndex
CREATE INDEX "Automation_organizationId_idx" ON "Automation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "PromptTemplate_organizationId_idx" ON "PromptTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "GeneratedPrompt_organizationId_idx" ON "GeneratedPrompt"("organizationId");

-- CreateIndex
CREATE INDEX "GeneratedPrompt_clientId_idx" ON "GeneratedPrompt"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_name_key" ON "Domain"("name");

-- CreateIndex
CREATE INDEX "Domain_organizationId_idx" ON "Domain"("organizationId");

-- CreateIndex
CREATE INDEX "LeadCaptureSource_organizationId_idx" ON "LeadCaptureSource"("organizationId");

-- CreateIndex
CREATE INDEX "CapturedLead_organizationId_idx" ON "CapturedLead"("organizationId");

-- CreateIndex
CREATE INDEX "CapturedLead_sourceId_idx" ON "CapturedLead"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CapturedLead_organizationId_provider_externalId_key" ON "CapturedLead"("organizationId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "CompanyIdentityCandidate_organizationId_idx" ON "CompanyIdentityCandidate"("organizationId");

-- CreateIndex
CREATE INDEX "CompanyIdentityCandidate_capturedLeadId_idx" ON "CompanyIdentityCandidate"("capturedLeadId");

-- CreateIndex
CREATE INDEX "CompanyIdentityCandidate_cnpj_idx" ON "CompanyIdentityCandidate"("cnpj");

-- CreateIndex
CREATE INDEX "CompanyIdentityCandidate_score_idx" ON "CompanyIdentityCandidate"("score");

-- CreateIndex
CREATE INDEX "CompanyIdentityAuditLog_organizationId_idx" ON "CompanyIdentityAuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "CompanyIdentityAuditLog_capturedLeadId_idx" ON "CompanyIdentityAuditLog"("capturedLeadId");

-- CreateIndex
CREATE INDEX "ProspectingFunnel_organizationId_idx" ON "ProspectingFunnel"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectingFunnel_organizationId_name_key" ON "ProspectingFunnel"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ProspectingFunnelStage_funnelId_idx" ON "ProspectingFunnelStage"("funnelId");

-- CreateIndex
CREATE INDEX "ProspectingRun_organizationId_idx" ON "ProspectingRun"("organizationId");

-- CreateIndex
CREATE INDEX "ProspectingRun_funnelId_idx" ON "ProspectingRun"("funnelId");

-- CreateIndex
CREATE INDEX "ProspectingRun_stageId_idx" ON "ProspectingRun"("stageId");

-- CreateIndex
CREATE INDEX "ProspectingRun_capturedLeadId_idx" ON "ProspectingRun"("capturedLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectingRun_funnelId_capturedLeadId_key" ON "ProspectingRun"("funnelId", "capturedLeadId");

-- CreateIndex
CREATE INDEX "LeadCaptureUsageLog_organizationId_idx" ON "LeadCaptureUsageLog"("organizationId");

-- CreateIndex
CREATE INDEX "Pipeline_organizationId_idx" ON "Pipeline"("organizationId");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_idx" ON "PipelineStage"("pipelineId");

-- CreateIndex
CREATE INDEX "Agenda_organizationId_idx" ON "Agenda"("organizationId");

-- CreateIndex
CREATE INDEX "ServiceCatalog_organizationId_idx" ON "ServiceCatalog"("organizationId");

-- CreateIndex
CREATE INDEX "Deliverable_organizationId_idx" ON "Deliverable"("organizationId");

-- CreateIndex
CREATE INDEX "Deliverable_projectId_idx" ON "Deliverable"("projectId");

-- CreateIndex
CREATE INDEX "Deliverable_clientId_idx" ON "Deliverable"("clientId");

-- CreateIndex
CREATE INDEX "Deliverable_status_idx" ON "Deliverable"("status");

-- CreateIndex
CREATE INDEX "Approval_deliverableId_idx" ON "Approval"("deliverableId");

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_organizationId_idx" ON "TimeEntry"("organizationId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "TimeEntry_date_idx" ON "TimeEntry"("date");

-- CreateIndex
CREATE INDEX "KnowledgeBase_organizationId_idx" ON "KnowledgeBase"("organizationId");

-- CreateIndex
CREATE INDEX "KnowledgeBase_category_idx" ON "KnowledgeBase"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ClientHealthScore_clientId_key" ON "ClientHealthScore"("clientId");

-- CreateIndex
CREATE INDEX "ClientHealthScore_organizationId_idx" ON "ClientHealthScore"("organizationId");

-- CreateIndex
CREATE INDEX "ClientHealthScore_score_idx" ON "ClientHealthScore"("score");

-- CreateIndex
CREATE INDEX "ClientHealthScore_riskLevel_idx" ON "ClientHealthScore"("riskLevel");

-- CreateIndex
CREATE INDEX "Inbox_organizationId_idx" ON "Inbox"("organizationId");

-- CreateIndex
CREATE INDEX "Conversation_inboxId_idx" ON "Conversation"("inboxId");

-- CreateIndex
CREATE INDEX "Conversation_channelId_idx" ON "Conversation"("channelId");

-- CreateIndex
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "ProspectingDecisionMaker_organizationId_idx" ON "ProspectingDecisionMaker"("organizationId");

-- CreateIndex
CREATE INDEX "ProspectingDecisionMaker_capturedLeadId_idx" ON "ProspectingDecisionMaker"("capturedLeadId");

-- CreateIndex
CREATE INDEX "ProspectingDecisionMaker_confidenceScore_idx" ON "ProspectingDecisionMaker"("confidenceScore");

-- CreateIndex
CREATE INDEX "ProspectingDispatchAttempt_organizationId_idx" ON "ProspectingDispatchAttempt"("organizationId");

-- CreateIndex
CREATE INDEX "ProspectingDispatchAttempt_runId_idx" ON "ProspectingDispatchAttempt"("runId");

-- CreateIndex
CREATE INDEX "ProspectingDispatchAttempt_capturedLeadId_idx" ON "ProspectingDispatchAttempt"("capturedLeadId");

-- CreateIndex
CREATE INDEX "ProspectingDispatchAttempt_status_idx" ON "ProspectingDispatchAttempt"("status");

-- CreateIndex
CREATE INDEX "ProspectingDispatchAttempt_createdAt_idx" ON "ProspectingDispatchAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "ProspectingOptOutContact_organizationId_idx" ON "ProspectingOptOutContact"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectingOptOutContact_organizationId_phone_key" ON "ProspectingOptOutContact"("organizationId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappContactIdentity_conversationId_key" ON "WhatsappContactIdentity"("conversationId");

-- CreateIndex
CREATE INDEX "WhatsappContactIdentity_organizationId_idx" ON "WhatsappContactIdentity"("organizationId");

-- CreateIndex
CREATE INDEX "WhatsappContactIdentity_phone_idx" ON "WhatsappContactIdentity"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappContactIdentity_organizationId_jid_key" ON "WhatsappContactIdentity"("organizationId", "jid");

-- CreateIndex
CREATE INDEX "WhatsappGroupParticipant_organizationId_idx" ON "WhatsappGroupParticipant"("organizationId");

-- CreateIndex
CREATE INDEX "WhatsappGroupParticipant_conversationId_idx" ON "WhatsappGroupParticipant"("conversationId");

-- CreateIndex
CREATE INDEX "WhatsappGroupParticipant_phone_idx" ON "WhatsappGroupParticipant"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappGroupParticipant_organizationId_groupJid_jid_key" ON "WhatsappGroupParticipant"("organizationId", "groupJid", "jid");

-- CreateIndex
CREATE INDEX "WhatsappMention_organizationId_idx" ON "WhatsappMention"("organizationId");

-- CreateIndex
CREATE INDEX "WhatsappMention_messageId_idx" ON "WhatsappMention"("messageId");

-- CreateIndex
CREATE INDEX "WhatsappMention_phone_idx" ON "WhatsappMention"("phone");

-- CreateIndex
CREATE INDEX "WhatsappConnectionLog_organizationId_idx" ON "WhatsappConnectionLog"("organizationId");

-- CreateIndex
CREATE INDEX "WhatsappConnectionLog_channelId_idx" ON "WhatsappConnectionLog"("channelId");

-- CreateIndex
CREATE INDEX "WhatsappConnectionLog_event_idx" ON "WhatsappConnectionLog"("event");

-- CreateIndex
CREATE INDEX "WhatsappWebhookLog_organizationId_idx" ON "WhatsappWebhookLog"("organizationId");

-- CreateIndex
CREATE INDEX "WhatsappWebhookLog_channelId_idx" ON "WhatsappWebhookLog"("channelId");

-- CreateIndex
CREATE INDEX "WhatsappWebhookLog_eventType_idx" ON "WhatsappWebhookLog"("eventType");

-- CreateIndex
CREATE INDEX "WhatsappWebhookLog_status_idx" ON "WhatsappWebhookLog"("status");

-- CreateIndex
CREATE INDEX "WhatsAppCall_organizationId_idx" ON "WhatsAppCall"("organizationId");

-- CreateIndex
CREATE INDEX "WhatsAppCall_channelId_idx" ON "WhatsAppCall"("channelId");

-- CreateIndex
CREATE INDEX "WhatsAppCall_conversationId_idx" ON "WhatsAppCall"("conversationId");

-- CreateIndex
CREATE INDEX "WhatsAppCall_leadId_idx" ON "WhatsAppCall"("leadId");

-- CreateIndex
CREATE INDEX "WhatsAppCall_state_idx" ON "WhatsAppCall"("state");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "AccountVerification_userId_channel_idx" ON "AccountVerification"("userId", "channel");

-- CreateIndex
CREATE INDEX "AccountVerification_expiresAt_idx" ON "AccountVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "AccountVerification_consumedAt_idx" ON "AccountVerification"("consumedAt");

-- CreateIndex
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");

-- CreateIndex
CREATE INDEX "Activity_contactId_idx" ON "Activity"("contactId");

-- CreateIndex
CREATE INDEX "Activity_companyId_idx" ON "Activity"("companyId");

-- CreateIndex
CREATE INDEX "Activity_dealId_idx" ON "Activity"("dealId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "DealStageHistory_dealId_idx" ON "DealStageHistory"("dealId");

-- CreateIndex
CREATE INDEX "DealStageHistory_toStageId_idx" ON "DealStageHistory"("toStageId");

-- CreateIndex
CREATE INDEX "Note_organizationId_idx" ON "Note"("organizationId");

-- CreateIndex
CREATE INDEX "Note_contactId_idx" ON "Note"("contactId");

-- CreateIndex
CREATE INDEX "Note_companyId_idx" ON "Note"("companyId");

-- CreateIndex
CREATE INDEX "Note_dealId_idx" ON "Note"("dealId");

-- CreateIndex
CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_organizationId_name_key" ON "Tag"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Taggable_taggableId_taggableType_idx" ON "Taggable"("taggableId", "taggableType");

-- CreateIndex
CREATE UNIQUE INDEX "Taggable_tagId_taggableId_taggableType_key" ON "Taggable"("tagId", "taggableId", "taggableType");

-- CreateIndex
CREATE INDEX "Webhook_organizationId_idx" ON "Webhook"("organizationId");

-- CreateIndex
CREATE INDEX "WebhookEvent_webhookId_idx" ON "WebhookEvent"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookEvent_event_idx" ON "WebhookEvent"("event");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "UsageEvent_organizationId_idx" ON "UsageEvent"("organizationId");

-- CreateIndex
CREATE INDEX "UsageEvent_feature_idx" ON "UsageEvent"("feature");

-- CreateIndex
CREATE INDEX "ProspectMission_organizationId_idx" ON "ProspectMission"("organizationId");

-- CreateIndex
CREATE INDEX "ProspectLead_missionId_idx" ON "ProspectLead"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectBlockedContact_organizationId_phone_key" ON "ProspectBlockedContact"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "ProspectLearningMetric_organizationId_idx" ON "ProspectLearningMetric"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingResponse_organizationId_key" ON "OnboardingResponse"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTemplate_slug_key" ON "BusinessTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceBlueprint_slug_key" ON "ExperienceBlueprint"("slug");

-- CreateIndex
CREATE INDEX "ExperienceBlueprint_vertical_idx" ON "ExperienceBlueprint"("vertical");

-- CreateIndex
CREATE INDEX "ExperienceBlueprint_isActive_idx" ON "ExperienceBlueprint"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationExperience_organizationId_key" ON "OrganizationExperience"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationExperience_vertical_idx" ON "OrganizationExperience"("vertical");

-- CreateIndex
CREATE INDEX "OrganizationExperience_status_idx" ON "OrganizationExperience"("status");

-- CreateIndex
CREATE INDEX "OrganizationModule_organizationId_idx" ON "OrganizationModule"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationModule_moduleKey_idx" ON "OrganizationModule"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationModule_organizationId_moduleKey_key" ON "OrganizationModule"("organizationId", "moduleKey");

-- CreateIndex
CREATE INDEX "ProvisioningRun_organizationId_idx" ON "ProvisioningRun"("organizationId");

-- CreateIndex
CREATE INDEX "ProvisioningRun_status_idx" ON "ProvisioningRun"("status");

-- CreateIndex
CREATE INDEX "CustomField_organizationId_idx" ON "CustomField"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_organizationId_key_model_key" ON "CustomField"("organizationId", "key", "model");

-- CreateIndex
CREATE INDEX "CustomFieldValue_recordId_idx" ON "CustomFieldValue"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_fieldId_recordId_key" ON "CustomFieldValue"("fieldId", "recordId");

-- CreateIndex
CREATE INDEX "LostReason_organizationId_idx" ON "LostReason"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LostReason_organizationId_name_key" ON "LostReason"("organizationId", "name");

-- CreateIndex
CREATE INDEX "WonReason_organizationId_idx" ON "WonReason"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WonReason_organizationId_name_key" ON "WonReason"("organizationId", "name");

-- CreateIndex
CREATE INDEX "NpsSurvey_organizationId_idx" ON "NpsSurvey"("organizationId");

-- CreateIndex
CREATE INDEX "NpsSurvey_clientId_idx" ON "NpsSurvey"("clientId");

-- CreateIndex
CREATE INDEX "RenewalOpportunity_organizationId_idx" ON "RenewalOpportunity"("organizationId");

-- CreateIndex
CREATE INDEX "RenewalOpportunity_clientId_idx" ON "RenewalOpportunity"("clientId");

-- CreateIndex
CREATE INDEX "AiLog_organizationId_idx" ON "AiLog"("organizationId");

-- CreateIndex
CREATE INDEX "AiLog_agentType_idx" ON "AiLog"("agentType");

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_modelId_key" ON "AiModel"("modelId");

-- CreateIndex
CREATE INDEX "AiModel_provider_idx" ON "AiModel"("provider");

-- CreateIndex
CREATE INDEX "AiModel_runtime_idx" ON "AiModel"("runtime");

-- CreateIndex
CREATE INDEX "AiModel_status_idx" ON "AiModel"("status");

-- CreateIndex
CREATE INDEX "AiAgent_organizationId_idx" ON "AiAgent"("organizationId");

-- CreateIndex
CREATE INDEX "AiAgent_status_idx" ON "AiAgent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AiAgent_organizationId_key_key" ON "AiAgent"("organizationId", "key");

-- CreateIndex
CREATE INDEX "AiEntitlement_organizationId_idx" ON "AiEntitlement"("organizationId");

-- CreateIndex
CREATE INDEX "AiEntitlement_clientId_idx" ON "AiEntitlement"("clientId");

-- CreateIndex
CREATE INDEX "AiEntitlement_agentId_idx" ON "AiEntitlement"("agentId");

-- CreateIndex
CREATE INDEX "AiEntitlement_modelId_idx" ON "AiEntitlement"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsageLedger_requestId_key" ON "AiUsageLedger"("requestId");

-- CreateIndex
CREATE INDEX "AiUsageLedger_organizationId_idx" ON "AiUsageLedger"("organizationId");

-- CreateIndex
CREATE INDEX "AiUsageLedger_clientId_idx" ON "AiUsageLedger"("clientId");

-- CreateIndex
CREATE INDEX "AiUsageLedger_agentKey_idx" ON "AiUsageLedger"("agentKey");

-- CreateIndex
CREATE INDEX "AiUsageLedger_modelName_idx" ON "AiUsageLedger"("modelName");

-- CreateIndex
CREATE INDEX "AiUsageLedger_createdAt_idx" ON "AiUsageLedger"("createdAt");

-- CreateIndex
CREATE INDEX "AiQuotaWindow_organizationId_idx" ON "AiQuotaWindow"("organizationId");

-- CreateIndex
CREATE INDEX "AiQuotaWindow_windowType_windowStart_idx" ON "AiQuotaWindow"("windowType", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "AiQuotaWindow_organizationId_clientId_agentKey_modelName_wi_key" ON "AiQuotaWindow"("organizationId", "clientId", "agentKey", "modelName", "windowType", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectValidation_leadId_key" ON "ProspectValidation"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectDossier_leadId_key" ON "ProspectDossier"("leadId");

-- CreateIndex
CREATE INDEX "ProspectOutreachMessage_leadId_idx" ON "ProspectOutreachMessage"("leadId");

-- CreateIndex
CREATE INDEX "ProspectOutreachMessage_missionId_idx" ON "ProspectOutreachMessage"("missionId");

-- CreateIndex
CREATE INDEX "ProspectConversation_leadId_idx" ON "ProspectConversation"("leadId");

-- CreateIndex
CREATE INDEX "ProspectConversation_missionId_idx" ON "ProspectConversation"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectAppointment_leadId_key" ON "ProspectAppointment"("leadId");

-- CreateIndex
CREATE INDEX "ProspectAppointment_missionId_idx" ON "ProspectAppointment"("missionId");

-- CreateIndex
CREATE INDEX "ProposalTemplate_organizationId_idx" ON "ProposalTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "OnboardingGeneratedItem_organizationId_idx" ON "OnboardingGeneratedItem"("organizationId");

-- CreateIndex
CREATE INDEX "OnboardingGeneratedItem_type_idx" ON "OnboardingGeneratedItem"("type");

-- CreateIndex
CREATE INDEX "AutomationLog_organizationId_idx" ON "AutomationLog"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationLog_event_idx" ON "AutomationLog"("event");

-- CreateIndex
CREATE INDEX "AutomationLog_resourceType_resourceId_idx" ON "AutomationLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "QuickReply_organizationId_idx" ON "QuickReply"("organizationId");

-- CreateIndex
CREATE INDEX "QuickReply_category_idx" ON "QuickReply"("category");

-- CreateIndex
CREATE UNIQUE INDEX "InboxSla_inboxId_key" ON "InboxSla"("inboxId");

-- CreateIndex
CREATE INDEX "ProposalStatusHistory_proposalId_idx" ON "ProposalStatusHistory"("proposalId");

-- CreateIndex
CREATE INDEX "ProspectAgentLog_missionId_idx" ON "ProspectAgentLog"("missionId");

-- CreateIndex
CREATE INDEX "ProspectAgentLog_leadId_idx" ON "ProspectAgentLog"("leadId");

-- CreateIndex
CREATE INDEX "AcpAccess_organizationId_idx" ON "AcpAccess"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AcpAccess_organizationId_userId_key" ON "AcpAccess"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "GoogleLocalAccess_organizationId_idx" ON "GoogleLocalAccess"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleLocalAccess_userId_idx" ON "GoogleLocalAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleLocalAccess_organizationId_userId_key" ON "GoogleLocalAccess"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "GoogleLocalProfile_organizationId_idx" ON "GoogleLocalProfile"("organizationId");

-- CreateIndex
CREATE INDEX "GoogleLocalScan_organizationId_createdAt_idx" ON "GoogleLocalScan"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "GoogleLocalScan_profileId_idx" ON "GoogleLocalScan"("profileId");

-- CreateIndex
CREATE INDEX "GoogleLocalGridPoint_scanId_idx" ON "GoogleLocalGridPoint"("scanId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleLocalGridPoint_scanId_rowIndex_columnIndex_key" ON "GoogleLocalGridPoint"("scanId", "rowIndex", "columnIndex");

-- CreateIndex
CREATE INDEX "AcpDiagnosis_organizationId_idx" ON "AcpDiagnosis"("organizationId");

-- CreateIndex
CREATE INDEX "AcpIcp_organizationId_idx" ON "AcpIcp"("organizationId");

-- CreateIndex
CREATE INDEX "AcpOffer_organizationId_idx" ON "AcpOffer"("organizationId");

-- CreateIndex
CREATE INDEX "AcpAgentExecution_organizationId_idx" ON "AcpAgentExecution"("organizationId");

-- CreateIndex
CREATE INDEX "AcpAgentExecution_agentId_idx" ON "AcpAgentExecution"("agentId");

-- CreateIndex
CREATE INDEX "AcpObjection_organizationId_idx" ON "AcpObjection"("organizationId");

-- CreateIndex
CREATE INDEX "AcpCompetitor_organizationId_idx" ON "AcpCompetitor"("organizationId");

-- CreateIndex
CREATE INDEX "AcpQuarterlyPlan_organizationId_idx" ON "AcpQuarterlyPlan"("organizationId");

-- CreateIndex
CREATE INDEX "AcpChurnSignal_organizationId_idx" ON "AcpChurnSignal"("organizationId");

-- CreateIndex
CREATE INDEX "AcpChurnSignal_clientId_idx" ON "AcpChurnSignal"("clientId");

-- CreateIndex
CREATE INDEX "AcpChurnSignal_severity_idx" ON "AcpChurnSignal"("severity");

-- CreateIndex
CREATE INDEX "WhitelabelSyncLog_templateId_idx" ON "WhitelabelSyncLog"("templateId");

-- CreateIndex
CREATE INDEX "WhitelabelSyncLog_organizationId_idx" ON "WhitelabelSyncLog"("organizationId");

-- CreateIndex
CREATE INDEX "WhitelabelSyncLog_status_idx" ON "WhitelabelSyncLog"("status");

-- CreateIndex
CREATE INDEX "ProfessionalExperience_organizationId_idx" ON "ProfessionalExperience"("organizationId");

-- CreateIndex
CREATE INDEX "ProfessionalExperience_userId_idx" ON "ProfessionalExperience"("userId");

-- CreateIndex
CREATE INDEX "QualificationForm_organizationId_idx" ON "QualificationForm"("organizationId");

-- CreateIndex
CREATE INDEX "QualificationForm_isActive_idx" ON "QualificationForm"("isActive");

-- CreateIndex
CREATE INDEX "QualificationSubmission_organizationId_idx" ON "QualificationSubmission"("organizationId");

-- CreateIndex
CREATE INDEX "QualificationSubmission_formId_idx" ON "QualificationSubmission"("formId");

-- CreateIndex
CREATE INDEX "QualificationSubmission_status_idx" ON "QualificationSubmission"("status");

-- CreateIndex
CREATE INDEX "QualificationSubmission_routedTo_idx" ON "QualificationSubmission"("routedTo");

-- CreateIndex
CREATE INDEX "ContractSignature_contractId_idx" ON "ContractSignature"("contractId");

-- CreateIndex
CREATE INDEX "ContractSignature_organizationId_idx" ON "ContractSignature"("organizationId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_clientId_idx" ON "PaymentTransaction"("clientId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_contractId_idx" ON "PaymentTransaction"("contractId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_organizationId_idx" ON "PaymentTransaction"("organizationId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_externalId_idx" ON "PaymentTransaction"("externalId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "CloserChecklistItem_clientId_idx" ON "CloserChecklistItem"("clientId");

-- CreateIndex
CREATE INDEX "CloserChecklistItem_organizationId_idx" ON "CloserChecklistItem"("organizationId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyPlan" ADD CONSTRAINT "AgencyPlan_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_moduleKey_fkey" FOREIGN KEY ("moduleKey") REFERENCES "Module"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "Feature"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "Permission"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "Permission"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaaSSubscription" ADD CONSTRAINT "SaaSSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaaSSubscription" ADD CONSTRAINT "SaaSSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaaSInvoice" ADD CONSTRAINT "SaaSInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accessProfileId_fkey" FOREIGN KEY ("accessProfileId") REFERENCES "AccessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessProfile" ADD CONSTRAINT "AccessProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAIContext" ADD CONSTRAINT "ClientAIContext_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentQueueItem" ADD CONSTRAINT "AgentQueueItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentQueueItem" ADD CONSTRAINT "AgentQueueItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalItem" ADD CONSTRAINT "ProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldProduct" ADD CONSTRAINT "SoldProduct_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_soldProductId_fkey" FOREIGN KEY ("soldProductId") REFERENCES "SoldProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_soldProductId_fkey" FOREIGN KEY ("soldProductId") REFERENCES "SoldProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceStep" ADD CONSTRAINT "SequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAd" ADD CONSTRAINT "CampaignAd_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSet" ADD CONSTRAINT "AdSet_campaignAdId_fkey" FOREIGN KEY ("campaignAdId") REFERENCES "CampaignAd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "AdCreative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "AdSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomAudience" ADD CONSTRAINT "CustomAudience_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdMetricSnapshot" ADD CONSTRAINT "AdMetricSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdMetricSnapshot" ADD CONSTRAINT "AdMetricSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdMetricSnapshot" ADD CONSTRAINT "AdMetricSnapshot_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdMetricSnapshot" ADD CONSTRAINT "AdMetricSnapshot_campaignAdId_fkey" FOREIGN KEY ("campaignAdId") REFERENCES "CampaignAd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdsInsight" ADD CONSTRAINT "AdsInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdsInsight" ADD CONSTRAINT "AdsInsight_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdsInsight" ADD CONSTRAINT "AdsInsight_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdsRecommendation" ADD CONSTRAINT "AdsRecommendation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdsRecommendation" ADD CONSTRAINT "AdsRecommendation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdsRecommendation" ADD CONSTRAINT "AdsRecommendation_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdsRecommendation" ADD CONSTRAINT "AdsRecommendation_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "AdsInsight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReportShare" ADD CONSTRAINT "ClientReportShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReportShare" ADD CONSTRAINT "ClientReportShare_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "AssetFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFolder" ADD CONSTRAINT "AssetFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AssetFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFolder" ADD CONSTRAINT "AssetFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LPTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_formId_fkey" FOREIGN KEY ("formId") REFERENCES "LPForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSubmission" ADD CONSTRAINT "QuizSubmission_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSubmission" ADD CONSTRAINT "QuizSubmission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPrompt" ADD CONSTRAINT "GeneratedPrompt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPrompt" ADD CONSTRAINT "GeneratedPrompt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCaptureSource" ADD CONSTRAINT "LeadCaptureSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCaptureSource" ADD CONSTRAINT "LeadCaptureSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapturedLead" ADD CONSTRAINT "CapturedLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapturedLead" ADD CONSTRAINT "CapturedLead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadCaptureSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyIdentityCandidate" ADD CONSTRAINT "CompanyIdentityCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyIdentityCandidate" ADD CONSTRAINT "CompanyIdentityCandidate_capturedLeadId_fkey" FOREIGN KEY ("capturedLeadId") REFERENCES "CapturedLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyIdentityAuditLog" ADD CONSTRAINT "CompanyIdentityAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyIdentityAuditLog" ADD CONSTRAINT "CompanyIdentityAuditLog_capturedLeadId_fkey" FOREIGN KEY ("capturedLeadId") REFERENCES "CapturedLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingFunnel" ADD CONSTRAINT "ProspectingFunnel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingFunnelStage" ADD CONSTRAINT "ProspectingFunnelStage_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "ProspectingFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingRun" ADD CONSTRAINT "ProspectingRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingRun" ADD CONSTRAINT "ProspectingRun_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "ProspectingFunnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingRun" ADD CONSTRAINT "ProspectingRun_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProspectingFunnelStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingRun" ADD CONSTRAINT "ProspectingRun_capturedLeadId_fkey" FOREIGN KEY ("capturedLeadId") REFERENCES "CapturedLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCaptureUsageLog" ADD CONSTRAINT "LeadCaptureUsageLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCaptureUsageLog" ADD CONSTRAINT "LeadCaptureUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCaptureUsageLog" ADD CONSTRAINT "LeadCaptureUsageLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadCaptureSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalog" ADD CONSTRAINT "ServiceCatalog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientHealthScore" ADD CONSTRAINT "ClientHealthScore_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingDecisionMaker" ADD CONSTRAINT "ProspectingDecisionMaker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingDecisionMaker" ADD CONSTRAINT "ProspectingDecisionMaker_capturedLeadId_fkey" FOREIGN KEY ("capturedLeadId") REFERENCES "CapturedLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingDispatchAttempt" ADD CONSTRAINT "ProspectingDispatchAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingDispatchAttempt" ADD CONSTRAINT "ProspectingDispatchAttempt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ProspectingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingDispatchAttempt" ADD CONSTRAINT "ProspectingDispatchAttempt_capturedLeadId_fkey" FOREIGN KEY ("capturedLeadId") REFERENCES "CapturedLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingDispatchAttempt" ADD CONSTRAINT "ProspectingDispatchAttempt_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectingOptOutContact" ADD CONSTRAINT "ProspectingOptOutContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappContactIdentity" ADD CONSTRAINT "WhatsappContactIdentity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappContactIdentity" ADD CONSTRAINT "WhatsappContactIdentity_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappContactIdentity" ADD CONSTRAINT "WhatsappContactIdentity_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappGroupParticipant" ADD CONSTRAINT "WhatsappGroupParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappGroupParticipant" ADD CONSTRAINT "WhatsappGroupParticipant_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappGroupParticipant" ADD CONSTRAINT "WhatsappGroupParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMention" ADD CONSTRAINT "WhatsappMention_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMention" ADD CONSTRAINT "WhatsappMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConnectionLog" ADD CONSTRAINT "WhatsappConnectionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConnectionLog" ADD CONSTRAINT "WhatsappConnectionLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappWebhookLog" ADD CONSTRAINT "WhatsappWebhookLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountVerification" ADD CONSTRAINT "AccountVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Taggable" ADD CONSTRAINT "Taggable_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectMission" ADD CONSTRAINT "ProspectMission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectMission" ADD CONSTRAINT "ProspectMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectMission" ADD CONSTRAINT "ProspectMission_salesOwnerId_fkey" FOREIGN KEY ("salesOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectLead" ADD CONSTRAINT "ProspectLead_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "ProspectMission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingResponse" ADD CONSTRAINT "OnboardingResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationExperience" ADD CONSTRAINT "OrganizationExperience_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationExperience" ADD CONSTRAINT "OrganizationExperience_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ExperienceBlueprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationModule" ADD CONSTRAINT "OrganizationModule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvisioningRun" ADD CONSTRAINT "ProvisioningRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostReason" ADD CONSTRAINT "LostReason_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WonReason" ADD CONSTRAINT "WonReason_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpsSurvey" ADD CONSTRAINT "NpsSurvey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpsSurvey" ADD CONSTRAINT "NpsSurvey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalOpportunity" ADD CONSTRAINT "RenewalOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalOpportunity" ADD CONSTRAINT "RenewalOpportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLog" ADD CONSTRAINT "AiLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_fallbackModelId_fkey" FOREIGN KEY ("fallbackModelId") REFERENCES "AiModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEntitlement" ADD CONSTRAINT "AiEntitlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEntitlement" ADD CONSTRAINT "AiEntitlement_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEntitlement" ADD CONSTRAINT "AiEntitlement_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLedger" ADD CONSTRAINT "AiUsageLedger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLedger" ADD CONSTRAINT "AiUsageLedger_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLedger" ADD CONSTRAINT "AiUsageLedger_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQuotaWindow" ADD CONSTRAINT "AiQuotaWindow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectValidation" ADD CONSTRAINT "ProspectValidation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProspectLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectDossier" ADD CONSTRAINT "ProspectDossier_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProspectLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectOutreachMessage" ADD CONSTRAINT "ProspectOutreachMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProspectLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectOutreachMessage" ADD CONSTRAINT "ProspectOutreachMessage_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "ProspectMission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectConversation" ADD CONSTRAINT "ProspectConversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProspectLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectConversation" ADD CONSTRAINT "ProspectConversation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "ProspectMission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectAppointment" ADD CONSTRAINT "ProspectAppointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProspectLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectAppointment" ADD CONSTRAINT "ProspectAppointment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "ProspectMission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalTemplate" ADD CONSTRAINT "ProposalTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingGeneratedItem" ADD CONSTRAINT "OnboardingGeneratedItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickReply" ADD CONSTRAINT "QuickReply_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxSla" ADD CONSTRAINT "InboxSla_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalStatusHistory" ADD CONSTRAINT "ProposalStatusHistory_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectAgentLog" ADD CONSTRAINT "ProspectAgentLog_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "ProspectMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectAgentLog" ADD CONSTRAINT "ProspectAgentLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProspectLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpAccess" ADD CONSTRAINT "AcpAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalAccess" ADD CONSTRAINT "GoogleLocalAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalAccess" ADD CONSTRAINT "GoogleLocalAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalAccess" ADD CONSTRAINT "GoogleLocalAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalProfile" ADD CONSTRAINT "GoogleLocalProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalProfile" ADD CONSTRAINT "GoogleLocalProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalScan" ADD CONSTRAINT "GoogleLocalScan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalScan" ADD CONSTRAINT "GoogleLocalScan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GoogleLocalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalScan" ADD CONSTRAINT "GoogleLocalScan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleLocalGridPoint" ADD CONSTRAINT "GoogleLocalGridPoint_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "GoogleLocalScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpDiagnosis" ADD CONSTRAINT "AcpDiagnosis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpIcp" ADD CONSTRAINT "AcpIcp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpIcp" ADD CONSTRAINT "AcpIcp_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "AcpDiagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpOffer" ADD CONSTRAINT "AcpOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpOffer" ADD CONSTRAINT "AcpOffer_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "AcpDiagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpOffer" ADD CONSTRAINT "AcpOffer_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "AcpIcp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpAgentExecution" ADD CONSTRAINT "AcpAgentExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpObjection" ADD CONSTRAINT "AcpObjection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpCompetitor" ADD CONSTRAINT "AcpCompetitor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpQuarterlyPlan" ADD CONSTRAINT "AcpQuarterlyPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcpChurnSignal" ADD CONSTRAINT "AcpChurnSignal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhitelabelSyncLog" ADD CONSTRAINT "WhitelabelSyncLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhitelabelSyncTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhitelabelSyncLog" ADD CONSTRAINT "WhitelabelSyncLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalExperience" ADD CONSTRAINT "ProfessionalExperience_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalExperience" ADD CONSTRAINT "ProfessionalExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationForm" ADD CONSTRAINT "QualificationForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationSubmission" ADD CONSTRAINT "QualificationSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "QualificationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationSubmission" ADD CONSTRAINT "QualificationSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloserChecklistItem" ADD CONSTRAINT "CloserChecklistItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
