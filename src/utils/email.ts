import { resend } from "../lib/mailer";
import { env } from "../config/env";

// Escapa caracteres especiais de HTML para evitar XSS em templates de e-mail
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const resetUrl = `${env.FRONTEND_URL}/auth/redefinir-senha?token=${token}`;
  await resend.emails.send({
    from:    "LEXA <no-reply@resend.dev>",
    to,
    subject: "Redefinição de senha — LEXA",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e1e2e; margin-bottom: 8px;">LEXA — Laboratório de Extensão Ativo</h2>
        <p style="color: #555; margin-bottom: 16px;">Olá, ${escapeHtml(name)}.</p>
        
        <div style="margin-bottom: 24px;">
          <p style="color: #333; margin-bottom: 24px;">
            Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para prosseguir:
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #6d28d9; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600;">
            Redefinir minha senha
          </a>
          <p style="color: #666; font-size: 13px; margin-top: 24px;">
            Este link expira em <strong>1 hora</strong>.<br/>
            Se você não solicitou a redefinição, pode ignorar este e-mail com segurança.
          </p>
        </div>

        <p style="color: #999; font-size: 13px; margin-top: 24px; border-top: 1px dotted #ccc; padding-top: 16px;">
          Este é um e-mail automático enviado pela plataforma LEXA, não responda.
        </p>
      </div>
    `,
  });
}