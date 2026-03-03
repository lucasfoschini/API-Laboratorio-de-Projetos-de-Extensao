import { NextFunction, Request, Response } from "express";
import { MemberRequestService } from "./member-request.service";
import { MemberRequestStatus } from "@prisma/client";

const svc = new MemberRequestService();

export class MemberRequestController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.status(201).json(await svc.create(req.params.id as string, req.user.id, req.body.message));
    } catch (e) { next(e); }
  }
  async listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.listByProject(req.params.id as string, req.user.id));
    } catch (e) { next(e); }
  }
  async review(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.review(req.params.requestId as string, req.user.id, req.body.status as MemberRequestStatus));
    } catch (e) { next(e); }
  }
  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.listMine(req.user.id));
    } catch (e) { next(e); }
  }
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.cancel(req.params.requestId as string, req.user.id));
    } catch (e) { next(e); }
  }
}
