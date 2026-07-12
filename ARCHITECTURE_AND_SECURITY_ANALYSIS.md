# NEXUS360 CODEBASE ARCHITECTURE & SECURITY ANALYSIS
# Comprehensive Overview - Generated 2026-06-05 19:56:34

## EXECUTIVE SUMMARY

Nexus360 is a sophisticated enterprise SaaS platform built with:
- Backend: Node.js/Express + Prisma ORM + PostgreSQL
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Multi-tenant architecture with agency/organization hierarchies
- AI integration (Groq, Gemini APIs)
- WhatsApp bridge integration (Go-based microservice)
- ComplexAPI with 40+ route modules

Total Route Handlers: 286+ endpoints
Major modules: 40+ route files

---

## 1. DIRECTORY STRUCTURE & ORGANIZATION

### Root Level
C:\Users\paulo\Vibecoding\Ativos\nexus360\
+-- backend/               # Node.js/Express API server
+-- frontend/              # React SPA application
+-- whatsapp-bridge/       # Go microservice for WhatsApp integration
+-- docs/                  # Documentation
+-- scratch/               # Temporary/experimental files
+-- docker-compose.yml     # Full stack orchestration
+-- .env.example           # Configuration template
+-- .env.portainer.example # Portainer-specific config
+-- package.json           # Root monorepo configuration
+-- [test files]

### Backend Structure
backend/
+-- src/
¦   +-- server.ts                 # Express app entry point (395 lines)
¦   +-- controllers/              # Route handlers
¦   ¦   +-- prospectController.ts
¦   +-- middleware/               # Auth, error handling, tenant
¦   ¦   +-- auth.ts              # JWT authentication (151 lines)
¦   ¦   +-- tenant.ts            # Multi-tenant isolation (89 lines)
¦   ¦   +-- access.ts            # Feature/subscription access control
¦   ¦   +-- errorHandler.ts
¦   +-- routes/                   # API endpoints (40+ files)
¦   ¦   +-- admin.ts             # Super admin operations
¦   ¦   +-- auth.ts              # Login, register, refresh (578 lines)
¦   ¦   +-- crm.ts               # CRM opportunities/leads (736 lines)
¦   ¦   +-- leadCapture.ts       # Lead sourcing (400+ lines)
¦   ¦   +-- whatsapp.ts          # WhatsApp integration (1000+ lines)
¦   ¦   +-- prospectingFunnels.ts # Prospecting automation
¦   ¦   +-- onboarding.ts        # Onboarding wizard
¦   ¦   +-- marketing.ts         # Marketing campaigns
¦   ¦   +-- automation.ts        # Workflow automation
¦   ¦   +-- [35+ more routes]
¦   +-- services/                # Business logic
¦   ¦   +-- prospect/            # AI prospecting agents
¦   ¦   +-- lead-capture/        # Lead capture service
¦   ¦   +-- prospectingAutomation.ts
¦   ¦   +-- whatsappIntelligence.ts
¦   ¦   +-- onboardingAI.ts
¦   ¦   +-- [more services]
¦   +-- lib/
¦   ¦   +-- prisma.ts           # Prisma client singleton
¦   ¦   +-- access.ts           # Access control logic (74 lines)
¦   +-- utils/
¦   ¦   +-- security.ts         # Password validation, cookies (84 lines)
¦   ¦   +-- sanitizer.ts        # Input sanitization (102 lines)
¦   ¦   +-- auditLogger.ts      # Activity logging
¦   ¦   +-- aiKeys.ts           # AI API key management
¦   ¦   +-- [5+ utilities]
¦   +-- middleware/              # Auth & error handling
¦   +-- workers/                 # Background jobs
¦       +-- automationWorker.ts
¦       +-- followUpWorker.ts
+-- prisma/
¦   +-- schema.prisma           # Database schema (2,947 lines!)
¦   +-- seed.js                 # Seed data
¦   +-- [seed variations]
+-- dist/                       # Compiled output

### Frontend Structure
frontend/
+-- src/
¦   +-- App.tsx                 # Main app router (17,359 lines)
¦   +-- types.ts                # TypeScript definitions (14,476 lines)
¦   +-- main.tsx                # Entry point
¦   +-- index.css               # Global styles
¦   +-- lib/
¦   ¦   +-- api.ts              # API client with token refresh (246 lines)
¦   ¦   +-- useAuth.ts          # Auth hook (51 lines)
¦   ¦   +-- access.ts           # Permission checking (99 lines)
¦   ¦   +-- useWhitelabel.ts    # White label config
¦   ¦   +-- agentsConfig.ts     # AI agent configuration
¦   ¦   +-- [utilities]
¦   +-- components/
¦   ¦   +-- crm/                # CRM UI components
¦   ¦   +-- sidebar/            # Navigation
¦   ¦   +-- ErrorBoundary.tsx
¦   ¦   +-- [other components]
¦   +-- pages/
¦       +-- admin/              # Super admin pages (15 files)
¦       +-- prospect/           # Prospecting pages
¦       +-- prospecting/        # Prospecting UI
¦       +-- LandingTemplates/   # Landing page editor
¦       +-- [60+ page components]
+-- dist/                       # Build output

### WhatsApp Bridge (Go)
whatsapp-bridge/
+-- main.go                     # WhatsApp integration service
+-- Dockerfile
+-- go.mod / go.sum            # Go dependencies
+-- [logic files]

---

## 2. AUTHENTICATION & AUTHORIZATION MECHANISMS

### JWT Implementation
File: backend/src/middleware/auth.ts (151 lines)

**Access Token:**
- Duration: 15 minutes
- Storage: sessionStorage (frontend) + Bearer header
- Algorithm: HS256 (HMAC with SHA-256)
- Key: process.env.JWT_SECRET (256-bit recommended)

**Refresh Token:**
- Duration: 30 days
- Storage: HttpOnly cookie (production) + body fallback
- Key: JWT_SECRET + "_refresh" suffix
- Cookie: SameSite=None; Secure (production) / SameSite=Lax (dev)

### Token Flow
1. Login: POST /api/auth/login
   - Hash password with bcryptjs
   - Generate access + refresh tokens
   - Set refresh token in HttpOnly cookie

2. Token Refresh: POST /api/auth/refresh
   - Validate refresh token from cookie or body
   - Generate new access token
   - Return in response body

3. Protected Routes
   - Extract "Bearer {token}" from Authorization header
   - Verify JWT signature with JWT_SECRET
   - Inject user object into request

### Role-Based Access Control (RBAC)
File: backend/src/middleware/auth.ts

Roles:
- SUPER_ADMIN: Full platform access + org impersonation
- AGENCY_ADMIN: Agency-level management
- ORG_ADMIN: Organization administrator
- USER: Regular user with scoped permissions

Permission Structure:
- Resource-based: { "leads": ["view", "edit", "delete"], "crm": "*" }
- Action-based: "leads.create", "finance.view"
- Stored in: User.permissions (JSON) or AccessProfile

### Multi-Tenant Isolation
File: backend/src/middleware/tenant.ts (89 lines)

Key Mechanism:
`	ypescript
export const resolveTenant = (req, res, next) => {
  let orgId = user.orgId;

  // Super Admin can impersonate via X-Org-Id header
  if (user.role === 'SUPER_ADMIN' && impersonatedOrgId) {
    orgId = impersonatedOrgId;
  }

  if (!orgId) return 403 TENANT_MISSING;

  // Inject tenant filter into request
  req.tenantFilter = { organizationId: orgId };
  next();
};
`

Enforcement:
- MANDATORY for all protected routes
- Blocks requests without orgId
- withTenant() utility appends organizationId to all queries

---

## 3. DATABASE SCHEMA & MODELS

File: backend/prisma/schema.prisma (2,947 lines)

### Core Models
1. **Organization** - Tenant/Client
   - Multi-agency support
   - Plan + subscription tracking
   - White-label configuration
   - Feature flag storage

2. **User** - Team members
   - Email/password auth
   - Role + permissions
   - Workspace + organization relationship
   - Audit trail

3. **Lead** - Prospect data
   - Contact info + history
   - Status tracking (novo, qualificado, etc.)
   - Temperature + score
   - AI diagnosis field

4. **Client** - Converted leads
   - Corporate info (CNPJ, tradeName)
   - Contact details
   - Relationship tracking

5. **Opportunity** - Sales deals
   - Pipeline stage tracking
   - Probability + value
   - Customer relationship
   - Proposal links

6. **CRM Models**
   - Pipeline: Sales funnels
   - Stage: Pipeline stages
   - Task: Activities
   - Project: Engagement management
   - Contract: Legal documents

7. **Marketing Models**
   - Campaign: Marketing initiatives
   - Automation: Workflow rules
   - LandingPage: Public pages
   - Asset: Media storage
   - Quiz: Interactive content

8. **WhatsApp Models**
   - WhatsappContactIdentity
   - WhatsappGroupParticipant
   - WhatsappMention
   - WhatsappConnectionLog
   - WhatsappWebhookLog

9. **Lead Capture Models**
   - CapturedLead: Imported leads
   - LeadCaptureSource: Search source
   - LeadCaptureUsageLog: API usage tracking
   - CompanyIdentityCandidate: CNPJ validation

10. **Planning & Execution**
    - ProspectingFunnel: Campaign templates
    - ProspectingRun: Campaign executions
    - ProspectingDecisionMaker: Contact extraction
    - ProspectingDispatchAttempt: Message sends

### Data Relationships
- Organization ? Users (1:N)
- Organization ? Leads (1:N)
- Organization ? Opportunities (1:N)
- Lead ? Opportunity (1:N)
- Client ? Opportunity (1:N)
- Opportunity ? Pipeline/Stage (N:1)
- User ? Task (1:N assigned)

### Critical Indexes
- Lead.organizationId (tenant isolation)
- User.email (unique)
- Opportunity.organizationId (query performance)
- Proposal.slug (public access)

---

## 4. API ENDPOINTS & ROUTES

Total: 286+ handlers across 40+ route files

### Authentication Routes (/api/auth)
POST   /login              - User authentication
POST   /register           - New user signup
POST   /refresh            - Token refresh
POST   /logout             - Session termination
GET    /me                 - Current user info

Rate limiting: 10 attempts/15 min for login

### CRM Routes (/api/crm)
GET    /pipelines          - List sales funnels
GET    /opportunities      - List deals
POST   /opportunities      - Create deal
PATCH  /opportunities/:id  - Update deal
POST   /opportunities/:id/win  - Mark as won
POST   /opportunities/:id/lose - Mark as lost
GET    /leads              - List leads
POST   /leads              - Create lead
PATCH  /leads/:id          - Update lead

### Lead Capture Routes (/api/lead-capture)
POST   /search             - Search for leads via Serper/SerpAPI/OutScraper
GET    /leads              - List captured leads
POST   /leads/:id/analyze  - AI analysis
POST   /leads/:id/dossier  - Company research
POST   /leads/:id/enrich   - Data enrichment
POST   /leads/:id/validate-company - CNPJ validation
GET    /leads/:id/decision-makers - Extract contacts
POST   /leads/:id/scripts  - Generate scripts
POST   /leads/:id/send-to-crm - Import to CRM

### WhatsApp Routes (/api/whatsapp)
GET    /connections        - List integrations
POST   /connections        - Create connection
PATCH  /connections/:id    - Update connection
POST   /connections/:id/connect - Activate
POST   /connections/:id/disconnect - Deactivate
GET    /conversations      - List chats
GET    /conversations/:id/messages - Get history
POST   /conversations/:id/messages - Send message
POST   /prospecting/dispatch - Send campaign
GET    /prospecting/opt-outs - Blacklist management
POST   /events             - Webhook receiver

### Admin Routes (/api/admin)
GET    /metrics            - System statistics
GET    /dashboard          - Admin dashboard
GET    /orgs               - List organizations
POST   /orgs               - Create organization
PATCH  /orgs/:id           - Update organization
DELETE /orgs/:id           - Delete organization
GET    /users              - List users
PATCH  /users/:id          - Update user
DELETE /users/:id          - Deactivate user

### Prospecting Routes (/api/prospecting-funnels)
GET    /funnels            - List templates
POST   /funnels            - Create campaign
POST   /runs               - Start execution
GET    /runs               - Track progress
POST   /runs/:id/response  - Record response
POST   /campaigns/prepare  - Prepare dispatch

### Additional Routes (30+ more)
- /api/org-settings - Organization configuration
- /api/marketing - Campaigns & content
- /api/automation - Workflow triggers
- /api/ai - AI services (transcription, feedback)
- /api/calendar - Event scheduling
- /api/billing - Subscription management
- /api/team - User management
- /api/tasks - Activity tracking
- /api/onboarding - Wizard
- [and 20+ more...]

### Security Headers (Express Server)
- Helmet.js protection
- CORS validation against registered domains
- Content Security Policy (CSP)
- X-Powered-By disabled
- XSS protection via sanitization

---

## 5. THIRD-PARTY DEPENDENCIES

### Backend Dependencies

**Authentication & Security:**
- bcryptjs: Password hashing
- jsonwebtoken: JWT generation/verification
- helmet: Security headers
- cors: Cross-origin handling
- express-rate-limit: Rate limiting

**Database & ORM:**
- @prisma/client: Database abstraction
- prisma: Migration & schema management

**AI & APIs:**
- groq-sdk: Groq API client
- axios: HTTP requests (external APIs)
- livekit-server-sdk: Video conferencing

**Utilities:**
- dotenv: Environment variable loading
- uuid: Unique ID generation
- express: Web framework
- CORS plugins: Multi-domain support

### Frontend Dependencies

**UI & Rendering:**
- react: UI library
- react-dom: DOM binding
- react-router-dom: Client-side routing

**UI Components:**
- lucide-react: Icon library
- recharts: Data visualization
- motion: Animations
- html-to-image: Image conversion
- react-markdown: Markdown rendering

**Communication:**
- livekit-client: WebRTC client
- @livekit/components-react: Video UI

**Styling:**
- tailwindcss: Utility CSS
- clsx: Class name management

**Build Tools:**
- vite: Bundler
- typescript: Type checking
- @vitejs/plugin-react: React support
- @tailwindcss/vite: Tailwind integration

---

## 6. ENVIRONMENT VARIABLES & CONFIGURATION

File: .env.example (73 lines)

### Core API Services
`
GEMINI_API_KEY=               # Google Gemini (AI)
GROQ_API_KEY=                 # Groq Whisper (transcription)
SERPER_API_KEY=               # Serper lead search
SERPAPI_API_KEY=              # SerpAPI alternative
OUTSCRAPER_API_KEY=           # OutScraper leads
MUAC_API_KEY=                 # Alternative service
`

### Application URLs
`
APP_URL=                      # Self-referential URL
FRONTEND_URL=http://localhost:8080
VITE_API_URL=http://localhost:10000
`

### Database (Backend)
`
DATABASE_URL=postgresql://postgres:password@localhost:5432/nexus360_db
DIRECT_URL=postgresql://...  # Non-pooled connection
`

### Security
`
JWT_SECRET=                   # Must be 256-bit+ in production
NODE_ENV=production|development
PORT=10000
`

### White Label / Custom Domains
`
WHITELABEL_DOCKER_IP=203.0.113.10
WHITELABEL_CNAME_TARGET=nexus360.consultio.com.br
`

### External Integrations

**LiveKit (Video conferencing):**
`
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=wss://your-server.cloud
`

**WhatsApp Bridge:**
`
WHATSAPP_BRIDGE_URL=http://localhost:8091
WHATSAPP_BRIDGE_PUBLIC_URL=
WHATSAPP_BRIDGE_SECRET=CHANGE_ME_TO_LONG_RANDOM_SECRET
NEXUS_BACKEND_URL=http://localhost:10000
`

### Docker Compose Variables
`
RUN_DB_PUSH=false|true        # Auto-migrate database
RUN_SEED=false|true           # Auto-seed data
SEED_ADMIN_EMAIL=admin@nexus360.com
SEED_ADMIN_PASSWORD=Admin@2024!
`

---

## 7. SECURITY-CRITICAL AREAS

### High Risk

1. **JWT Secret Management**
   - Location: process.env.JWT_SECRET
   - Risk: If leaked, all tokens compromised
   - Mitigation: Must be 256-bit, rotated regularly, never logged
   - Currently: Simple string concatenation for refresh suffix (risky)

2. **Multi-Tenant Isolation**
   - File: middleware/tenant.ts
   - Risk: organizationId must be enforced on EVERY query
   - Missing: Some routes might not use withTenant()
   - Need: Audit all Prisma queries

3. **API Key Exposure**
   - Risk: SERPER_API_KEY, OUTSCRAPER_API_KEY in environment
   - Location: Fetched in services/lead-capture
   - Mitigation: Keys stored per organization (org.serperApiKey)
   - Issue: Fallback to process.env = exposure risk

4. **Lead Capture External APIs**
   - File: modules/lead-capture/lead-capture.service.ts
   - Risk: Calls to SerpAPI, OutScraper, Serper
   - Potential: API injection, data leakage
   - Needs: Rate limiting, IP whitelisting

5. **AI Prompt Injection**
   - File: modules/lead-capture/lead-ai.service.ts
   - Risk: Lead data injected into prompts without sanitization
   - Attack: Jailbreak attempts via business names
   - Needs: Prompt template validation

6. **WhatsApp Integration**
   - File: routes/whatsapp.ts (1000+ lines)
   - Risk: HMAC signature validation (verifyHmacSignature)
   - Security: Webhook secret used for verification
   - Concerns: Message delivery can be spoofed if secret leaked

### Medium Risk

1. **Password Validation**
   - File: utils/security.ts
   - Rules: 10+ chars, mixed case, numbers
   - Missing: No special character requirement
   - Regex: No validation of special characters

2. **HTML Sanitization**
   - File: utils/sanitizer.ts + security.ts
   - Function: sanitizeStoredHtml()
   - Limitation: Regex-based, not library-based
   - Risk: Regex bypasses are possible

3. **Rate Limiting**
   - Global: 2000 req/15 min (very generous)
   - Auth: 10 attempts/15 min (reasonable)
   - Missing: Per-endpoint rate limits for AI calls

4. **Audit Logging**
   - File: utils/auditLogger.ts
   - Logged: User ID, action, resource, IP, user-agent
   - Missing: Failed login attempts not always logged
   - Concern: No log retention policy visible

5. **Error Messages**
   - Risk: Generic "Usuário ou senha inválidos" but
   - Pattern: User enumeration possible via timing
   - Detailed error codes in responses (may leak structure)

### Medium-Low Risk

1. **CORS Configuration**
   - server.ts (lines 96-116)
   - Validates against registered domains
   - Fallback: localhost allowed
   - Risk: Dynamic domain check via isRegisteredTenantHost()

2. **Input Sanitization**
   - Middleware: sanitizeMiddleware()
   - Whitelist-based approach (good)
   - Issue: Some routes may not use it

3. **Cookie Security**
   - HttpOnly: Yes (production)
   - Secure flag: Yes (production)
   - SameSite: None/Secure (production) - requires HTTPS
   - Path: /api/auth (restrictive)

4. **Database Connection**
   - Uses directUrl for migrations (non-pooled)
   - Risk: Pool exhaustion possible
   - Best: Connection pooling configured

---

## 8. BUSINESS LOGIC & AI INTEGRATION

### Lead Capture Service
File: modules/lead-capture/lead-capture.service.ts (320+ lines)

**Process:**
1. User searches via keyword + location
2. Select provider (Serper, SerpAPI, OutScraper)
3. API call with organization's API key
4. Normalize results
5. Apply filters (location, rating, etc.)
6. Deduplication via external_id
7. Save with score calculation
8. Rate limiting logged

**AI Analysis (Lead-AI Service)**
File: modules/lead-capture/lead-ai.service.ts (882 lines)

**Agents:**
1. Dossier Agent - Company research
2. Filter Agent - Lead scoring
3. Lead Extractor Agent - Contact mining
4. Lead Validator Agent - Company validation
5. Mission Scheduler - Campaign automation

**Prompts:**
- Inject company data into AI prompts
- Request JSON responses
- Fall back to hardcoded diagnosis if API fails

### WhatsApp Intelligence
File: services/whatsappIntelligence.ts

**Capabilities:**
- Message classification
- Sentiment analysis
- Lead qualification
- Response suggestion

### Prospecting Automation
File: services/prospectingAutomation.ts

**Workflow:**
1. Create funnel (template)
2. Enroll leads
3. Schedule dispatch
4. Track responses
5. Qualify based on interaction

### Onboarding AI
File: services/onboardingAI.ts

**Steps:**
1. Business type identification
2. Industry analysis
3. Challenge identification
4. Solution recommendation
5. Setup guidance

---

## 9. KEY SECURITY CONTROLS

### Input Validation
- Password strength: 10+ chars, mixed case, numbers
- Email validation: Basic email format check
- Sanitizer: Whitelist-based field validation
- HTML sanitization: Regex-based script removal

### Output Encoding
- JSON responses: Automatic via Express
- HTML pages: XSS protections via CSP
- Error messages: Generic where possible

### Access Control
- JWT token validation on protected routes
- Role-based permission checks
- Tenant isolation via organizationId filter
- Feature access via plan + subscription

### Audit & Monitoring
- AuditLog model for major actions
- Exception logging to console
- No centralized log aggregation visible
- IP + User-Agent tracking

### Data Protection
- Passwords hashed with bcryptjs (10 rounds default)
- Refresh tokens hashed before storage
- HTTPS required in production
- HttpOnly cookies for tokens

---

## 10. KNOWN SECURITY GAPS & RECOMMENDATIONS

### Critical

1. **JWT Secret Rotation**
   - Issue: No rotation mechanism visible
   - Recommendation: Implement key versioning

2. **Tenant Context Validation**
   - Issue: Relies on middleware execution
   - Risk: Routes missing authenticateToken middleware
   - Audit: Check all route handlers

3. **API Key Management**
   - Issue: Fallback to process.env
   - Recommendation: Vault integration for sensitive keys

4. **Prompt Injection**
   - Issue: User data directly in AI prompts
   - Recommendation: Template-based prompts with escaping

### High

1. **Rate Limiting**
   - Increase granularity per endpoint
   - Implement costs (AI requests cost more)

2. **HMAC Validation**
   - Timing-safe comparison exists
   - Ensure always used for webhooks

3. **Error Handling**
   - Remove stack traces from production errors
   - Standardize error response format

4. **Logging**
   - No structured logging (JSON)
   - Missing: Failed attempts, security events
   - No retention policy

### Medium

1. **Password Policy**
   - Add special character requirement
   - Implement password history

2. **HTML Sanitization**
   - Consider DOMPurify or similar library
   - Current regex approach is fragile

3. **CORS**
   - Document trusted domains
   - Implement domain whitelist

---

## 11. DEPLOYMENT ARCHITECTURE

### Docker Compose (docker-compose.yml)

**Services:**
1. **Backend** (Node.js/Express)
   - Port: 10000
   - Health check: /api/health
   - Dependencies: Waits for database

2. **Frontend** (Nginx + React)
   - Port: 8080
   - Dependencies: Waits for backend
   - Build args: VITE_API_URL, VITE_LIVEKIT_URL

3. **WhatsApp Bridge** (Go)
   - Port: 8091
   - Volume: whatsapp_bridge_data (persistent)
   - Backend communication via HTTP

4. **Database** (PostgreSQL)
   - Not in compose (external or separate container)
   - Configured via DATABASE_URL

### Environment Overrides
- Backend port: BACKEND_PORT env var
- Frontend port: FRONTEND_PORT env var
- WhatsApp port: WHATSAPP_BRIDGE_PORT env var
- Database auto-migration: RUN_DB_PUSH
- Seed data: RUN_SEED

### Deployment Platforms Supported
- Docker Compose (local, VPS)
- Portainer (Docker orchestration)
- Railway.app (PaaS)

---

## 12. FILE INVENTORY

### Critical Files for Security Audit

**Authentication:**
- backend/src/middleware/auth.ts
- backend/src/routes/auth.ts
- backend/src/utils/security.ts
- frontend/src/lib/api.ts

**Multi-tenancy:**
- backend/src/middleware/tenant.ts
- backend/src/lib/access.ts
- backend/prisma/schema.prisma (models section)

**Data Protection:**
- backend/src/utils/sanitizer.ts
- backend/src/utils/auditLogger.ts
- backend/src/middleware/errorHandler.ts

**AI Integration:**
- backend/src/modules/lead-capture/lead-ai.service.ts
- backend/src/routes/ai.ts
- backend/src/utils/aiKeys.ts

**External Integrations:**
- backend/src/routes/whatsapp.ts
- backend/whatsapp-bridge/main.go
- backend/src/utils/domainManager.ts

**API Gateway:**
- backend/src/server.ts
- frontend/src/lib/api.ts

### Configuration Files
- .env.example (73 lines)
- .env.portainer.example
- docker-compose.yml
- docker-stack.portainer.yml
- backend/tsconfig.json
- frontend/tsconfig.json
- frontend/vite.config.ts

---

## 13. TECHNOLOGY STACK SUMMARY

| Layer | Technology | Version |
|-------|-----------|---------|
| **Database** | PostgreSQL | 12+ |
| **Backend** | Express.js | 4.21 |
| **Backend Runtime** | Node.js | 18+ |
| **ORM** | Prisma | 6.19 |
| **Auth** | JWT (HS256) | Custom |
| **Frontend** | React | 19 |
| **Frontend Build** | Vite | 6.2 |
| **Styling** | TailwindCSS | 4.1 |
| **Type System** | TypeScript | 5.8 |
| **Video** | LiveKit | 2.18 (client) / 2.15 (server) |
| **WhatsApp** | Custom Go Bridge | - |
| **Containerization** | Docker | Latest |
| **Orchestration** | Docker Compose / Portainer | - |

---

## 14. NEXT STEPS FOR SECURITY AUDIT

### Phase 1: Static Analysis
1. Search for SQL injection vulnerabilities
2. Identify missing authenticateToken checks
3. Find hardcoded secrets
4. Check for eval() or dangerous functions
5. Validate tenant filter application

### Phase 2: Business Logic Review
1. Verify lead capture rate limiting
2. Audit AI prompt construction
3. Review WhatsApp webhook validation
4. Check proposal sharing authorization
5. Validate subscription enforcement

### Phase 3: Dynamic Testing
1. Multi-tenant isolation testing
2. Authentication bypass attempts
3. Authorization escalation
4. API rate limiting effectiveness
5. Cookie security validation

### Phase 4: Infrastructure
1. Environment variable management
2. Database backup security
3. Log retention & access
4. Secret rotation procedures
5. Incident response plan

---

Report Generated: 2026-06-05 19:56:34
