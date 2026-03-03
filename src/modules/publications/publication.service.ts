import { prisma } from "../../config/prisma";
import { HttpError } from "../../utils/http-error";
import { PublicationType } from "@prisma/client";

interface CreatePublicationInput {
  title:      string;
  abstract:   string;
  content?:   string;
  type:       PublicationType;
  year:       number;
  journal?:   string;
  doi?:       string;
  zenodoLink?: string;
  tags?:      string[];
  images?:    string[];
  references?: string[];
  projectId:  string;
  authorIds?: string[];
  userId?:    string;
}

const PUBLICATION_INCLUDE = {
  project: { select: { id: true, title: true, area: true, category: true, status: true, ownerId: true } },
  authors: { select: { id: true, name: true, email: true, avatar: true, department: true } },
} as const;

export class PublicationService {
  async create(input: CreatePublicationInput) {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new HttpError(404, "Projeto não encontrado");

    const authorsToConnect = input.authorIds?.map((id) => ({ id })) ?? [];

    return prisma.publication.create({
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
        authors: { connect: authorsToConnect },
      },
      include: PUBLICATION_INCLUDE,
    });
  }

  async getAll() {
    return prisma.publication.findMany({
      include: PUBLICATION_INCLUDE,
      orderBy: { year: "desc" },
    });
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
  }

  async update(id: string, userId: string, input: Partial<CreatePublicationInput>) {
    const pub = await prisma.publication.findUnique({
      where: { id },
      include: { authors: { select: { id: true } } },
    });
    if (!pub) throw new HttpError(404, "Publicação não encontrada");

    const isAuthor  = pub.authors.some((a) => a.id === userId);
    const isCreator = pub.userId === userId;

    if (!isAuthor && !isCreator) {
      throw new HttpError(403, "Sem permissão para editar esta publicação");
    }

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

    // authorIds substitui completamente a lista de autores
    if (authorIds !== undefined) {
      data.authors = {
        set: authorIds.map((aid) => ({ id: aid })),
      };
    }

    return prisma.publication.update({
      where: { id },
      data,
      include: PUBLICATION_INCLUDE,
    });
  }
}
