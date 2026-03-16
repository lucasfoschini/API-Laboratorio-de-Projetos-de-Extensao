import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { ProjectController } from "./project.controller";
import { MemberRequestController } from "../member-requests/member-request.controller";
import { PostController } from "../posts/post.controller";
import { createPostSchema } from "../posts/post.validation";
import { createProjectSchema, projectIdParamSchema, updateProjectSchema } from "./project.validation";

const ctrl     = new ProjectController();
const reqCtrl  = new MemberRequestController();
const postCtrl = new PostController();

export const projectRoutes = Router();

// ── Públicas ──────────────────────────────────────────────────────────────────
projectRoutes.get("/",    (req, res, next) => ctrl.getAll(req, res, next));
// getById usa optionalAuth para incluir subscriptionStatus e activities quando logado
projectRoutes.get("/:id", optionalAuthMiddleware, validate(projectIdParamSchema), (req, res, next) => ctrl.getById(req, res, next));

// ── Autenticadas ──────────────────────────────────────────────────────────────
projectRoutes.post("/",    authMiddleware, validate(createProjectSchema), (req, res, next) => ctrl.create(req, res, next));
projectRoutes.patch("/:id", authMiddleware, validate(updateProjectSchema), (req, res, next) => ctrl.update(req, res, next));
projectRoutes.delete("/:id", authMiddleware, validate(projectIdParamSchema), (req, res, next) => ctrl.delete(req, res, next));

// ── Inscrição / acompanhar ────────────────────────────────────────────────────
projectRoutes.post  ("/:id/subscribe", authMiddleware, (req, res, next) => ctrl.subscribe(req, res, next));
projectRoutes.delete("/:id/subscribe", authMiddleware, (req, res, next) => ctrl.unsubscribe(req, res, next));
projectRoutes.get   ("/:id/subscribe", authMiddleware, (req, res, next) => ctrl.subscriptionStatus(req, res, next));

// ── Solicitações de entrada ───────────────────────────────────────────────────
projectRoutes.post("/:id/join-request",  authMiddleware, (req, res, next) => reqCtrl.create(req, res, next));
projectRoutes.get ("/:id/join-requests", authMiddleware, (req, res, next) => reqCtrl.listByProject(req, res, next));

// ── Posts / atualizações ─────────────────────────────────────────────────────
projectRoutes.get ("/:id/posts", (req, res, next) => postCtrl.listByProject(req, res, next));
projectRoutes.post("/:id/posts", authMiddleware, validate(createPostSchema), (req, res, next) => postCtrl.create(req, res, next));

// ── Sair / Remover membro ─────────────────────────────────────────────────────
projectRoutes.delete("/:id/leave",           authMiddleware, (req, res, next) => ctrl.leave(req, res, next));
projectRoutes.delete("/:id/members/:userId", authMiddleware, (req, res, next) => ctrl.removeMember(req, res, next));