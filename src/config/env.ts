import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:              z.enum(["development", "test", "production"]).default("development"),
  PORT:                  z.coerce.number().default(3333),
  DATABASE_URL:          z.string().min(1),
  JWT_SECRET:            z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres"),
  JWT_REFRESH_SECRET:    z.string().min(32).optional(), // se não definido, usa JWT_SECRET + sufixo
  JWT_EXPIRES_IN:        z.string().default("15m"),
  JWT_REFRESH_IN:        z.string().default("7d"),
  CORS_ORIGIN:           z.string().min(1, "CORS_ORIGIN é obrigatório. Defina a URL do frontend (ex: https://seusite.com)"),
  BCRYPT_SALT_ROUNDS:    z.coerce.number().min(10).max(16).default(12),
  RATE_LIMIT_WINDOW_MS:  z.coerce.number().default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_MAX:        z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX:   z.coerce.number().default(10), // login/register
  RESEND_API_KEY: z.string().min(1),
  FRONTEND_URL:   z.string().url().default("http://localhost:3000"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

const data = parsed.data;

export const env = {
  ...data,
  JWT_REFRESH_SECRET: data.JWT_REFRESH_SECRET ?? `${data.JWT_SECRET}_refresh`,
};
