import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshSecret,
  authenticateToken,
  AuthRequest,
} from "../middleware/auth.js";
import { logAudit, getClientIp, getClientUA } from "../utils/auditLogger.js";
import {
  assertStrongPassword,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "../utils/security.js";
import { findTenantHostContext } from "../utils/tenantHost.js";
import {
  emailDomain,
  hasVerifiedContact,
  normalizeBrazilianPhone,
  validateEmailAddress,
} from "../utils/contactValidation.js";
import { refreshOrganizationSubscriptionState } from "../services/subscriptionState.js";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return process.env.JWT_SECRET;
};

const planWithFeatures = {
  include: {
    planFeatures: true,
  },
};

const serializePlan = (plan: any) => {
  const fallback = { name: "Free", maxLeads: 100, leadsLimit: 100 };
  if (!plan) return fallback;
  return {
    ...plan,
    maxLeads: plan.maxLeads ?? plan.leadsLimit ?? fallback.maxLeads,
    leadsLimit: plan.maxLeads ?? plan.leadsLimit ?? fallback.leadsLimit,
  };
};

const serializeWhitelabelOnboarding = (organization: any) => {
  if (!organization || organization.type !== "WHITELABEL") return null;
  const settings = organization.settings && typeof organization.settings === "object"
    ? organization.settings
    : {};

  return {
    step: Number(settings.whitelabelOnboardingStep) || 1,
    complete: Boolean(settings.whitelabelOnboardingComplete),
    provisioningStatus: settings.whitelabelOnboardingComplete ? "active" : "onboarding",
  };
};

const buildOrgSlug = (value: unknown) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `org-${Date.now().toString(36)}`;
};

async function generateUniqueOrganizationSlug(client: any, value: unknown) {
  const base = buildOrgSlug(value);
  for (let index = 0; index < 20; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const existing = await client.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function serializeContactVerification(user: any) {
  const verified = hasVerifiedContact(user);
  return {
    required: !verified,
    complete: verified,
    emailVerified: Boolean(user?.emailVerified),
    phoneVerified: Boolean(user?.phoneVerified),
    verifiedContactAt: user?.verifiedContactAt || null,
  };
}

function validateSignupContact(input: { email: unknown; phone: unknown }) {
  const emailResult = validateEmailAddress(input.email);
  if (!emailResult.ok) return { ok: false as const, error: emailResult.error };

  const phoneResult = normalizeBrazilianPhone(input.phone);
  if (!phoneResult.ok) return { ok: false as const, error: phoneResult.error };

  return {
    ok: true as const,
    email: emailResult.email,
    domain: emailResult.domain || emailDomain(emailResult.email),
    phone: phoneResult.raw,
    phoneNormalized: phoneResult.normalized,
  };
}

function verificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function shouldExposeVerificationCode() {
  return process.env.NODE_ENV !== "production" && process.env.EXPOSE_DEV_VERIFICATION_CODES !== "false";
}

export function authRoutes(prisma: PrismaClient) {
  const router = Router();

  async function ensureUserMatchesTenantDomain(
    req: AuthRequest,
    res: any,
    userOrgId: string | null | undefined,
    userRole: string | null | undefined
  ) {
    const tenantDomain = await findTenantHostContext(
      prisma,
      req.headers["x-forwarded-host"] || req.headers.host
    );

    if (!tenantDomain) return true;
    if (userRole === "SUPER_ADMIN") return true;
    if (userOrgId === tenantDomain.organization.id) return true;

    res.status(403).json({
      success: false,
      error: "Este dominio pertence a outra organizacao.",
      code: "DOMAIN_ORG_MISMATCH",
    });
    return false;
  }

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Limite de 10 tentativas por IP
    message: {
      success: false,
      error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ==================== LOGIN ====================
  router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: "E-mail e senha são obrigatórios",
        });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          organization: {
            include: {
              planObj: planWithFeatures,
              _count: {
                select: { leads: true },
              },
            },
          },
          accessProfile: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Usuário ou senha inválidos",
        });
      }

      // Verificar se conta está ativa
      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          error: "Conta suspensa ou desativada. Contate o administrador.",
        });
      }

      if (!user.password) {
        return res.status(500).json({
          success: false,
          error: "Usuário sem senha cadastrada",
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: "Usuário ou senha inválidos",
        });
      }

      if (!(await ensureUserMatchesTenantDomain(req, res, user.organizationId, user.role))) {
        return;
      }

      const organization = await refreshOrganizationSubscriptionState(prisma, user.organization);
      let orgId = user.organizationId;
      let orgName = organization?.name || "Sem Organização";
      let orgSlug = organization?.slug || "";

      if (user.role === "SUPER_ADMIN" && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
          orgSlug = firstOrg.slug || "";
        }
      }

      // Gerar par access + refresh token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: orgId,
        agencyId: user.agencyId,
        permissions: user.accessProfile
          ? user.accessProfile.permissions
          : user.permissions,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken({ id: user.id, orgId });
      setRefreshTokenCookie(res, refreshToken);

      // Salvar refresh token no banco
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      prisma.refreshToken
        .create({
          data: {
            token: refreshTokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            ip: getClientIp(req),
            userAgent: getClientUA(req),
          },
        })
        .catch((error) => {
          console.error("[REFRESH_TOKEN_CREATE_ERROR]", {
            userId: user.id,
            errorMessage: error.message,
            prismaCode: error.code,
          });
        });

      // Limpar tokens expirados do usuário (limpeza assíncrona)
      prisma.refreshToken
        .deleteMany({
          where: {
            userId: user.id,
            expiresAt: { lt: new Date() },
          },
        })
        .catch(() => {});

      // Audit log
      logAudit({
        organizationId: orgId,
        userId: user.id,
        action: "LOGIN",
        resource: "User",
        resourceId: user.id,
        ip: getClientIp(req),
        userAgent: getClientUA(req),
      });

      const orgType = organization?.type || "CLIENT";

      return res.json({
        success: true,
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          contactVerification: serializeContactVerification(user),
          permissions: user.accessProfile
            ? user.accessProfile.permissions
            : user.permissions,
          accessProfileId: user.accessProfileId,
          orgId,
          orgName,
          orgSlug,
          orgType,
          whitelabelOnboarding: serializeWhitelabelOnboarding(organization),
          agencyId: user.agencyId,
          subscriptionStatus: organization?.subscriptionStatus || "TRIAL",
          trialEndsAt: organization?.trialEndsAt || null,
          currentPeriodEnd: organization?.currentPeriodEnd || null,
          betaAccess: organization?.betaAccess || false,
          isTestAccount: organization?.isTestAccount || false,
          plan: serializePlan(organization?.planObj || { name: organization?.plan || "Free" }),
          usage: {
            leads: organization?._count?.leads || 0,
          },
        },
      });
    } catch (error: any) {
      console.error("[LOGIN_ERROR] Full Context:", {
        email: req.body?.email,
        errorMessage: error.message,
        prismaCode: error.code
      });
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor"
      });
    }
  });

  // ==================== REFRESH TOKEN ====================
  router.post("/refresh", async (req, res) => {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);

      if (!refreshToken) {
        clearRefreshTokenCookie(res);
        return res.status(400).json({ error: "Refresh token obrigatório." });
      }

      // Verificar JWT do refresh token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, getRefreshSecret());
      } catch (err: any) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "REFRESH_TOKEN_INVALID",
          message: "Refresh token inválido ou expirado. Faça login novamente.",
        });
      }

      // Verificar no banco
      const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
        include: {
          user: {
            include: {
              organization: {
                include: {
                  planObj: planWithFeatures,
                  _count: { select: { leads: true } },
                },
              },
              accessProfile: true,
            },
          },
        },
      });

      if (!storedToken || storedToken.revokedAt) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "REFRESH_TOKEN_REVOKED",
          message: "Token já foi revogado. Faça login novamente.",
        });
      }

      if (storedToken.user.organizationId && storedToken.user.organizationId !== decoded.orgId) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "REFRESH_TOKEN_ORG_MISMATCH",
          message: "Token não pertence a esta organização. Faça login novamente.",
        });
      }

      if (storedToken.expiresAt < new Date()) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({
          error: "REFRESH_TOKEN_EXPIRED",
          message: "Refresh token expirado. Faça login novamente.",
        });
      }

      const user = storedToken.user;
      if (!(await ensureUserMatchesTenantDomain(req, res, user.organizationId, user.role))) {
        clearRefreshTokenCookie(res);
        return;
      }

      const organization = await refreshOrganizationSubscriptionState(prisma, user.organization);
      let orgId = user.organizationId;
      let orgName = organization?.name || "Sem Organização";

      if (user.role === "SUPER_ADMIN" && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
        }
      }

      // Gerar novo access token
      const newAccessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId,
        agencyId: user.agencyId,
        permissions: user.accessProfile
          ? user.accessProfile.permissions
          : user.permissions,
      });

      const newRefreshToken = generateRefreshToken({ id: user.id, orgId });
      const newRefreshTokenHash = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { revokedAt: new Date() },
        }),
        prisma.refreshToken.create({
          data: {
            token: newRefreshTokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            ip: getClientIp(req),
            userAgent: getClientUA(req),
          },
        }),
      ]);
      setRefreshTokenCookie(res, newRefreshToken);

      return res.json({
        success: true,
        token: newAccessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          contactVerification: serializeContactVerification(user),
          orgId,
          orgName,
          orgType: organization?.type || "CLIENT",
          whiteLabelConfig: organization?.whiteLabelConfig || null,
          whitelabelOnboarding: serializeWhitelabelOnboarding(organization),
          subscriptionStatus: organization?.subscriptionStatus || "TRIAL",
          trialEndsAt: organization?.trialEndsAt || null,
          currentPeriodEnd: organization?.currentPeriodEnd || null,
          betaAccess: organization?.betaAccess || false,
          isTestAccount: organization?.isTestAccount || false,
          plan: serializePlan(organization?.planObj || { name: organization?.plan || "Free" }),
          usage: {
            leads: organization?._count?.leads || 0,
          },
        },
      });
    } catch (error) {
      console.error("[REFRESH_ERROR]", error);
      return res.status(500).json({ error: "Erro ao renovar token." });
    }
  });

  // ==================== LOGOUT ====================
  router.post("/logout", async (req, res) => {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);

      if (refreshToken) {
        const tokenHash = crypto
          .createHash("sha256")
          .update(refreshToken)
          .digest("hex");

        await prisma.refreshToken.updateMany({
          where: { token: tokenHash },
          data: { revokedAt: new Date() },
        });
      }

      clearRefreshTokenCookie(res);
      return res.json({ success: true, message: "Logout realizado." });
    } catch (error) {
      console.error("[LOGOUT_ERROR]", error);
      return res.json({ success: true, message: "Logout realizado." });
    }
  });

  router.post("/verification/start", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Nao autenticado." });

      const channel = String(req.body?.channel || "EMAIL").trim().toUpperCase();
      if (!["EMAIL", "PHONE"].includes(channel)) {
        return res.status(400).json({ error: "Canal invalido. Use EMAIL ou PHONE." });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          emailVerified: true,
          phoneVerified: true,
          verifiedContactAt: true,
        },
      });

      if (!user) return res.status(404).json({ error: "Usuario nao encontrado." });
      if (channel === "EMAIL" && user.emailVerified) {
        return res.json({ success: true, alreadyVerified: true, contactVerification: serializeContactVerification(user) });
      }
      if (channel === "PHONE" && user.phoneVerified) {
        return res.json({ success: true, alreadyVerified: true, contactVerification: serializeContactVerification(user) });
      }

      const target = channel === "EMAIL" ? user.email : user.phone;
      if (!target) return res.status(400).json({ error: "Contato nao cadastrado para este canal." });

      await prisma.accountVerification.updateMany({
        where: { userId, channel, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      const code = verificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.accountVerification.create({
        data: {
          userId,
          channel,
          target,
          codeHash: hashVerificationCode(code),
          expiresAt,
        },
      });

      console.info("[ACCOUNT_VERIFICATION_CODE]", {
        userId,
        channel,
        target,
        code: shouldExposeVerificationCode() ? code : "[hidden]",
      });

      return res.json({
        success: true,
        channel,
        target,
        expiresAt,
        delivery: process.env.NODE_ENV === "production" ? "provider_required" : "dev_echo",
        ...(shouldExposeVerificationCode() ? { devCode: code } : {}),
      });
    } catch (error) {
      console.error("[VERIFICATION_START_ERROR]", error);
      return res.status(500).json({ error: "Falha ao iniciar verificacao." });
    }
  });

  router.post("/verification/confirm", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Nao autenticado." });

      const channel = String(req.body?.channel || "EMAIL").trim().toUpperCase();
      const code = String(req.body?.code || "").trim();
      if (!["EMAIL", "PHONE"].includes(channel)) {
        return res.status(400).json({ error: "Canal invalido. Use EMAIL ou PHONE." });
      }
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "Codigo invalido." });
      }

      const verification = await prisma.accountVerification.findFirst({
        where: {
          userId,
          channel,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verification) {
        return res.status(400).json({ error: "Codigo expirado ou inexistente." });
      }

      if (verification.attempts >= 5) {
        return res.status(429).json({ error: "Muitas tentativas. Gere um novo codigo." });
      }

      if (verification.codeHash !== hashVerificationCode(code)) {
        await prisma.accountVerification.update({
          where: { id: verification.id },
          data: { attempts: { increment: 1 } },
        });
        return res.status(400).json({ error: "Codigo incorreto." });
      }

      const user = await prisma.$transaction(async (tx) => {
        await tx.accountVerification.update({
          where: { id: verification.id },
          data: { consumedAt: new Date() },
        });

        return tx.user.update({
          where: { id: userId },
          data: {
            verifiedContactAt: new Date(),
            ...(channel === "EMAIL" ? { emailVerified: true } : { phoneVerified: true }),
          },
          select: {
            id: true,
            email: true,
            phone: true,
            emailVerified: true,
            phoneVerified: true,
            verifiedContactAt: true,
          },
        });
      });

      return res.json({
        success: true,
        contactVerification: serializeContactVerification(user),
      });
    } catch (error) {
      console.error("[VERIFICATION_CONFIRM_ERROR]", error);
      return res.status(500).json({ error: "Falha ao confirmar verificacao." });
    }
  });

  // ==================== REGISTER CUSTOM DOMAIN OWNER ====================
  router.post("/register/custom-domain-admin", async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: "Nome, e-mail, telefone e senha sao obrigatorios.",
      });
    }

    const contact = validateSignupContact({ email, phone });
    if (!contact.ok) return res.status(400).json({ error: contact.error });

    const passwordError = assertStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    try {
      const tenantDomain = await findTenantHostContext(
        prisma,
        req.headers["x-forwarded-host"] || req.headers.host
      );

      if (!tenantDomain) {
        return res.status(403).json({
          error: "Este onboarding so esta disponivel em dominios white-label verificados.",
          code: "CUSTOM_DOMAIN_REQUIRED",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: tenantDomain.organization.id },
        include: {
          planObj: planWithFeatures,
          _count: { select: { leads: true } },
        },
      });

      if (!organization || organization.type !== "WHITELABEL" || !organization.isActive) {
        return res.status(403).json({
          error: "Dominio white-label indisponivel para onboarding.",
          code: "WHITELABEL_DOMAIN_UNAVAILABLE",
        });
      }

      const settings = organization.settings && typeof organization.settings === "object"
        ? organization.settings as Record<string, any>
        : {};
      const onboardingComplete = Boolean(settings.whitelabelOnboardingComplete);

      const existingOwnerCount = await prisma.user.count({
        where: {
          organizationId: organization.id,
          role: "ORG_ADMIN",
          status: "ACTIVE",
        },
      });

      if (onboardingComplete && existingOwnerCount > 0) {
        return res.status(409).json({
          error: "Este white-label ja possui um administrador ativo. Acesse pelo login.",
          code: "ADMIN_ALREADY_EXISTS",
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email: contact.email } });
      if (existingUser) {
        return res.status(400).json({
          error: "Este email ja esta em uso.",
          code: "EMAIL_ALREADY_EXISTS",
        });
      }
      const existingPhone = await prisma.user.findUnique({
        where: { phoneNormalized: contact.phoneNormalized },
      });
      if (existingPhone) {
        return res.status(400).json({
          error: "Este telefone ja esta em uso.",
          code: "PHONE_ALREADY_EXISTS",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await prisma.$transaction(async (tx) => {
        const updatedOrg = await tx.organization.update({
          where: { id: organization.id },
          data: {
            settings: {
              ...settings,
              whitelabelOnboardingStep: Number(settings.whitelabelOnboardingStep) || 1,
              whitelabelOnboardingComplete: false,
            },
          },
          include: {
            planObj: planWithFeatures,
            _count: { select: { leads: true } },
          },
        });

        const user = await tx.user.create({
          data: {
            name,
            email: contact.email,
            phone: contact.phone,
            phoneNormalized: contact.phoneNormalized,
            password: hashedPassword,
            role: "ORG_ADMIN",
            status: "ACTIVE",
            organizationId: updatedOrg.id,
          },
        });

        return { user, org: updatedOrg };
      });

      const accessToken = generateAccessToken({
        id: result.user.id,
        email: result.user.email,
        orgId: result.org.id,
        role: result.user.role,
      });

      const refreshToken = generateRefreshToken({
        id: result.user.id,
        orgId: result.org.id,
      });
      setRefreshTokenCookie(res, refreshToken);

      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await prisma.refreshToken.create({
        data: {
          token: refreshTokenHash,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ip: getClientIp(req),
          userAgent: getClientUA(req),
        },
      });

      logAudit({
        organizationId: result.org.id,
        userId: result.user.id,
        action: "CREATE",
        resource: "User",
        resourceId: result.user.id,
        metadata: {
          source: "custom-domain-onboarding",
          domain: tenantDomain.domain,
        },
        ip: getClientIp(req),
        userAgent: getClientUA(req),
      });

      return res.status(201).json({
        success: true,
        token: accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          status: result.user.status,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified,
          contactVerification: serializeContactVerification(result.user),
          orgId: result.org.id,
          orgName: result.org.name,
          orgSlug: result.org.slug,
          orgType: "WHITELABEL",
          whiteLabelConfig: result.org.whiteLabelConfig || null,
          whitelabelOnboarding: serializeWhitelabelOnboarding(result.org),
          subscriptionStatus: result.org.subscriptionStatus || "TRIAL",
          betaAccess: result.org.betaAccess || false,
          isTestAccount: result.org.isTestAccount || false,
          plan: serializePlan(result.org.planObj || { name: result.org.plan || "Free" }),
          usage: {
            leads: result.org._count?.leads || 0,
          },
        },
      });
    } catch (error) {
      console.error("[REGISTER_CUSTOM_DOMAIN_ADMIN_ERROR]", error);
      return res.status(500).json({ error: "Falha ao criar usuario do white-label." });
    }
  });

  // ==================== REGISTER WHITELABEL ====================
  router.post("/register/whitelabel", async (req, res) => {
    const { name, email, phone, password, organizationName, brandName, logoUrl, primaryColor, secondaryColor } = req.body;

    if (!name || !email || !phone || !password || !organizationName) {
      return res.status(400).json({
        error: "Todos os campos (nome, email, telefone, senha, nome da agência) são obrigatórios.",
      });
    }

    const contact = validateSignupContact({ email, phone });
    if (!contact.ok) return res.status(400).json({ error: contact.error });

    const passwordError = assertStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    try {
      const tenantDomain = await findTenantHostContext(
        prisma,
        req.headers["x-forwarded-host"] || req.headers.host
      );
      if (tenantDomain) {
        return res.status(403).json({
          error: "Cadastro indisponivel neste dominio.",
          code: "CUSTOM_DOMAIN_REGISTRATION_DISABLED",
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email: contact.email } });
      if (existingUser)
        return res.status(400).json({ error: "Este email já está em uso." });
      const existingPhone = await prisma.user.findUnique({
        where: { phoneNormalized: contact.phoneNormalized },
      });
      if (existingPhone)
        return res.status(400).json({ error: "Este telefone ja esta em uso." });

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await prisma.$transaction(async (tx) => {
        const wlConfig: Record<string, any> = {
          name: brandName || organizationName,
        };
        if (logoUrl) wlConfig.logoUrl = logoUrl;
        if (primaryColor) wlConfig.primaryColor = primaryColor;
        if (secondaryColor) wlConfig.secondaryColor = secondaryColor;

        const org = await tx.organization.create({
          data: {
            name: organizationName,
            type: "WHITELABEL",
            slug: await generateUniqueOrganizationSlug(tx, organizationName),
            domain: contact.domain,
            plan: "Free",
            whiteLabelConfig: wlConfig,
            settings: { whitelabelOnboardingStep: 1, whitelabelOnboardingComplete: false },
          },
        });
        const user = await tx.user.create({
          data: {
            name,
            email: contact.email,
            phone: contact.phone,
            phoneNormalized: contact.phoneNormalized,
            password: hashedPassword,
            role: "ORG_ADMIN",
            organizationId: org.id,
          },
        });
        return { user, org };
      });

      const accessToken = generateAccessToken({
        id: result.user.id,
        orgId: result.org.id,
        role: result.user.role,
      });

      const refreshToken = generateRefreshToken({
        id: result.user.id,
        orgId: result.org.id,
      });
      setRefreshTokenCookie(res, refreshToken);

      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await prisma.refreshToken.create({
        data: {
          token: refreshTokenHash,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ip: getClientIp(req),
          userAgent: getClientUA(req),
        },
      });

      logAudit({
        organizationId: result.org.id,
        userId: result.user.id,
        action: "CREATE",
        resource: "Organization",
        resourceId: result.org.id,
        ip: getClientIp(req),
        userAgent: getClientUA(req),
      });

      res.status(201).json({
        token: accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified,
          contactVerification: serializeContactVerification(result.user),
          orgId: result.org.id,
          orgName: result.org.name,
          orgSlug: result.org.slug,
          orgType: "WHITELABEL",
        },
      });
    } catch (error) {
      console.error("[REGISTER_WHITELABEL_ERROR]", error);
      res.status(500).json({ error: "Falha ao registrar parceiro whitelabel." });
    }
  });

  // ==================== REGISTER ====================
  router.post("/register", async (req, res) => {
    const { name, email, phone, password, organizationName, planId } = req.body;

    if (!name || !email || !phone || !password || !organizationName) {
      return res.status(400).json({
        error:
          "Todos os campos (nome, email, telefone, senha, nome da agência) são obrigatórios.",
      });
    }

    const contact = validateSignupContact({ email, phone });
    if (!contact.ok) return res.status(400).json({ error: contact.error });

    const passwordError = assertStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    try {
      const tenantDomain = await findTenantHostContext(
        prisma,
        req.headers["x-forwarded-host"] || req.headers.host
      );
      if (tenantDomain) {
        return res.status(403).json({
          error: "Cadastro indisponivel neste dominio.",
          code: "CUSTOM_DOMAIN_REGISTRATION_DISABLED",
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email: contact.email } });
      if (existingUser)
        return res.status(400).json({ error: "Este email já está em uso." });

      const existingPhone = await prisma.user.findUnique({
        where: { phoneNormalized: contact.phoneNormalized },
      });
      if (existingPhone) {
        return res.status(400).json({ error: "Este telefone ja esta em uso." });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const selectedPlan = planId
        ? await prisma.plan.findFirst({
            where: { id: planId, isActive: true, isPublic: true },
          })
        : await prisma.plan.findFirst({
            where: { isActive: true, isPublic: true },
            orderBy: { priceMonthly: "asc" },
          });

      if (planId && !selectedPlan) {
        return res.status(400).json({ error: "O plano selecionado não está disponível." });
      }

      const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: await generateUniqueOrganizationSlug(tx, organizationName),
            domain: contact.domain,
            plan: selectedPlan?.name || "Free",
            planId: selectedPlan?.id || null,
            subscriptionStatus: "TRIAL",
            trialEndsAt,
          },
        });
        await tx.saaSSubscription.create({
          data: {
            organizationId: org.id,
            planId: selectedPlan?.id || null,
            status: "TRIAL",
            startDate: new Date(),
            trialEndsAt,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndsAt,
            price: 0,
            billingCycle: "MONTHLY",
          },
        });
        const user = await tx.user.create({
          data: {
            name,
            email: contact.email,
            phone: contact.phone,
            phoneNormalized: contact.phoneNormalized,
            password: hashedPassword,
            role: "ORG_ADMIN",
            organizationId: org.id,
          },
        });
        return { user, org };
      });

      const accessToken = generateAccessToken({
        id: result.user.id,
        orgId: result.org.id,
        role: result.user.role,
      });

      const refreshToken = generateRefreshToken({
        id: result.user.id,
        orgId: result.org.id,
      });
      setRefreshTokenCookie(res, refreshToken);

      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await prisma.refreshToken.create({
        data: {
          token: refreshTokenHash,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ip: getClientIp(req),
          userAgent: getClientUA(req),
        },
      });

      // Audit log
      logAudit({
        organizationId: result.org.id,
        userId: result.user.id,
        action: "CREATE",
        resource: "Organization",
        resourceId: result.org.id,
        ip: getClientIp(req),
        userAgent: getClientUA(req),
      });

      res.status(201).json({
        token: accessToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified,
          contactVerification: serializeContactVerification(result.user),
          orgId: result.org.id,
          orgName: result.org.name,
          orgSlug: result.org.slug,
          orgType: result.org.type || "CLIENT",
          subscriptionStatus: "TRIAL",
          trialEndsAt,
          plan: selectedPlan
            ? { id: selectedPlan.id, name: selectedPlan.name, slug: selectedPlan.slug }
            : { name: "Free" },
        },
      });
    } catch (error) {
      console.error("[REGISTER_ERROR]", error);
      res.status(500).json({ error: "Falha ao registrar agência." });
    }
  });

  // ==================== ME ====================
  router.get("/me", async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    try {
      const decoded: any = jwt.verify(token, getJwtSecret());
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          organization: {
            include: {
              planObj: planWithFeatures,
              _count: {
                select: { leads: true },
              },
            },
          },
          accessProfile: true,
        },
      });

      if (!user)
        return res.status(404).json({ error: "User not found" });

      if (!(await ensureUserMatchesTenantDomain(req, res, user.organizationId, user.role))) {
        return;
      }

      const organization = await refreshOrganizationSubscriptionState(prisma, user.organization);
      let orgId = user.organizationId;
      let orgName = organization?.name || "No Org";
      let orgSlug = organization?.slug || "";

      if (user.role === "SUPER_ADMIN" && !orgId) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) {
          orgId = firstOrg.id;
          orgName = firstOrg.name;
          orgSlug = firstOrg.slug || "";
        }
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        contactVerification: serializeContactVerification(user),
        permissions: user.accessProfile
          ? user.accessProfile.permissions
          : user.permissions,
        accessProfileId: user.accessProfileId,
        orgId,
        orgName,
        orgSlug,
        orgType: organization?.type || "CLIENT",
        whiteLabelConfig: organization?.whiteLabelConfig || null,
        whitelabelOnboarding: serializeWhitelabelOnboarding(organization),
        agencyId: user.agencyId,
        subscriptionStatus: organization?.subscriptionStatus || "TRIAL",
        trialEndsAt: organization?.trialEndsAt || null,
        currentPeriodEnd: organization?.currentPeriodEnd || null,
        betaAccess: organization?.betaAccess || false,
        isTestAccount: organization?.isTestAccount || false,
        plan: serializePlan(organization?.planObj || { name: organization?.plan || "Free" }),
        usage: {
          leads: organization?._count?.leads || 0,
        },
      });
    } catch (error: any) {
      console.error("[AUTH_ME_ERROR]", {
        error: error.name,
        message: error.message,
        authHeader: req.headers["authorization"] ? "Present" : "Missing"
      });

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "TOKEN_EXPIRED",
          message: "Token expirado. Use o refresh token para obter um novo.",
        });
      }

      res.status(401).json({ error: "Invalid token" });
    }
  });

  return router;
}
