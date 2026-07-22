import { Router } from "express";
import { AiController } from "./ai.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const controller = new AiController();
export const aiRoutes = Router();

// Requer autenticação para evitar uso indevido da cota gratuita
aiRoutes.post("/suggest-tags",     authMiddleware, (req, res, next) => controller.suggestTags(req, res, next));
aiRoutes.post("/suggest-abstract", authMiddleware, (req, res, next) => controller.suggestAbstract(req, res, next));
