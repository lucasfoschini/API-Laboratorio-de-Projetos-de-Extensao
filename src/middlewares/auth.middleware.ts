import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Tenta cookie primeiro, depois header Authorization (compatibilidade com Insomnia/Postman)
  const cookieToken = req.cookies?.["labativo_access_token"];
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.replace("Bearer ", "").trim()
    : null;

  const token = cookieToken ?? headerToken;

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id:    payload.sub,
      role:  payload.role as Express.UserPayload["role"],
      email: payload.email,
      name:  payload.name,
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Tenta cookie primeiro, depois header Authorization
  const cookieToken = req.cookies?.["labativo_access_token"];
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.replace("Bearer ", "").trim()
    : null;

  const token = cookieToken ?? headerToken;

  if (token) {
    try {
      const payload = verifyAccessToken(token);

      req.user = {
        id:    payload.sub,
        role:  payload.role as Express.UserPayload["role"],
        email: payload.email,
        name:  payload.name,
      };
    } catch {
      // token inválido ou expirado — ignora silenciosamente
    }
  }

  next();
}