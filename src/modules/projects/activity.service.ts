import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { NotificationService } from "../notifications/notification.service";
import { resend } from "../../lib/mailer";
import { escapeHtml } from "../../utils/email";
import { sseManager } from "../../config/sse";

async function sendActivityEmail(to: string, name: string, projectTitle: string, activityTitle: string, description: string, dueDate: Date) {
  try {
    await resend.emails.send({
      from:    "LEXA <no-reply@resend.dev>",
      to,
      subject: `Nova atividade atribuída — ${escapeHtml(projectTitle)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1e1e2e; margin-bottom: 8px;">LEXA — Laboratório de Extensão Ativo</h2>
          <p style="color: #555; margin-bottom: 16px;">Olá, ${escapeHtml(name)}.</p>
          <p style="color: #333; margin-bottom: 8px;">Uma nova atividade foi atribuída a você no projeto <strong>"${escapeHtml(projectTitle)}"</strong>:</p>
          <div style="background: #f5f5f5; border-left: 4px solid #6d28d9; padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;">
            <p style="margin: 0 0 4px; font-weight: bold; color: #1e1e2e;">${escapeHtml(activityTitle)}</p>
            <p style="margin: 0 0 8px; color: #555; font-size: 14px;">${escapeHtml(description)}</p>
            <p style="margin: 0; color: #888; font-size: 13px;">Prazo: <strong>${dueDate.toLocaleDateString("pt-BR")}</strong></p>
          </div>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">Este é um e-mail automático, não responda.</p>
        </div>
      `,
    });
  } catch { /* não bloqueia */ }
}

const ACTIVITY_INCLUDE = {
  responsibles: { select: { id: true, name: true, avatar: true, email: true } },
  project:      { select: { id: true, title: true, ownerId: true } },
} as const;

export class ActivityService {
  async create(projectId: string, requesterId: string, input: {
    title:          string;
    description:    string;
    dueDate:        string;
    responsibleIds: string[];
  }) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, members: { some: { id: requesterId } } },
    });
    if (!project) throw new HttpError(403, "Apenas membros do projeto podem criar atividades");

    if (!input.responsibleIds?.length) throw new HttpError(400, "Selecione pelo menos um responsável");

    // Todos os responsáveis precisam ser membros
    for (const rid of input.responsibleIds) {
      const isMember = await prisma.project.findFirst({
        where: { id: projectId, members: { some: { id: rid } } },
      });
      if (!isMember) throw new HttpError(400, "Todos os responsáveis precisam ser membros do projeto");
    }

    // Valida data — não pode ser no passado
    const due = new Date(input.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) throw new HttpError(400, "A data de término não pode ser no passado");

    const activity = await prisma.activity.create({
      data: {
        title:       input.title,
        description: input.description,
        dueDate:     due,
        projectId,
        responsibles: { connect: input.responsibleIds.map((id) => ({ id })) },
      },
      include: ACTIVITY_INCLUDE,
    });

    // Notificação no sistema + e-mail para cada responsável (exceto o criador)
    for (const resp of activity.responsibles) {
      if (resp.id !== requesterId) {
        await NotificationService.create({
          userId:    resp.id,
          type:      "ACTIVITY_ASSIGNED",
          message:   `Você foi designado para a atividade "${activity.title}" no projeto "${project.title}"`,
          projectId,
        });
        if (resp.email) {
          await sendActivityEmail(resp.email, resp.name, project.title, activity.title, activity.description, activity.dueDate);
        }
      }
    }

    sseManager.emit(project.ownerId, "activities_updated", { projectId });
    for (const resp of activity.responsibles) {
      if (resp.id !== project.ownerId) {
        sseManager.emit(resp.id, "activities_updated", { projectId });
      }
    }

    return activity;
  }

  async listByProject(projectId: string, userId?: string) {
    const project = await prisma.project.findUnique({
      where:  { id: projectId },
      select: { ownerId: true },
    });
    const isOwner = project?.ownerId === userId;

    // Dono vê todas; membros veem só as que são responsáveis
    const where = isOwner || !userId
      ? { projectId }
      : { projectId, responsibles: { some: { id: userId } } };

    return prisma.activity.findMany({
      where,
      include: ACTIVITY_INCLUDE,
      orderBy: { dueDate: "asc" },
    });
  }

  async getById(activityId: string, userId: string) {
    const activity = await prisma.activity.findUnique({
      where:   { id: activityId },
      include: ACTIVITY_INCLUDE,
    });
    if (!activity) throw new HttpError(404, "Atividade não encontrada");

    const isOwner       = activity.project.ownerId === userId;
    const isResponsible = activity.responsibles.some((r) => r.id === userId);
    if (!isOwner && !isResponsible) throw new HttpError(403, "Sem permissão para ver esta atividade");

    return activity;
  }

  async toggleDone(activityId: string, userId: string) {
    const activity = await prisma.activity.findUnique({
      where:   { id: activityId },
      include: ACTIVITY_INCLUDE,
    });
    if (!activity) throw new HttpError(404, "Atividade não encontrada");

    const isOwner       = activity.project.ownerId === userId;
    const isResponsible = activity.responsibles.some((r) => r.id === userId);
    if (!isOwner && !isResponsible) throw new HttpError(403, "Sem permissão para alterar esta atividade");

    const markingDone   = !activity.done;
    const isLate        = markingDone && new Date() > new Date(activity.dueDate);

    const updated = await prisma.activity.update({
      where:   { id: activityId },
      data:    {
        done:          markingDone,
        completedLate: markingDone ? isLate : false,
      },
      include: ACTIVITY_INCLUDE,
    });

    sseManager.emit(updated.project.ownerId, "activities_updated", { projectId: updated.projectId });
    for (const resp of updated.responsibles) {
      if (resp.id !== updated.project.ownerId) {
        sseManager.emit(resp.id, "activities_updated", { projectId: updated.projectId });
      }
    }

    return updated;
  }

  async delete(activityId: string, userId: string) {
    const activity = await prisma.activity.findUnique({
      where:   { id: activityId },
      include: { 
        project: { select: { ownerId: true } },
        responsibles: { select: { id: true } }
      },
    });
    if (!activity) throw new HttpError(404, "Atividade não encontrada");
    if (activity.project.ownerId !== userId) throw new HttpError(403, "Apenas o professor do projeto pode excluir atividades");

    await prisma.activity.delete({ where: { id: activityId } });

    sseManager.emit(activity.project.ownerId, "activities_updated", { projectId: activity.projectId });
    for (const resp of activity.responsibles) {
      if (resp.id !== activity.project.ownerId) {
        sseManager.emit(resp.id, "activities_updated", { projectId: activity.projectId });
      }
    }

    return { message: "Atividade removida" };
  }
}