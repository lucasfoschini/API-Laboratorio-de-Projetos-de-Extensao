import { NextFunction, Request, Response } from "express";
import { DashboardService } from "./dashboard.service";

const svc = new DashboardService();

export class DashboardController {
  async stats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.stats(req.user.id));
    } catch (e) { next(e); }
  }
  async myProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.myProjects(req.user.id));
    } catch (e) { next(e); }
  }
  async myRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.myRequests(req.user.id));
    } catch (e) { next(e); }
  }
  async pendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.pendingRequests(req.user.id));
    } catch (e) { next(e); }
  }
  async mySubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.mySubscriptions(req.user.id));
    } catch (e) { next(e); }
  }
  async subscribedActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.subscribedActivity(req.user.id));
    } catch (e) { next(e); }
  }
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.stats(req, res, next);
  }
}
