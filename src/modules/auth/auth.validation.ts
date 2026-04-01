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
    name:        z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    email:       z.string().email("E-mail inválido"),
    password:    passwordSchema,
    role:        z.nativeEnum(Role),
    department:  z.string().min(2).optional(),
    institution: z.string().min(2).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email:    z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
});

export const updateMeSchema = z.object({
  body: z.object({
    name:        z.string().min(2).optional(),
    department:  z.string().min(2).optional(),
    institution: z.string().min(2).optional(),
    avatar:      z.string().url("URL de avatar inválida").optional().or(z.literal("")),
    bio:         z.string().max(500).optional(),
    linkedin:    z.string().optional(),
    github:      z.string().optional(),
    phone:       z.string().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("E-mail inválido"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token:    z.string().min(1, "Token obrigatório"),
    password: passwordSchema,
  }),
});