import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { AuthController } from "./auth.controller";
import { forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema, updateMeSchema } from "./auth.validation";

const controller = new AuthController();

export const authRoutes = Router();

authRoutes.post("/register",        validate(registerSchema),       (req, res, next) => controller.register(req, res, next));
authRoutes.post("/login",           validate(loginSchema),          (req, res, next) => controller.login(req, res, next));
authRoutes.post("/refresh",         validate(refreshSchema),        (req, res, next) => controller.refresh(req, res, next));
authRoutes.post("/forgot-password", validate(forgotPasswordSchema), (req, res, next) => controller.forgotPassword(req, res, next));
authRoutes.post("/reset-password",  validate(resetPasswordSchema),  (req, res, next) => controller.resetPassword(req, res, next));
authRoutes.get ("/me",              authMiddleware,                  (req, res, next) => controller.me(req, res, next));
authRoutes.patch("/me",              authMiddleware, validate(updateMeSchema), (req, res, next) => controller.updateMe(req, res, next));
