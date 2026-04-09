import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { NotificationController } from "./notification.controller";

const ctrl = new NotificationController();

export const notificationRoutes = Router();

// ── SSE — deve vir antes de /:id para não capturar "stream" como parâmetro ──
notificationRoutes.get("/stream",       authMiddleware, (req, res)       => ctrl.stream(req, res));

notificationRoutes.get("/",             authMiddleware, (req, res, next) => ctrl.list(req, res, next));
notificationRoutes.patch("/read-all",   authMiddleware, (req, res, next) => ctrl.markAllRead(req, res, next));
notificationRoutes.patch("/:id/read",   authMiddleware, (req, res, next) => ctrl.markAsRead(req, res, next));
notificationRoutes.delete("/read",      authMiddleware, (req, res, next) => ctrl.deleteAllRead(req, res, next));

