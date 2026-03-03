import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:              z.enum(["development", "test", "production"]).default("development"),
  PORT:                  z.coerce.number().default(3333),
  DATABASE_URL:          z.string().min(1),
  JWT_SECRET:            z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres"),
  JWT_REFRESH_SECRET:    z.string().min(32).optional(), // se não definido, usa JWT_SECRET + sufixo
  JWT_EXPIRES_IN:        z.string().default("15m"),
  JWT_REFRESH_IN:        z.string().default("7d"),
  CORS_ORIGIN:           z.string().default("*"),
  BCRYPT_SALT_ROUNDS:    z.coerce.number().min(10).max(16).default(12),
  RATE_LIMIT_WINDOW_MS:  z.coerce.number().default(15 * 60 * 1000), // 15 min
  RATE_LIMIT_MAX:        z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX:   z.coerce.number().default(10), // login/register
  // SMTP (e-mail)
  SMTP_HOST:             z.string().default("smtp.gmail.com"),
  SMTP_PORT:             z.coerce.number().default(587),
  SMTP_USER:             z.string().optional(),
  SMTP_PASS:             z.string().optional(),
  SMTP_FROM_NAME:        z.string().default("Laboratório Ativo"),
  FRONTEND_URL:          z.string().default("http://localhost:3000"),
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
