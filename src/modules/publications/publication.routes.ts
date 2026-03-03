import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { PublicationController } from "./publication.controller";
import { createPublicationSchema, publicationIdParamSchema, updatePublicationSchema } from "./publication.validation";

const controller = new PublicationController();

export const publicationRoutes = Router();

publicationRoutes.get("/",    (req, res, next) => controller.getAll(req, res, next));
publicationRoutes.get("/:id", validate(publicationIdParamSchema), (req, res, next) => controller.getById(req, res, next));

// Qualquer usuário autenticado pode criar publicações (alunos e professores)
publicationRoutes.post(
  "/",
  authMiddleware, validate(createPublicationSchema),
  (req, res, next) => controller.create(req, res, next),
);

publicationRoutes.delete(
  "/:id",
  authMiddleware, validate(publicationIdParamSchema),
  (req, res, next) => controller.delete(req, res, next),
);

publicationRoutes.patch(
  "/:id",
  authMiddleware, validate(updatePublicationSchema),
  (req, res, next) => controller.update(req, res, next),
);
