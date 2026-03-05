import bcrypt from "bcrypt";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { signAccessToken, signRefreshToken, verifyToken } from "../../utils/jwt";
import { sendPasswordResetEmail } from "../../utils/email";

interface RegisterInput {
  name:        string;
  email:       string;
  password:    string;
  role:        Role;
  department?: string;
  institution?: string;
}

interface LoginInput {
  email:    string;
  password: string;
}

const USER_SELECT = {
  id:          true,
  name:        true,
  email:       true,
  role:        true,
  department:  true,
  institution: true,
  avatar:      true,
  createdAt:   true,
  bio:         true,
  linkedin:    true,
  github:      true,
  phone:       true,
} as const;

export class AuthService {
  async updateMe(userId: string, input: {
    name?: string; department?: string; institution?: string;
    avatar?: string; bio?: string; linkedin?: string; github?: string; phone?: string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name        !== undefined && { name:        input.name }),
        ...(input.department  !== undefined && { department:  input.department  || null }),
        ...(input.institution !== undefined && { institution: input.institution || null }),
        ...(input.avatar      !== undefined && { avatar:      input.avatar      || null }),
        ...(input.bio         !== undefined && { bio:         input.bio         || null }),
        ...(input.linkedin    !== undefined && { linkedin:    input.linkedin    || null }),
        ...(input.github      !== undefined && { github:      input.github      || null }),
        ...(input.phone       !== undefined && { phone:       input.phone       || null }),
      },
      select: USER_SELECT,
    });
    return user;
  }

  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new HttpError(409, "E-mail já cadastrado");

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name:        input.name,
        email:       input.email,
        password:    hashedPassword,
        role:        input.role,
        department:  input.department  ?? null,
        institution: input.institution ?? null,
      },
      select: USER_SELECT,
    });

    const payload = { sub: user.id, role: user.role, email: user.email, name: user.name };

    return {
      accessToken:  signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where:  { email: input.email },
      select: { ...USER_SELECT, password: true },
    });

    if (!user) throw new HttpError(401, "Credenciais inválidas");

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new HttpError(401, "Credenciais inválidas");

    const { password: _, ...userWithoutPwd } = user;
    const payload = { sub: user.id, role: user.role, email: user.email, name: user.name };

    return {
      accessToken:  signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: userWithoutPwd,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = verifyToken(refreshToken);
      const user = await prisma.user.findUnique({
        where:  { id: payload.sub },
        select: USER_SELECT,
      });
      if (!user) throw new HttpError(401, "Usuário não encontrado");

      const newPayload = { sub: user.id, role: user.role, email: user.email, name: user.name };
      return {
        accessToken:  signAccessToken(newPayload),
        refreshToken: signRefreshToken(newPayload),
        user,
      };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(401, "Token de refresh inválido ou expirado");
    }
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: USER_SELECT,
    });
    if (!user) throw new HttpError(404, "Usuário não encontrado");
    return user;
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { message: "Se o e-mail existir, você receberá as instruções." };

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data:  { used: true },
    });

    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.passwordResetToken.create({
      data: { token, expiresAt, userId: user.id },
    });

    await sendPasswordResetEmail(user.email, user.name, token);

    return { message: "Se o e-mail existir, você receberá as instruções." };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.used || record.expiresAt < new Date())
      throw new HttpError(400, "Token inválido ou expirado.");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: record.userId },
      data:  { password: hashedPassword },
    });

    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data:  { used: true },
    });

    return { message: "Senha redefinida com sucesso." };
  }
}