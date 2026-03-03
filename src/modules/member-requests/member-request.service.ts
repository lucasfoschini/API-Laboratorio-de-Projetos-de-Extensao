import { MemberRequestStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { NotificationService } from "../notifications/notification.service";

const INCLUDE = {
  user:    { select: { id: true, name: true, email: true, avatar: true, department: true, institution: true } },
  project: { select: { id: true, title: true, area: true, status: true } },
} as const;

export class MemberRequestService {
  async create(projectId: string, userId: string, message: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId === userId) throw new HttpError(400, "Você é o criador deste projeto");

    // Verifica se já é membro
    const isMember = await prisma.project.findFirst({
      where: { id: projectId, members: { some: { id: userId } } },
    });
    if (isMember) throw new HttpError(409, "Você já faz parte deste grupo");

    const existing = await prisma.memberRequest.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) throw new HttpError(409, "Você já enviou uma solicitação para este projeto");

    return prisma.memberRequest.create({
      data: { projectId, userId, message },
      include: INCLUDE,
    });
  }

  async listByProject(projectId: string, requesterId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project)                    throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId !== requesterId) throw new HttpError(403, "Acesso negado");

    return prisma.memberRequest.findMany({
      where: { projectId },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async review(requestId: string, reviewerId: string, status: MemberRequestStatus) {
    const req = await prisma.memberRequest.findUnique({
      where: { id: requestId }, include: { project: true },
    });
    if (!req) throw new HttpError(404, "Solicitação não encontrada");
    if (req.project.ownerId !== reviewerId) throw new HttpError(403, "Acesso negado");
    if (req.status !== MemberRequestStatus.PENDING) throw new HttpError(400, "Solicitação já avaliada");

    // Verifica limite de vagas ANTES de aprovar (fora da transação para fail-fast)
    if (status === MemberRequestStatus.APPROVED) {
      const projectWithCount = await prisma.project.findUnique({
        where: { id: req.projectId },
        include: { _count: { select: { members: true } } },
      });
      if (projectWithCount && projectWithCount._count.members >= projectWithCount.vacancies) {
        throw new HttpError(409, "Não há vagas disponíveis neste projeto");
      }
    }

    // Transação garante atomicidade: atualiza status + conecta membro
    return prisma.$transaction(async (tx) => {
      const updated = await tx.memberRequest.update({
        where: { id: requestId },
        data: { status },
        include: INCLUDE,
      });

      if (status === MemberRequestStatus.APPROVED) {
        await tx.project.update({
          where: { id: req.projectId },
          data: { members: { connect: { id: req.userId } } },
        });

        // Notifica o solicitante de que foi aceito
        await NotificationService.create({
          userId: req.userId,
          type: "REQUEST_ACCEPTED",
          message: `Sua solicitação para "${req.project.title}" foi aceita!`,
          projectId: req.projectId,
        });

        // Se atingiu o máximo de vagas, muda status para EM_ANDAMENTO automaticamente
        const afterCount = await tx.project.findUnique({
          where: { id: req.projectId },
          include: { _count: { select: { members: true } } },
        });
        if (afterCount && afterCount._count.members >= afterCount.vacancies && afterCount.status === "ABERTO") {
          await tx.project.update({
            where: { id: req.projectId },
            data: { status: "EM_ANDAMENTO" },
          });
        }
      }

      return updated;
    });
  }

  async listMine(userId: string) {
    return prisma.memberRequest.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async cancel(requestId: string, userId: string) {
    const req = await prisma.memberRequest.findUnique({ where: { id: requestId } });
    if (!req)                   throw new HttpError(404, "Solicitação não encontrada");
    if (req.userId !== userId)  throw new HttpError(403, "Acesso negado");
    if (req.status !== MemberRequestStatus.PENDING) throw new HttpError(400, "Só é possível cancelar solicitações pendentes");
    await prisma.memberRequest.delete({ where: { id: requestId } });
    return { message: "Solicitação cancelada" };
  }
}
