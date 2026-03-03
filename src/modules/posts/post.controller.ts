import { NextFunction, Request, Response } from "express";
import { PostService } from "./post.service";

const svc = new PostService();

export class PostController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.status(201).json(await svc.create(req.params.id as string, req.user.id, req.body));
    } catch (e) { next(e); }
  }
  async listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page  = parseInt(String(req.query.page  ?? "1"));
      const limit = parseInt(String(req.query.limit ?? "10"));
      res.json(await svc.listByProject(req.params.id as string, page, limit));
    } catch (e) { next(e); }
  }
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json(await svc.getById(req.params.postId as string)); } catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      res.json(await svc.delete(req.params.postId as string, req.user.id));
    } catch (e) { next(e); }
  }
}
