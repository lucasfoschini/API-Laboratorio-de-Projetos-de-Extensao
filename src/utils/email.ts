import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const resetUrl = `${env.FRONTEND_URL}/auth/redefinir-senha?token=${token}`;
  await resend.emails.send({
    from:    "Laboratório Ativo <no-reply@resend.dev>",
    to,
    subject: "Redefinição de senha — Laboratório Ativo",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e1e2e; margin-bottom: 8px;">Redefinir senha</h2>
        <p style="color: #555; margin-bottom: 24px;">Olá, ${name}. Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #6d28d9; color: white; padding: 12px 24px;
                  border-radius: 8px; text-decoration: none; font-weight: 600;">
          Redefinir minha senha
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          Este link expira em <strong>1 hora</strong>.<br/>
          Se você não solicitou a redefinição, ignore este e-mail.
        </p>
      </div>
    `,
  });
}