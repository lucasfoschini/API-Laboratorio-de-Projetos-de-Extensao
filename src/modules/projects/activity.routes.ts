import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { ActivityService } from "./activity.service";

const service = new ActivityService();

export const activityRoutes = Router({ mergeParams: true });

// GET /projects/:projectId/activities
activityRoutes.get("/", authMiddleware, async (req: Request<{ projectId: string }>, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const activities = await service.listByProject(req.params.projectId, userId);
    res.json(activities);
  } catch (e) { next(e); }
});

// GET /projects/:projectId/activities/:activityId
activityRoutes.get("/:activityId", authMiddleware, async (req: Request<{ projectId: string; activityId: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
    const activity = await service.getById(req.params.activityId, req.user.id);
    res.json(activity);
  } catch (e) { next(e); }
});

// POST /projects/:projectId/activities
activityRoutes.post("/", authMiddleware, async (req: Request<{ projectId: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
    const activity = await service.create(req.params.projectId, req.user.id, req.body);
    res.status(201).json(activity);
  } catch (e) { next(e); }
});

// PATCH /projects/:projectId/activities/:activityId/toggle
activityRoutes.patch("/:activityId/toggle", authMiddleware, async (req: Request<{ projectId: string; activityId: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
    const activity = await service.toggleDone(req.params.activityId, req.user.id);
    res.json(activity);
  } catch (e) { next(e); }
});

// DELETE /projects/:projectId/activities/:activityId
activityRoutes.delete("/:activityId", authMiddleware, async (req: Request<{ projectId: string; activityId: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
    const result = await service.delete(req.params.activityId, req.user.id);
    res.json(result);
  } catch (e) { next(e); }
});