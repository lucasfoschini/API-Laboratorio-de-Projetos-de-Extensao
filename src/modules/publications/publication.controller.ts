import { NextFunction, Request, Response } from "express";
import { PublicationService } from "./publication.service";

const publicationService = new PublicationService();

export class PublicationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const pub = await publicationService.create({
        ...req.body,
        userId:   req.user.id,
        userRole: req.user.role,
      });
      res.status(201).json(pub);
    } catch (error) { next(error); }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page  = Math.max(1, (typeof req.query.page  === "string" ? parseInt(req.query.page)  : 0) || 1);
      const limit = Math.min(50, Math.max(1, (typeof req.query.limit === "string" ? parseInt(req.query.limit) : 0) || 12));
      const type  = typeof req.query.type === "string" ? req.query.type    : undefined;
      const yearN = typeof req.query.year === "string" ? parseInt(req.query.year) : NaN;
      const year  = Number.isFinite(yearN) ? yearN : undefined;

      const filters: { type?: string; year?: number } = {};
      if (type) filters.type = type;
      if (year) filters.year = year;

      const result = await publicationService.getAll(page, limit, filters);
      res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pub = await publicationService.getById(req.params.id as string);
      res.status(200).json(pub);
    } catch (error) { next(error); }
  }

  async getPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const pubs = await publicationService.getPending(req.params.projectId as string);
      res.status(200).json(pubs);
    } catch (error) { next(error); }
  }

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const pub = await publicationService.approve(req.params.id as string, req.user.id);
      res.status(200).json(pub);
    } catch (error) { next(error); }
  }

  async suggest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const result = await publicationService.suggest(
        req.params.id as string,
        req.user.id,
        req.body.suggestion,
      );
      res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const result = await publicationService.reject(
        req.params.id as string,
        req.user.id,
        req.body.reason,
      );
      res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      await publicationService.delete(req.params.id as string, req.user.id);
      res.status(204).send();
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const pub = await publicationService.update(req.params.id as string, req.user.id, req.body);
      res.status(200).json(pub);
    } catch (error) { next(error); }
  }
}