import type { CookieOptions } from "express";
import { env } from "../config/env";

export function cookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure:   env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax", // "none" + secure para cross-domain
    path:     "/",
    maxAge:   maxAgeMs,
  };
}
