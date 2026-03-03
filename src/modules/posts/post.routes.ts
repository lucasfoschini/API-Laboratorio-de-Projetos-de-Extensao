import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { PostController } from "./post.controller";

const ctrl = new PostController();
export const postRoutes = Router();

postRoutes.get   ("/:postId",  (req, res, next) => ctrl.getById(req, res, next));
postRoutes.delete("/:postId",  authMiddleware, (req, res, next) => ctrl.delete(req, res, next));
