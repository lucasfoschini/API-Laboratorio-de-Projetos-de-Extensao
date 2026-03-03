import { NextFunction, Request, Response } from "express";
import { ProjectService } from "./project.service";

const svc = new ProjectService();

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.status(201).json(await svc.create(req.body, req.user.id));
    } catch (e) { next(e); }
  }
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await svc.getAll()); } catch (e) { next(e); }
  }
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await svc.getById(req.params.id as string)); } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.update(req.params.id as string, req.body, req.user.id));
    } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.delete(req.params.id as string, req.user.id));
    } catch (e) { next(e); }
  }
  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.subscribe(req.params.id as string, req.user.id));
    } catch (e) { next(e); }
  }
  async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.unsubscribe(req.params.id as string, req.user.id));
    } catch (e) { next(e); }
  }
  async subscriptionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.getSubscriptionStatus(req.params.id as string, req.user.id));
    } catch (e) { next(e); }
  }
  async leave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.leave(req.params.id as string, req.user.id));
    } catch (e) { next(e); }
  }
  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.removeMember(req.params.id as string, req.params.userId as string, req.user.id));
    } catch (e) { next(e); }
  }
}
