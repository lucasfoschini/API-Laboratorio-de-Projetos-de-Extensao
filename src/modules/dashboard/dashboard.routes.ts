import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { DashboardController } from "./dashboard.controller";

const ctrl = new DashboardController();
export const dashboardRoutes = Router();

dashboardRoutes.get("/overview",              authMiddleware, (req, res, next) => ctrl.overview(req, res, next));
dashboardRoutes.get("/notification-summary",  authMiddleware, (req, res, next) => ctrl.notificationSummary(req, res, next));

dashboardRoutes.get("/stats",                 authMiddleware, (req, res, next) => ctrl.stats(req, res, next));
dashboardRoutes.get("/projects",              authMiddleware, (req, res, next) => ctrl.myProjects(req, res, next));
dashboardRoutes.get("/requests/mine",         authMiddleware, (req, res, next) => ctrl.myRequests(req, res, next));
dashboardRoutes.get("/requests/pending",      authMiddleware, (req, res, next) => ctrl.pendingRequests(req, res, next));
dashboardRoutes.get("/subscriptions",         authMiddleware, (req, res, next) => ctrl.mySubscriptions(req, res, next));
dashboardRoutes.get("/subscribed-activity",   authMiddleware, (req, res, next) => ctrl.subscribedActivity(req, res, next));
dashboardRoutes.get("/",                      authMiddleware, (req, res, next) => ctrl.get(req, res, next));