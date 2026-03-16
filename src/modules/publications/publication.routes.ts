import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { PublicationController } from "./publication.controller";
import { createPublicationSchema, publicationIdParamSchema, updatePublicationSchema } from "./publication.validation";

const controller = new PublicationController();

export const publicationRoutes = Router();

publicationRoutes.get("/",    (req: Request, res: Response, next: NextFunction) => controller.getAll(req, res, next));
publicationRoutes.get("/:id", validate(publicationIdParamSchema), (req: Request, res: Response, next: NextFunction) => controller.getById(req, res, next));

// Publicações pendentes de um projeto
publicationRoutes.get(
  "/pending/:projectId",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => controller.getPending(req, res, next),
);

// Criar publicação
publicationRoutes.post(
  "/",
  authMiddleware, validate(createPublicationSchema),
  (req: Request, res: Response, next: NextFunction) => controller.create(req, res, next),
);

// Professor aprova publicação
publicationRoutes.patch(
  "/:id/approve",
  authMiddleware, validate(publicationIdParamSchema),
  (req: Request, res: Response, next: NextFunction) => controller.approve(req, res, next),
);

// Professor envia sugestões ao autor
publicationRoutes.post(
  "/:id/suggest",
  authMiddleware, validate(publicationIdParamSchema),
  (req: Request, res: Response, next: NextFunction) => controller.suggest(req, res, next),
);

// Professor recusa publicação
publicationRoutes.patch(
  "/:id/reject",
  authMiddleware, validate(publicationIdParamSchema),
  (req: Request, res: Response, next: NextFunction) => controller.reject(req, res, next),
);

publicationRoutes.delete(
  "/:id",
  authMiddleware, validate(publicationIdParamSchema),
  (req: Request, res: Response, next: NextFunction) => controller.delete(req, res, next),
);

publicationRoutes.patch(
  "/:id",
  authMiddleware, validate(updatePublicationSchema),
  (req: Request, res: Response, next: NextFunction) => controller.update(req, res, next),
);