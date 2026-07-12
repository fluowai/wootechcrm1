import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import { assertStrongPassword } from "../utils/security.js";
import { DOMAIN_REGEX, getDnsInstructions, normalizeDomain, verifyDomainDns } from "../utils/domainConfig.js";
import { removeTraefikDomainConfig, syncTraefikDomainConfig, writeTraefikDomainConfig } from "../services/traefikDomainConfig.js";
import { refreshPendingDomainList, verifyAndProvisionDomain } from "../services/domainProvisioning.js";
import {
  normalizeBrazilianPhone,
  validateEmailAddress,
} from "../utils/contactValidation.js";

function buildOrgSlug(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function adminRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/metrics", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Access denied. Super Admin role required." });
    }
    try {
      const orgsCount = await prisma.organization.count();
      const usersCount = await prisma.user.count();
      const totalLeads = await prisma.lead.count();
      const revenue = await prisma.organization.findMany({ select: { plan: true } });

      res.json({
        agencies: orgsCount,
        totalUsers: usersCount,
        totalLeads,
        revenue: revenue.length * 499
      });
    } catch (error) {
       res.status(500).json({ error: "Failed to fetch admin metrics" });
    }
  });

  router.get("/dashboard", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Access denied. Super Admin role required." });
    }
    const { orgId } = req.query;
    const whereClause = orgId ? { organizationId: String(orgId) } : {};

    try {
      const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [leadsCount, clientsCount, proposalsCount, invoicesSum, contentCount, chartData] = await Promise.all([
        prisma.lead.count({ where: whereClause }),
        prisma.client.count({ where: whereClause }),
        prisma.proposal.count({ where: whereClause }),
        prisma.invoice.aggregate({ where: { ...whereClause, status: 'paga' }, _sum: { total: true } }),
        (async () => {
          const [creatives, campaigns, lps] = await Promise.all([
            prisma.creative.count({ where: whereClause }),
            prisma.campaign.count({ where: whereClause as any }),
            prisma.landingPage.count({ where: whereClause as any }),
          ]);
          return creatives + campaigns + lps;
        })(),
        (async () => {
          try {
            const orgFilter = orgId ? `AND l."organizationId" = $1` : ``;
            const params: any[] = [];
            if (orgId) params.push(String(orgId));
            params.push(sevenDaysAgo);
            const rows = await prisma.$queryRawUnsafe<Array<{ date: Date; leads: bigint; conv: bigint }>>(
              `SELECT DATE(l."createdAt") as date, COUNT(*) FILTER (WHERE l.status = 'qualificado' OR l.status = 'fechado') as conv,
               COUNT(*) as leads FROM "Lead" l WHERE 1=1 ${orgFilter} AND l."createdAt" >= $${params.length} GROUP BY DATE(l."createdAt") ORDER BY date ASC`,
              ...params
            );
            return rows.map((r) => ({
              name: dayLabels[new Date(r.date).getDay()] || "N/A",
              leads: Number(r.leads),
              conv: Number(r.conv),
            }));
          } catch {
            return [];
          }
        })(),
      ]);

      let orgName = "Painel Global";
      let plan: any = { name: "Global", maxLeads: 100, leadsLimit: 100 };
      if (orgId) {
        const org = await prisma.organization.findUnique({
          where: { id: String(orgId) },
          select: { name: true, plan: true, planObj: true }
        });
        if (org) {
          orgName = org.name;
          const legacyPlan = !org.planObj && org.plan
            ? await prisma.plan.findFirst({ where: { name: org.plan } })
            : null;
          const sourcePlan = org.planObj || legacyPlan || { name: org.plan || "Free", maxLeads: 100 };
          plan = {
            ...sourcePlan,
            maxLeads: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
            leadsLimit: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
          };
        }
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
      const revenue = invoicesSum._sum.total || 0;
      const conversions = leadsCount > 0 ? Number(((clientsCount / leadsCount) * 100).toFixed(1)) : 0;

      res.json({
        orgName,
        userName: user?.name || "Admin",
        plan,
        usage: { leads: leadsCount },
        metrics: {
          leads: leadsCount,
          clients: clientsCount,
          proposals: proposalsCount,
          revenue,
          conversions,
          contentCount,
        },
        chartData,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  router.get("/orgs", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const typeFilter = req.query.type as string | undefined;
    const whereClause = typeFilter && ['CLIENT', 'WHITELABEL'].includes(typeFilter)
      ? { type: typeFilter }
      : {};
    try {
      const orgs = await prisma.organization.findMany({
        where: whereClause,
        include: {
          domains: { orderBy: { createdAt: 'desc' } },
          planObj: true,
          _count: { select: { users: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      const refreshedOrgs = await Promise.all(orgs.map(async (org: any) => ({
        ...org,
        domains: await refreshPendingDomainList(prisma, org.domains || []),
      })));
      res.json(refreshedOrgs);
    } catch (error) {
      console.error("[ADMIN_ORGS_GET_ERROR]", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to fetch orgs", details });
    }
  });

  router.post("/orgs", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { name, type, domain, plan, planId, adminEmail, adminPhone, adminPassword, adminName, slug, isTestAccount, betaAccess, whiteLabelConfig } = req.body;
    const validType = type && ['CLIENT', 'WHITELABEL'].includes(type) ? type : 'CLIENT';
    const shouldCreateAdmin = true;

    if (!name) {
      return res.status(400).json({ error: "Nome da organizacao e obrigatorio." });
    }

    if (shouldCreateAdmin && (!adminEmail || !adminPhone || !adminPassword)) {
      return res.status(400).json({ error: "E-mail, telefone e senha do administrador sao obrigatorios" });
    }

    // Gerar um slug padrão se não for enviado
    const finalSlug = buildOrgSlug(slug || name);
    if (!finalSlug) {
      return res.status(400).json({ error: "Informe um slug valido para a organizacao." });
    }
    const normalizedDomain = normalizeDomain(domain);
    if (normalizedDomain && !DOMAIN_REGEX.test(normalizedDomain)) {
      return res.status(400).json({ error: "Informe um dominio valido, ex: crm.seudominio.com.br" });
    }

    if (shouldCreateAdmin) {
      const adminEmailResult = validateEmailAddress(adminEmail);
      if (!adminEmailResult.ok) return res.status(400).json({ error: adminEmailResult.error });
      const adminPhoneResult = normalizeBrazilianPhone(adminPhone);
      if (!adminPhoneResult.ok) return res.status(400).json({ error: adminPhoneResult.error });
      const adminPasswordError = assertStrongPassword(adminPassword);
      if (adminPasswordError) return res.status(400).json({ error: adminPasswordError });
    }

    try {
      const adminEmailResult = shouldCreateAdmin ? validateEmailAddress(adminEmail) : null;
      const adminPhoneResult = shouldCreateAdmin ? normalizeBrazilianPhone(adminPhone) : null;
      const [slugConflict, emailConflict, domainConflict] = await Promise.all([
        prisma.organization.findUnique({ where: { slug: finalSlug }, select: { id: true } }),
        shouldCreateAdmin && adminEmailResult?.ok ? prisma.user.findUnique({ where: { email: adminEmailResult.email }, select: { id: true } }) : Promise.resolve(null),
        normalizedDomain ? prisma.domain.findUnique({ where: { name: normalizedDomain }, select: { id: true } }) : Promise.resolve(null),
      ]);
      const phoneConflict = shouldCreateAdmin && adminPhoneResult?.ok
        ? await prisma.user.findUnique({ where: { phoneNormalized: adminPhoneResult.normalized }, select: { id: true } })
        : null;

      if (slugConflict) {
        return res.status(409).json({ error: "Este slug ja esta em uso. Escolha outro slug." });
      }
      if (emailConflict) {
        return res.status(409).json({ error: "Este e-mail de administrador ja esta em uso." });
      }
      if (phoneConflict) {
        return res.status(409).json({ error: "Este telefone de administrador ja esta em uso." });
      }
      if (domainConflict) {
        return res.status(409).json({ error: "Este dominio ja esta vinculado a outra organizacao." });
      }

      let domainSync: any = null;
      const verification = normalizedDomain
        ? await verifyDomainDns(normalizedDomain, finalSlug)
        : null;

      const result = await prisma.$transaction(async (tx) => {
        const selectedPlan = planId
          ? await tx.plan.findUnique({ where: { id: planId } })
          : plan
            ? await tx.plan.findFirst({ where: { name: plan } })
            : null;

        // 1. Criar Organização
        const org = await tx.organization.create({
          data: {
            name,
            type: validType,
            domain: normalizedDomain || null,
            plan: selectedPlan?.name || plan || "Free",
            planId: selectedPlan?.id || null,
            slug: finalSlug,
            isTestAccount: isTestAccount || false,
            betaAccess: betaAccess || false,
            ...(validType === "WHITELABEL" && {
              settings: { whitelabelOnboardingStep: 1, whitelabelOnboardingComplete: false },
            }),
            ...(whiteLabelConfig !== undefined && { whiteLabelConfig })
          }
        });

        // 2. Criar Usuário Admin para esta organização
        if (shouldCreateAdmin) {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          await tx.user.create({
            data: {
              email: adminEmailResult?.ok ? adminEmailResult.email : adminEmail,
              phone: adminPhoneResult?.ok ? adminPhoneResult.raw : adminPhone,
              phoneNormalized: adminPhoneResult?.ok ? adminPhoneResult.normalized : null,
              password: hashedPassword,
              name: adminName || name,
              role: 'ORG_ADMIN',
              organizationId: org.id,
              status: 'ACTIVE'
            }
          });
        }

        // If a custom domain was provided, register it in the Domain table too
        if (normalizedDomain && verification) {
          domainSync = { name: normalizedDomain, verified: verification.verified };
          await tx.domain.create({
            data: {
              name: normalizedDomain,
              provider: 'crm',
              status: verification.verified ? "verified" : "pending",
              organizationId: org.id,
            },
          });
        }

        return tx.organization.findUnique({
          where: { id: org.id },
          include: { domains: true, planObj: true, _count: { select: { users: true } } }
        });
      });

      const traefik = domainSync
        ? await syncTraefikDomainConfig(domainSync.name, domainSync.verified)
        : undefined;

      res.json(traefik ? { ...result, traefik } : result);
    } catch (error: any) {
      console.error("[ADMIN_ORGS_POST]", error);
      if (error?.code === "P2002") {
        return res.status(409).json({
          error: "Ja existe um registro com estes dados. Verifique slug, dominio ou e-mail.",
          details: Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : error.message,
        });
      }
      res.status(500).json({
        error: "Falha ao criar cliente e usuário administrador",
        details: error.message
      });
    }
  });

  // Atualizar Organização / Cliente (SUPER_ADMIN)
  router.patch("/orgs/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { name, type, domain, plan, planId, slug, adminEmail, adminPhone, isTestAccount, betaAccess, whiteLabelConfig } = req.body;
    const password = typeof req.body.password === "string" ? req.body.password.trim() : req.body.password;
    const shouldUpdatePassword = typeof password === "string" && password !== "" && !/^\*+$/.test(password);
    const hasDomain = Object.prototype.hasOwnProperty.call(req.body, "domain");
    const normalizedDomain = hasDomain ? normalizeDomain(domain) : undefined;
    const adminEmailResult = adminEmail ? validateEmailAddress(adminEmail) : null;
    const adminPhoneResult = adminPhone ? normalizeBrazilianPhone(adminPhone) : null;

    if (shouldUpdatePassword) {
      const passwordError = assertStrongPassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
    }
    if (adminEmailResult && !adminEmailResult.ok) {
      return res.status(400).json({ error: adminEmailResult.error });
    }
    if (adminPhoneResult && !adminPhoneResult.ok) {
      return res.status(400).json({ error: adminPhoneResult.error });
    }
    if (normalizedDomain && !DOMAIN_REGEX.test(normalizedDomain)) {
      return res.status(400).json({ error: "Informe um dominio valido, ex: crm.seudominio.com.br" });
    }

    try {
      let domainSync: any = null;
      let domainToRemove: string | null = null;
      const result = await prisma.$transaction(async (tx) => {
        // 1. Verificar se a organização existe
        const existingOrg = await tx.organization.findUnique({ where: { id } });
        const hasPlanId = Object.prototype.hasOwnProperty.call(req.body, "planId");
        const selectedPlan = hasPlanId && planId
          ? await tx.plan.findUnique({ where: { id: planId } })
          : !hasPlanId && plan
            ? await tx.plan.findFirst({ where: { name: plan } })
            : null;
        if (hasPlanId && planId && !selectedPlan) throw new Error("Plano nao encontrado.");
        if (!existingOrg) throw new Error("Organização não encontrada.");

        // 2. Atualizar Organização
          const org = await tx.organization.update({
            where: { id },
            data: {
              ...(name && { name }),
              ...(type && ['CLIENT', 'WHITELABEL'].includes(type) && { type }),
              ...(hasDomain && { domain: normalizedDomain || null }),
              ...(plan && !selectedPlan && { plan }),
              ...(selectedPlan && { plan: selectedPlan.name }),
              ...(hasPlanId && { planId: selectedPlan?.id || null }),
              ...(!hasPlanId && selectedPlan && { planId: selectedPlan.id }),
              ...(slug && { slug }),
              ...(isTestAccount !== undefined && { isTestAccount }),
              ...(betaAccess !== undefined && { betaAccess }),
              ...(whiteLabelConfig !== undefined && { whiteLabelConfig })
            }
          });

        // 3. Atualizar Usuário Admin se solicitado
        if (adminEmail || adminPhone || shouldUpdatePassword) {
          const admin = await tx.user.findFirst({
            where: { organizationId: id, role: 'ORG_ADMIN' }
          });

          if (admin) {
            const userUpdateData: any = {};
            if (adminEmailResult?.ok) {
              // Verificar se o email já existe em outro usuário
              const emailConflict = await tx.user.findFirst({
                where: { email: adminEmailResult.email, NOT: { id: admin.id } }
              });
              if (emailConflict) throw new Error("Este e-mail já está em uso por outro usuário.");
              userUpdateData.email = adminEmailResult.email;
              userUpdateData.emailVerified = false;
            }
            if (adminPhoneResult?.ok) {
              const phoneConflict = await tx.user.findFirst({
                where: { phoneNormalized: adminPhoneResult.normalized, NOT: { id: admin.id } }
              });
              if (phoneConflict) throw new Error("Este telefone ja esta em uso por outro usuario.");
              userUpdateData.phone = adminPhoneResult.raw;
              userUpdateData.phoneNormalized = adminPhoneResult.normalized;
              userUpdateData.phoneVerified = false;
            }
            if (shouldUpdatePassword) {
              userUpdateData.password = await bcrypt.hash(password, 10);
            }

            await tx.user.update({
              where: { id: admin.id },
              data: userUpdateData
            });
          }
        }

        // If domain changed, upsert Domain record
        if (hasDomain) {
          // Remove old domain records for this org if domain changed
          if (existingOrg.domain && existingOrg.domain !== normalizedDomain) {
            domainToRemove = existingOrg.domain;
            await tx.domain.deleteMany({
              where: { name: existingOrg.domain, organizationId: id }
            });
          }
          // Create new domain record if domain is set
          if (normalizedDomain) {
            const verification = await verifyDomainDns(normalizedDomain, org.slug);
            domainSync = { name: normalizedDomain, verified: verification.verified };
            await tx.domain.upsert({
              where: { name: normalizedDomain },
              update: { organizationId: id, provider: 'crm', status: verification.verified ? "verified" : "pending" },
              create: {
                name: normalizedDomain,
                provider: 'crm',
                status: verification.verified ? "verified" : "pending",
                organizationId: id,
              },
            });
          }
        }

        return tx.organization.findUnique({
          where: { id: org.id },
          include: { planObj: true, _count: { select: { users: true } } }
        });
      });

      const traefikRemoved = domainToRemove ? await removeTraefikDomainConfig(domainToRemove) : undefined;
      const traefik = domainSync
        ? await syncTraefikDomainConfig(domainSync.name, domainSync.verified)
        : traefikRemoved;

      res.json(traefik ? { ...result, traefik } : result);
    } catch (error: any) {
      console.error("[ADMIN_ORGS_PATCH_ERROR]", error);
      res.status(error.message.includes("encontrada") ? 404 : 500).json({
        error: "Falha ao atualizar organização",
        details: error.message
      });
    }
  });

  // Excluir Organização (Cascata)
  router.delete("/orgs/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;

    try {
      const domainsToRemove = await prisma.domain.findMany({
        where: { organizationId: id },
        select: { name: true },
      });

      await prisma.$transaction(async (tx) => {
        // Remover dependências em cascata (Exemplos)
        await tx.domain.deleteMany({ where: { organizationId: id } });
        await tx.lead.deleteMany({ where: { organizationId: id } });
        await tx.client.deleteMany({ where: { organizationId: id } });
        await tx.project.deleteMany({ where: { organizationId: id } });
        await tx.user.deleteMany({ where: { organizationId: id } });

        // Finalmente deletar a organização
        await tx.organization.delete({ where: { id } });
      });

      await Promise.all(domainsToRemove.map(domain => removeTraefikDomainConfig(domain.name)));

      res.json({ success: true });
    } catch (error) {
      console.error("[ADMIN_ORGS_DELETE]", error);
      res.status(500).json({ error: "Failed to delete organization (cascade error)" });
    }
  });

  // Get white-label config for an org
  router.get("/orgs/:id/whitelabel", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          type: true,
          whiteLabelConfig: true,
          domain: true,
          slug: true,
          plan: true,
          planId: true,
        }
      });
      if (!org) return res.status(404).json({ error: "Organização não encontrada" });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch whitelabel config" });
    }
  });

  // Update white-label branding for an org
  router.patch("/orgs/:id/whitelabel", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { whiteLabelConfig, type } = req.body;
    try {
      const org = await prisma.organization.update({
        where: { id },
        data: {
          ...(whiteLabelConfig !== undefined && { whiteLabelConfig }),
          ...(type && ['CLIENT', 'WHITELABEL'].includes(type) && { type }),
        }
      });
      res.json({ success: true, org });
    } catch (error) {
      res.status(500).json({ error: "Failed to update whitelabel config" });
    }
  });

  router.get("/users", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emailVerified: true,
          phoneVerified: true,
          verifiedContactAt: true,
          role: true,
          status: true,
          permissions: true,
          organizationId: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Editar Usuário (SUPER_ADMIN)
  router.patch("/users/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { name, email, phone, role, status, permissions } = req.body;
    const password = typeof req.body.password === "string" ? req.body.password.trim() : req.body.password;
    const organizationId = req.body.organizationId || null;
    const emailResult = validateEmailAddress(email);
    if (!emailResult.ok) return res.status(400).json({ error: emailResult.error });
    const phoneResult = normalizeBrazilianPhone(phone);
    if (!phoneResult.ok) return res.status(400).json({ error: phoneResult.error });
    if (password) {
      const passwordError = assertStrongPassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
    }

    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { email: true, phoneNormalized: true, emailVerified: true, phoneVerified: true }
      });
      if (!currentUser) return res.status(404).json({ error: "Usuario nao encontrado." });

      const [emailConflict, phoneConflict] = await Promise.all([
        prisma.user.findFirst({ where: { email: emailResult.email, NOT: { id: req.params.id } }, select: { id: true } }),
        prisma.user.findFirst({ where: { phoneNormalized: phoneResult.normalized, NOT: { id: req.params.id } }, select: { id: true } }),
      ]);
      if (emailConflict) return res.status(409).json({ error: "Este e-mail ja esta em uso." });
      if (phoneConflict) return res.status(409).json({ error: "Este telefone ja esta em uso." });

      const emailChanged = currentUser.email !== emailResult.email;
      const phoneChanged = currentUser.phoneNormalized !== phoneResult.normalized;
      const nextEmailVerified = emailChanged ? false : currentUser.emailVerified;
      const nextPhoneVerified = phoneChanged ? false : currentUser.phoneVerified;
      const data: any = {
        name,
        email: emailResult.email,
        phone: phoneResult.raw,
        phoneNormalized: phoneResult.normalized,
        role,
        status,
        permissions,
        organizationId
      };
      if (emailChanged) data.emailVerified = false;
      if (phoneChanged) data.phoneVerified = false;
      if (!nextEmailVerified && !nextPhoneVerified) data.verifiedContactAt = null;
      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data
      });
      const { password: _password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  router.post("/domains", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { orgId } = req.body;
    const domain = normalizeDomain(req.body?.domain);

    if (!domain || !orgId) {
      return res.status(400).json({ error: "Domain and OrgId are required" });
    }
    if (!DOMAIN_REGEX.test(domain)) {
      return res.status(400).json({ error: "Informe um dominio valido, ex: crm.seudominio.com.br" });
    }

    try {
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) return res.status(404).json({ error: "Organizacao nao encontrada" });

      const existing = await prisma.domain.findUnique({ where: { name: domain } });
      if (existing && existing.organizationId !== orgId) {
        return res.status(409).json({ error: "Este dominio ja esta vinculado a outra organizacao." });
      }
      const previousDomain = org.domain && org.domain !== domain ? org.domain : null;

      const savedDomain = await prisma.$transaction(async (tx) => {
        const verification = await verifyDomainDns(domain, org.slug);

        if (org.domain && org.domain !== domain) {
          await tx.domain.deleteMany({ where: { name: org.domain, organizationId: orgId } });
        }

        const domainRecord = await tx.domain.upsert({
          where: { name: domain },
          update: { organizationId: orgId, provider: "crm", status: verification.verified ? "verified" : existing?.status || "pending" },
          create: {
            name: domain,
            provider: "crm",
            status: verification.verified ? "verified" : "pending",
            organizationId: orgId,
          },
        });

        await tx.organization.update({
          where: { id: orgId },
          data: { domain },
        });

        return { domainRecord, verification };
      });

      res.json({
        success: true,
        message: savedDomain.verification.verified
          ? "Dominio cadastrado e DNS validado para o servidor Nexus360."
          : "Dominio cadastrado. Configure o DNS para apontar ao servidor Nexus360 e validar a URL do cliente.",
        domain: {
          ...savedDomain.domainRecord,
          dns: getDnsInstructions(domain, org.slug),
        },
        verification: savedDomain.verification,
        traefik: {
          removed: previousDomain ? await removeTraefikDomainConfig(previousDomain) : undefined,
          current: await syncTraefikDomainConfig(domain, savedDomain.verification.verified),
        },
      });
    } catch (error: any) {
      console.error("[Domain Error]", error);
      res.status(500).json({
        error: "Failed to register domain",
        details: error.message
      });
    }
  });

  router.post("/domains/:id/verify", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });

    try {
      const domain = await prisma.domain.findUnique({
        where: { id: req.params.id },
        include: { organization: { select: { slug: true } } },
      });
      if (!domain) return res.status(404).json({ error: "Dominio nao encontrado" });

      const result = await verifyAndProvisionDomain(prisma, domain, domain.organization.slug);

      res.json({
        success: true,
        domain: {
          ...result.domain,
          dns: getDnsInstructions(domain.name, domain.organization.slug),
        },
        verification: result.verification,
        traefik: result.traefik,
      });
    } catch (error: any) {
      console.error("[Admin Domain Verify Error]", error);
      res.status(500).json({
        error: "Falha ao validar DNS",
        details: error.message,
      });
    }
  });

  router.post("/domains/sync-all", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });

    try {
      const domains = await prisma.domain.findMany({
        where: { status: { in: ["verified", "pending"] } },
        select: { name: true },
        orderBy: { createdAt: "asc" },
      });

      const results = [];
      for (const domain of domains) {
        results.push({
          domain: domain.name,
          traefik: await writeTraefikDomainConfig(domain.name),
        });
      }

      res.json({ success: true, count: results.length, results });
    } catch (error: any) {
      console.error("[Admin Domain Sync All Error]", error);
      res.status(500).json({
        error: "Falha ao sincronizar dominios no Traefik",
        details: error.message,
      });
    }
  });

  // Criar Usuário (SUPER_ADMIN)
  router.post("/users", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    const { name, email, phone, role, status, permissions } = req.body;
    const password = typeof req.body.password === "string" ? req.body.password.trim() : req.body.password;
    const organizationId = req.body.organizationId || null;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "Nome, e-mail, telefone e senha sao obrigatorios." });
    }
    const emailResult = validateEmailAddress(email);
    if (!emailResult.ok) return res.status(400).json({ error: emailResult.error });
    const phoneResult = normalizeBrazilianPhone(phone);
    if (!phoneResult.ok) return res.status(400).json({ error: phoneResult.error });
    const passwordError = assertStrongPassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    try {
      const existingUser = await prisma.user.findUnique({ where: { email: emailResult.email } });
      const existingPhone = await prisma.user.findUnique({ where: { phoneNormalized: phoneResult.normalized } });
      if (existingUser) return res.status(400).json({ error: "E-mail já está em uso." });

      if (existingPhone) return res.status(400).json({ error: "Telefone ja esta em uso." });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email: emailResult.email,
          phone: phoneResult.raw,
          phoneNormalized: phoneResult.normalized,
          password: hashedPassword,
          role: role || 'USER',
          status: status || 'ACTIVE',
          permissions: permissions || {},
          organizationId
        }
      });
      const { password: _password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("[ADMIN_USER_POST]", error);
      res.status(500).json({ error: "Failed to create system user" });
    }
  });

  // Excluir Usuário (SUPER_ADMIN)
  router.delete("/users/:id", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Unauthorized" });
    try {
      // Impedir de excluir a si mesmo
      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: "Você não pode excluir sua própria conta." });
      }
      await prisma.user.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // --- Modular Routes Handle elsewhere ---

  return router;
}
