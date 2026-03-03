import { z } from "zod";
import { Role } from "@prisma/client";

const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(128, "Senha deve ter no máximo 128 caracteres")
  .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número");

export const registerSchema = z.object({
  body: z.object({
    name:        z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
    email:       z.string().email("E-mail inválido").max(255).transform((e) => e.toLowerCase().trim()),
    password:    passwordSchema,
    role:        z.nativeEnum(Role),
    department:  z.string().min(2).max(100).optional(),
    institution: z.string().min(2).max(150).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email:    z.string().email().transform((e) => e.toLowerCase().trim()),
    password: z.string().min(1).max(128),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "refreshToken é obrigatório"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("E-mail inválido").transform((e) => e.toLowerCase().trim()),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token:    z.string().min(1, "Token é obrigatório"),
    password: passwordSchema,
  }),
});
