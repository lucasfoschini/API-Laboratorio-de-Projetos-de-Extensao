import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { PublicationType, Prisma } from "@prisma/client";
import { NotificationService } from "../notifications/notification.service";
import { resend } from "../../lib/mailer";
import { escapeHtml } from "../../utils/email";
import { cached, invalidateByPrefix } from "../../config/cache";
import { DashboardService } from "../dashboard/dashboard.service";

interface CreatePublicationInput {
  title:       string;
  abstract:    string;
  content?:    string;
  type:        PublicationType;
  year:        number;
  journal?:    string;
  doi?:        string;
  zenodoLink?: string;
  tags?:       string[];
  images?:     string[];
  references?: string[];
  projectId:   string;
  authorIds?:  string[];
  userId?:     string;
  userRole?:   string;
}

const PUBLICATION_INCLUDE = {
  project: { select: { id: true, title: true, area: true, category: true, status: true, ownerId: true } },
  authors: { select: { id: true, name: true, email: true, avatar: true, department: true } },
  user:    { select: { id: true, name: true, email: true, avatar: true } },
} as const;

async function sendPublicationEmail(to: string, name: string, subject: string, body: string) {
  try {
    await resend.emails.send({
      from:    "LEXA <no-reply@resend.dev>",
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
            Este é um e-mail automático enviado pela plataforma LEXA, não responda.
          </p>
        </div>
      `,
    });
  } catch {
    // Não bloqueia a operação se e-mail falhar
  }
}

export class PublicationService {
  async create(input: CreatePublicationInput) {
    const project = await prisma.project.findUnique({
      where:   { id: input.projectId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!project) throw new HttpError(404, "Projeto não encontrado");

    const authorsToConnect = input.authorIds?.map((id) => ({ id })) ?? [];
    const approved = input.userRole === "PROFESSOR";

    const pub = await prisma.publication.create({
      data: {
        title:      input.title,
        abstract:   input.abstract,
        content:    input.content    ?? null,
        type:       input.type,
        year:       input.year,
        journal:    input.journal    ?? null,
        doi:        input.doi        ?? null,
        zenodoLink: input.zenodoLink ?? null,
        tags:       input.tags       ?? [],
        images:     input.images     ?? [],
        references: input.references ?? [],
        projectId:  input.projectId,
        userId:     input.userId     ?? null,
        approved,
        authors: { connect: authorsToConnect },
      },
      include: PUBLICATION_INCLUDE,
    });

    invalidateByPrefix("publications:list");

    // Se for aluno, notifica o professor do projeto
    if (!approved && project.owner) {
      await NotificationService.create({
        userId:    project.owner.id,
        type:      "PUBLICATION_PENDING",
        message:   `Nova publicação "${pub.title}" aguardando sua aprovação no projeto "${project.title}"`,
        projectId: input.projectId,
      });
      if (project.owner.email) {
        await sendPublicationEmail(
          project.owner.email,
          project.owner.name,
          `Nova publicação aguardando aprovação — ${project.title}`,
          `Uma nova publicação <strong>"${pub.title}"</strong> foi enviada para o projeto <strong>"${project.title}"</strong> e aguarda sua aprovação.`,
        );
      }
    }

    // Se já aprovada (professor criou), notifica subscribers
    if (approved) {
      const subscribers = await prisma.subscription.findMany({
        where:   { projectId: input.projectId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      for (const sub of subscribers) {
        if (sub.userId === input.userId) continue;

        await NotificationService.create({
          userId:    sub.userId,
          type:      "NEW_PUBLICATION",
          message:   `Nova publicação "${pub.title}" foi adicionada ao projeto "${project.title}"`,
          projectId: input.projectId,
        });

        if (sub.user.email) {
          await sendPublicationEmail(
            sub.user.email,
            sub.user.name,
            `Nova publicação — ${project.title}`,
            `Uma nova publicação <strong>"${pub.title}"</strong> foi adicionada ao projeto <strong>"${project.title}"</strong> que você acompanha.`,
          );
        }
      }
    }

    return pub;
  }

  async getAll(page = 1, limit = 12, filters: { type?: string; year?: number } = {}) {
    const cacheKey = `publications:list:${page}:${limit}:${JSON.stringify(filters)}`;
    return cached(cacheKey, 60, async () => {
      const skip = (page - 1) * limit;

      const where: Prisma.PublicationWhereInput = { approved: true };
      if (filters.type) where.type = filters.type.toUpperCase() as PublicationType;
      if (filters.year) where.year = filters.year;

      const [publications, total] = await Promise.all([
        prisma.publication.findMany({
          where,
          include: PUBLICATION_INCLUDE,
          orderBy: { year: "desc" },
          skip,
          take: limit,
        }),
        prisma.publication.count({ where }),
      ]);

      return {
        data:       publications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore:    page * limit < total,
      };
    });
  }

  async getPending(projectId: string, userId?: string) {
    return prisma.publication.findMany({
      where:   { projectId, approved: false, revisionRequested: false },
      include: PUBLICATION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async approve(id: string, userId: string) {
    const pub = await prisma.publication.findUnique({
      where:   { id },
      include: {
        project: { select: { ownerId: true, title: true } },
        user:    { select: { id: true, name: true, email: true } },
        authors: { select: { id: true } },
      },
    });
    if (!pub) throw new HttpError(404, "Publicação não encontrada");
    if (pub.project.ownerId !== userId) throw new HttpError(403, "Apenas o professor do projeto pode aprovar publicações");

    const updated = await prisma.publication.update({
      where:   { id },
      data:    { approved: true, revisionRequested: false },
      include: PUBLICATION_INCLUDE,
    });

    // Limpa sugestões antigas desta publicação
    await prisma.notification.deleteMany({
      where: {
        type:    "PUBLICATION_SUGGESTION",
        message: { contains: `[pubId:${id}]` }
      }
    });

    invalidateByPrefix("publications:list");

    // Notifica o aluno criador
    if (pub.userId && pub.user) {
      await NotificationService.create({
        userId:    pub.userId,
        type:      "PUBLICATION_APPROVED",
        message:   `Sua publicação "${pub.title}" foi aprovada no projeto "${pub.project.title}"`,
        projectId: pub.projectId,
      });
      if (pub.user.email) {
        await sendPublicationEmail(
          pub.user.email,
          pub.user.name,
          `Publicação aprovada — ${pub.project.title}`,
          `Sua publicação <strong>"${pub.title}"</strong> foi <strong style="color:#16a34a">aprovada</strong> pelo professor responsável pelo projeto <strong>"${pub.project.title}"</strong>.`,
        );
      }
    }

    // Notifica e envia email para quem acompanha o projeto
    const subscribers = await prisma.subscription.findMany({
      where:   { projectId: pub.projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    for (const sub of subscribers) {
      if (sub.userId === pub.userId) continue;

      await NotificationService.create({
        userId:    sub.userId,
        type:      "NEW_PUBLICATION",
        message:   `Nova publicação "${pub.title}" foi adicionada ao projeto "${pub.project.title}"`,
        projectId: pub.projectId,
      });

      if (sub.user.email) {
        await sendPublicationEmail(
          sub.user.email,
          sub.user.name,
          `Nova publicação — ${pub.project.title}`,
          `Uma nova publicação <strong>"${pub.title}"</strong> foi adicionada ao projeto <strong>"${pub.project.title}"</strong> que você acompanha.`,
        );
      }
    }

    // Invalida o cache do dashboard de todos os envolvidos
    const participants = [
      ...(pub.userId ? [pub.userId] : []),
      ...pub.authors.map(a => a.id)
    ];
    [...new Set(participants)].forEach(pid => DashboardService.invalidateUser(pid));

    return updated;
  }

  async suggest(id: string, userId: string, suggestion: string) {
    const pub = await prisma.publication.findUnique({
      where:   { id },
      include: {
        project: { select: { ownerId: true, title: true } },
        user:    { select: { id: true, name: true, email: true } },
        authors: { select: { id: true, name: true, email: true } },
      },
    });
    if (!pub) throw new HttpError(404, "Publicação não encontrada");
    if (pub.project.ownerId !== userId) throw new HttpError(403, "Apenas o professor do projeto pode enviar sugestões");

    // Marca como "em revisão" → some da fila do professor
    await prisma.publication.update({
      where: { id },
      data:  { revisionRequested: true },
    });

    // Notifica e envia e-mail para o criador e autores
    const recipients = [
      ...(pub.user ? [pub.user] : []),
      ...pub.authors.filter((a) => a.id !== pub.userId),
    ].filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i);

    for (const recipient of recipients) {
      await NotificationService.create({
        userId:    recipient.id,
        type:      "PUBLICATION_SUGGESTION",
        message:   `O professor enviou sugestões para sua publicação "${pub.title}": ${suggestion.slice(0, 100)}${suggestion.length > 100 ? "..." : ""} [pubId:${id}]`,
        projectId: pub.projectId,
      });

      if (recipient.email) {
        await sendPublicationEmail(
          recipient.email,
          recipient.name,
          `Sugestões de revisão — ${pub.title}`,
          `
            <p style="margin-bottom: 16px;">O professor responsável pelo projeto <strong>"${pub.project.title}"</strong> enviou sugestões de revisão para sua publicação <strong>"${pub.title}"</strong>:</p>
            <div style="background: #fefce8; border-left: 4px solid #ca8a04; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; font-style: italic; color: #854d0e;">
              ${escapeHtml(suggestion).replace(/\n/g, '<br/>')}
            </div>
            <p style="font-size: 14px; color: #666;">Por favor, edite sua publicação considerando as sugestões acima e reenvie para aprovação.</p>
          `
        );
      }
    }

    return { message: "Sugestão enviada com sucesso" };
  }

  async reject(id: string, userId: string, reason?: string) {
    const pub = await prisma.publication.findUnique({
      where:   { id },
      include: {
        project: { select: { ownerId: true, title: true } },
        user:    { select: { id: true, name: true, email: true } },
        authors: { select: { id: true } },
      },
    });
    if (!pub) throw new HttpError(404, "Publicação não encontrada");
    if (pub.project.ownerId !== userId) throw new HttpError(403, "Apenas o professor do projeto pode recusar publicações");

    await prisma.publication.delete({ where: { id } });

    // Limpa sugestões antigas desta publicação
    await prisma.notification.deleteMany({
      where: {
        type:    "PUBLICATION_SUGGESTION",
        message: { contains: `[pubId:${id}]` }
      }
    });

    invalidateByPrefix("publications:list");

    if (pub.userId && pub.user) {
      const reasonText = reason ? ` Motivo: ${reason}` : "";
      await NotificationService.create({
        userId:    pub.userId,
        type:      "PUBLICATION_REJECTED",
        message:   `Sua publicação "${pub.title}" foi recusada no projeto "${pub.project.title}".${reasonText}`,
        projectId: pub.projectId,
      });
      await sendPublicationEmail(
        pub.user.email,
        pub.user.name,
        `Publicação recusada — ${pub.project.title}`,
        `Sua publicação <strong>"${pub.title}"</strong> foi <strong style="color:#dc2626">recusada</strong> pelo professor responsável pelo projeto <strong>"${pub.project.title}"</strong>.${reason ? `<br/><br/><strong>Motivo:</strong> ${reason}` : ""}`,
      );
    }

    // Invalida o cache do dashboard de todos os envolvidos
    const participants = [
      ...(pub.userId ? [pub.userId] : []),
      ...pub.authors.map(a => a.id)
    ];
    [...new Set(participants)].forEach(pid => DashboardService.invalidateUser(pid));

    return { message: "Publicação recusada e removida" };
  }

  async getById(id: string) {
    const pub = await prisma.publication.findUnique({
      where:   { id },
      include: PUBLICATION_INCLUDE,
    });
    if (!pub) throw new HttpError(404, "Publicação não encontrada");
    return pub;
  }

  async delete(id: string, userId: string) {
    const pub = await prisma.publication.findUnique({
      where: { id },
      include: {
        authors: { select: { id: true } },
        project: { select: { ownerId: true } },
      },
    });
    if (!pub) throw new HttpError(404, "Publicação não encontrada");

    const isAuthor       = pub.authors.some((a) => a.id === userId);
    const isProjectOwner = pub.project.ownerId === userId;
    const isCreator      = pub.userId === userId;

    if (!isAuthor && !isProjectOwner && !isCreator) {
      throw new HttpError(403, "Você não tem permissão para excluir esta publicação");
    }

    await prisma.publication.delete({ where: { id } });

    // Limpa sugestões antigas desta publicação
    await prisma.notification.deleteMany({
      where: {
        type:    "PUBLICATION_SUGGESTION",
        message: { contains: `[pubId:${id}]` }
      }
    });

    invalidateByPrefix("publications:list");

    // Invalida o cache do dashboard
    const participants = [
      ...(pub.userId ? [pub.userId] : []),
      ...pub.authors.map(a => a.id)
    ];
    [...new Set(participants)].forEach(pid => DashboardService.invalidateUser(pid));
  }

  async update(id: string, userId: string, input: Partial<CreatePublicationInput>) {
    const pub = await prisma.publication.findUnique({
      where:   { id },
      include: {
        authors: { select: { id: true } },
        project: { select: { ownerId: true, title: true } },
        user:    { select: { id: true, name: true } },
      },
    });
    if (!pub) throw new HttpError(404, "Publicação não encontrada");

    const isAuthor  = pub.authors.some((a) => a.id === userId);
    const isCreator = pub.userId === userId;

    if (!isAuthor && !isCreator) {
      throw new HttpError(403, "Sem permissão para editar esta publicação");
    }

    const wasRevisionRequested = (pub as any).revisionRequested === true;

    const { authorIds, projectId, ...fields } = input;

    const data: Record<string, unknown> = {};
    if (fields.title      !== undefined) data.title      = fields.title;
    if (fields.abstract   !== undefined) data.abstract   = fields.abstract;
    if (fields.content    !== undefined) data.content    = fields.content ?? null;
    if (fields.type       !== undefined) data.type       = fields.type;
    if (fields.year       !== undefined) data.year       = fields.year;
    if (fields.journal    !== undefined) data.journal    = fields.journal ?? null;
    if (fields.doi        !== undefined) data.doi        = fields.doi ?? null;
    if (fields.zenodoLink !== undefined) data.zenodoLink = fields.zenodoLink ?? null;
    if (fields.tags       !== undefined) data.tags       = fields.tags ?? [];
    if (fields.images     !== undefined) data.images     = fields.images ?? [];
    if (fields.references !== undefined) data.references = fields.references ?? [];
    if (projectId         !== undefined) data.projectId  = projectId;

    if (wasRevisionRequested) {
      data.revisionRequested = false;
      data.approved          = false;

      // Limpa as notificações de sugestão desta publicação para TODOS os membros
      await prisma.notification.deleteMany({
        where: {
          type: "PUBLICATION_SUGGESTION",
          message: { contains: `[pubId:${id}]` }
        }
      });
    }

    if (authorIds !== undefined) {
      data.authors = { set: authorIds.map((aid) => ({ id: aid })) };
    }

    const updated = await prisma.publication.update({
      where: { id },
      data,
      include: PUBLICATION_INCLUDE,
    });

    // Notifica o professor que o aluno resubmeteu
    if (wasRevisionRequested && pub.project?.ownerId && pub.project.ownerId !== userId) {
      const authorName = pub.user?.name ?? "O aluno";
      await NotificationService.create({
        userId:    pub.project.ownerId,
        type:      "PUBLICATION_PENDING",
        message:   `${authorName} revisou a publicação "${pub.title}" e resubmeteu para aprovação.`,
        projectId: pub.projectId ?? undefined,
      });
      const owner = await prisma.user.findUnique({
        where:  { id: pub.project.ownerId },
        select: { email: true, name: true },
      });
      if (owner?.email) {
        await sendPublicationEmail(
          owner.email,
          owner.name,
          `Publicação revisada aguardando aprovação — ${pub.project.title}`,
          `${authorName} revisou a publicação <strong>"${pub.title}"</strong> e resubmeteu para aprovação no projeto <strong>"${pub.project.title}"</strong>.`,
        );
      }
    }

    // Invalida o cache do dashboard de todos os membros envolvidos
    const participants = [
      ...(pub.userId ? [pub.userId] : []),
      ...pub.authors.map(a => a.id)
    ];
    [...new Set(participants)].forEach(pid => DashboardService.invalidateUser(pid));

    return updated;
  }
}