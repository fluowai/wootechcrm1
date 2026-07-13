import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function financeRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar Faturas
  router.get("/invoices", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const invoices = await prisma.invoice.findMany({
        where: { organizationId: orgId },
        include: { client: { select: { corporateName: true } } },
        orderBy: { dueDate: 'asc' }
      });
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

  // Criar Fatura
  router.post("/invoices", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const { clientId, amount, dueDate, description, status } = req.body;
    try {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          organizationId: orgId as string,
          clientId,
          total: parseFloat(amount),
          dueDate: new Date(dueDate),
          description,
          status: status || 'pendente'
        }
      });
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  });

  // Listar Despesas
  router.get("/expenses", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const expenses = await prisma.expense.findMany({
        where: { organizationId: orgId },
        orderBy: { date: 'desc' }
      });
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  // Criar Despesa
  router.post("/expenses", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const { title, amount, category, date, description } = req.body;
    try {
      const expense = await prisma.expense.create({
        data: {
          description: title || description,
          amount: parseFloat(amount),
          category,
          date: new Date(date),
          organizationId: orgId as string
        }
      });
      res.json(expense);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard Financeiro
  router.get("/overview", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const [revenue, pending, expenses] = await Promise.all([
        prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'paga' }, _sum: { total: true } }),
        prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'pendente' }, _sum: { total: true } }),
        prisma.expense.aggregate({ where: { organizationId: orgId }, _sum: { amount: true } })
      ]);

      res.json({
        balance: Number(revenue._sum.total || 0) - Number(expenses._sum.amount || 0),
        revenue: Number(revenue._sum.total || 0),
        pending: Number(pending._sum.total || 0),
        expenses: Number(expenses._sum.amount || 0)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
