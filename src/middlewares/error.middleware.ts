import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error";

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  // Log no servidor para debug, mas nunca exponha detalhes ao client
  console.error(`[ERROR] ${new Date().toISOString()}`, error.message, error.stack);
  res.status(500).json({ message: "Internal server error" });
}
