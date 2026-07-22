import { Request, Response, NextFunction } from "express";
import { AiService } from "./ai.service";

const service = new AiService();

export class AiController {
  async suggestTags(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, area, pubType } = req.body;
      if (!title) return res.status(400).json({ message: "title é obrigatório" });
      const result = await service.suggestTags({ title, description, area, pubType });
      res.json({ result });
    } catch (err) {
      next(err);
    }
  }

  async suggestAbstract(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, area, pubType } = req.body;
      if (!title) return res.status(400).json({ message: "title é obrigatório" });
      const result = await service.suggestAbstract({ title, description, area, pubType });
      res.json({ result });
    } catch (err) {
      next(err);
    }
  }
}
