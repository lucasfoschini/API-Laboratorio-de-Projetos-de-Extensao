import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { prisma } from "../../config/prisma";

export const userRoutes = Router();

const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  institution: true, department: true, bio: true,
  avatar: true, phone: true, linkedin: true, github: true, website: true,
  createdAt: true,
} as const;

// Helper: string vazia → null, senão valida normalmente
const optStr = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().max(max).nullable()
  ).optional();

// helper to validate optional url string with configurable max length
const optUrl = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().url("URL inválida").max(max).nullable()
  ).optional();

const updateProfileSchema = z.object({
  body: z.object({
    name:        z.string().min(3, "Nome deve ter ao menos 3 caracteres").max(100).optional(),
    institution: optStr(150),
    department:  optStr(100),
    bio:         optStr(500),
    phone:       optStr(30),
    linkedin:    optUrl(255),
    github:      optUrl(255),
    website:     optUrl(255),
    avatar:      optUrl(2000),
  }),
});

// GET /users/me — retorna dados do usuário logado
userRoutes.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: USER_SELECT,
    });
    if (!user) { res.status(404).json({ message: "Usuário não encontrado" }); return; }
    res.json(user);
  } catch (e) { next(e); }
});

// PATCH /users/me — atualiza perfil do usuário logado
userRoutes.patch("/me", authMiddleware, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const allowed = ["name", "institution", "department", "bio", "phone", "linkedin", "github", "website", "avatar"] as const;
    const data: Record<string, string | null> = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        data[key] = req.body[key] === null ? null : req.body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ message: "Nenhum campo para atualizar" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: USER_SELECT,
    });

    res.json(user);
  } catch (e) { next(e); }
});

// GET /users/search?q=nome — busca usuários pelo nome ou e-mail
userRoutes.get("/search", authMiddleware, async (req, res, next) => {
  try {
    const q = (req.query.q as string)?.trim() ?? "";
    if (q.length < 2) { res.json([]); return; }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name:  { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
        NOT: { id: req.user!.id }, // exclui o próprio usuário
      },
      select: { id: true, name: true, email: true, avatar: true, department: true, role: true },
      take: 8,
      orderBy: { name: "asc" },
    });

    res.json(users);
  } catch (e) { next(e); }
});
