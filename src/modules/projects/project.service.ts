import { ProjectArea, ProjectCategory, ProjectStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { NotificationService } from "../notifications/notification.service";
import { resend } from "../../lib/mailer";
import { escapeHtml } from "../../utils/email";
import { cached, invalidateByPrefix } from "../../config/cache";
import { sseManager } from "../../config/sse";

const VALID_CATEGORIES = Object.values(ProjectCategory) as string[];

async function sendProjectEmail(to: string, name: string, subject: string, body: string) {
  try {
    await resend.emails.send({
      from: "LEXA <no-reply@resend.dev>",
      to,
      subject: escapeHtml(subject),
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1e1e2e; margin-bottom: 8px;">LEXA — Laboratório de Extensão Ativo</h2>
          <p style="color: #555; margin-bottom: 16px;">Olá, ${escapeHtml(name)}.</p>
          <p style="color: #333; margin-bottom: 24px;">${escapeHtml(body)}</p>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">Este é um e-mail automático, não responda.</p>
        </div>
      `,
    });
  } catch {
    // Não bloqueia a operação se e-mail falhar
  }
}

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
    enrolled:             _count?.members ?? 0,
    subscribersCount:     _count?.subscriptions ?? 0,
    postsCount:           _count?.posts ?? 0,
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

function resolveStatus(
  vacancies: number,
  memberCount: number,
  currentStatus?: ProjectStatus,
  explicitStatus?: ProjectStatus,
): ProjectStatus {
  if (explicitStatus) return explicitStatus;
  if (currentStatus === "FINALIZADO") return "FINALIZADO";
  const openSlots = vacancies - memberCount;
  return openSlots > 0 ? "ABERTO" : "EM_ANDAMENTO";
}

export class ProjectService {
  async create(input: CreateInput, ownerId: string) {
    const membersToConnect = [
      { id: ownerId },
      ...(input.memberIds?.filter((id) => id !== ownerId).map((id) => ({ id })) ?? []),
    ];

    const { category, categoryText } = resolveCategory(input.category ?? input.categoryText);
    const initialMemberCount = membersToConnect.length;
    const initialStatus = resolveStatus(input.vacancies, initialMemberCount);

    const project = await prisma.project.create({
      data: {
        title: input.title, description: input.description,
        area: input.area, category, vacancies: input.vacancies,
        areas: input.areas ?? [], categoryText,
        tags: input.tags ?? [], tempo: input.tempo,
        status: initialStatus,
        custo: input.custo ?? 0, escopo: input.escopo,
        coverImage:          input.coverImage          ?? null,
        contactEmail:        input.contactEmail        ?? null,
        contactInfo:         input.contactInfo         ?? null,
        startDate:           input.startDate           ? new Date(input.startDate)           : null,
        endDate:             input.endDate             ? new Date(input.endDate)             : null,
        applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
        ownerId,
        members: { connect: membersToConnect },
      },
      include: detailInclude(),
    });
    invalidateByPrefix("projects:list");
    sseManager.broadcast("global_projects_updated", { projectId: project.id });
    return toResponse(project);
  }

  async getAll(page = 1, limit = 12, statusFilter?: string) {
    const now = new Date();

    // Constrói o where do Prisma baseado no filtro de status,
    // mantendo consistência com a lógica visual do ProjectCard:
    //   open        = ABERTO + deadline futuro (ou sem deadline)
    //   in_progress = EM_ANDAMENTO  OU  ABERTO com deadline já passado
    //   completed   = FINALIZADO
    let where: any = {};
    if (statusFilter === "open") {
      where = {
        status: "ABERTO",
        OR: [
          { applicationDeadline: null },
          { applicationDeadline: { gt: now } },
        ],
      };
    } else if (statusFilter === "in_progress") {
      where = {
        OR: [
          { status: "EM_ANDAMENTO" },
          { status: "ABERTO", applicationDeadline: { lte: now } },
        ],
      };
    } else if (statusFilter === "completed") {
      where = { status: "FINALIZADO" };
    }

    const cacheKey = `projects:list:${page}:${limit}:${statusFilter ?? "all"}`;
    return cached(cacheKey, 60, async () => {
      const skip = (page - 1) * limit;

      const select = {
        id: true, title: true, description: true, area: true, areas: true,
        category: true, status: true, vacancies: true, tags: true,
        startDate: true, applicationDeadline: true, createdAt: true,
        owner: { select: { id: true, name: true, avatar: true, department: true, institution: true } },
        _count: { select: { members: true, subscriptions: true } },
      } as const;

      const [projects, total] = await Promise.all([
        prisma.project.findMany({ where, select, orderBy: { createdAt: "desc" }, skip, take: limit }),
        prisma.project.count({ where }),
      ]);

      return {
        data: projects.map((p) => {
          const { _count, ...rest } = p as any;
          return { ...rest, enrolled: _count?.members ?? 0, subscribersCount: _count?.subscriptions ?? 0 };
        }),
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasMore:    page * limit < total,
      };
    });
  }

  async getById(id: string, userId?: string) {
    const p = await prisma.project.findUnique({ where: { id }, include: detailWithPosts() });
    if (!p) throw new HttpError(404, "Projeto não encontrado");

    const base = toResponse(p);

    // Subscription status
    const subscribed = userId
      ? !!(await prisma.subscription.findUnique({ where: { projectId_userId: { projectId: id, userId } } }))
      : false;

    // Activities — dono vê todas, membro vê só as suas
    const isOwner = p.ownerId === userId;
    const activitiesWhere = isOwner || !userId
      ? { projectId: id }
      : { projectId: id, responsibles: { some: { id: userId } } };
    const activities = userId
      ? await prisma.activity.findMany({
          where:   activitiesWhere,
          include: { responsibles: { select: { id: true, name: true, avatar: true, email: true } }, project: { select: { id: true, title: true, ownerId: true } } },
          orderBy: { dueDate: "asc" },
        })
      : [];

    return { ...base, subscribed, activities };
  }

  async update(id: string, input: UpdateInput, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!project)                   throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId !== userId) throw new HttpError(403, "Apenas o criador pode editar este projeto");

    const catData: Partial<{ category: ProjectCategory; categoryText: string | null }> =
      input.category || input.categoryText
        ? resolveCategory(input.category ?? input.categoryText)
        : {};

    const { category: _c, categoryText: _ct, startDate, endDate, applicationDeadline, status: explicitStatus, ...rest } = input;

    const dateData: Record<string, Date> = {};
    if (startDate)           dateData.startDate           = new Date(startDate);
    if (endDate)             dateData.endDate             = new Date(endDate);
    if (applicationDeadline) dateData.applicationDeadline = new Date(applicationDeadline);

    const newVacancies   = input.vacancies ?? project.vacancies;
    const memberCount    = (project as any)._count.members;
    const resolvedStatus = resolveStatus(
      newVacancies, memberCount, project.status,
      explicitStatus as ProjectStatus | undefined,
    );

    const updated = await prisma.project.update({
      where: { id },
      data: { ...rest, ...catData, ...dateData, status: resolvedStatus },
      include: detailInclude(),
    });
    invalidateByPrefix("projects:list");
    sseManager.broadcast("global_projects_updated", { projectId: id });
    return toResponse(updated);
  }

  async delete(id: string, userId: string) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project)                   throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId !== userId) throw new HttpError(403, "Apenas o criador pode excluir este projeto");
    await prisma.project.delete({ where: { id } });
    invalidateByPrefix("projects:list");
    sseManager.broadcast("global_projects_updated", { projectId: id });
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
    sseManager.broadcast("global_projects_updated", { projectId });
    return { subscribed: true, message: "Inscrito com sucesso" };
  }

  async unsubscribe(projectId: string, userId: string) {
    await prisma.subscription.deleteMany({ where: { projectId, userId } });
    sseManager.broadcast("global_projects_updated", { projectId });
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
      where:   { id: projectId },
      include: {
        members: { select: { id: true, name: true, email: true } },
        owner:   { select: { id: true, name: true, email: true } },
        _count:  { select: { members: true } },
      },
    });
    if (!project) throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId === userId) throw new HttpError(400, "O líder não pode sair do próprio projeto");

    const member = project.members.find((m) => m.id === userId);
    if (!member) throw new HttpError(403, "Você não é membro deste projeto");

    await prisma.project.update({
      where: { id: projectId },
      data:  { members: { disconnect: { id: userId } } },
    });
    await prisma.memberRequest.deleteMany({ where: { projectId, userId } });

    const newMemberCount = (project._count.members ?? 1) - 1;
    const newStatus = resolveStatus(project.vacancies, newMemberCount, project.status);
    if (newStatus !== project.status) {
      await prisma.project.update({ where: { id: projectId }, data: { status: newStatus } });
    }

    await NotificationService.create({
      userId:    project.ownerId,
      type:      "MEMBER_LEFT",
      message:   `${member.name} saiu do projeto "${project.title}"`,
      projectId,
    });
    if (project.owner) {
      await sendProjectEmail(
        project.owner.email,
        project.owner.name,
        `Membro saiu do projeto — ${project.title}`,
        `<strong>${member.name}</strong> saiu do projeto <strong>"${project.title}"</strong>.`,
      );
    }

    const remainingMembers = project.members.filter(m => m.id !== userId);
    for (const m of remainingMembers) {
      if (m.id !== project.ownerId) {
        sseManager.emit(m.id, "project_updated", { projectId });
      }
    }
    sseManager.emit(project.ownerId, "project_updated", { projectId });

    return { message: "Você saiu do projeto com sucesso" };
  }

  async removeMember(projectId: string, memberId: string, requesterId: string) {
    const project = await prisma.project.findUnique({
      where:   { id: projectId },
      include: {
        members: { select: { id: true, name: true, email: true } },
        _count:  { select: { members: true } },
      },
    });
    if (!project)                          throw new HttpError(404, "Projeto não encontrado");
    if (project.ownerId !== requesterId)   throw new HttpError(403, "Apenas o líder pode remover membros");
    if (project.ownerId === memberId)      throw new HttpError(400, "Não é possível remover o líder do projeto");

    const member = project.members.find((m) => m.id === memberId);
    if (!member) throw new HttpError(404, "Membro não encontrado no projeto");

    await prisma.project.update({
      where: { id: projectId },
      data:  { members: { disconnect: { id: memberId } } },
    });
    await prisma.memberRequest.deleteMany({ where: { projectId, userId: memberId } });

    const newMemberCount = (project._count.members ?? 1) - 1;
    const newStatus = resolveStatus(project.vacancies, newMemberCount, project.status);
    if (newStatus !== project.status) {
      await prisma.project.update({ where: { id: projectId }, data: { status: newStatus } });
    }

    await NotificationService.create({
      userId:    memberId,
      type:      "MEMBER_REMOVED",
      message:   `Você foi removido do projeto "${project.title}"`,
      projectId,
    });
    if (member.email) {
      await sendProjectEmail(
        member.email,
        member.name,
        `Você foi removido do projeto — ${project.title}`,
        `Você foi removido do projeto <strong>"${project.title}"</strong> pelo professor responsável.`,
      );
    }

    const remainingMembers = project.members.filter(m => m.id !== memberId);
    for (const m of remainingMembers) {
      if (m.id !== project.ownerId) {
        sseManager.emit(m.id, "project_updated", { projectId });
      }
    }
    sseManager.emit(project.ownerId, "project_updated", { projectId });

    return { message: "Membro removido com sucesso" };
  }
}