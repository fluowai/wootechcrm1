# NEXUS360 - DETAILED FILE MAPPING & SECURITY FOCUS

## ABSOLUTE PATHS TO CRITICAL FILES

### AUTHENTICATION & SECURITY CORE

**Backend Authentication**
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\middleware\auth.ts
  Purpose: JWT token generation/validation, role checking
  Lines: 151
  Functions: generateAccessToken(), generateRefreshToken(), authenticateToken(), requireRole(), requirePermission()
  
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\auth.ts
  Purpose: Login, register, refresh, logout endpoints
  Lines: 578+
  Endpoints: POST /login, /refresh, /register, /logout, GET /me
  Rate limiting: 10 attempts per 15 minutes

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\utils\security.ts
  Purpose: Password validation, cookie handling, HMAC verification
  Lines: 84
  Functions: assertStrongPassword(), setRefreshTokenCookie(), verifyHmacSignature(), sanitizeStoredHtml()

**Frontend Authentication**
- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\src\lib\api.ts
  Purpose: API client with automatic token refresh
  Lines: 246
  Features: Token refresh logic, error handling, retry mechanism

- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\src\lib\useAuth.ts
  Purpose: Auth state management hook
  Lines: 51
  Functions: useAuth() for user state, logout handling

### MULTI-TENANT ISOLATION

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\middleware\tenant.ts
  Purpose: MANDATORY tenant context resolution
  Lines: 89
  Critical: resolveTenant(), withTenant(), belongsToTenant()
  MUST-HAVE: Applied to all protected routes

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\lib\access.ts
  Purpose: Feature/subscription access control
  Lines: 74
  Functions: getTenantAccess(), feature checking, usage limit validation

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\middleware\access.ts
  Purpose: Access control middleware
  Functions: requireAccess() for feature/plan validation

### DATA PROTECTION & SANITIZATION

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\utils\sanitizer.ts
  Purpose: Input whitelisting and HTML sanitization
  Lines: 102
  Whitelist: lead, client, opportunity, task, proposal, automation, user fields

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\middleware\errorHandler.ts
  Purpose: Global error handler
  Lines: 59
  Handles: Prisma errors, validation, generic fallback

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\utils\auditLogger.ts
  Purpose: Activity logging
  Functions: logAudit(), getClientIp(), getClientUA()

---

## DATABASE & SCHEMA

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\prisma\schema.prisma
  Size: 2,947 lines
  Models: 150+
  Key: User, Organization, Lead, Client, Opportunity, Plan, Role, Permission, etc.
  
Critical Models:
  * User (405-455): Password field, role, organization association
  * Organization (36-157): Tenant container, plan, API keys
  * Lead (474+): Contact data, scoring
  * AccessProfile (457-472): RBAC for users
  * AuditLog (316-331): Activity tracking
  * Opportunity, Client, Task: CRM data models

---

## API ROUTES (286+ ENDPOINTS)

### Group 1: AUTHENTICATION (5 routes)
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\auth.ts
- POST   /login        ? Rate limited (10/15min)
- POST   /register
- POST   /refresh      ? Token renewal
- POST   /logout       ? Session clear
- GET    /me           ? Current user info

### Group 2: ADMIN SYSTEM (11+ routes)
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\admin.ts
- GET    /metrics      ? System statistics
- GET    /dashboard    ? Admin dashboard
- GET    /orgs         ? List all organizations
- POST   /orgs         ? Create organization
- PATCH  /orgs/:id     ? Update organization
- DELETE /orgs/:id     ? Delete organization
- GET    /users        ? List all users
- PATCH  /users/:id    ? Update user
- DELETE /users/:id    ? Deactivate user
- POST   /domains      ? Domain management
  
**CRITICAL**: All require SUPER_ADMIN role

### Group 3: CRM (20+ routes)
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\crm.ts
- GET    /pipelines
- GET    /opportunities
- POST   /opportunities
- PATCH  /opportunities/:id
- POST   /opportunities/:id/win
- POST   /opportunities/:id/lose
- DELETE /opportunities/:id
- GET    /leads
- POST   /leads
- PATCH  /leads/:id
- GET    /leads/:id

### Group 4: LEAD CAPTURE (15+ routes)
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\leadCapture.ts
- POST   /search                      ? External API calls
- GET    /leads                       ? Access control: canViewCapturedLeads
- GET    /leads/:id
- POST   /leads/:id/analyze           ? AI analysis
- POST   /leads/:id/dossier           ? Company research
- POST   /leads/:id/enrich            ? Data enrichment
- POST   /leads/:id/validate-company  ? CNPJ validation
- GET    /leads/:id/decision-makers   ? Contact extraction
- POST   /leads/:id/send-to-crm       ? Import to CRM

### Group 5: WHATSAPP INTEGRATION (20+ routes)
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\whatsapp.ts (1000+ lines)
- GET    /connections         ? List connections
- POST   /connections         ? Create connection
- PATCH  /connections/:id     ? Update
- POST   /connections/:id/connect
- POST   /connections/:id/disconnect
- DELETE /connections/:id
- GET    /conversations
- GET    /conversations/:id/messages
- POST   /conversations/:id/messages
- POST   /prospecting/dispatch        ? Send campaign
- GET    /prospecting/opt-outs
- POST   /prospecting/opt-outs        ? Blacklist
- POST   /events                      ? Webhook receiver (HMAC validation)

### Group 6: PROSPECTING (8+ routes)
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\prospectingFunnels.ts
- GET    /funnels
- POST   /funnels
- POST   /funnels/default
- GET    /runs
- POST   /campaigns/prepare
- POST   /runs/:id/response
- POST   /funnels/:id/enroll
- GET    /agents

### Group 7: ORGANIZATIONAL SETTINGS (15+ routes)
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\orgSettings.ts
- GET    /profile
- PATCH  /profile
- GET    /settings
- PATCH  /settings
- GET    /team
- POST   /team
- PATCH  /team/:id
- DELETE /team/:id
- GET    /templates
- POST   /templates
- PATCH  /templates/:id
- DELETE /templates/:id

### Group 8: OTHER MODULES (200+ more routes)
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\routes\
- ai.ts               ? Transcription, feedback generation
- marketing.ts        ? Campaigns, landing pages
- automation.ts       ? Workflow triggers
- billing.ts          ? Subscription management
- calendar.ts         ? Events
- clients.ts          ? Client database
- domains.ts          ? Custom domain management
- finance.ts          ? Financial data
- healthScore.ts      ? Client health metrics
- proposals.ts        ? Proposal generation
- tasks.ts            ? Activity tracking
- team.ts             ? User management
- [and 25+ more...]

---

## SERVICES & BUSINESS LOGIC

### Lead Capture & AI
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\modules\lead-capture\lead-capture.service.ts (320 lines)
  Process: Search ? Normalize ? Filter ? Deduplicate ? Score ? Save
  Providers: Serper, SerpAPI, OutScraper

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\modules\lead-capture\lead-ai.service.ts (882 lines)
  AI Agents: Dossier, Filter, LeadExtractor, LeadValidator, MissionScheduler
  Risk: Prompt injection via unescaped user data

### Prospect Services
C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\services\prospect\
- DossierAgent.ts      (3,263 lines) - Company research
- FilterAgent.ts       (2,529 lines) - Lead scoring
- LeadExtractorAgent.ts (3,523 lines) - Contact mining
- LeadValidatorAgent.ts (3,417 lines) - Company validation
- MissionScheduler.ts  (10,354 lines) - Campaign execution

### Other Services
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\services\prospectingAutomation.ts (11,435 lines)
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\services\whatsappIntelligence.ts (9,917 lines)
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\services\onboardingAI.ts (14,375 lines)

### Worker Threads
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\workers\automationWorker.ts (10,848 lines)
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\src\workers\followUpWorker.ts (1,848 lines)

---

## FRONTEND COMPONENTS

### Authentication & Access Control
- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\src\lib\access.ts (99 lines)
  Functions: useAccess() hook for module/feature checking

- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\src\lib\useAuth.ts (51 lines)
  Hook for user state management

### Pages
- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\src\pages\
  Admin Pages (15 files):
    - admin/Agencies.tsx
    - admin/Plans.tsx
    - admin/SystemTeam.tsx
    - admin/Billing.tsx
    - admin/Domains.tsx
    - admin/WhiteLabel.tsx
    - admin/Monitor.tsx
    - admin/Analytics.tsx
    
  User Pages (50+ files):
    - CRM.tsx              ? Opportunity management
    - WhatsApp.tsx         ? Chat interface
    - LeadCapture.tsx      ? Lead sourcing
    - Proposals.tsx        ? Proposal management
    - Automation.tsx       ? Workflow builder
    - etc.

### Components
- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\src\components\
  CRM Components:
    - crm/LeadDetailModal.tsx
    - crm/OpportunityDetail.tsx
    - crm/PipelineKanban.tsx
    - crm/WinLeadModal.tsx

---

## CONFIGURATION & DEPLOYMENT

### Environment
- C:\Users\paulo\Vibecoding\Ativos\nexus360\.env.example (73 lines)
  Variables: API keys, database, JWT secret, WhatsApp bridge, etc.

- C:\Users\paulo\Vibecoding\Ativos\nexus360\.env.portainer.example
  Portainer-specific configuration

### Docker
- C:\Users\paulo\Vibecoding\Ativos\nexus360\docker-compose.yml
  Services: backend (10000), frontend (8080), whatsapp-bridge (8091)

- C:\Users\paulo\Vibecoding\Ativos\nexus360\docker-stack.portainer.yml
  Portainer stack definition

### TypeScript
- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\tsconfig.json
- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\tsconfig.json
- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\tsconfig.node.json

### Build
- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\vite.config.ts
  Vite configuration for React build

- C:\Users\paulo\Vibecoding\Ativos\nexus360\backend\package.json
  Scripts: dev, build, start, seed

- C:\Users\paulo\Vibecoding\Ativos\nexus360\frontend\package.json
  Scripts: dev, build, preview

---

## WHATSAPP BRIDGE (Go Service)

- C:\Users\paulo\Vibecoding\Ativos\nexus360\whatsapp-bridge\main.go (23,293 bytes)
  Purpose: WhatsApp connection handler
  Language: Go
  Dependencies: go.mod, go.sum

---

## SECURITY HOTSPOTS (BY FILE)

### ?? CRITICAL
1. backend/src/middleware/tenant.ts
   - Verify ALL routes use it
   - Check for route bypasses

2. backend/src/routes/admin.ts
   - Admin operations require SUPER_ADMIN
   - Verify role checks

3. backend/src/modules/lead-capture/lead-ai.service.ts
   - Prompt injection via user data
   - No escaping/sanitization

4. backend/src/routes/auth.ts
   - Password validation rules
   - Token generation security

### ?? HIGH
1. backend/src/routes/whatsapp.ts
   - Webhook signature validation
   - Message injection potential

2. backend/src/utils/security.ts
   - Password strength enforcement
   - HMAC validation timing

3. backend/src/utils/sanitizer.ts
   - HTML sanitization (regex-based)
   - Whitelist coverage

4. backend/src/routes/leadCapture.ts
   - External API calls
   - Rate limiting

### ?? MEDIUM
1. backend/src/middleware/errorHandler.ts
   - Error message leakage
   - Stack traces in production

2. backend/src/lib/access.ts
   - Feature flag enforcement
   - Subscription validation

3. backend/src/server.ts
   - CORS configuration
   - Rate limiting settings

4. backend/prisma/schema.prisma
   - Database constraints
   - Index coverage for security

---

## QUICK FILE SIZE REFERENCE

| File | Size (KB) | Type | Complexity |
|------|-----------|------|-----------|
| schema.prisma | 87.4 | Database | Very High |
| server.ts | 15.8 | Main | High |
| whatsapp.ts | 42+ | Routes | Very High |
| prospectingFunnels.ts | 32 | Routes | High |
| lead-ai.service.ts | 35.2 | Service | Very High |
| admin.ts | 15.7 | Routes | High |
| auth.ts | 17.3 | Routes | Medium |
| crm.ts | 33.1 | Routes | High |
| App.tsx (frontend) | 17.4 | Component | Very High |

---

## TESTING COMMANDS

### Start services
docker-compose up -d

### View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f whatsapp-bridge

### Database operations
npx prisma db push
npx prisma db seed
npx prisma studio

### Build backend
npm run build --prefix backend

### Build frontend  
npm run build --prefix frontend

---

Generated: 2026-06-05 19:57:46
For detailed security analysis, see: ARCHITECTURE_AND_SECURITY_ANALYSIS.md
For quick reference, see: SECURITY_QUICK_REFERENCE.md
