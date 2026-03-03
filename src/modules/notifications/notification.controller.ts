import { NextFunction, Request, Response } from "express";
import { NotificationService } from "./notification.service";

const svc = new NotificationService();

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.list(req.user.id));
    } catch (e) { next(e); }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.markAsRead(req.params.id, req.user.id));
    } catch (e) { next(e); }
  }
}
