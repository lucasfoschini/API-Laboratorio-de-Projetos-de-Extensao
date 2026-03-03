import nodemailer from "nodemailer";
import { env } from "../config/env";

let transporter: nodemailer.Transporter | null = null;

if (env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  console.log("[EMAIL] Serviço de e-mail configurado com sucesso");
} else {
  console.warn("[EMAIL] SMTP_USER e SMTP_PASS não configurados — e-mails serão apenas logados no console");
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions): Promise<void> {
  if (!transporter) {
    console.log(`[EMAIL] (sem SMTP) Para: ${to} | Assunto: "${subject}"`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Enviado para ${to}: "${subject}"`);
  } catch (error) {
    console.error(`[EMAIL] Falha ao enviar para ${to}:`, error);
    // Não lança erro — o fluxo de reset password não deve quebrar se o e-mail falhar
  }
}

export function buildResetPasswordEmail(name: string, resetLink: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Recuperação de Senha</h2>
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Laboratório Ativo</strong>.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #4F46E5; color: white; padding: 12px 32px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Redefinir Senha
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        Este link expira em <strong>1 hora</strong>. Se você não solicitou a recuperação, ignore este e-mail.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Laboratório Ativo — Sistema de Gestão de Projetos</p>
    </div>
  `;
}
