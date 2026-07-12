import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import { assertStrongPassword } from "../utils/security.js";
import {
  normalizeBrazilianPhone,
  validateEmailAddress,
} from "../utils/contactValidation.js";

export function teamRoutes(prisma: PrismaClient) {
  const router = Router();

  // List organization members
  router.get("/members", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    try {
      const members = await prisma.user.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emailVerified: true,
          phoneVerified: true,
          role: true,
          status: true,
          permissions: true,
          accessProfileId: true,
          accessProfile: { select: { name: true } },
          createdAt: true
        }
      });
      res.json(Array.isArray(members) ? members : []);
    } catch (error) {
      res.status(500).json({ error: "Falha ao buscar membros da equipe." });
    }
  });

  // Create new member
  router.post("/members", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { name, email, phone, role, permissions, accessProfileId } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: "Nome, e-mail e telefone sao obrigatorios." });
    }

    const emailResult = validateEmailAddress(email);
    if (!emailResult.ok) return res.status(400).json({ error: emailResult.error });
    const phoneResult = normalizeBrazilianPhone(phone);
    if (!phoneResult.ok) return res.status(400).json({ error: phoneResult.error });

    let { password } = req.body;
    password = typeof password === "string" ? password.trim() : password;
    const passwordError = assertStrongPassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    // Prevenção de Escalabilidade de Privilégios
    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Apenas Super Admins podem criar outros Super Admins." });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email: emailResult.email } });
      if (existingUser) return res.status(400).json({ error: "E-mail já cadastrado." });
      const existingPhone = await prisma.user.findUnique({
        where: { phoneNormalized: phoneResult.normalized },
      });
      if (existingPhone) return res.status(400).json({ error: "Telefone ja cadastrado." });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email: emailResult.email,
          phone: phoneResult.raw,
          phoneNormalized: phoneResult.normalized,
          password: hashedPassword,
          role: role || 'USER',
          permissions: permissions || {},
          accessProfileId: accessProfileId || null,
          organizationId: orgId,
          status: 'ACTIVE'
        }
      });

      const { password: _password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Falha ao criar membro." });
    }
  });

  // Update member permissions
  router.patch("/members/:id/permissions", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { name, email, phone, permissions, accessProfileId, role, status } = req.body;
    let { password } = req.body;
    password = typeof password === "string" ? password.trim() : password;

    if (password) {
      const passwordError = assertStrongPassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
    }

    // Prevenção de Escalabilidade de Privilégios
    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Apenas Super Admins podem promover usuários a Super Admin." });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!user) return res.status(404).json({ error: "Membro não encontrado." });

      let nextEmail = email;
      if (email !== undefined) {
        const emailResult = validateEmailAddress(email);
        if (!emailResult.ok) return res.status(400).json({ error: emailResult.error });
        nextEmail = emailResult.email;
      }

      let nextPhone: string | undefined;
      let nextPhoneNormalized: string | undefined;
      if (phone !== undefined) {
        const phoneResult = normalizeBrazilianPhone(phone);
        if (!phoneResult.ok) return res.status(400).json({ error: phoneResult.error });
        nextPhone = phoneResult.raw;
        nextPhoneNormalized = phoneResult.normalized;
      }

      if (nextEmail && nextEmail !== user.email) {
        const emailConflict = await prisma.user.findFirst({
          where: { email: nextEmail, NOT: { id: req.params.id } }
        });
        if (emailConflict) return res.status(400).json({ error: "E-mail jÃ¡ cadastrado." });
      }
      if (nextPhoneNormalized && nextPhoneNormalized !== user.phoneNormalized) {
        const phoneConflict = await prisma.user.findFirst({
          where: { phoneNormalized: nextPhoneNormalized, NOT: { id: req.params.id } }
        });
        if (phoneConflict) return res.status(400).json({ error: "Telefone ja cadastrado." });
      }

      const data: any = {
        ...(name !== undefined && { name }),
        ...(nextEmail !== undefined && { email: nextEmail, emailVerified: false }),
        ...(nextPhone !== undefined && { phone: nextPhone, phoneNormalized: nextPhoneNormalized, phoneVerified: false }),
        ...(permissions !== undefined && { permissions }),
        ...(accessProfileId !== undefined && { accessProfileId }),
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status }),
      };

      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data
      });

      const { password: _password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Falha ao atualizar permissões." });
    }
  });

  // Delete member
  router.delete("/members/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!user) return res.status(404).json({ error: "Membro não encontrado." });
      if (user.role === 'ORG_ADMIN') return res.status(400).json({ error: "Não é possível excluir o administrador da organização." });

      await prisma.user.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Falha ao excluir membro." });
    }
  });

  return router;
}
