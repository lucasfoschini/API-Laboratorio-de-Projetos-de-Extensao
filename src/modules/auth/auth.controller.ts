import { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { cookieOptions } from "../../utils/cookie";
import { env } from "../../config/env";

const authService = new AuthService();

// Duração dos cookies de autenticação
const ACCESS_TOKEN_MAX_AGE  = 60 * 60 * 1000;          // 1h (igual ao JWT_EXPIRES_IN)
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role, department, institution } = req.body;
      const result = await authService.register({ name, email, password, role, department, institution });

      // Setar cookies HttpOnly — tokens saem do body
      res.cookie("labativo_access_token",  result.accessToken,  cookieOptions(ACCESS_TOKEN_MAX_AGE));
      res.cookie("labativo_refresh_token", result.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

      res.status(201).json({ user: result.user });
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      // Setar cookies HttpOnly — tokens saem do body
      res.cookie("labativo_access_token",  result.accessToken,  cookieOptions(ACCESS_TOKEN_MAX_AGE));
      res.cookie("labativo_refresh_token", result.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

      res.status(200).json({ user: result.user });
    } catch (error) { next(error); }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Lê o refreshToken do cookie ou do body (compatibilidade com Insomnia/Postman)
      const refreshToken = req.cookies?.["labativo_refresh_token"] ?? req.body.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ message: "Refresh token não fornecido." });
        return;
      }
      const result = await authService.refresh(refreshToken);

      // Renova os cookies HttpOnly
      res.cookie("labativo_access_token",  result.accessToken,  cookieOptions(ACCESS_TOKEN_MAX_AGE));
      res.cookie("labativo_refresh_token", result.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

      res.status(200).json({ user: result.user });
    } catch (error) { next(error); }
  }

  async logout(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      res.clearCookie("labativo_access_token",  { path: "/", sameSite: "strict", secure: env.NODE_ENV === "production" });
      res.clearCookie("labativo_refresh_token", { path: "/", sameSite: "strict", secure: env.NODE_ENV === "production" });
      res.status(200).json({ message: "Logout realizado com sucesso." });
    } catch (error) { _next(error); }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const user = await authService.updateMe(req.user.id, req.body);
      res.status(200).json(user);
    } catch (error) { next(error); }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      res.status(200).json(result);
    } catch (error) { next(error); }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ message: "Unauthorized" }); return; }
      const user = await authService.me(req.user.id);
      res.status(200).json(user);
    } catch (error) { next(error); }
  }
}