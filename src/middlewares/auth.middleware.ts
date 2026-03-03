import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const token = header.replace("Bearer ", "").trim();
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role as Express.UserPayload["role"],
      email: payload.email,
      name: payload.name
    };

    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
