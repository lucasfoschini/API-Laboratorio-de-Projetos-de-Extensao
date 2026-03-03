import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { MemberRequestController } from "./member-request.controller";

const ctrl = new MemberRequestController();
export const memberRequestRoutes = Router();

memberRequestRoutes.get   ("/my",            authMiddleware, (req, res, next) => ctrl.listMine(req, res, next));
memberRequestRoutes.patch ("/:requestId",    authMiddleware, (req, res, next) => ctrl.review(req, res, next));
memberRequestRoutes.delete("/:requestId",    authMiddleware, (req, res, next) => ctrl.cancel(req, res, next));
