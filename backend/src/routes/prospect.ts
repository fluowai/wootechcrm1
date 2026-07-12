import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { 
  getMissions, 
  createMission, 
  getMissionById, 
  updateMission,
  deleteMission,
  runMission,
  pauseMission,
  resumeMission,
  cancelMission,
  getLeads,
  getMissionLeads,
  getDashboardMetrics
} from "../controllers/prospectController.js";

export const prospectRoutes = (prisma: PrismaClient) => {
  const router = Router();

  // Dashboard e Métricas
  router.get("/dashboard", (req, res, next) => getDashboardMetrics(req, res, next, prisma));
  router.get("/metrics", (req, res, next) => getDashboardMetrics(req, res, next, prisma));

  // Missões
  router.get("/missions", (req, res, next) => getMissions(req, res, next, prisma));
  router.post("/missions", (req, res, next) => createMission(req, res, next, prisma));
  router.get("/missions/:id", (req, res, next) => getMissionById(req, res, next, prisma));
  router.put("/missions/:id", (req, res, next) => updateMission(req, res, next, prisma));
  router.delete("/missions/:id", (req, res, next) => deleteMission(req, res, next, prisma));
  
  // Ações de Missões
  router.post("/missions/:id/run", (req, res, next) => runMission(req, res, next, prisma));
  router.post("/missions/:id/pause", (req, res, next) => pauseMission(req, res, next, prisma));
  router.post("/missions/:id/resume", (req, res, next) => resumeMission(req, res, next, prisma));
  router.post("/missions/:id/cancel", (req, res, next) => cancelMission(req, res, next, prisma));

  // Leads
  router.get("/leads", (req, res, next) => getLeads(req, res, next, prisma));
  router.get("/missions/:id/leads", (req, res, next) => getMissionLeads(req, res, next, prisma));

  return router;
};
