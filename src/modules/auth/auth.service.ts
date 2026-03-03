import bcrypt from "bcrypt";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendMail, buildResetPasswordEmail } from "../../utils/mail";

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

    const hashedPassword = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

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
      const payload = verifyRefreshToken(refreshToken);
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
    // Sempre retorna 200 para evitar enumeração de e-mails
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." };

    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const resetLink = `${env.FRONTEND_URL}/auth/redefinir-senha?token=${token}`;

    await sendMail({
      to: user.email,
      subject: "Recuperação de Senha — Laboratório Ativo",
      html: buildResetPasswordEmail(user.name, resetLink),
    });

    return { message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new HttpError(400, "Token inválido ou expirado.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: "Senha redefinida com sucesso." };
  }
}
