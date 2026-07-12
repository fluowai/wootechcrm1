import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { creativeAI } from "../services/creativeAI.js";
import { imageAI } from "../services/imageAI.js";

export function opsRoutes(prisma: PrismaClient) {
  const router = Router();
  
  router.get("/", (req, res) => res.json({ message: "Ops routes ready" }));

  // Geração de Roteiro e Imagem Real
  router.post("/generate-creative", async (req: AuthRequest, res) => {
    const { theme, type } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // 1. Gera o roteiro com a IA Mano
      const script = await creativeAI.generateScript(prisma, theme, type, orgId, req.user?.id);
      
      // 2. Tenta gerar uma imagem (opcional, se falhar não trava o texto)
      let imageUrl = "";
      try {
        const firstSlidePrompt = script.slides?.[0]?.headline || theme;
        imageUrl = await imageAI.generate(firstSlidePrompt);
      } catch (e) {
        console.warn("Image generation failed, continuing with text only.");
      }
      
      res.json({ ...script, generatedImage: imageUrl });
    } catch (error) {
      console.error("[OPS_AI_ERROR]", error);
      res.status(500).json({ error: "Falha na geração criativa da IA." });
    }
  });

  // Geração de Imagem Individual para Slide
  router.post("/generate-image", async (req: AuthRequest, res) => {
    const { prompt } = req.body;
    try {
      const imageUrl = await imageAI.generate(prompt);
      res.json({ imageUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Falha ao gerar imagem" });
    }
  });

  return router;
}
