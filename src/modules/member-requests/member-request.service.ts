import { MemberRequestStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { NotificationService } from "../notifications/notification.service";
import { DashboardService } from "../dashboard/dashboard.service";
import { resend } from "../../lib/mailer";
import { escapeHtml } from "../../utils/email";
import { sseManager } from "../../config/sse";

async function sendRequestEmail(to: string, name: string, subject: string, body: string) {
  try {
    await resend.emails.send({
      from: "LEXA <no-reply@resend.dev>",
      to,
      subject: escapeHtml(subject),
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1e1e2e; margin-bottom: 8px;">LEXA — Laboratório de Extensão Ativo</h2>
          <p style="color: #555; margin-bottom: 16px;">Olá, ${escapeHtml(name)}.</p>
          <div style="color: #333; line-height: 1.6; margin-bottom: 24px;">
            ${body}
          </div>
          <p style="color: #999; font-size: 13px; margin-top: 24px; border-top: 1px dotted #ccc; padding-top: 16px;">
            Este é um e-mail automático, não responda.
          </p>
        </div>
      `,
    });
  } catch {
    // Falha silenciosa para não bloquear a criação da solicitação
  }
}

const INCLUDE = {
  user:    { select: { id: true, name: true, email: true, avatar: true, department: true, institution: true } },
  project: { select: { id: true, title: true, area: true, status: true } },
} as const;

export class MemberRequestService {
  async create(projectId: string, userId: string, message: string) {
    const project = await prisma.project.findUnique({
      where:   { id: projectId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!project) throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId === userId) throw new HttpError(400, "Você é o criador deste projeto");

    // Bloqueia solicitações após a data limite de inscrição
    if (project.applicationDeadline && new Date() > new Date(project.applicationDeadline)) {
      throw new HttpError(403, "O prazo para solicitações de entrada neste projeto já encerrou");
    }

    const isMember = await prisma.project.findFirst({
      where: { id: projectId, members: { some: { id: userId } } },
    });
    if (isMember) throw new HttpError(409, "Você já faz parte deste grupo");

    // Busca o nome do solicitante para a notificação e e-mail
    const requester = await prisma.user.findUnique({
      where:  { id: userId },
      select: { name: true },
    });

    const currentRequest = await prisma.memberRequest.findFirst({
      where: { projectId, userId },
    });

    let result;
    if (currentRequest?.status === MemberRequestStatus.REJECTED) {
      const rejectionCount = await prisma.notification.count({
        where: {
          userId,
          projectId,
          type: "REQUEST_REJECTED",
        },
      });

      if (rejectionCount >= 3) {
        throw new HttpError(429, "Você já foi recusado 3 vezes neste projeto e não pode solicitar novamente");
      }

      result = await prisma.$transaction(async (tx) => {
        await tx.memberRequest.deleteMany({
          where: { projectId, userId },
        });

        return tx.memberRequest.create({
          data:    { projectId, userId, message },
          include: INCLUDE,
        });
      });
    } else if (currentRequest) {
      throw new HttpError(409, "Você já enviou uma solicitação para este projeto");
    } else {
      result = await prisma.memberRequest.create({
        data:    { projectId, userId, message },
        include: INCLUDE,
      });
    }

    // Envia e-mail para o dono do projeto
    if (project.owner?.email) {
      await sendRequestEmail(
        project.owner.email,
        project.owner.name,
        `Nova solicitação de entrada — ${project.title}`,
        `O aluno <strong>${requester?.name ?? "Alguém"}</strong> enviou uma solicitação para participar do seu projeto <strong>"${project.title}"</strong>. Você pode revisar esta solicitação no seu dashboard.`,
      );
    }

    // Invalida o cache de notificações do dono para que a solicitação apareça imediatamente no sininho
    DashboardService.invalidateUser(project.ownerId);

    // Ecoa para o Dashboard do dono a chegada de um pedido
    sseManager.emit(project.ownerId, "member_requests_updated", { projectId });

    return result;
  }

  async listByProject(projectId: string, requesterId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project)                        throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId !== requesterId) throw new HttpError(403, "Acesso negado");

    return prisma.memberRequest.findMany({
      where: { projectId },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async review(requestId: string, reviewerId: string, status: MemberRequestStatus) {
    const req = await prisma.memberRequest.findUnique({
      where:   { id: requestId },
      include: {
        project: true,
        user:    { select: { id: true, name: true, email: true } },
      },
    });
    if (!req) throw new HttpError(404, "Solicitação não encontrada");
    if (req.project.ownerId !== reviewerId) throw new HttpError(403, "Acesso negado");
    if (req.status !== MemberRequestStatus.PENDING) throw new HttpError(400, "Solicitação já avaliada");

    if (status === MemberRequestStatus.APPROVED) {
      const projectWithCount = await prisma.project.findUnique({
        where:   { id: req.projectId },
        include: { _count: { select: { members: true } } },
      });
      if (projectWithCount && projectWithCount._count.members >= projectWithCount.vacancies) {
        throw new HttpError(409, "Não há vagas disponíveis neste projeto");
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.memberRequest.update({
        where:   { id: requestId },
        data:    { status },
        include: INCLUDE,
      });

      if (status === MemberRequestStatus.APPROVED) {
        await tx.project.update({
          where: { id: req.projectId },
          data:  { members: { connect: { id: req.userId } } },
        });

        // Recalcula status se lotou
        const afterCount = await tx.project.findUnique({
          where:   { id: req.projectId },
          include: { _count: { select: { members: true } }, members: { select: { id: true } } },
        });
        
        if (afterCount) {
          // Avisa a todos que uma vaga foi ocupada
          for (const m of afterCount.members) {
            sseManager.emit(m.id, "project_updated", { projectId: req.projectId });
          }

          if (afterCount._count.members >= afterCount.vacancies && afterCount.status === "ABERTO") {
            await tx.project.update({
              where: { id: req.projectId },
              data:  { status: "EM_ANDAMENTO" },
            });
          }
        }
      }

      return updated;
    });

    // Notificação + e-mail para o solicitante
    if (status === MemberRequestStatus.APPROVED) {
      await NotificationService.create({
        userId:    req.userId,
        type:      "REQUEST_ACCEPTED",
        message:   `Sua solicitação para "${req.project.title}" foi aceita!`,
        projectId: req.projectId,
      });
      if (req.user?.email) {
        await sendRequestEmail(
          req.user.email,
          req.user.name,
          `Solicitação aceita — ${req.project.title}`,
          `Sua solicitação para entrar no projeto <strong>"${req.project.title}"</strong> foi <strong style="color:#16a34a">aceita</strong>! Você já é membro do grupo.`,
        );
      }
    } else {
      await NotificationService.create({
        userId:    req.userId,
        type:      "REQUEST_REJECTED",
        message:   `Sua solicitação para "${req.project.title}" foi recusada.`,
        projectId: req.projectId,
      });
      if (req.user?.email) {
        await sendRequestEmail(
          req.user.email,
          req.user.name,
          `Solicitação recusada — ${req.project.title}`,
          `Sua solicitação para entrar no projeto <strong>"${req.project.title}"</strong> foi <strong style="color:#dc2626">recusada</strong> pelo responsável.`,
        );
      }
    }

    // Invalida o cache do dashboard para ambos os usuários envolvidos
    // (sem isso, o servidor devolve dados stale por até 30s e a solicitação reaparece)
    DashboardService.invalidateUser(reviewerId);
    DashboardService.invalidateUser(req.userId);

    // Ecoa na tela do Solicitante e do Revisor
    sseManager.emit(req.userId, "member_requests_updated", { projectId: req.projectId });
    sseManager.emit(reviewerId, "member_requests_updated", { projectId: req.projectId });

    // Atualiza a listagem de membros do lado do cliente caso ele tenha entrado na página do projeto
    if (status === MemberRequestStatus.APPROVED) {
      sseManager.emit(req.userId, "project_updated", { projectId: req.projectId });
    }

    return result;
  }

  async listMine(userId: string) {
    return prisma.memberRequest.findMany({
      where:   { userId },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async cancel(requestId: string, userId: string) {
    const req = await prisma.memberRequest.findUnique({ 
      where: { id: requestId },
      include: { project: { select: { ownerId: true } } }
    });
    if (!req)                  throw new HttpError(404, "Solicitação não encontrada");
    if (req.userId !== userId) throw new HttpError(403, "Acesso negado");
    if (req.status !== MemberRequestStatus.PENDING) throw new HttpError(400, "Só é possível cancelar solicitações pendentes");
    await prisma.memberRequest.delete({ where: { id: requestId } });

    sseManager.emit(userId, "member_requests_updated", { projectId: req.projectId });
    sseManager.emit(req.project.ownerId, "member_requests_updated", { projectId: req.projectId });

    return { message: "Solicitação cancelada" };
  }
}