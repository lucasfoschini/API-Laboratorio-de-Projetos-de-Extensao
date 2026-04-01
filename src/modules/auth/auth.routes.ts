import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { AuthController } from "./auth.controller";
import {
  loginSchema, registerSchema, refreshSchema,
  updateMeSchema, forgotPasswordSchema, resetPasswordSchema,
} from "./auth.validation";
import { env } from "../../config/env";

const controller = new AuthController();

export const authRoutes = Router();

authRoutes.post("/register",        validate(registerSchema),       (req, res, next) => controller.register(req, res, next));
authRoutes.post("/login",           validate(loginSchema),          (req, res, next) => controller.login(req, res, next));

// Refresh: lê token do cookie ou do body (compatibilidade com Insomnia/Postman)
authRoutes.post("/refresh",         validate(refreshSchema),         (req, res, next) => controller.refresh(req, res, next));

// Logout: limpa os cookies de autenticação
authRoutes.post("/logout", (_req, res) => {
  const clearOpts = { path: "/", sameSite: "strict" as const, secure: env.NODE_ENV === "production" };
  res.clearCookie("labativo_access_token",  clearOpts);
  res.clearCookie("labativo_refresh_token", clearOpts);
  res.json({ message: "Logout realizado com sucesso." });
});

authRoutes.get ("/me",              authMiddleware,                  (req, res, next) => controller.me(req, res, next));
authRoutes.patch("/me",             authMiddleware, validate(updateMeSchema), (req, res, next) => controller.updateMe(req, res, next));
authRoutes.post("/forgot-password", validate(forgotPasswordSchema), (req, res, next) => controller.forgotPassword(req, res, next));
authRoutes.post("/reset-password",  validate(resetPasswordSchema),  (req, res, next) => controller.resetPassword(req, res, next));
