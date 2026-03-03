import { NextFunction, Request, Response } from "express";
import { PublicationService } from "./publication.service";

const publicationService = new PublicationService();

export class PublicationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const pub = await publicationService.create({ ...req.body, userId: req.user.id });
      res.status(201).json(pub);
    } catch (error) { next(error); }
  }

  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pubs = await publicationService.getAll();
      res.status(200).json(pubs);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pub = await publicationService.getById(req.params.id as string);
      res.status(200).json(pub);
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
