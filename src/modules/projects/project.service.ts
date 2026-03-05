import { ProjectArea, ProjectCategory, ProjectStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { NotificationService } from "../notifications/notification.service";

const VALID_CATEGORIES = Object.values(ProjectCategory) as string[];

// includes as functions to avoid TS readonly spread issue
function listInclude() {
  return {
    owner:  { select: { id: true, name: true, avatar: true, department: true, institution: true } },
    _count: { select: { members: true, subscriptions: true, posts: true } },
  } as const;
}

function detailInclude() {
  return {
    owner:        { select: { id: true, name: true, email: true, avatar: true, department: true, institution: true, linkedin: true } },
    members:      { select: { id: true, name: true, email: true, avatar: true, department: true } },
    _count:       { select: { members: true, subscriptions: true, posts: true } },
    publications: { select: { id: true, title: true, type: true, year: true } },
  } as const;
}

function detailWithPosts() {
  return {
    ...detailInclude(),
    posts: {
      orderBy: { createdAt: "desc" as const },
      take: 5,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        media: true,
      },
    },
  } as const;
}

function toResponse(p: any) {
  const { _count, ...rest } = p;
  return {
    ...rest,
    enrolled:            _count?.members ?? 0,
    subscribersCount:    _count?.subscriptions ?? 0,
    postsCount:          _count?.posts ?? 0,
    pendingRequestsCount: _count?.memberRequests ?? 0,
  };
}

interface CreateInput {
  title: string; description: string; area: ProjectArea; category?: string;
  areas?: string[]; categoryText?: string;
  vacancies: number; tags?: string[];
  startDate?: string; endDate?: string; applicationDeadline?: string;
  coverImage?: string; tempo: string; custo?: number; escopo: string;
  contactEmail?: string; contactInfo?: string; memberIds?: string[];
}

interface UpdateInput {
  title?: string; description?: string; area?: ProjectArea; category?: string;
  areas?: string[]; categoryText?: string;
  status?: ProjectStatus; vacancies?: number; tags?: string[];
  startDate?: string; endDate?: string; applicationDeadline?: string;
  coverImage?: string; tempo?: string; custo?: number; escopo?: string;
  contactEmail?: string; contactInfo?: string;
}

function resolveCategory(raw?: string): { category: ProjectCategory; categoryText: string | null } {
  if (!raw) return { category: "OUTRO", categoryText: null };
  const upper = raw.toUpperCase();
  if (VALID_CATEGORIES.includes(upper)) return { category: upper as ProjectCategory, categoryText: null };
  return { category: "OUTRO", categoryText: raw };
}

export class ProjectService {
  async create(input: CreateInput, ownerId: string) {
    const membersToConnect = [
      { id: ownerId },
      ...(input.memberIds?.filter((id) => id !== ownerId).map((id) => ({ id })) ?? []),
    ];

    const { category, categoryText } = resolveCategory(input.category ?? input.categoryText);

    const project = await prisma.project.create({
      data: {
        title: input.title, description: input.description,
        area: input.area, category, vacancies: input.vacancies,
        areas: input.areas ?? [], categoryText,
        tags: input.tags ?? [], tempo: input.tempo,
        custo: input.custo ?? 0, escopo: input.escopo,
        coverImage:   input.coverImage   ?? null,
        contactEmail: input.contactEmail ?? null,
        contactInfo:  input.contactInfo  ?? null,
        startDate:           input.startDate           ? new Date(input.startDate)           : null,
        endDate:             input.endDate             ? new Date(input.endDate)             : null,
        applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
        ownerId,
        members: { connect: membersToConnect },
      },
      include: detailInclude(),
    });
    return toResponse(project);
  }

  async getAll(page = 1, limit = 12) {
    const skip = (page - 1) * limit;

    const select = {
      id:          true,
      title:       true,
      description: true,
      area:        true,
      areas:       true,
      category:    true,
      status:      true,
      vacancies:   true,
      tags:        true,
      startDate:   true,
      applicationDeadline: true,
      createdAt:   true,
      owner: {
        select: {
          id:         true,
          name:       true,
          avatar:     true,
          department: true,
          institution: true,
        },
      },
      _count: {
        select: {
          members:       true,
          subscriptions: true,
        },
      },
    } as const;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        select,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count(),
    ]);

    return {
      data:       projects.map((p) => {
        const { _count, ...rest } = p as any;
        return {
          ...rest,
          enrolled: _count?.members ?? 0,
          subscribersCount: _count?.subscriptions ?? 0,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const p = await prisma.project.findUnique({
      where: { id },
      include: detailWithPosts(),
    });
    if (!p) throw new HttpError(404, "Projeto não encontrado");
    return toResponse(p); // full include remains unchanged
  }

  async update(id: string, input: UpdateInput, userId: string) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project)              throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId !== userId) throw new HttpError(403, "Apenas o criador pode editar este projeto");

    const catData: Partial<{ category: ProjectCategory; categoryText: string | null }> =
      input.category || input.categoryText
        ? resolveCategory(input.category ?? input.categoryText)
        : {};

    // Strip raw string fields already handled by resolveCategory
    const { category: _c, categoryText: _ct, startDate, endDate, applicationDeadline, ...rest } = input;

    const dateData: Record<string, Date> = {};
    if (startDate)           dateData.startDate           = new Date(startDate);
    if (endDate)             dateData.endDate             = new Date(endDate);
    if (applicationDeadline) dateData.applicationDeadline = new Date(applicationDeadline);

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...catData,
        ...dateData,
      },
      include: detailInclude(),
    });
    return toResponse(updated);
  }

  async delete(id: string, userId: string) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project)              throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId !== userId) throw new HttpError(403, "Apenas o criador pode excluir este projeto");
    await prisma.project.delete({ where: { id } });
    return { message: "Projeto excluído com sucesso" };
  }

  async subscribe(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new HttpError(404, "Projeto não encontrado");
    await prisma.subscription.upsert({
      where:  { projectId_userId: { projectId, userId } },
      update: {},
      create: { projectId, userId },
    });
    return { subscribed: true, message: "Inscrito com sucesso" };
  }

  async unsubscribe(projectId: string, userId: string) {
    await prisma.subscription.deleteMany({ where: { projectId, userId } });
    return { subscribed: false, message: "Inscrição cancelada" };
  }

  async getSubscriptionStatus(projectId: string, userId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return { subscribed: !!sub };
  }

  async leave(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { select: { id: true, name: true } } },
    });
    if (!project) throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId === userId) throw new HttpError(400, "O líder não pode sair do próprio projeto");

    const member = project.members.find((m) => m.id === userId);
    if (!member) throw new HttpError(403, "Você não é membro deste projeto");

    await prisma.project.update({
      where: { id: projectId },
      data: { members: { disconnect: { id: userId } } },
    });

    // Limpa member-requests para permitir re-join
    await prisma.memberRequest.deleteMany({ where: { projectId, userId } });

    // Notifica o líder
    await NotificationService.create({
      userId: project.ownerId,
      type: "MEMBER_LEFT",
      message: `${member.name} saiu do projeto "${project.title}"`,
      projectId,
    });

    return { message: "Você saiu do projeto com sucesso" };
  }

  async removeMember(projectId: string, memberId: string, requesterId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { select: { id: true } } },
    });
    if (!project) throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId !== requesterId) throw new HttpError(403, "Apenas o líder pode remover membros");
    if (project.ownerId === memberId) throw new HttpError(400, "Não é possível remover o líder do projeto");

    const isMember = project.members.some((m) => m.id === memberId);
    if (!isMember) throw new HttpError(404, "Membro não encontrado no projeto");

    await prisma.project.update({
      where: { id: projectId },
      data: { members: { disconnect: { id: memberId } } },
    });

    // Limpa member-requests para permitir re-join
    await prisma.memberRequest.deleteMany({ where: { projectId, userId: memberId } });

    // Notifica o membro removido
    await NotificationService.create({
      userId: memberId,
      type: "MEMBER_REMOVED",
      message: `Você foi removido do projeto "${project.title}"`,
      projectId,
    });

    return { message: "Membro removido com sucesso" };
  }
}
